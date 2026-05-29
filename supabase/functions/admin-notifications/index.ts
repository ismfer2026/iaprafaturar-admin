// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

function normalizeAdminType(value: unknown) {
  return typeof value === 'string' && ['info', 'alert', 'warning', 'success', 'update'].includes(value)
    ? value
    : 'info'
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

    if (action === 'delete_old') {
      const daysOld = Number(body?.days_old || 30)
      if (!Number.isFinite(daysOld) || daysOld < 1) return json({ error: 'days_old must be positive' }, 400)

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data: oldRows, error: selectError } = await supabase
        .from('professional_notifications')
        .select('id')
        .eq('category', 'admin_broadcast')
        .lt('created_at', cutoffDate.toISOString())

      if (selectError) throw selectError

      const ids = (oldRows || []).map((row) => row.id)
      if (ids.length === 0) return json({ deleted: 0 })

      const { error: deleteError } = await supabase
        .from('professional_notifications')
        .delete()
        .in('id', ids)

      if (deleteError) throw deleteError
      return json({ deleted: ids.length })
    }

    if (action !== 'list') return json({ error: 'Unknown action' }, 400)

    const [{ data: rows, error: rowsError }, { data: profs, error: profsError }, { data: prefs, error: prefsError }] = await Promise.all([
      supabase
        .from('professional_notifications')
        .select('id, professional_id, title, body, type, priority, is_read, created_at, data')
        .eq('category', 'admin_broadcast')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('professionals')
        .select('id, name, email')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('notification_preferences')
        .select('professional_id, push_enabled, whatsapp_enabled'),
    ])

    if (rowsError) throw rowsError
    if (profsError) throw profsError
    if (prefsError) throw prefsError

    const prefsMap = new Map((prefs || []).map((pref) => [pref.professional_id, pref]))
    const professionals = (profs || []).map((prof) => ({
      ...prof,
      push_enabled: prefsMap.get(prof.id)?.push_enabled ?? true,
      whatsapp_enabled: prefsMap.get(prof.id)?.whatsapp_enabled ?? false,
    }))

    const grouped = new Map<string, Array<any>>()
    for (const row of rows || []) {
      const broadcastId = row.data?.broadcast_id || row.id
      if (!grouped.has(broadcastId)) grouped.set(broadcastId, [])
      grouped.get(broadcastId)!.push(row)
    }

    const broadcasts = Array.from(grouped.values()).map((groupRows) => {
      const first = groupRows[0]
      const readCount = groupRows.filter((row) => row.is_read).length
      return {
        broadcast_id: first.data?.broadcast_id || first.id,
        title: first.title,
        body: first.body,
        type: normalizeAdminType(first.data?.admin_type || first.type),
        priority: first.priority || 5,
        recipient_count: groupRows.length,
        read_count: readCount,
        sent_at: first.created_at,
      }
    })

    return json({ broadcasts, professionals })
  } catch (error) {
    console.error('[admin-notifications] error:', error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
