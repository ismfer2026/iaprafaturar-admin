// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PLAN_COLUMNS = `
  id, slug, name, description, price_monthly, price_annual,
  max_users, max_clients, max_sessions_per_month,
  feature_agenda, feature_clients, feature_sessions, feature_financial,
  feature_products, feature_reports, feature_rfm, feature_campaigns,
  feature_funnels, feature_indications, feature_ai_agents,
  feature_multi_agenda, feature_team_management,
  feature_consolidated_reports, feature_shared_clients, feature_admin_master,
  trial_days, is_active, is_featured, sort_order, badge_text,
  created_at, updated_at
`

const WRITABLE_FIELDS = [
  'slug',
  'name',
  'description',
  'price_monthly',
  'price_annual',
  'max_users',
  'max_clients',
  'max_sessions_per_month',
  'feature_agenda',
  'feature_clients',
  'feature_sessions',
  'feature_financial',
  'feature_products',
  'feature_reports',
  'feature_rfm',
  'feature_campaigns',
  'feature_funnels',
  'feature_indications',
  'feature_ai_agents',
  'feature_multi_agenda',
  'feature_team_management',
  'feature_consolidated_reports',
  'feature_shared_clients',
  'feature_admin_master',
  'trial_days',
  'is_active',
  'is_featured',
  'sort_order',
  'badge_text',
]

const CREDIT_PRODUCT_BY_SLUG: Record<string, string> = {
  solo: 'plan_solo',
  pro: 'plan_pro',
  clinica: 'plan_clinica',
}

const CREDIT_FALLBACK_BY_SLUG: Record<string, number | null> = {
  solo: 1200,
  pro: 4500,
  clinica: 13000,
  gratuito: null,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function requireActiveAdmin(req: Request, supabase: any): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) return json({ error: 'Unauthorized' }, 401)

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401)

  const { data: admin, error: adminError } = await supabase
    .from('master_admins')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .single()

  if (adminError || !admin) return json({ error: 'Forbidden' }, 403)

  return null
}

function sanitizePlan(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {}
  for (const field of WRITABLE_FIELDS) {
    if (field in input) payload[field] = input[field]
  }
  if (typeof payload.name === 'string') payload.name = payload.name.trim()
  if (typeof payload.slug === 'string') payload.slug = payload.slug.trim().toLowerCase()
  if (typeof payload.description !== 'string') payload.description = ''
  if (typeof payload.badge_text === 'string' && payload.badge_text.trim() === '') payload.badge_text = null
  return payload
}

async function updatePlanCredits(supabase: any, slug: string, credits: unknown) {
  const productKey = CREDIT_PRODUCT_BY_SLUG[slug]
  if (!productKey || credits === undefined || credits === null || credits === '') return

  const creditsAmount = Number(credits)
  if (!Number.isFinite(creditsAmount) || creditsAmount < 0) return

  const { data: product, error: productError } = await supabase
    .from('billing_products')
    .select('id, metadata')
    .eq('product_key', productKey)
    .eq('product_type', 'subscription')
    .eq('active', true)
    .single()

  if (productError) throw productError

  const { error } = await supabase
    .from('billing_products')
    .update({
      credits_amount: Math.round(creditsAmount),
      metadata: { ...(product?.metadata || {}), credits_amount: Math.round(creditsAmount) },
    })
    .eq('id', product.id)

  if (error) throw error
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json({ error: 'Server configuration missing' }, 500)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authResponse = await requireActiveAdmin(req, supabase)
    if (authResponse) return authResponse

    const body = await req.json().catch(() => ({}))
    const action = body?.action || 'list'

    if (action === 'list') {
      const [{ data: plans, error: plansError }, { data: subs, error: subsError }, { data: products, error: productsError }] = await Promise.all([
        supabase.from('plans').select(PLAN_COLUMNS).order('sort_order', { ascending: true, nullsFirst: false }).order('price_monthly', { ascending: true }),
        supabase.from('professional_subscriptions').select('plan_id, status, plans(price_monthly)').eq('status', 'active'),
        supabase.from('billing_products').select('product_key, credits_amount').eq('product_type', 'subscription').eq('active', true),
      ])

      if (plansError) throw plansError
      if (subsError) throw subsError
      if (productsError) throw productsError

      const subsMap: Record<string, { count: number; mrr: number }> = {}
      for (const sub of subs || []) {
        if (!sub.plan_id) continue
        if (!subsMap[sub.plan_id]) subsMap[sub.plan_id] = { count: 0, mrr: 0 }
        subsMap[sub.plan_id].count++
        subsMap[sub.plan_id].mrr += Number(sub.plans?.price_monthly || 0)
      }

      const creditsByProduct = new Map((products || []).map((product) => [product.product_key, product.credits_amount]))

      return json({
        plans: (plans || []).map((plan) => ({
          ...plan,
          ai_credits_month: creditsByProduct.get(CREDIT_PRODUCT_BY_SLUG[plan.slug]) ?? CREDIT_FALLBACK_BY_SLUG[plan.slug] ?? null,
          subscribers_count: subsMap[plan.id]?.count || 0,
          mrr_contribution: subsMap[plan.id]?.mrr || 0,
        })),
      })
    }

    if (action === 'toggle') {
      const id = body?.id
      const isActive = body?.is_active
      if (!id || typeof isActive !== 'boolean') return json({ error: 'id and is_active are required' }, 400)

      const { data, error } = await supabase
        .from('plans')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(PLAN_COLUMNS)
        .single()

      if (error) throw error
      return json({ plan: data })
    }

    if (action === 'save') {
      const rawPlan = body?.plan || {}
      const plan = sanitizePlan(rawPlan)
      if (!plan.name || !plan.slug) return json({ error: 'name and slug are required' }, 400)

      if (body?.id) {
        const { data, error } = await supabase
          .from('plans')
          .update({ ...plan, updated_at: new Date().toISOString() })
          .eq('id', body.id)
          .select(PLAN_COLUMNS)
          .single()

        if (error) throw error
        await updatePlanCredits(supabase, String(plan.slug), rawPlan.ai_credits_month)
        return json({ plan: data })
      }

      const { data, error } = await supabase
        .from('plans')
        .insert(plan)
        .select(PLAN_COLUMNS)
        .single()

      if (error) throw error
      await updatePlanCredits(supabase, String(plan.slug), rawPlan.ai_credits_month)
      return json({ plan: data })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('[admin-plans] error:', error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
