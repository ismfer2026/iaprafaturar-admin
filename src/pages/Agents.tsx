import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Zap, MessageSquare, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Sparkles, Wrench, Save, TerminalSquare,
  UserPlus, Bell, HeartHandshake, Star
} from 'lucide-react'
import { toast } from 'sonner' 

interface AgentStats {
  total_conversations: number
  total_credits: number
  last_activity: string | null
}

interface AgentConfig {
  id: string
  agent_slug: string
  is_active: boolean
  custom_instructions: string | null 
  updated_at: string
}

const ALL_AGENTS =[
  {
    slug: 'onboarding',
    type: 'platform',
    name: 'Agente de Onboarding (Nerissa)',
    description: 'Recebe o profissional e conduz a conversa guiada para configurar o CRM.',
    icon: <Sparkles size={24} color="#0D6E6E" />,
    color: '#0D6E6E', bg: '#f0fdfa', border: '#99f6e4',
  },
  {
    slug: 'cadastro',
    type: 'platform',
    name: 'Agente de Cadastro',
    description: 'Primeiro contato com novos pacientes que chegam pelo WhatsApp.',
    icon: <UserPlus size={24} color="#10b981" />,
    color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0',
  },
  {
    slug: 'agendamento',
    type: 'app',
    name: 'Agente de Agendamento',
    description: 'IA principal que atende pacientes, negocia horários e marca consultas.',
    icon: <MessageSquare size={24} color="#ea580c" />,
    color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',
  },
  {
    slug: 'lembrete',
    type: 'app',
    name: 'Agente de Lembretes',
    description: 'Envia confirmações e lida com respostas de pacientes sobre horários marcados.',
    icon: <Bell size={24} color="#6366f1" />,
    color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe',
  },
  {
    slug: 'pos_atendimento',
    type: 'app',
    name: 'Agente de Pós-Atendimento',
    description: 'Coleta feedbacks e garante a satisfação após o procedimento.',
    icon: <Star size={24} color="#f59e0b" />,
    color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7',
  },
  {
    slug: 'indicacao',
    type: 'app',
    name: 'Agente de Indicação',
    description: 'Estimula pacientes atuais a indicarem novos amigos para a clínica.',
    icon: <HeartHandshake size={24} color="#ec4899" />,
    color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8',
  },
  {
    slug: 'reativacao',
    type: 'app',
    name: 'Agente de Reativação',
    description: 'IA vendedora que busca clientes inativos para novos pacotes.',
    icon: <Zap size={24} color="#2563eb" />,
    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
  },
  {
    slug: 'configurador',
    type: 'platform',
    name: 'Agente Configurador',
    description: 'Permite ao dono da clínica alterar regras do sistema via chat.',
    icon: <Wrench size={24} color="#7c3aed" />,
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
  }
]

export function AgentsPage() {
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const[toggling, setToggling] = useState<string | null>(null)
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null)
  
  const [prompts, setPrompts] = useState<Record<string, string>>({})

  useEffect(() => { fetchData() },[])

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log('📊 [Agents] Iniciando fetchData...')

      // FATO 1: Agora buscamos as regras GLOBAIS (professional_id IS NULL)
      const { data: allAgents, error: agentError } = await supabase
        .from('professional_agents')
        .select('*')
        .filter('professional_id', 'is', null);

      if (agentError) {
        console.error('❌ Erro ao buscar professional_agents:', agentError)
        throw agentError;
      }

      // Filtra apenas os agentes que existem em ALL_AGENTS
      const agentData = allAgents?.filter(a =>
        ALL_AGENTS.some(agent => agent.slug === a.agent_slug)
      ) || [];

      console.log('✅ professional_agents carregado:', agentData.length, 'registros')

      const configMap: Record<string, AgentConfig> = {}
      const promptMap: Record<string, string> = {}

      ALL_AGENTS.forEach(a => {
        promptMap[a.slug] = '';
      });

      agentData?.forEach(a => {
        configMap[a.agent_slug] = a
        promptMap[a.agent_slug] = a.custom_instructions || ''
      })

      setConfigs(configMap)
      setPrompts(promptMap)

      // 3. Busca Estatísticas (Últimos 30 dias) - Para agentes globais
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs, error: logsError } = await supabase
        .from('agent_logs')
        .select('agent_slug, tokens_used, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1000);

      if (logsError) {
        console.warn('⚠️ Erro ao buscar agent_logs:', logsError)
      } else {
        console.log('✅ agent_logs carregado:', logs?.length || 0, 'registros')
      }

      const statsMap: Record<string, AgentStats> = {}
      logs?.forEach(l => {
        if (!statsMap[l.agent_slug]) statsMap[l.agent_slug] = { total_conversations: 0, total_credits: 0, last_activity: null }
        statsMap[l.agent_slug].total_conversations++
        statsMap[l.agent_slug].total_credits += (l.tokens_used / 100) || 0
        if (!statsMap[l.agent_slug].last_activity || new Date(l.created_at) > new Date(statsMap[l.agent_slug].last_activity!)) {
          statsMap[l.agent_slug].last_activity = l.created_at
        }
      })

      console.log('✅ Dados carregados com sucesso')

    } catch (e) {
      console.error('❌ Erro no fetchData:', e);
      toast.error("Erro ao sincronizar dados com o servidor.");
    } finally {
      setLoading(false)
    }
  }

  const toggleAgent = async (slug: string, current: boolean) => {
    setToggling(slug)
    try {
      const existing = configs[slug]
      const newState = !current

      if (existing) {
        await supabase.from('professional_agents').update({ is_active: newState, updated_at: new Date().toISOString() }).eq('id', existing.id)
        setConfigs(prev => ({ ...prev, [slug]: { ...existing, is_active: newState } }))
      } else {
        // FATO 2: Cria um registro global passando professional_id = null
        const { data } = await supabase.from('professional_agents').insert({
            agent_slug: slug, is_active: newState, professional_id: null, ai_provider: 'platform'
          }).select().single()
        if (data) setConfigs(prev => ({ ...prev, [slug]: data }))
      }
      toast.success(`${slug} ${newState ? 'ativado' : 'desativado'}`)
    } catch (e) {
      console.error('Erro ao alterar agente:', e)
      toast.error('Erro ao alterar status do agente')
    } finally { setToggling(null) }
  }

  const saveMasterPrompt = async (slug: string) => {
    setSavingPrompt(slug)
    const newPrompt = prompts[slug] || '';

    try {
      const existing = configs[slug]

      if (existing) {
        const { error } = await supabase
          .from('professional_agents')
          .update({ 
            custom_instructions: newPrompt, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // FATO 3: Salva o prompt mestre global passando professional_id = null
        const { data, error } = await supabase
          .from('professional_agents')
          .insert({
            agent_slug: slug,
            is_active: true,
            custom_instructions: newPrompt,
            professional_id: null,
            ai_provider: 'platform'
          })
          .select()
          .single()
        
        if (error) throw error;
        if (data) setConfigs(prev => ({ ...prev, [slug]: data }))
      }
      
      toast.success(`Prompt do ${slug} salvo com sucesso!`)
    } catch (e) { 
      console.error('Erro ao salvar prompt:', e)
      toast.error('Falha ao persistir no banco de dados.')
    } finally { 
      setSavingPrompt(null) 
    }
  }

  const isActive = (slug: string) => configs[slug]?.is_active ?? true 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Laboratório de Inteligência Artificial</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Configure o comportamento mestre (System Prompts) de todos os agentes da plataforma.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Sincronizando modelos de IA...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ALL_AGENTS.map(agent => {
            const active = isActive(agent.slug)
            const isExpanded = expanded === agent.slug

            return (
              <div key={agent.slug} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isExpanded ? agent.color : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s ease-in-out' }}>

                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ background: agent.bg, border: `1px solid ${agent.border}`, borderRadius: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {agent.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{agent.name}</h3>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: agent.type === 'platform' ? '#f1f5f9' : '#fdf4ff', color: agent.type === 'platform' ? '#475569' : '#c026d3', border: `1px solid ${agent.type === 'platform' ? '#e2e8f0' : '#fbcfe8'}` }}>
                        {agent.type === 'platform' ? 'USO INTERNO' : 'USO DA CLÍNICA'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>{agent.description}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <button onClick={() => setExpanded(isExpanded ? null : agent.slug)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${agent.border}`, background: agent.bg, padding: '24px 32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40 }}>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center' }}>
                            <TerminalSquare size={16} style={{ marginRight: 8 }} />
                            System Prompt Mestre
                          </p>
                          <button 
                            onClick={() => saveMasterPrompt(agent.slug)}
                            disabled={savingPrompt === agent.slug}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: agent.color, color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            <Save size={14} /> {savingPrompt === agent.slug ? 'Salvando...' : 'Salvar Prompt'}
                          </button>
                        </div>
                        
                        <p style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                          Escreva a instrução base. Variáveis como nome da clínica e serviços serão injetadas via RAG.
                        </p>

                        <textarea 
                          value={prompts[agent.slug] || ''}
                          onChange={(e) => setPrompts({...prompts,[agent.slug]: e.target.value})}
                          placeholder="Ex: Você é um assistente gentil. Sua missão é..."
                          style={{ width: '100%', height: '280px', padding: '16px', borderRadius: 8, border: `1px solid ${agent.border}`, background: '#fff', fontSize: 14, fontFamily: 'monospace', color: '#334155', resize: 'vertical', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: `1px solid ${agent.border}` }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 16px' }}>Controle de API</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>Habilitar Agente</p>
                              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Status global na plataforma</p>
                            </div>
                            <button
                              onClick={() => toggleAgent(agent.slug, active)}
                              disabled={toggling === agent.slug}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: toggling === agent.slug ? 0.5 : 1, padding: 0 }}
                            >
                              {active ? <ToggleRight size={40} color={agent.color} /> : <ToggleLeft size={40} color="#94a3b8" />}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}