import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { professional_ids, title, body, type, priority = 5 } = await req.json()

    if (!professional_ids || !Array.isArray(professional_ids) || professional_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "professional_ids must be a non-empty array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const broadcastId = crypto.randomUUID()
    const now = new Date().toISOString()

    // 1. Batch INSERT em professional_notifications (service_role ignora RLS)
    const notificationRows = professional_ids.map((profId) => ({
      professional_id: profId,
      type: type || "campaign_admin",
      title,
      body,
      category: "admin_broadcast",
      priority,
      is_read: false,
      data: { broadcast_id: broadcastId, sent_by: "admin" },
      created_at: now,
    }))

    const { error: insertError, data: insertedData } = await supabase
      .from("professional_notifications")
      .insert(notificationRows)

    if (insertError) {
      console.error("[admin-broadcast] Insert error:", insertError)
      return new Response(
        JSON.stringify({ error: `Insert failed: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Buscar onesignal_ids dos profissionais
    const { data: tokens, error: tokensError } = await supabase
      .from("professional_push_tokens")
      .select("professional_id, onesignal_id")
      .in("professional_id", professional_ids)

    if (tokensError) {
      console.error("[admin-broadcast] Tokens fetch error:", tokensError)
      // Não é erro fatal — notificações foram inseridas no banco
      return new Response(
        JSON.stringify({
          success: true,
          inserted: professional_ids.length,
          pushed: 0,
          no_token_count: professional_ids.length,
          message: "Notificações inseridas no banco. Push OneSignal não disponível.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const tokenMap = new Map((tokens || []).map((t) => [t.professional_id, t.onesignal_id]))
    const onesignalIds = Array.from(tokenMap.values())
    const noTokenCount = professional_ids.length - onesignalIds.length

    // Se não houver tokens OneSignal, a notificação ainda foi inserida no banco
    if (onesignalIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: professional_ids.length,
          pushed: 0,
          no_token_count: professional_ids.length,
          message: "Notificações inseridas no banco. Nenhum token OneSignal disponível.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Enviar via OneSignal REST API
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID")
    const onesignalRestKey = Deno.env.get("ONESIGNAL_REST_API_KEY")

    if (!onesignalAppId || !onesignalRestKey) {
      console.warn("[admin-broadcast] OneSignal não configurado")
      return new Response(
        JSON.stringify({
          success: true,
          inserted: professional_ids.length,
          pushed: 0,
          no_token_count: professional_ids.length,
          message: "Notificações inseridas no banco. OneSignal não configurado nos secrets do Supabase.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${onesignalRestKey}`,
      },
      body: JSON.stringify({
        app_id: onesignalAppId,
        include_subscription_ids: onesignalIds,
        headings: { en: title, pt: title },
        contents: { en: body, pt: body },
        data: {
          type: type || "campaign_admin",
          broadcast_id: broadcastId,
          sent_by: "admin",
        },
        priority: Math.min(Math.max(priority, 1), 10),
        ttl: 86400,
      }),
    })

    const osResult = await osResponse.json()

    if (!osResponse.ok) {
      console.error("[admin-broadcast] OneSignal error:", osResult)
      // Mesmo assim, as notificações foram inseridas no banco
      return new Response(
        JSON.stringify({
          success: true,
          inserted: professional_ids.length,
          pushed: 0,
          no_token_count: noTokenCount,
          warning: `OneSignal error: ${osResult.errors?.[0] || "unknown"}. Notificações inseridas no banco.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: professional_ids.length,
        pushed: onesignalIds.length,
        no_token_count: noTokenCount,
        broadcast_id: broadcastId,
        onesignal_response: osResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[admin-broadcast] Error:", msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
