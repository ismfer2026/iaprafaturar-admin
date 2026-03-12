import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Bot, Activity, Zap, Clock, MessageSquare, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'

interface AgentStats {
  total_conversations: number
  total_credits: number
  last_activity: string | null
}

interface AgentConfig {
  id: string
  slug: string
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const ADMIN_AGENTS = [
  {
    slug: 'onboarding-agent',
    name: 'Agente de Onboarding',
    description: 'Recebe o profissional recém-cadastrado via WhatsApp e conduz uma conversa guiada para coletar todas as informações do perfil clínico: especialidade, horários de atendimento, serviços oferecidos, configurações iniciais e preferências do sistema.',
    icon: '🚀',
    color: '#0D6E6E',
    bg: '#f0fdfa',
    border: '#99f6e4',
    trigger: 'Disparado automaticamente após o cadastro do profissional',
    capabilities: [
      'Coleta nome completo, especialidade e CRM/registro',
      'Define horários de atendimento e dias da semana',
      'Cadastra os serviços oferecidos e valores',
      'Configura preferências de notificação',
      'Orienta sobre os próximos passos na plataforma',
    ],
  },
  {
    slug: 'configurador-agent',
    name: 'Agente Configurador',
    description: 'Auxilia o profissional a configurar e personalizar seus agentes de IA via conversa natural no WhatsApp. Permite ativar agentes, definir mensagens, ajustar comportamentos e entender como cada agente funciona, sem necessidade de acessar o painel.',
    icon: '⚙️',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    trigger: 'Acionado manualmente pelo profissional ou pelo Super Admin',
    capabilities: [
      'Ativa e desativa agentes individuais',
      'Personaliza mensagens e tom de comunicação',
      'Configura horários e regras de cada agente',
      'Explica funcionalidades em linguagem simples',
      'Aplica templates de configuração por especialidade',
    ],
  },
]

export function AgentsPage() {
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({})
  const [stats, setStats] = useState<Record<string, AgentStats>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Busca configs dos agentes admin na tabela professional_agents (professional_id = null = admin)
      const { data: agentData } = await supabase
        .from('professional_agents')
        .select('*')
        .in('agent_slug', ADMIN_AGENTS.map(a => a.slug))
        .is('professional_id', null)

      const configMap: Record<string, AgentConfig> = {}
      agentData?.forEach(a => { configMap[a.agent_slug] = a })
      setConfigs(configMap)

      // Busca logs dos últimos 30 dias
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: logs } = await supabase
        .from('agent_logs')
        .select('agent_slug, credits_consumed, created_at')
        .in('agent_slug', ADMIN_AGENTS.map(a => a.slug))
        .gte('created_at', thirtyDaysAgo.toISOString())

      const statsMap: Record<string, AgentStats> = {}
      logs?.forEach(l => {
        if (!statsMap[l.agent_slug]) statsMap[l.agent_slug] = { total_conversations: 0, total_credits: 0, last_activity: null }
        statsMap[l.agent_slug].total_conversations++
        statsMap[l.agent_slug].total_credits += l.credits_consumed || 0
        statsMap[l.agent_slug].last_activity = l.created_at
      })
      setStats(statsMap)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const toggleAgent = async (slug: string, current: boolean) => {
    setToggling(slug)
    try {
      const existing = configs[slug]
      if (existing) {
        await supabase.from('professional_agents').update({ is_active: !current }).eq('id', existing.id)
        setConfigs(prev => ({ ...prev, [slug]: { ...existing, is_active: !current } }))
      } else {
        const { data } = await supabase.from('professional_agents').insert({
          agent_slug: slug, is_active: !current, professional_id: null,
        }).select().single()
        if (data) setConfigs(prev => ({ ...prev, [slug]: data }))
      }
    } catch (e) { console.error(e) } finally { setToggling(null) }
  }

  const isActive = (slug: string) => configs[slug]?.is_active ?? true // padrão: ativo

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header info */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Bot size={20} color="#0D6E6E" />
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Agentes Exclusivos do Super Admin</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
            Estes agentes operam na camada da plataforma e não são visíveis para os profissionais. Novos agentes serão adicionados conforme a necessidade.
          </p>
        </div>
      </div>

      {/* Cards dos agentes */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Carregando agentes...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ADMIN_AGENTS.map(agent => {
            const active = isActive(agent.slug)
            const stat = stats[agent.slug]
            const isExpanded = expanded === agent.slug

            return (
              <div key={agent.slug} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isExpanded ? agent.border : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'border-color 0.2s' }}>

                {/* Cabeçalho do card */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>

                  {/* Ícone */}
                  <div style={{ background: agent.bg, border: `1px solid ${agent.border}`, borderRadius: 12, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {agent.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>{agent.name}</h3>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                        background: active ? '#f0fdf4' : '#f1f5f9',
                        color: active ? '#16a34a' : '#64748b',
                        border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}`,
                      }}>
                        {active ? '● Ativo' : '○ Inativo'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{agent.description}</p>
                  </div>

                  {/* Stats rápidos */}
                  <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', color: '#64748b', marginBottom: 2 }}>
                        <MessageSquare size={13} />
                        <span style={{ fontSize: 11 }}>Conversas (30d)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: agent.color }}>{stat?.total_conversations ?? 0}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', color: '#64748b', marginBottom: 2 }}>
                        <Zap size={13} />
                        <span style={{ fontSize: 11 }}>Créditos (30d)</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: agent.color }}>{(stat?.total_credits ?? 0).toFixed(0)}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', color: '#64748b', marginBottom: 2 }}>
                        <Clock size={13} />
                        <span style={{ fontSize: 11 }}>Última atividade</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        {stat?.last_activity ? new Date(stat.last_activity).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle + expandir */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 8 }}>
                    <button
                      onClick={() => toggleAgent(agent.slug, active)}
                      disabled={toggling === agent.slug}
                      title={active ? 'Desativar agente' : 'Ativar agente'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: toggling === agent.slug ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                    >
                      {active
                        ? <ToggleRight size={32} color="#0D6E6E" />
                        : <ToggleLeft size={32} color="#94a3b8" />}
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : agent.slug)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Painel expandido */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${agent.border}`, background: agent.bg, padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                      {/* Capacidades */}
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                          <Activity size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                          Capacidades
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {agent.capabilities.map(cap => (
                            <div key={cap} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ color: agent.color, marginTop: 1, flexShrink: 0 }}>✓</span>
                              <span style={{ fontSize: 13, color: '#475569' }}>{cap}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detalhes técnicos */}
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                          <Zap size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                          Informações Técnicas
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[
                            { label: 'Slug', value: agent.slug },
                            { label: 'Gatilho', value: agent.trigger },
                            { label: 'Status atual', value: active ? 'Ativo' : 'Inativo' },
                            { label: 'Última atualização', value: configs[agent.slug]?.updated_at ? new Date(configs[agent.slug].updated_at).toLocaleDateString('pt-BR') : '—' },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
                              <p style={{ fontSize: 13, color: '#0f172a', margin: 0 }}>{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Botão de ação */}
                        <button
                          onClick={() => toggleAgent(agent.slug, active)}
                          disabled={toggling === agent.slug}
                          style={{
                            marginTop: 20, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                            background: active ? '#fef2f2' : '#f0fdf4',
                            color: active ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {active ? 'Desativar este agente' : 'Ativar este agente'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Rodapé */}
      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>➕</span>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Novos agentes administrativos serão adicionados aqui conforme a plataforma evolui.</p>
      </div>
    </div>
  )
}