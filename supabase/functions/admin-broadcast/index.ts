// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || ''
const ONESIGNAL_REST_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY') || ''
const EVOLUTION_URL = (Deno.env.get('EVOLUTION_GO_URL') || '').replace(/\/$/, '')
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_GO_KEY') || ''
const APP_URL = (Deno.env.get('APP_BASE_URL') || 'https://app.iaprafaturar.com.br').replace(/\/$/, '')

type Channel = 'push_only' | 'push_with_whatsapp_fallback' | 'whatsapp_only'

async function requireActiveAdmin(req: Request, supabase: any): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: admin, error: adminError } = await supabase
    .from('master_admins')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .single()

  if (adminError || !admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return null
}

async function sendPush(subscriptionId: string, title: string, body: string): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) return false
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: [subscriptionId],
        headings: { en: title, pt: title, es: title },
        contents: { en: body, pt: body, es: body },
        large_icon: `${APP_URL}/icon-192x192.png`,
        priority: 7,
      }),
    })
    return res.ok
  } catch (e) {
    console.error('[admin-broadcast] push error:', e)
    return false
  }
}

async function sendWhatsApp(instanceId: string, phone: string, title: string, body: string, instanceToken?: string): Promise<boolean> {
  if (!EVOLUTION_URL || !instanceId || !phone) return false
  const apikey = instanceToken || EVOLUTION_KEY
  if (!apikey) return false
  const clean = phone.replace(/\D/g, '')
  const full = clean.startsWith('55') ? clean : `55${clean}`
  const text = `*${title}*\n\n${body}`
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey },
      body: JSON.stringify({ number: full, text, delay: 0 }),
    })
    console.log(`[admin-broadcast] WhatsApp ${instanceId} -> ${res.ok ? 'ok' : res.status}`)
    return res.ok
  } catch (e) {
    console.error('[admin-broadcast] WhatsApp error:', e)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authResponse = await requireActiveAdmin(req, supabase)
    if (authResponse) return authResponse

    const { professional_ids, title, body, type = 'info', priority = 5, channel = 'push_only' } = await req.json() as {
      professional_ids: string[]
      title: string
      body: string
      type?: string
      priority?: number
      channel?: Channel
    }

    if (!professional_ids?.length || !title || !body) {
      return new Response(JSON.stringify({ error: 'professional_ids, title and body are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const broadcastId = crypto.randomUUID()

    const [profsRes, tokensRes] = await Promise.all([
      supabase
        .from('professionals')
        .select('id, phone_whatsapp, evolution_instance_id, evolution_instance_token')
        .in('id', professional_ids),
      supabase
        .from('professional_push_tokens')
        .select('professional_id, onesignal_id')
        .in('professional_id', professional_ids),
    ])

    const profsMap = new Map((profsRes.data || []).map((p) => [p.id, p]))
    const tokensMap = new Map((tokensRes.data || []).map((t) => [t.professional_id, t.onesignal_id]))

    const notifications = professional_ids.map((id) => ({
      professional_id: id,
      type: 'sistema',
      title,
      body,
      category: 'admin_broadcast',
      is_read: false,
      priority,
      data: { broadcast_id: broadcastId, admin_type: type },
    }))

    const { error: insertError } = await supabase.from('professional_notifications').insert(notifications)
    if (insertError) throw insertError

    let pushed = 0
    let whatsapp_sent = 0

    await Promise.all(professional_ids.map(async (id) => {
      const prof = profsMap.get(id)
      const osId = tokensMap.get(id)
      const hasPush = !!osId
      const hasWA = !!prof?.evolution_instance_id && !!prof?.phone_whatsapp

      if (channel === 'push_only') {
        if (hasPush && await sendPush(osId, title, body)) pushed++
      } else if (channel === 'whatsapp_only') {
        if (hasWA && await sendWhatsApp(prof.evolution_instance_id, prof.phone_whatsapp, title, body, prof.evolution_instance_token)) whatsapp_sent++
      } else if (channel === 'push_with_whatsapp_fallback') {
        if (hasPush && await sendPush(osId, title, body)) pushed++
        else if (hasWA && await sendWhatsApp(prof.evolution_instance_id, prof.phone_whatsapp, title, body, prof.evolution_instance_token)) whatsapp_sent++
      }
    }))

    return new Response(
      JSON.stringify({ success: true, broadcast_id: broadcastId, pushed, whatsapp_sent, saved: professional_ids.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[admin-broadcast] erro:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
