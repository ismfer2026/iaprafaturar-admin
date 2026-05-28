// @ts-nocheck — Deno runtime, não Node.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const NERISSA_INTERNAL_TOKEN = Deno.env.get('NERISSA_INTERNAL_TOKEN') ?? ''

function timingSafeEqual(a: string, b: string) {
  if (!a || !b) return false
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  if (left.length !== right.length) return false

  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

function isAuthorized(req: Request) {
  const auth = req.headers.get('Authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '')
  const apikey = req.headers.get('apikey') ?? ''
  const internalToken = req.headers.get('x-nerissa-internal-token') ?? ''

  return (
    timingSafeEqual(bearer, SUPABASE_SERVICE_ROLE_KEY) ||
    timingSafeEqual(apikey, SUPABASE_SERVICE_ROLE_KEY) ||
    (Boolean(NERISSA_INTERNAL_TOKEN) && timingSafeEqual(internalToken, NERISSA_INTERNAL_TOKEN))
  )
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Aceita chamada interna com service role ou x-nerissa-internal-token.
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 1. Buscar todas as conversões ativas com dados do parceiro
  const { data: conversions, error: convErr } = await supabase
    .from('affiliate_conversions')
    .select(`
      id,
      affiliate_id,
      referred_professional_id,
      commission_pct,
      affiliate_partners ( id, pending_payment )
    `)
    .eq('status', 'ativo')

  if (convErr) {
    console.error('[affiliate-commission-cron] Erro ao buscar conversions:', convErr)
    return new Response(JSON.stringify({ error: convErr.message }), { status: 500 })
  }

  let processed = 0
  let skipped = 0
  let totalCommission = 0

  for (const conv of conversions ?? []) {
    // 2. Idempotência — já processou este parceiro neste mês?
    const { count } = await supabase
      .from('affiliate_payments')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', conv.affiliate_id)
      .eq('period_month', period)

    if ((count ?? 0) > 0) {
      console.log(`[affiliate-commission-cron] Pulando ${conv.affiliate_id} — já processado em ${period}`)
      skipped++
      continue
    }

    // 3. Buscar assinatura ativa do indicado com preço do plano
    const { data: sub } = await supabase
      .from('professional_subscriptions')
      .select('status, plans ( monthly_price )')
      .eq('professional_id', conv.referred_professional_id)
      .eq('status', 'active')
      .maybeSingle()

    const monthlyPrice = (sub?.plans as any)?.monthly_price ?? 0

    if (!sub || monthlyPrice <= 0) {
      console.log(`[affiliate-commission-cron] Pulando professional ${conv.referred_professional_id} — sem assinatura ativa ou plano gratuito`)
      skipped++
      continue
    }

    // 4. Calcular comissão (2 casas decimais)
    const commission = Math.round((monthlyPrice * conv.commission_pct / 100) * 100) / 100

    // 5. Registrar em affiliate_payments
    const { error: payErr } = await supabase
      .from('affiliate_payments')
      .insert({
        affiliate_id: conv.affiliate_id,
        gross_amount: commission,
        net_amount: commission,
        status: 'pending',
        period_month: period,
      })

    if (payErr) {
      console.error(`[affiliate-commission-cron] Erro ao inserir payment para ${conv.affiliate_id}:`, payErr)
      skipped++
      continue
    }

    // 6. Incrementar pending_payment do parceiro
    const currentPending = (conv.affiliate_partners as any)?.pending_payment ?? 0
    await supabase
      .from('affiliate_partners')
      .update({ pending_payment: Number(currentPending) + commission })
      .eq('id', conv.affiliate_id)

    // 7. Atualizar commission_monthly_value na conversão
    await supabase
      .from('affiliate_conversions')
      .update({ commission_monthly_value: commission })
      .eq('id', conv.id)

    processed++
    totalCommission += commission

    // Notificar parceiro — fire-and-forget, não bloqueia o loop
    fetch(`${SUPABASE_URL}/functions/v1/affiliate-notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        affiliate_id: conv.affiliate_id,
        event_type: 'commission_credited',
        data: { amount: commission, period },
      }),
    }).catch(e => console.warn('[cron] Falha ao notificar parceiro:', e))
  }

  console.log(`[affiliate-commission-cron] Concluído — period: ${period}, processed: ${processed}, skipped: ${skipped}, total: R$ ${totalCommission.toFixed(2)}`)

  return new Response(
    JSON.stringify({ processed, skipped, total_commission: totalCommission, period }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
