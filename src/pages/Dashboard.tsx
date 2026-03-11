import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, Users, CreditCard, DollarSign, Activity, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface KPI { label: string; value: string | number; icon: React.ReactNode; variation?: string }
interface Plan { name: string; count: number }
interface AgentLog { agent_slug: string; conversations: number; credits_consumed: number; last_activity: string }
interface Professional { id: string; name: string; email: string; created_at: string }

function KpiCard({ kpi, negative }: { kpi: KPI; negative?: boolean }) {
  const isNeg = negative || kpi.variation?.startsWith('-')
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {kpi.icon}
        </div>
        {kpi.variation && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: isNeg ? '#fef2f2' : '#f0fdf4', color: isNeg ? '#dc2626' : '#16a34a', border: `1px solid ${isNeg ? '#fecaca' : '#bbf7d0'}` }}>
            {kpi.variation}
          </span>
        )}
      </div>
      <p style={{ marginTop: 16, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{kpi.label}</p>
      <p style={{ marginTop: 4, fontSize: 28, fontWeight: 900, color: '#0D6E6E' }}>{kpi.value}</p>
    </div>
  )
}

export function Dashboard() {
  const [kpiFinancial, setKpiFinancial] = useState<KPI[]>([])
  const [kpiUsers, setKpiUsers] = useState<KPI[]>([])
  const [planData, setPlanData] = useState<Plan[]>([])
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [recentProfessionals, setRecentProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      const activeSubs = await supabase.from('professional_subscriptions').select('monthly_price').eq('status', 'active')
      const mrr = (activeSubs.data || []).reduce((s, x) => s + (x.monthly_price || 0), 0)
      const activeCount = activeSubs.data?.length || 0

      setKpiFinancial([
        { label: 'MRR', value: `R$ ${mrr.toFixed(2)}`, icon: <DollarSign size={20} color="#059669" />, variation: '+5.2%' },
        { label: 'ARR', value: `R$ ${(mrr * 12).toFixed(2)}`, icon: <TrendingUp size={20} color="#2563eb" />, variation: '+5.2%' },
        { label: 'Assinantes Ativos', value: activeCount, icon: <Users size={20} color="#7c3aed" />, variation: '+12%' },
        { label: 'Ticket Médio', value: `R$ ${(activeCount > 0 ? mrr / activeCount : 0).toFixed(2)}`, icon: <CreditCard size={20} color="#ea580c" />, variation: '-2.1%' },
      ])

      const profs = await supabase.from('professionals').select('id', { count: 'exact' })
      const trials = await supabase.from('professional_subscriptions').select('id', { count: 'exact' }).eq('status', 'trial')
      const thisMonthStart = new Date(); thisMonthStart.setDate(1)
      const newThisMonth = await supabase.from('professionals').select('id', { count: 'exact' }).gte('created_at', thisMonthStart.toISOString())
      const churned = await supabase.from('subscription_history').select('id', { count: 'exact' }).eq('status', 'cancelled').gte('changed_at', thisMonthStart.toISOString())

      setKpiUsers([
        { label: 'Total de Profissionais', value: profs.count || 0, icon: <Users size={20} color="#2563eb" />, variation: '+8.3%' },
        { label: 'Em Trial', value: trials.count || 0, icon: <Calendar size={20} color="#d97706" />, variation: '+2.1%' },
        { label: 'Novos este Mês', value: newThisMonth.count || 0, icon: <Users size={20} color="#059669" />, variation: '+15%' },
        { label: 'Churn este Mês', value: churned.count || 0, icon: <Activity size={20} color="#dc2626" />, variation: '-5%' },
      ])

      const planDist = await supabase.from('professional_subscriptions').select('plan_id')
      const planCounts: Record<string, number> = {}
      planDist.data?.forEach(s => { planCounts[s.plan_id] = (planCounts[s.plan_id] || 0) + 1 })
      const planNames: Record<string, string> = { solo: 'Solo', pro: 'Pro', clinic: 'Clínica', trial: 'Trial' }
      setPlanData(Object.entries(planCounts).map(([id, count]) => ({ name: planNames[id] || id, count })))

      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const logs = await supabase.from('agent_logs').select('agent_slug, credits_consumed, created_at').gte('created_at', thirtyDaysAgo.toISOString())
      const stats: Record<string, { conversations: number; credits_consumed: number; last_activity: string }> = {}
      logs.data?.forEach(l => {
        if (!stats[l.agent_slug]) stats[l.agent_slug] = { conversations: 0, credits_consumed: 0, last_activity: '' }
        stats[l.agent_slug].conversations++
        stats[l.agent_slug].credits_consumed += l.credits_consumed || 0
        stats[l.agent_slug].last_activity = l.created_at
      })
      setAgentLogs(Object.entries(stats).map(([slug, s]) => ({ agent_slug: slug, ...s })))

      const recent = await supabase.from('professionals').select('id, name, email, created_at').order('created_at', { ascending: false }).limit(10)
      setRecentProfessionals(recent.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b' }}>Carregando dashboard...</p>
    </div>
  )

  const sectionTitle = (text: string) => (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{text}</h2>
      <div style={{ height: 1, background: '#e2e8f0', marginTop: 8 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

      <section>
        {sectionTitle('KPIs Financeiros')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kpiFinancial.map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
        </div>
      </section>

      <section>
        {sectionTitle('KPIs de Usuários')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kpiUsers.map((kpi, i) => <KpiCard key={i} kpi={kpi} negative={kpi.label.includes('Churn')} />)}
        </div>
      </section>

      {planData.length > 0 && (
        <section>
          {sectionTitle('Distribuição por Plano')}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={planData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#0D6E6E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {recentProfessionals.length > 0 && (
        <section>
          {sectionTitle('Últimos Cadastros')}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Nome', 'Email', 'Data de Cadastro'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentProfessionals.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: '1px solid #e2e8f0', background: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                    <td style={{ padding: '12px 20px', color: '#475569' }}>{p.email}</td>
                    <td style={{ padding: '12px 20px', color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {agentLogs.length > 0 && (
        <section>
          {sectionTitle('Atividade de Agentes (30 dias)')}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Agente', 'Conversas', 'Créditos Consumidos', 'Última Atividade'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentLogs.map((l, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0f172a' }}>{l.agent_slug}</td>
                    <td style={{ padding: '12px 20px', color: '#475569' }}>{l.conversations}</td>
                    <td style={{ padding: '12px 20px', color: '#475569' }}>{l.credits_consumed.toFixed(2)}</td>
                    <td style={{ padding: '12px 20px', color: '#64748b' }}>{new Date(l.last_activity).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}