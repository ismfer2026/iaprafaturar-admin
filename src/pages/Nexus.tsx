import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Users, Bot, Send, RefreshCw, Phone } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useI18n } from '@/i18n'

interface Lead {
  id: string
  name: string
  phone_whatsapp: string
  status: string
  source: string
  created_at: string
}

export function NexusPage() {
  const { t } = useI18n()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Nexus Admin Orchestrator ativado. Pronto para gerenciar o ecossistema.' }
  ])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_leads')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setLeads(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || sending) return
    
    const userMsg = chatInput
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatInput('')
    setSending(true)

    try {
      const { data, error } = await supabase.functions.invoke('nexus-orchestrator', {
        body: { message: userMsg, admin_phone: 'ui-console' }
      })

      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Erro na resposta.' }])
    } catch (e) {
      toast.error('Erro ao falar com Nexus')
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: 'calc(100vh - 100px)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A2E', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={28} color="#0D6E6E" aria-hidden={true} />
            {t('nexus.title')}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>{t('nexus.subtitle')}</p>
        </div>
        <button 
          onClick={fetchLeads} 
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar Nexus
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* LADO ESQUERDO: GESTÃO DE LEADS */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="#0D6E6E" aria-hidden={true} />
              Pipeline de Vendas (Leads)
            </h2>
            <span style={{ fontSize: 12, fontWeight: 600, background: '#e8f5f5', color: '#0D6E6E', padding: '4px 10px', borderRadius: 20 }}>
              {leads.length} Leads Ativos
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leads.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Nenhum lead encontrado</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                  <tr>
                    <th scope="col" style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Lead</th>
                    <th scope="col" style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                    <th scope="col" style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Origem</th>
                    <th scope="col" style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{lead.name || 'Sem nome'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={10} aria-hidden={true} /> {lead.phone_whatsapp}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                          background: lead.status === 'novo' ? '#f0fdf4' : '#f1f5f9',
                          color: lead.status === 'novo' ? '#16a34a' : '#64748b'
                        }}>
                          {lead.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#64748b', fontSize: 13 }}>
                        {lead.source}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {/* TODO: Implementar visualização de fluxo do lead */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* LADO DIREITO: CONSOLE NEXUS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* DASHBOARD MINI */}
          <div style={{ background: '#0D6E6E', borderRadius: 16, padding: 24, color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Saúde do Sistema</h3>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Edge Functions</p>
                {/* TODO: Buscar dados dinamicamente do banco/API */}
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800 }}>-- Carregando</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>Erros (24h)</p>
                {/* TODO: Buscar dados dinamicamente do banco/API */}
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#4ade80' }}>-- Carregando</p>
              </div>
            </div>
          </div>

          {/* CHAT CONSOLE */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} color="#0D6E6E" aria-hidden={true} />
                Nexus Orchestrator
              </h3>
            </div>

            <div
              aria-live="polite"
              aria-label="Conversa com Nexus"
              style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? '#0D6E6E' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1A1A2E',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: 13,
                  lineHeight: 1.5
                }}>
                  {m.text}
                </div>
              ))}
              {sending && (
                <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '8px 12px', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div className="animate-bounce" style={{ width: 4, height: 4, background: '#94a3b8', borderRadius: '50%' }}></div>
                    <div className="animate-bounce" style={{ width: 4, height: 4, background: '#94a3b8', borderRadius: '50%', animationDelay: '0.2s' }}></div>
                    <div className="animate-bounce" style={{ width: 4, height: 4, background: '#94a3b8', borderRadius: '50%', animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Comando Nexus..."
                  style={{ flex: 1, padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending}
                  aria-label="Enviar mensagem"
                  style={{ background: '#0D6E6E', border: 'none', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                >
                  <Send size={18} aria-hidden={true} />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
