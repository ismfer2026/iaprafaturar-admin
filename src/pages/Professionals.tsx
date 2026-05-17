import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, X, UserX } from 'lucide-react'

// Interfaces atualizadas para refletir o schema real do banco
interface Professional {
  id: string
  name: string
  business_name: string
  email: string
  phone_whatsapp: string
  profession_type: string
  created_at: string
  empresa_id?: string
  credit_wallets?: Array<{ wallet_type: string; balance: number; status: string }>
  assinatura?: {
    plano: string
    status_pagamento: string
    data_proximo_pagamento: string
  }
}

const planLabels: Record<string, string> = { 
  'Essencial': 'Essencial', 
  'Estratégico': 'Estratégico', 
  'Performance': 'Performance' 
}

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  ativo:     { bg: '#f0fdf4', color: '#16a34a', label: 'Ativo' },
  pendente:  { bg: '#fffbeb', color: '#d97706', label: 'Pendente' },
  cancelado: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelado' },
  inativo:   { bg: '#f1f5f9', color: '#64748b', label: 'Conta Inativa' }
}

function getSaldo(wallets: Array<{ wallet_type: string; balance: number; status: string }> | undefined) {
  return (wallets || [])
    .filter(w => w.status === 'active')
    .reduce((sum, w) => sum + (w.balance || 0), 0)
}

export function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [filtered, setFiltered] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<Professional | null>(null)

  useEffect(() => { fetchProfessionals() }, [])

  useEffect(() => {
    let list = professionals
    
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.email?.toLowerCase().includes(q) ||
        p.business_name?.toLowerCase().includes(q)
      )
    }
    
    if (filterPlan !== 'all') {
      list = list.filter(p => p.assinatura?.plano === filterPlan)
    }
    
    if (filterStatus !== 'all') {
      list = list.filter(p => p.assinatura?.status_pagamento === filterStatus)
    }
    
    setFiltered(list)
  }, [search, filterPlan, filterStatus, professionals])

  // 🆕 FUNÇÃO fetchProfessionals ATUALIZADA — JOIN direto com professional_subscriptions
  const fetchProfessionals = async () => {
    try {
      // No novo banco, fazemos um JOIN direto entre professionals e suas assinaturas! (Muito mais rápido e limpo)
      const { data: profs, error } = await supabase
        .from('professionals')
        .select(`
          id, name, business_name, email, phone_whatsapp, profession_type, created_at,
          professional_subscriptions ( plan_id, status, current_period_end, plans ( name, slug ) ),
          credit_wallets ( wallet_type, balance, status )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error;
      if (!profs) return;

      // Mapeia para o formato que a sua UI espera
      const combined = profs.map(p => {
        // Como é um left join no Supabase, ele pode retornar um array
        const sub = Array.isArray(p.professional_subscriptions) 
          ? p.professional_subscriptions[0] 
          : p.professional_subscriptions;

        // Traduz os status gringos do Stripe para a nossa interface
        let statusBR = 'inativo';
        if (sub?.status === 'active') statusBR = 'ativo';
        else if (sub?.status === 'trialing') statusBR = 'pendente'; // Você pode tratar trial como pendente ou criar um status novo
        else if (sub?.status === 'canceled') statusBR = 'cancelado';

        return {
          ...p,
          assinatura: sub ? {
            plano: (sub.plans as any)?.name || (sub.plans as any)?.slug || 'Gratuito',
            status_pagamento: statusBR,
            data_proximo_pagamento: sub.current_period_end
          } : undefined
        }
      })

      setProfessionals(combined)
      setFiltered(combined)
    } catch (e) {
      console.error('Erro ao buscar profissionais:', e)
    } finally {
      setLoading(false)
    }
  }


  const subStatus = (p: Professional) => {
    const s = p.assinatura?.status_pagamento
    return statusColors[s || 'inativo'] || statusColors['inativo']
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0D6E6E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Carregando profissionais e assinaturas...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Profissionais e Clínicas</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Gerencie as contas ativas, suspensões e assinaturas.</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, clínica ou e-mail..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtro plano */}
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">Todos os Planos</option>
          <option value="Essencial">Essencial</option>
          <option value="Estratégico">Estratégico</option>
          <option value="Performance">Performance</option>
        </select>

        {/* Filtro status */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">Todos os Status</option>
          <option value="ativo">Pagamento em dia</option>
          <option value="pendente">Pagamento pendente</option>
          <option value="cancelado">Assinatura cancelada</option>
          <option value="conta_ativa">App Ativo</option>
          <option value="conta_inativa">App Bloqueado</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Profissional / Clínica', 'Contato', 'Plano', 'Créditos IA', 'Status Financeiro', 'Ações'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                <UserX size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                <p>Nenhum profissional encontrado com os filtros atuais.</p>
              </td></tr>
            ) : filtered.map(p => {
              const st = subStatus(p)
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff', transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.business_name || 'Sem clínica'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#475569' }}>{p.email}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.phone_whatsapp || 'Sem número'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {p.assinatura ? (
                      <span style={{ background: '#e8f5f5', color: '#0D6E6E', fontWeight: 600, fontSize: 12, padding: '4px 10px', borderRadius: 6 }}>
                        {planLabels[p.assinatura.plano] || p.assinatura.plano}
                      </span>
                    ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>Gratuito / S/N</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: getSaldo(p.credit_wallets) > 0 ? '#0D6E6E' : '#94a3b8'
                    }}>
                      {getSaldo(p.credit_wallets).toLocaleString('pt-BR')}
                    </span>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>créditos</p>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: st.bg, color: st.color, fontWeight: 600, fontSize: 12, padding: '4px 10px', borderRadius: 6 }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => setSelected(p)}
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Ver Perfil
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal detalhes */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 500, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selected.name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{selected.business_name || 'Clínica não informada'}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label="E-mail de Login" value={selected.email} />
              <Row label="WhatsApp (CRM)" value={selected.phone_whatsapp || 'Não configurado'} />
              <Row label="Especialidade" value={selected.profession_type || 'Não informada'} />
              <Row label="Data de Cadastro" value={new Date(selected.created_at).toLocaleDateString('pt-BR')} />

              <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Dados Financeiros</p>
              {selected.assinatura ? <>
                <Row label="Plano Atual" value={planLabels[selected.assinatura.plano] || selected.assinatura.plano} />
                <Row label="Status da Fatura" value={statusColors[selected.assinatura.status_pagamento]?.label || selected.assinatura.status_pagamento} highlight={statusColors[selected.assinatura.status_pagamento]?.color} />
                {selected.assinatura.data_proximo_pagamento && <Row label="Próximo Vencimento" value={new Date(selected.assinatura.data_proximo_pagamento).toLocaleDateString('pt-BR')} />}
              </> : <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Este usuário não possui vínculo com nenhuma assinatura financeira no Stripe/Kiwify.</p>
              </div>}
              <Row label="Créditos IA Disponíveis" value={getSaldo(selected.credit_wallets).toLocaleString('pt-BR')} highlight={getSaldo(selected.credit_wallets) > 0 ? '#0D6E6E' : '#94a3b8'} />
            </div>

            <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
              <button onClick={() => setSelected(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', background: '#0D6E6E', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Fechar Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: highlight || '#0f172a' }}>{value}</span>
    </div>
  )
}