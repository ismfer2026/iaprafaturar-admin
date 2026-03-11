import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp,
  Users,
  CreditCard,
  DollarSign,
  Activity,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface KPI {
  label: string
  value: string | number
  icon: React.ReactNode
  variation?: string
}

interface Plan {
  name: string
  count: number
}

interface AgentLog {
  agent_slug: string
  conversations: number
  credits_consumed: number
  last_activity: string
}

interface Professional {
  id: string
  name: string
  email: string
  created_at: string
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg md:text-xl font-bold text-[#1A1A2E]">
        {children}
      </h2>
      <div className="mt-3 h-px w-full bg-slate-200" />
    </div>
  )
}

export function Dashboard() {
  const [kpiFinancial, setKpiFinancial] = useState<KPI[]>([])
  const [kpiUsers, setKpiUsers] = useState<KPI[]>([])
  const [planData, setPlanData] = useState<Plan[]>([])
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [recentProfessionals, setRecentProfessionals] = useState<
    Professional[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      const activeSubscriptions = await supabase
        .from('professional_subscriptions')
        .select('monthly_price')
        .eq('status', 'active')

      const mrr = (activeSubscriptions.data || []).reduce(
        (sum, sub) => sum + (sub.monthly_price || 0),
        0,
      )
      const arr = mrr * 12
      const activeCount = activeSubscriptions.data?.length || 0
      const ticketMedio = activeCount > 0 ? mrr / activeCount : 0

      setKpiFinancial([
        {
          label: 'MRR',
          value: `R$ ${mrr.toFixed(2)}`,
          icon: <DollarSign className="text-emerald-600" size={22} />,
          variation: '+5.2%',
        },
        {
          label: 'ARR',
          value: `R$ ${arr.toFixed(2)}`,
          icon: <TrendingUp className="text-blue-600" size={22} />,
          variation: '+5.2%',
        },
        {
          label: 'Assinantes Ativos',
          value: activeCount,
          icon: <Users className="text-violet-600" size={22} />,
          variation: '+12%',
        },
        {
          label: 'Ticket Médio',
          value: `R$ ${ticketMedio.toFixed(2)}`,
          icon: <CreditCard className="text-orange-600" size={22} />,
          variation: '-2.1%',
        },
      ])

      const professionals = await supabase
        .from('professionals')
        .select('id, created_at', { count: 'exact' })

      const trials = await supabase
        .from('professional_subscriptions')
        .select('id', { count: 'exact' })
        .eq('status', 'trial')

      const thisMonth = new Date()
      thisMonth.setDate(1)
      const thisMonthStart = thisMonth.toISOString()

      const newThisMonth = await supabase
        .from('professionals')
        .select('id', { count: 'exact' })
        .gte('created_at', thisMonthStart)

      const churnedThisMonth = await supabase
        .from('subscription_history')
        .select('id', { count: 'exact' })
        .eq('status', 'cancelled')
        .gte('changed_at', thisMonthStart)

      setKpiUsers([
        {
          label: 'Total de Profissionais',
          value: professionals.count || 0,
          icon: <Users className="text-blue-600" size={22} />,
          variation: '+8.3%',
        },
        {
          label: 'Em Trial',
          value: trials.count || 0,
          icon: <Calendar className="text-amber-600" size={22} />,
          variation: '+2.1%',
        },
        {
          label: 'Novos este Mês',
          value: newThisMonth.count || 0,
          icon: <Users className="text-emerald-600" size={22} />,
          variation: '+15%',
        },
        {
          label: 'Churn este Mês',
          value: churnedThisMonth.count || 0,
          icon: <Activity className="text-red-600" size={22} />,
          variation: '-5%',
        },
      ])

      const planDistribution = await supabase
        .from('professional_subscriptions')
        .select('plan_id')

      const planCounts: { [key: string]: number } = {}
      planDistribution.data?.forEach((sub) => {
        planCounts[sub.plan_id] = (planCounts[sub.plan_id] || 0) + 1
      })

      const planNames: { [key: string]: string } = {
        solo: 'Solo',
        pro: 'Pro',
        clinic: 'Clínica',
        trial: 'Trial',
      }

      setPlanData(
        Object.entries(planCounts).map(([planId, count]) => ({
          name: planNames[planId] || planId,
          count,
        })),
      )

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoString = thirtyDaysAgo.toISOString()

      const agentLogsRes = await supabase
        .from('agent_logs')
        .select('agent_slug, credits_consumed, created_at')
        .gte('created_at', thirtyDaysAgoString)

      const agentStats: {
        [key: string]: {
          conversations: number
          credits_consumed: number
          last_activity: string
        }
      } = {}

      agentLogsRes.data?.forEach((log) => {
        if (!agentStats[log.agent_slug]) {
          agentStats[log.agent_slug] = {
            conversations: 0,
            credits_consumed: 0,
            last_activity: '',
          }
        }
        agentStats[log.agent_slug].conversations += 1
        agentStats[log.agent_slug].credits_consumed += log.credits_consumed || 0
        agentStats[log.agent_slug].last_activity = log.created_at
      })

      setAgentLogs(
        Object.entries(agentStats)
          .map(([slug, stats]) => ({ agent_slug: slug, ...stats }))
          .sort(
            (a, b) =>
              new Date(b.last_activity).getTime() -
              new Date(a.last_activity).getTime(),
          ),
      )

      const recentProfs = await supabase
        .from('professionals')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentProfessionals(recentProfs.data || [])
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-slate-600">Carregando dashboard...</p>
      </div>
    )
  }

  const KpiCard = ({
    kpi,
    negative,
  }: {
    kpi: KPI
    negative?: boolean
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
          {kpi.icon}
        </div>

        {kpi.variation ? (
          <span
            className={[
              'text-xs font-bold px-2 py-1 rounded-full',
              negative
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            ].join(' ')}
          >
            {kpi.variation}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {kpi.label}
      </p>
      <p className="mt-1 text-3xl font-black text-[#0D6E6E]">{kpi.value}</p>
    </div>
  )

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle>KPIs Financeiros</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiFinancial.map((kpi, idx) => (
            <KpiCard
              key={idx}
              kpi={kpi}
              negative={kpi.variation?.startsWith('-')}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>KPIs de Usuários</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiUsers.map((kpi, idx) => (
            <KpiCard
              key={idx}
              kpi={kpi}
              negative={
                kpi.label.includes('Churn') || kpi.variation?.startsWith('-')
              }
            />
          ))}
        </div>
      </section>

      {planData.length > 0 && (
        <section>
          <SectionTitle>Distribuição por Plano</SectionTitle>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={planData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#0D6E6E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {agentLogs.length > 0 && (
        <section>
          <SectionTitle>Atividade de Agentes (Últimos 30 dias)</SectionTitle>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left text-slate-700">
                  <th className="px-6 py-3 font-bold">Agente</th>
                  <th className="px-6 py-3 font-bold">Conversas</th>
                  <th className="px-6 py-3 font-bold">Créditos Consumidos</th>
                  <th className="px-6 py-3 font-bold">Última Atividade</th>
                </tr>
              </thead>
              <tbody>
                {agentLogs.map((log, idx) => (
                  <tr
                    key={idx}
                    className={[
                      'border-t border-slate-200',
                      idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white',
                    ].join(' ')}
                  >
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {log.agent_slug}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {log.conversations}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {log.credits_consumed.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(log.last_activity).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {recentProfessionals.length > 0 && (
        <section>
          <SectionTitle>Últimos Cadastros</SectionTitle>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left text-slate-700">
                  <th className="px-6 py-3 font-bold">Nome</th>
                  <th className="px-6 py-3 font-bold">Email</th>
                  <th className="px-6 py-3 font-bold">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {recentProfessionals.map((prof, idx) => (
                  <tr
                    key={prof.id}
                    className={[
                      'border-t border-slate-200',
                      idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white',
                    ].join(' ')}
                  >
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {prof.name}
                    </td>
                    <td className="px-6 py-3 text-slate-700">{prof.email}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(prof.created_at).toLocaleDateString('pt-BR')}
                    </td>
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