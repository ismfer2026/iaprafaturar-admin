import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface BroadcastRequest {
  professional_ids: string[]
  title: string
  body: string
  type: string
  priority: number
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as BroadcastRequest

    if (!body.professional_ids || !Array.isArray(body.professional_ids)) {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials")
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const broadcastId = crypto.randomUUID()
    const now = new Date().toISOString()

    // 1. Batch INSERT em professional_notifications com service_role
    const rows = body.professional_ids.map((prof_id) => ({
      professional_id: prof_id,
      category: "admin_broadcast",
      title: body.title,
      body: body.body,
      type: body.type || "info",
      priority: body.priority || 5,
      data: { broadcast_id: broadcastId },
      created_at: now,
      updated_at: now,
    }))

    const { error: insertError } = await supabase
      .from("professional_notifications")
      .insert(rows)

    if (insertError) {
      console.error("Insert error:", insertError)
      throw insertError
    }

    // 2. Buscar onesignal_ids de professional_push_tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("professional_push_tokens")
      .select("onesignal_id")
      .in("professional_id", body.professional_ids)

    if (tokensError) {
      console.error("Tokens fetch error:", tokensError)
      throw tokensError
    }

    let pushedCount = 0
    const onesignalIds = tokens?.map((t) => t.onesignal_id).filter(Boolean) || []

    // 3. Enviar para OneSignal se houver tokens
    if (onesignalIds.length > 0) {
      const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID")
      const onesignalRestKey = Deno.env.get("ONESIGNAL_REST_API_KEY")

      if (!onesignalAppId || !onesignalRestKey) {
        console.warn("OneSignal credentials not configured, skipping push")
      } else {
        try {
          const onesignalPayload = {
            app_id: onesignalAppId,
            include_subscription_ids: onesignalIds,
            headings: { en: body.title },
            contents: { en: body.body },
            data: { broadcast_id: broadcastId, type: body.type },
            priority: body.priority || 5,
          }

          const onesignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Authorization: `Basic ${onesignalRestKey}`,
            },
            body: JSON.stringify(onesignalPayload),
          })

          if (!onesignalResponse.ok) {
            const errorText = await onesignalResponse.text()
            console.error("OneSignal error:", onesignalResponse.status, errorText)
          } else {
            pushedCount = onesignalIds.length
            console.log(`OneSignal notification sent to ${pushedCount} subscribers`)
          }
        } catch (e) {
          console.error("OneSignal request failed:", e)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        broadcast_id: broadcastId,
        inserted: body.professional_ids.length,
        pushed: pushedCount,
        no_token_count: body.professional_ids.length - onesignalIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Function error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
