import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, Users, CreditCard, DollarSign, Activity, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  plan?: string
  status?: string
}

export function Dashboard() {
  const [kpiFinancial, setKpiFinancial] = useState<KPI[]>([])
  const [kpiUsers, setKpiUsers] = useState<KPI[]>([])
  const [planData, setPlanData] = useState<Plan[]>([])
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [recentProfessionals, setRecentProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Buscar KPIs Financeiros
      const activeSubscriptions = await supabase
        .from('professional_subscriptions')
        .select('monthly_price')
        .eq('status', 'active')

      const mrr = (activeSubscriptions.data || []).reduce((sum, sub) => sum + (sub.monthly_price || 0), 0)
      const arr = mrr * 12
      const activeCount = activeSubscriptions.data?.length || 0
      const ticketMedio = activeCount > 0 ? mrr / activeCount : 0

      setKpiFinancial([
        {
          label: 'MRR',
          value: `R$ ${mrr.toFixed(2)}`,
          icon: <DollarSign className="text-green-600" size={24} />,
          variation: '+5.2%',
        },
        {
          label: 'ARR',
          value: `R$ ${arr.toFixed(2)}`,
          icon: <TrendingUp className="text-blue-600" size={24} />,
          variation: '+5.2%',
        },
        {
          label: 'Assinantes Ativos',
          value: activeCount,
          icon: <Users className="text-purple-600" size={24} />,
          variation: '+12%',
        },
        {
          label: 'Ticket Médio',
          value: `R$ ${ticketMedio.toFixed(2)}`,
          icon: <CreditCard className="text-orange-600" size={24} />,
          variation: '-2.1%',
        },
      ])

      // Buscar KPIs de Usuários
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
          icon: <Users className="text-blue-600" size={24} />,
          variation: '+8.3%',
        },
        {
          label: 'Em Trial',
          value: trials.count || 0,
          icon: <Calendar className="text-yellow-600" size={24} />,
          variation: '+2.1%',
        },
        {
          label: 'Novos este Mês',
          value: newThisMonth.count || 0,
          icon: <Users className="text-green-600" size={24} />,
          variation: '+15%',
        },
        {
          label: 'Churn este Mês',
          value: churnedThisMonth.count || 0,
          icon: <Activity className="text-red-600" size={24} />,
          variation: '-5%',
        },
      ])

      // Buscar Distribuição por Plano
      const planDistribution = await supabase
        .from('professional_subscriptions')
        .select('plan_id')

      const planCounts: { [key: string]: number } = {}
      planDistribution.data?.forEach((sub) => {
        planCounts[sub.plan_id] = (planCounts[sub.plan_id] || 0) + 1
      })

      const planNames: { [key: string]: string } = {
        'solo': 'Solo',
        'pro': 'Pro',
        'clinic': 'Clínica',
        'trial': 'Trial',
      }

      const formattedPlanData = Object.entries(planCounts).map(([planId, count]) => ({
        name: planNames[planId] || planId,
        count,
      }))

      setPlanData(formattedPlanData)

      // Buscar Atividade de Agentes
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoString = thirtyDaysAgo.toISOString()

      const agentLogs = await supabase
        .from('agent_logs')
        .select('agent_slug, credits_consumed, created_at')
        .gte('created_at', thirtyDaysAgoString)

      const agentStats: { [key: string]: { conversations: number; credits_consumed: number; last_activity: string } } = {}

      agentLogs.data?.forEach((log) => {
        if (!agentStats[log.agent_slug]) {
          agentStats[log.agent_slug] = { conversations: 0, credits_consumed: 0, last_activity: '' }
        }
        agentStats[log.agent_slug].conversations += 1
        agentStats[log.agent_slug].credits_consumed += log.credits_consumed || 0
        agentStats[log.agent_slug].last_activity = log.created_at
      })

      const formattedAgentLogs = Object.entries(agentStats)
        .map(([slug, stats]) => ({
          agent_slug: slug,
          ...stats,
        }))
        .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())

      setAgentLogs(formattedAgentLogs)

      // Buscar Últimos Cadastros
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
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs Financeiros */}
      <section>
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1A1A2E' }}>
          KPIs Financeiros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiFinancial.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>{kpi.icon}</div>
                <span className="text-sm font-semibold text-green-600">{kpi.variation}</span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: '#0D6E6E' }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* KPIs de Usuários */}
      <section>
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1A1A2E' }}>
          KPIs de Usuários
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiUsers.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>{kpi.icon}</div>
                <span className={`text-sm font-semibold ${kpi.label.includes('Churn') ? 'text-red-600' : 'text-green-600'}`}>
                  {kpi.variation}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: '#0D6E6E' }}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Distribuição por Plano */}
      {planData.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1A1A2E' }}>
            Distribuição por Plano
          </h2>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <ResponsiveContainer width="100%" height={300}>
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

      {/* Atividade de Agentes */}
      {agentLogs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1A1A2E' }}>
            Atividade de Agentes (Últimos 30 dias)
          </h2>
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full">
              <thead style={{ backgroundColor: '#0D6E6E' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-white font-semibold">Agente</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Conversas</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Créditos Consumidos</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Última Atividade</th>
                </tr>
              </thead>
              <tbody>
                {agentLogs.map((log, idx) => (
                  <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{log.agent_slug}</td>
                    <td className="px-6 py-3">{log.conversations}</td>
                    <td className="px-6 py-3">{log.credits_consumed.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(log.last_activity).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Últimos Cadastros */}
      {recentProfessionals.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1A1A2E' }}>
            Últimos Cadastros
          </h2>
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full">
              <thead style={{ backgroundColor: '#0D6E6E' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-white font-semibold">Nome</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Email</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {recentProfessionals.map((prof) => (
                  <tr key={prof.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{prof.name}</td>
                    <td className="px-6 py-3 text-gray-600">{prof.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
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
