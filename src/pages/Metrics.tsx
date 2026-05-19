import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Bot, RefreshCw, Search, AlertTriangle, Zap, Clock, BarChart2, Heart } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useI18n } from '@/i18n'

type Period = '7' | '30' | '90' | '365'
type Tab = 'growth' | 'financial' | 'engagement' | 'agents' | 'health'

const PLAN_COLORS = ['#0D6E6E', '#7c3aed', '#d97706', '#64748b']

const STATUS_CONFIG_BASE = {
  healthy:  { color: '#16a34a', bg: '#f0fdf4', icon: '💚', border: '#bbf7d0' },
  at_risk:  { color: '#d97706', bg: '#fffbeb', icon: '⚠️', border: '#fde68a' },
  churning: { color: '#dc2626', bg: '#fef2f2', icon: '🔴', border: '#fecaca' },
  inactive: { color: '#64748b', bg: '#f8fafc', icon: '⚫', border: '#e2e8f0' },
  new:      { color: '#2563eb', bg: '#eff6ff', icon: '🆕', border: '#bfdbfe' },
}

const getStatusConfig = (t: any) => ({
  healthy:  { ...STATUS_CONFIG_BASE.healthy,  label: t('metrics.health_status_healthy') },
  at_risk:  { ...STATUS_CONFIG_BASE.at_risk,  label: t('metrics.health_status_at_risk') },
  churning: { ...STATUS_CONFIG_BASE.churning, label: t('metrics.health_status_churning') },
  inactive: { ...STATUS_CONFIG_BASE.inactive, label: t('metrics.health_status_inactive') },
  new:      { ...STATUS_CONFIG_BASE.new,      label: t('metrics.health_status_new') },
})

// ─── Sub-componentes ───────────────────────────────────────

function KPI({ label, value, sub, icon, color, bg, trend }: any) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ background: bg, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: trend >= 0 ? '#f0fdf4' : '#fef2f2', color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color, margin: '0 0 2px' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const size = 52; const r = 20; const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color }}>{score}</span>
    </div>
  )
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min((value / 25) * 100, 100)}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 24, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ─── Tipos ────────────────────────────────────────────────

interface MetricData {
  newProfessionals: number; newProfessionalsGrowth: number; trialConversionRate: number
  totalProfessionals: number; growthByMonth: any[]; mrr: number; arr: number
  churnRate: number; ltv: number; revenueByPlan: any[]; mrrHistory: any[]
  ambassadorRevenue: number; activeThisMonth: number; atRiskCount: number
  retentionRate: number; totalConversations: number; completionRate: number
  creditsByAgent: any[]; agentErrors: number; peakHours: any[]
}

interface HealthScore {
  id: string; professional_id: string; score: number
  score_frequency: number; score_depth: number; score_features: number; score_agents: number
  days_active_30d: number; sessions_30d: number; avg_session_minutes: number
  pages_visited_30d: number; unique_features_30d: number; agent_conversations_30d: number
  last_seen_at: string | null; days_since_last_login: number
  status: 'healthy' | 'at_risk' | 'churning' | 'inactive' | 'new'
  reactivation_triggered: boolean; updated_at: string
  professional?: { name: string; email: string }
}

// ─── Componente principal ─────────────────────────────────

export function MetricsPage() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('90')
  const [activeTab, setActiveTab] = useState<Tab>('growth')
  const [data, setData] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)

  // Health Score state
  const [healthScores, setHealthScores] = useState<HealthScore[]>([])
  const [healthFiltered, setHealthFiltered] = useState<HealthScore[]>([])
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthSearch, setHealthSearch] = useState('')
  const [healthFilterStatus, setHealthFilterStatus] = useState('all')
  const [healthSelected, setHealthSelected] = useState<HealthScore | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (isCurrent) await fetchMetrics()
    }
    load()
    return () => { isCurrent = false }
  }, [period])
  useEffect(() => { if (activeTab === 'health' && healthScores.length === 0) fetchHealthScores() }, [activeTab])

  useEffect(() => {
    let list = [...healthScores]
    if (healthSearch) list = list.filter(s =>
      s.professional?.name?.toLowerCase().includes(healthSearch.toLowerCase()) ||
      s.professional?.email?.toLowerCase().includes(healthSearch.toLowerCase())
    )
    if (healthFilterStatus !== 'all') list = list.filter(s => s.status === healthFilterStatus)
    setHealthFiltered(list)
  }, [healthSearch, healthFilterStatus, healthScores])

  const getPeriodStart = () => { const d = new Date(); d.setDate(d.getDate() - parseInt(period)); return d.toISOString() }

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const start = getPeriodStart()
      const prevStart = new Date(); prevStart.setDate(prevStart.getDate() - parseInt(period) * 2)

      const { count: newProfs } = await supabase.from('professionals').select('id', { count: 'exact' }).gte('created_at', start)
      const { count: prevProfs } = await supabase.from('professionals').select('id', { count: 'exact' }).gte('created_at', prevStart.toISOString()).lt('created_at', start)
      const { count: totalProfs } = await supabase.from('professionals').select('id', { count: 'exact' })
      const { count: trialsConverted } = await supabase.from('professional_subscriptions').select('id', { count: 'exact' }).eq('status', 'active').gte('created_at', start)
      const { count: trialsTotal } = await supabase.from('professional_subscriptions').select('id', { count: 'exact' }).gte('created_at', start)

      const growthByMonth: any[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        const { count: cads } = await supabase.from('professionals').select('id', { count: 'exact' }).gte('created_at', ms).lte('created_at', me)
        const { count: convs } = await supabase.from('professional_subscriptions').select('id', { count: 'exact' }).eq('status', 'active').gte('created_at', ms).lte('created_at', me)
        growthByMonth.push({ month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), cadastros: cads || 0, conversoes: convs || 0 })
      }

      const { data: activeSubs } = await supabase.from('professional_subscriptions').select('plan_id, plans ( price_monthly, slug )').eq('status', 'active')
      const mrr = (activeSubs || []).reduce((s, x) => s + ((x.plans as any)?.price_monthly || 0), 0)
      const { count: churnCount } = await supabase.from('subscription_history').select('id', { count: 'exact' }).eq('status', 'cancelled').gte('changed_at', start)
      const churnRate = totalProfs ? ((churnCount || 0) / (totalProfs || 1)) * 100 : 0
      const planCounts: Record<string, number> = {}
      activeSubs?.forEach(s => { const slug = (s.plans as any)?.slug || s.plan_id; planCounts[slug] = (planCounts[slug] || 0) + ((s.plans as any)?.price_monthly || 0) })
      const planNames: Record<string, string> = { solo: 'Solo', pro: 'Pro', clinic: 'Clínica', trial: 'Trial' }
      const { data: ambassadorSubs } = await supabase.from('professional_subscriptions').select('plans ( price_monthly )').eq('status', 'active').not('ambassador_id', 'is', null)

      const mrrHistory: any[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        const { data: monthSubs } = await supabase.from('professional_subscriptions').select('plans ( price_monthly )').eq('status', 'active').gte('created_at', monthStart).lte('created_at', monthEnd)
        const monthMRR = (monthSubs || []).reduce((s, x) => s + ((x.plans as any)?.price_monthly || 0), 0)
        mrrHistory.push({ month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), mrr: monthMRR })
      }

      const thisMonthStart = new Date(); thisMonthStart.setDate(1)
      const { count: activeMonth } = await supabase.from('professionals').select('id', { count: 'exact' }).gte('updated_at', thisMonthStart.toISOString())
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { count: atRisk } = await supabase.from('professionals').select('id', { count: 'exact' }).lt('updated_at', thirtyDaysAgo.toISOString())

      const { data: agentLogs } = await supabase.from('agent_logs').select('agent_slug, credits_consumed, created_at, status').gte('created_at', start)
      const agentStatsMap: Record<string, any> = {}
      let totalConvs = 0; let totalErrors = 0
      agentLogs?.forEach(l => {
        if (!agentStatsMap[l.agent_slug]) agentStatsMap[l.agent_slug] = { credits: 0, conversations: 0 }
        agentStatsMap[l.agent_slug].conversations++
        agentStatsMap[l.agent_slug].credits += l.credits_consumed || 0
        if (l.status === 'error') totalErrors++
        totalConvs++
      })
      const hourCounts: Record<number, number> = {}
      agentLogs?.forEach(l => { const h = new Date(l.created_at).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1 })

      setData({
        newProfessionals: newProfs || 0,
        newProfessionalsGrowth: prevProfs ? (((newProfs || 0) - (prevProfs || 0)) / (prevProfs || 1)) * 100 : 0,
        trialConversionRate: trialsTotal ? ((trialsConverted || 0) / (trialsTotal || 1)) * 100 : 0,
        totalProfessionals: totalProfs || 0, growthByMonth,
        mrr, arr: mrr * 12, churnRate, ltv: churnRate > 0 ? mrr / (churnRate / 100) : 0,
        revenueByPlan: Object.entries(planCounts).map(([k, v]) => ({ name: planNames[k] || k, value: v })),
        mrrHistory, ambassadorRevenue: (ambassadorSubs || []).reduce((s, x) => s + ((x.plans as any)?.price_monthly || 0), 0),
        activeThisMonth: activeMonth || 0, atRiskCount: atRisk || 0,
        retentionRate: totalProfs ? (((totalProfs || 0) - (churnCount || 0)) / (totalProfs || 1)) * 100 : 100,
        totalConversations: totalConvs, completionRate: totalConvs > 0 ? ((totalConvs - totalErrors) / totalConvs) * 100 : 0,
        creditsByAgent: Object.entries(agentStatsMap).map(([slug, s]) => ({ agent: slug.replace('-agent', ''), ...s })).sort((a: any, b: any) => b.conversations - a.conversations),
        agentErrors: totalErrors,
        peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: hourCounts[h] || 0 })).filter((h: any) => h.count > 0),
      })
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchHealthScores = async () => {
    setHealthLoading(true)
    try {
      const { data } = await supabase.from('professional_health_scores').select('*').order('score', { ascending: true })
      if (!data) return
      const ids = data.map(s => s.professional_id)
      const { data: profs } = await supabase.from('professionals').select('id, name, email').in('id', ids)
      const map: Record<string, any> = {}
      profs?.forEach(p => { map[p.id] = { name: p.name, email: p.email } })
      const enriched = data.map(s => ({ ...s, professional: map[s.professional_id] }))
      setHealthScores(enriched)
      setHealthFiltered(enriched)
    } catch (e) { console.error(e) } finally { setHealthLoading(false) }
  }

  const triggerReactivation = async (score: HealthScore) => {
    if (!window.confirm(t('metrics.confirm_reactivation', { name: score.professional?.name || 'este profissional' }))) {
      return
    }
    setTriggering(score.id)
    try {
      const { error: invokeError } = await supabase.functions.invoke('reativacao-agent', { body: { professional_id: score.professional_id, trigger: 'health_score', score: score.score } })
      if (invokeError) throw invokeError

      await supabase.from('professional_health_scores').update({ reactivation_triggered: true, reactivation_triggered_at: new Date().toISOString() }).eq('id', score.id)
      setHealthScores(prev => prev.map(s => s.id === score.id ? { ...s, reactivation_triggered: true } : s))
      if (healthSelected?.id === score.id) setHealthSelected({ ...healthSelected, reactivation_triggered: true })
    } catch (e) {
      console.error('Erro ao disparar reativação:', e)
    } finally { setTriggering(null) }
  }

  const recalculateAll = async () => {
    setRecalculating(true)
    try {
      const { data: profs } = await supabase.from('professionals').select('id').eq('status', 'ativo')
      if (profs) for (const p of profs) await supabase.rpc('calculate_health_score', { p_professional_id: p.id })
      await fetchHealthScores()
    } catch (e) { console.error(e) } finally { setRecalculating(false) }
  }

  const STATUS_CONFIG = getStatusConfig(t)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Controles de período */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['7', '30', '90', '365'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: period === p ? '#0D6E6E' : '#fff', color: period === p ? '#fff' : '#475569', border: `1px solid ${period === p ? '#0D6E6E' : '#e2e8f0'}` }}>
              {t(`metrics.period_${p as Period}`)}
            </button>
          ))}
        </div>
        <button onClick={fetchMetrics} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={14} /> {t('metrics.period_refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0' }}>
        {[
          { key: 'growth', color: '#0D6E6E' },
          { key: 'financial', color: '#7c3aed' },
          { key: 'engagement', color: '#d97706' },
          { key: 'agents', color: '#2563eb' },
          { key: 'health', color: '#dc2626' },
        ].map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key as Tab}
            aria-controls={`${tab.key}-panel`}
            onClick={() => setActiveTab(tab.key as Tab)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activeTab === tab.key as Tab ? tab.color : '#94a3b8',
              borderBottom: `2px solid ${activeTab === tab.key as Tab ? tab.color : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {t(`metrics.tab_${tab.key}`)}
          </button>
        ))}
      </div>

      {/* ── CRESCIMENTO ── */}
      {activeTab === 'growth' && (loading ? <div id="growth-panel" role="tabpanel" style={{ padding: 64, textAlign: 'center' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ display: 'flex', gap: 6 }}><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.2s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.4s' }} /></div><p style={{ color: '#94a3b8', margin: 0 }}>{t('metrics.syncing')}</p></div></div> : data && (
        <div id="growth-panel" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <KPI label={t('metrics.growth_new_professionals')} value={data.newProfessionals} icon={<Users size={18} color="#0D6E6E" />} color="#0D6E6E" bg="#f0fdfa" trend={data.newProfessionalsGrowth} sub={t('metrics.growth_new_sub')} />
            <KPI label={t('metrics.growth_total_professionals')} value={data.totalProfessionals} icon={<Users size={18} color="#2563eb" />} color="#2563eb" bg="#eff6ff" />
            <KPI label={t('metrics.growth_trial_conversion')} value={`${data.trialConversionRate.toFixed(1)}%`} icon={<TrendingUp size={18} color="#16a34a" />} color="#16a34a" bg="#f0fdf4" />
            <KPI label={t('metrics.growth_retention')} value={`${data.retentionRate.toFixed(1)}%`} icon={<Activity size={18} color="#d97706" />} color="#d97706" bg="#fffbeb" />
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 16px' }}>{t('metrics.growth_chart_title')}</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.growthByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
                <Bar dataKey="cadastros" name={t('metrics.growth_chart_signups')} fill="#0D6E6E" radius={[4,4,0,0]} />
                <Bar dataKey="conversoes" name={t('metrics.growth_chart_conversions')} fill="#99f6e4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      {/* ── FINANCEIRO ── */}
      {activeTab === 'financial' && (loading ? <div id="financial-panel" role="tabpanel" style={{ padding: 64, textAlign: 'center' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ display: 'flex', gap: 6 }}><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.2s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.4s' }} /></div><p style={{ color: '#94a3b8', margin: 0 }}>{t('metrics.syncing')}</p></div></div> : data && (
        <div id="financial-panel" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <KPI label={t('metrics.financial_mrr')} value={`R$ ${data.mrr.toFixed(0)}`} icon={<DollarSign size={18} color="#7c3aed" />} color="#7c3aed" bg="#f5f3ff" />
            <KPI label={t('metrics.financial_arr')} value={`R$ ${data.arr.toFixed(0)}`} icon={<TrendingUp size={18} color="#0D6E6E" />} color="#0D6E6E" bg="#f0fdfa" />
            <KPI label={t('metrics.financial_churn')} value={`${data.churnRate.toFixed(2)}%`} icon={<TrendingDown size={18} color="#dc2626" />} color="#dc2626" bg="#fef2f2" sub={t('metrics.financial_churn_sub')} />
            <KPI label={t('metrics.financial_ltv')} value={`R$ ${data.ltv.toFixed(0)}`} icon={<DollarSign size={18} color="#d97706" />} color="#d97706" bg="#fffbeb" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 16px' }}>{t('metrics.financial_mrr_evolution')}</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.mrrHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v.toFixed(0)}`} /><Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                  <Line type="monotone" dataKey="mrr" name="MRR" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 16px' }}>{t('metrics.financial_revenue_by_plan')}</p>
              {data.revenueByPlan.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>{t('metrics.financial_no_data')}</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.revenueByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {data.revenueByPlan.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div style={{ marginTop: 12, background: '#f0fdf4', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>{t('metrics.financial_ambassador_revenue')}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', margin: 0 }}>R$ {data.ambassadorRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ── ENGAJAMENTO ── */}
      {activeTab === 'engagement' && (loading ? <div id="engagement-panel" role="tabpanel" style={{ padding: 64, textAlign: 'center' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ display: 'flex', gap: 6 }}><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.2s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.4s' }} /></div><p style={{ color: '#94a3b8', margin: 0 }}>{t('metrics.syncing')}</p></div></div> : data && (
        <div id="engagement-panel" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <KPI label="Ativos este Mês" value={data.activeThisMonth} icon={<Activity size={18} color="#16a34a" />} color="#16a34a" bg="#f0fdf4" />
            <KPI label="Em Risco de Churn" value={data.atRiskCount} icon={<TrendingDown size={18} color="#dc2626" />} color="#dc2626" bg="#fef2f2" sub="inativos há 30+ dias" />
            <KPI label="Taxa de Retenção" value={`${data.retentionRate.toFixed(1)}%`} icon={<Users size={18} color="#0D6E6E" />} color="#0D6E6E" bg="#f0fdfa" />
            <KPI label="Total na Plataforma" value={data.totalProfessionals} icon={<Users size={18} color="#7c3aed" />} color="#7c3aed" bg="#f5f3ff" />
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 20px' }}>Saúde da Base de Profissionais</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Ativos', value: data.activeThisMonth, total: data.totalProfessionals, color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Em Risco', value: data.atRiskCount, total: data.totalProfessionals, color: '#dc2626', bg: '#fef2f2' },
                { label: 'Inativos', value: Math.max(0, data.totalProfessionals - data.activeThisMonth - data.atRiskCount), total: data.totalProfessionals, color: '#64748b', bg: '#f8fafc' },
              ].map(({ label, value, total, color, bg }) => {
                const pct = total > 0 ? (value / total) * 100 : 0
                return (
                  <div key={label} style={{ flex: 1, background: bg, borderRadius: 10, padding: '16px 20px' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
                    <p style={{ fontSize: 28, fontWeight: 900, color, margin: '0 0 8px' }}>{value}</p>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{pct.toFixed(1)}% do total</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* ── AGENTES IA ── */}
      {activeTab === 'agents' && (loading ? <div id="agents-panel" role="tabpanel" style={{ padding: 64, textAlign: 'center' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ display: 'flex', gap: 6 }}><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.2s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.4s' }} /></div><p style={{ color: '#94a3b8', margin: 0 }}>{t('metrics.syncing')}</p></div></div> : data && (
        <div id="agents-panel" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <KPI label="Total de Conversas" value={data.totalConversations} icon={<Bot size={18} color="#2563eb" />} color="#2563eb" bg="#eff6ff" />
            <KPI label="Taxa de Conclusão" value={`${data.completionRate.toFixed(1)}%`} icon={<Activity size={18} color="#16a34a" />} color="#16a34a" bg="#f0fdf4" />
            <KPI label="Total de Erros" value={data.agentErrors} icon={<TrendingDown size={18} color="#dc2626" />} color="#dc2626" bg="#fef2f2" />
            <KPI label="Agentes Ativos" value={data.creditsByAgent.length} icon={<Bot size={18} color="#0D6E6E" />} color="#0D6E6E" bg="#f0fdfa" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 16px' }}>Uso por Agente</p>
              {data.creditsByAgent.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Sem dados no período</p> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.creditsByAgent} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis type="number" tick={{ fontSize: 12 }} /><YAxis dataKey="agent" type="category" width={110} tick={{ fontSize: 12 }} /><Tooltip />
                    <Bar dataKey="conversations" name="Conversas" fill="#2563eb" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: '0 0 16px' }}>Horários de Pico</p>
              {data.peakHours.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Sem dados no período</p> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="hour" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
                    <Bar dataKey="count" name="Conversas" fill="#0D6E6E" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {data.creditsByAgent.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Agente', 'Conversas', 'Créditos Consumidos', 'Créditos / Conversa'].map(h => <th key={h} scope="col" style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.creditsByAgent.map((a: any, i: number) => (
                    <tr key={a.agent} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0f172a' }}>{a.agent}</td>
                      <td style={{ padding: '12px 20px', color: '#475569' }}>{a.conversations}</td>
                      <td style={{ padding: '12px 20px', color: '#475569' }}>{a.credits.toFixed(2)}</td>
                      <td style={{ padding: '12px 20px', color: '#0D6E6E', fontWeight: 700 }}>{a.conversations > 0 ? (a.credits / a.conversations).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* ── SAÚDE DOS USUÁRIOS ── */}
      {activeTab === 'health' && (
        <div id="health-panel" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPIs saúde */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {[
              { label: 'Score Médio', value: healthScores.length ? Math.round(healthScores.reduce((s, x) => s + x.score, 0) / healthScores.length) : 0, color: '#0D6E6E', bg: '#f0fdfa', icon: <BarChart2 size={16} color="#0D6E6E" /> },
              { label: '💚 Saudáveis',  value: healthScores.filter(s => s.status === 'healthy').length,  color: '#16a34a', bg: '#f0fdf4', icon: null },
              { label: '⚠️ Em Risco',   value: healthScores.filter(s => s.status === 'at_risk').length,  color: '#d97706', bg: '#fffbeb', icon: null },
              { label: '🔴 Churnando',  value: healthScores.filter(s => s.status === 'churning').length, color: '#dc2626', bg: '#fef2f2', icon: null },
              { label: '⚫ Inativos',   value: healthScores.filter(s => s.status === 'inactive').length,  color: '#64748b', bg: '#f8fafc', icon: null },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                {icon && <div style={{ background: bg, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>}
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Explicação */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px' }}>📊 Como o Health Score é calculado (0–100)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12, color: '#475569' }}>
              <div><strong style={{ color: '#0D6E6E' }}>Frequência (25pts)</strong><br />Dias ativos nos últimos 30 dias</div>
              <div><strong style={{ color: '#7c3aed' }}>Profundidade (25pts)</strong><br />Diversidade de páginas visitadas</div>
              <div><strong style={{ color: '#d97706' }}>Funcionalidades (25pts)</strong><br />Uso de recursos-chave do sistema</div>
              <div><strong style={{ color: '#2563eb' }}>Agentes IA (25pts)</strong><br />Engajamento com agentes de automação</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={healthSearch} onChange={e => setHealthSearch(e.target.value)} placeholder={t('metrics.health_search_placeholder')}
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
            </div>
            <select value={healthFilterStatus} onChange={e => setHealthFilterStatus(e.target.value)}
              style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', cursor: 'pointer' }}>
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([key, s]) => <option key={key} value={key}>{s.icon} {s.label}</option>)}
            </select>
            <button onClick={recalculateAll} disabled={recalculating}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: recalculating ? 'not-allowed' : 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', opacity: recalculating ? 0.6 : 1 }}>
              <Zap size={14} /> {recalculating ? 'Recalculando...' : 'Recalcular tudo'}
            </button>
            <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{healthFiltered.length} profissional(is)</span>
          </div>

          {/* Tabela health */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {healthLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ display: 'flex', gap: 6 }}><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.2s' }} /><div className="animate-pulse" style={{ width: 12, height: 12, background: '#d1d5db', borderRadius: '50%', animationDelay: '0.4s' }} /></div><p style={{ color: '#94a3b8', margin: 0 }}>{t('metrics.loading_scores')}</p></div></div>
            ) : healthFiltered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Sem dados. Execute o schema de tracking e aguarde os primeiros acessos.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Score', 'Profissional', 'Status', 'Dias Ativos', 'Sessões', 'Tempo Médio', 'Último Acesso', 'Ação'].map(h => (
                    <th key={h} scope="col" style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {healthFiltered.map((s, i) => {
                    const st = STATUS_CONFIG[s.status]
                    const isOpen = healthSelected?.id === s.id
                    return (
                      <>
                        <tr key={s.id} onClick={() => setHealthSelected(isOpen ? null : s)}
                          style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', background: isOpen ? '#f8fffe' : i % 2 === 1 ? '#fafafa' : '#fff', cursor: 'pointer' }}>
                          <td style={{ padding: '12px 16px' }}><ScoreRing score={s.score} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{s.professional?.name ?? '—'}</p>
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{s.professional?.email ?? '—'}</p>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${st.border}` }}>{st.icon} {st.label}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{s.days_active_30d}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{s.sessions_30d}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{s.avg_session_minutes > 0 ? `${Number(s.avg_session_minutes).toFixed(0)} min` : '—'}</td>
                          <td style={{ padding: '12px 16px', color: s.days_since_last_login > 14 ? '#dc2626' : '#475569', fontWeight: s.days_since_last_login > 14 ? 600 : 400 }}>
                            {s.last_seen_at ? `${s.days_since_last_login}d atrás` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                            {(s.status === 'at_risk' || s.status === 'churning' || s.status === 'inactive') && (
                              <button onClick={() => triggerReactivation(s)} disabled={!!s.reactivation_triggered || triggering === s.id}
                                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: s.reactivation_triggered ? 'default' : 'pointer', border: 'none', background: s.reactivation_triggered ? '#f1f5f9' : '#fef2f2', color: s.reactivation_triggered ? '#94a3b8' : '#dc2626', opacity: triggering === s.id ? 0.5 : 1 }}>
                                {s.reactivation_triggered ? '✓ Enviado' : '🔁 Reativar'}
                              </button>
                            )}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${s.id}-detail`}>
                            <td colSpan={8} style={{ background: '#f8fffe', padding: '20px 24px', borderTop: '1px solid #d1fae5' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0D6E6E', textTransform: 'uppercase', margin: '0 0 14px' }}>Breakdown do Score</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[
                                      { label: 'Frequência de login', value: s.score_frequency, color: '#0D6E6E' },
                                      { label: 'Profundidade de uso', value: s.score_depth, color: '#7c3aed' },
                                      { label: 'Funcionalidades usadas', value: s.score_features, color: '#d97706' },
                                      { label: 'Engajamento com agentes', value: s.score_agents, color: '#2563eb' },
                                    ].map(({ label, value, color }) => (
                                      <div key={label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                          <span style={{ fontSize: 12, color: '#475569' }}>{label}</span>
                                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}/25</span>
                                        </div>
                                        <ScoreBar value={value} color={color} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0D6E6E', textTransform: 'uppercase', margin: '0 0 14px' }}>Dados dos Últimos 30 Dias</p>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                      { label: 'Dias ativos', value: s.days_active_30d, icon: <Clock size={13} color="#0D6E6E" /> },
                                      { label: 'Sessões totais', value: s.sessions_30d, icon: <BarChart2 size={13} color="#7c3aed" /> },
                                      { label: 'Tempo médio/sessão', value: s.avg_session_minutes > 0 ? `${Number(s.avg_session_minutes).toFixed(1)} min` : '—', icon: <Clock size={13} color="#d97706" /> },
                                      { label: 'Páginas visitadas', value: s.pages_visited_30d, icon: <BarChart2 size={13} color="#2563eb" /> },
                                      { label: 'Funcionalidades únicas', value: s.unique_features_30d, icon: <Zap size={13} color="#d97706" /> },
                                      { label: 'Conversas com agentes', value: s.agent_conversations_30d, icon: <Heart size={13} color="#dc2626" /> },
                                    ].map(({ label, value, icon }) => (
                                      <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>{icon}<span style={{ fontSize: 11, color: '#64748b' }}>{label}</span></div>
                                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{value}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {s.status !== 'healthy' && (
                                    <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
                                      <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
                                        <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Recomendação
                                      </p>
                                      <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>
                                        {s.score_frequency < 10 && 'Baixa frequência de acesso. '}
                                        {s.score_features < 10 && 'Não está usando as funcionalidades principais. '}
                                        {s.score_agents < 5 && 'Não está engajando com agentes de IA. '}
                                        {s.days_since_last_login > 14 && `Sem login há ${s.days_since_last_login} dias. `}
                                        {!s.reactivation_triggered ? 'Considere acionar o Agente de Reativação.' : 'Agente de reativação já foi acionado.'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}