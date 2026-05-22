// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type Channel = "push_only" | "push_with_whatsapp_fallback" | "whatsapp_only"

interface BroadcastRequest {
  professional_ids: string[]
  title: string
  body: string
  type: string
  priority: number
  channel?: Channel   // default: "push_only" (comportamento legado)
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const APP_URL = "https://iaprafaturar.com.br"

async function sendWhatsAppSelfMessage(
  instanceId: string,
  phone: string,
  title: string,
  body: string,
): Promise<boolean> {
  const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "")
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") || ""
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !instanceId || !phone) return false

  const clean = phone.replace(/\D/g, "")
  const full  = clean.startsWith("55") ? clean : `55${clean}`
  const text  = `🔔 *${title}*\n\n${body}\n\n_${APP_URL}_`

  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: full, text, delay: 0 }),
    })
    return res.ok
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as BroadcastRequest

    if (!body.professional_ids || !Array.isArray(body.professional_ids) || body.professional_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "professional_ids must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials")

    const supabase    = createClient(supabaseUrl, serviceRoleKey)
    const channel     = body.channel || "push_only"
    const broadcastId = crypto.randomUUID()
    const now         = new Date().toISOString()

    // ── 1. Salva notificações no histórico do app ───────────────────
    const rows = body.professional_ids.map((prof_id) => ({
      professional_id: prof_id,
      category: "admin_broadcast",
      title: body.title,
      body:  body.body,
      type:  body.type || "info",
      priority: body.priority || 5,
      data: { broadcast_id: broadcastId, channel },
      created_at: now,
      updated_at: now,
    }))

    const { error: insertError } = await supabase.from("professional_notifications").insert(rows)
    if (insertError) {
      console.error("Insert error:", insertError)
      throw insertError
    }

    let pushedCount   = 0
    let whatsappCount = 0

    // ── 2. Canal Push (OneSignal) ───────────────────────────────────
    if (channel === "push_only" || channel === "push_with_whatsapp_fallback") {
      const { data: tokens } = await supabase
        .from("professional_push_tokens")
        .select("professional_id, onesignal_id")
        .in("professional_id", body.professional_ids)

      const withToken    = tokens?.filter(t => t.onesignal_id) || []
      const withoutToken = body.professional_ids.filter(
        id => !withToken.some(t => t.professional_id === id)
      )

      // Envia push para quem tem token
      if (withToken.length > 0) {
        const onesignalAppId  = Deno.env.get("ONESIGNAL_APP_ID")
        const onesignalRestKey = Deno.env.get("ONESIGNAL_REST_API_KEY")

        if (onesignalAppId && onesignalRestKey) {
          try {
            const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Basic ${onesignalRestKey}`,
              },
              body: JSON.stringify({
                app_id: onesignalAppId,
                include_subscription_ids: withToken.map(t => t.onesignal_id),
                headings: { en: body.title, pt: body.title, es: body.title },
                contents: { en: body.body,  pt: body.body,  es: body.body  },
                data: { broadcast_id: broadcastId, type: body.type },
                priority: body.priority || 5,
              }),
            })

            if (osRes.ok) {
              pushedCount = withToken.length
              console.log(`[admin-broadcast] OneSignal → ${pushedCount} subscribers`)
            } else {
              console.error("[admin-broadcast] OneSignal error:", await osRes.text())
            }
          } catch (e) {
            console.error("[admin-broadcast] OneSignal request failed:", e)
          }
        }
      }

      // Fallback WhatsApp para quem não tem push token
      if (channel === "push_with_whatsapp_fallback" && withoutToken.length > 0) {
        const { data: profData } = await supabase
          .from("professionals")
          .select("id, phone_whatsapp, evolution_instance_id")
          .in("id", withoutToken)

        for (const prof of profData || []) {
          if (prof.evolution_instance_id && prof.phone_whatsapp) {
            const sent = await sendWhatsAppSelfMessage(
              prof.evolution_instance_id,
              prof.phone_whatsapp,
              body.title,
              body.body,
            )
            if (sent) whatsappCount++
          }
        }

        console.log(`[admin-broadcast] WhatsApp fallback → ${whatsappCount} enviados`)
      }
    }

    // ── 3. Canal WhatsApp only ──────────────────────────────────────
    if (channel === "whatsapp_only") {
      const { data: profData } = await supabase
        .from("professionals")
        .select("id, phone_whatsapp, evolution_instance_id")
        .in("id", body.professional_ids)

      for (const prof of profData || []) {
        if (prof.evolution_instance_id && prof.phone_whatsapp) {
          const sent = await sendWhatsAppSelfMessage(
            prof.evolution_instance_id,
            prof.phone_whatsapp,
            body.title,
            body.body,
          )
          if (sent) whatsappCount++
        }
      }

      console.log(`[admin-broadcast] WhatsApp only → ${whatsappCount} enviados`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        broadcast_id: broadcastId,
        channel,
        inserted:       body.professional_ids.length,
        pushed:         pushedCount,
        whatsapp_sent:  whatsappCount,
        no_token_count: body.professional_ids.length - pushedCount - whatsappCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[admin-broadcast] Function error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
