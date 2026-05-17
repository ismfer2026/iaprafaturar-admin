// @ts-nocheck — Deno runtime, não Node.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('DEFAULT_WHATSAPP_INSTANCE') ?? 'default'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Suporta dois formatos:
  // 1. Chamada direta (cron): { affiliate_id, event_type, data }
  // 2. Supabase DB Webhook:   { type: "INSERT", record: { affiliate_id, ... } }
  let affiliate_id: string | undefined
  let event_type: string | undefined
  let data: Record<string, unknown> = {}

  if (body.record && typeof body.record === 'object') {
    // Formato Supabase Webhook
    const record = body.record as Record<string, unknown>
    affiliate_id = record.affiliate_id as string
    event_type = 'new_conversion'
    data = {}
  } else {
    // Formato chamada direta
    affiliate_id = body.affiliate_id as string
    event_type = body.event_type as string
    data = (body.data as Record<string, unknown>) ?? {}
  }

  if (!affiliate_id || !event_type) {
    return new Response(JSON.stringify({ error: 'affiliate_id e event_type são obrigatórios' }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: partner, error: partnerErr } = await supabase
    .from('affiliate_partners')
    .select('name, email, phone_whatsapp')
    .eq('id', affiliate_id)
    .single()

  if (partnerErr || !partner) {
    console.error('[affiliate-notify] Parceiro não encontrado:', affiliate_id)
    return new Response(JSON.stringify({ error: 'Partner not found' }), { status: 404 })
  }

  const results = { email_sent: false, whatsapp_sent: false, errors: [] as string[] }

  // ── Montar mensagens por tipo de evento ──────────────────────────────────────
  let emailSubject = ''
  let emailHtml = ''
  let waText = ''

  if (event_type === 'new_conversion') {
    emailSubject = '🎉 Novo indicado cadastrado!'
    emailHtml = `
      <h2>Olá, ${partner.name}!</h2>
      <p>Alguém usou seu link de afiliado e acabou de se cadastrar no <strong>iaprafaturar</strong>. 🚀</p>
      <p>Quando esse profissional ativar um plano pago, você começa a receber sua comissão mensalmente.</p>
      <p>Acompanhe suas conversões no painel de parceiros.</p>
    `
    waText = `🎉 *${partner.name}*, alguém usou seu link e se cadastrou no iaprafaturar!\n\nQuando ativar um plano pago, você começa a receber sua comissão. 💰\n\nAcompanhe no painel de parceiros.`

  } else if (event_type === 'commission_credited') {
    const amount = typeof data.amount === 'number' ? data.amount.toFixed(2) : '0.00'
    const period = typeof data.period === 'string' ? data.period : ''
    emailSubject = `💰 Comissão de R$ ${amount} creditada!`
    emailHtml = `
      <h2>Olá, ${partner.name}!</h2>
      <p>Sua comissão de <strong>R$ ${amount}</strong> referente a <strong>${period}</strong> foi creditada no seu saldo.</p>
      <p>Acesse o painel de parceiros para acompanhar seu saldo e solicitar pagamento via PIX.</p>
    `
    waText = `💰 *${partner.name}*, sua comissão de *R$ ${amount}* referente a ${period} foi creditada!\n\nAcesse o painel para solicitar pagamento via PIX. 🏦`
  } else {
    return new Response(JSON.stringify({ error: `Tipo de evento desconhecido: ${event_type}` }), { status: 400 })
  }

  // ── Email via Resend ─────────────────────────────────────────────────────────
  if (partner.email && RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'iaprafaturar Parceiros <noreply@iaprafaturar.com.br>',
          to: partner.email,
          subject: emailSubject,
          html: emailHtml,
        }),
      })
      results.email_sent = res.ok
      if (!res.ok) {
        const errText = await res.text()
        console.error('[affiliate-notify] Resend error:', errText)
        results.errors.push(`Email: ${errText}`)
      }
    } catch (e) {
      console.error('[affiliate-notify] Email exception:', e)
      results.errors.push(`Email exception: ${e}`)
    }
  }

  // ── WhatsApp via Evolution API ───────────────────────────────────────────────
  const rawPhone = typeof partner.phone_whatsapp === 'string' ? partner.phone_whatsapp : ''
  const phone = rawPhone.replace(/\D/g, '')

  if (phone && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
    try {
      const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: `${phone}@s.whatsapp.net`,
          text: waText,
        }),
      })
      results.whatsapp_sent = res.ok
      if (!res.ok) {
        const errText = await res.text()
        console.error('[affiliate-notify] Evolution error:', errText)
        results.errors.push(`WhatsApp: ${errText}`)
      }
    } catch (e) {
      console.error('[affiliate-notify] WhatsApp exception:', e)
      results.errors.push(`WhatsApp exception: ${e}`)
    }
  }

  console.log(`[affiliate-notify] ${event_type} para ${affiliate_id}: email=${results.email_sent}, whatsapp=${results.whatsapp_sent}`)

  return new Response(
    JSON.stringify(results),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
