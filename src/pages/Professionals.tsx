import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, X } from 'lucide-react'

interface Professional {
  id: string
  name: string
  email: string
  phone?: string
  specialty?: string
  is_active: boolean
  created_at: string
  subscription?: {
    plan_id: string
    status: string
    monthly_price: number
    started_at: string
    expires_at?: string
  }
}

const planLabels: Record<string, string> = { solo: 'Solo', pro: 'Pro', clinic: 'Clínica', trial: 'Trial' }
const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: '#f0fdf4', color: '#16a34a', label: 'Ativo' },
  trial:    { bg: '#fffbeb', color: '#d97706', label: 'Trial' },
  inactive: { bg: '#f1f5f9', color: '#64748b', label: 'Inativo' },
  cancelled:{ bg: '#fef2f2', color: '#dc2626', label: 'Cancelado' },
  past_due: { bg: '#fff7ed', color: '#ea580c', label: 'Inadimplente' },
}

export function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [filtered, setFiltered] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<Professional | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { fetchProfessionals() }, [])

  useEffect(() => {
    let list = professionals
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
    }
    if (filterPlan !== 'all') list = list.filter(p => p.subscription?.plan_id === filterPlan)
    if (filterStatus !== 'all') {
      if (filterStatus === 'active_account') list = list.filter(p => p.is_active)
      else if (filterStatus === 'inactive_account') list = list.filter(p => !p.is_active)
      else list = list.filter(p => p.subscription?.status === filterStatus)
    }
    setFiltered(list)
  }, [search, filterPlan, filterStatus, professionals])

  const fetchProfessionals = async () => {
    try {
      const { data: profs } = await supabase
        .from('professionals')
        .select('id, name, email, phone, specialty, is_active, created_at')
        .order('created_at', { ascending: false })

      if (!profs) return

      const ids = profs.map(p => p.id)
      const { data: subs } = await supabase
        .from('professional_subscriptions')
        .select('professional_id, plan_id, status, monthly_price, started_at, expires_at')
        .in('professional_id', ids)

      const subsMap = new Map(subs?.map(s => [s.professional_id, s]) || [])

      const combined = profs.map(p => ({
        ...p,
        subscription: subsMap.get(p.id),
      }))

      setProfessionals(combined)
      setFiltered(combined)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (prof: Professional) => {
    setToggling(prof.id)
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_active: !prof.is_active })
        .eq('id', prof.id)

      if (!error) {
        setProfessionals(prev => prev.map(p => p.id === prof.id ? { ...p, is_active: !p.is_active } : p))
        if (selected?.id === prof.id) setSelected(prev => prev ? { ...prev, is_active: !prev.is_active } : null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(null)
    }
  }

  const subStatus = (p: Professional) => {
    const s = p.subscription?.status
    if (!p.is_active) return statusColors['inactive']
    return statusColors[s || 'inactive'] || statusColors['inactive']
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b' }}>Carregando profissionais...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtro plano */}
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}>
          <option value="all">Todos os planos</option>
          <option value="trial">Trial</option>
          <option value="solo">Solo</option>
          <option value="pro">Pro</option>
          <option value="clinic">Clínica</option>
        </select>

        {/* Filtro status */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}>
          <option value="all">Todos os status</option>
          <option value="active">Assinatura ativa</option>
          <option value="trial">Em trial</option>
          <option value="cancelled">Cancelado</option>
          <option value="past_due">Inadimplente</option>
          <option value="active_account">Conta ativa</option>
          <option value="inactive_account">Conta inativa</option>
        </select>

        <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Nome', 'Email', 'Plano', 'Status', 'Cadastro', 'Conta', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nenhum profissional encontrado.</td></tr>
            ) : filtered.map((p, i) => {
              const st = subStatus(p)
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{p.name || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{p.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.subscription ? (
                      <span style={{ background: '#e8f5f5', color: '#0D6E6E', fontWeight: 600, fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                        {planLabels[p.subscription.plan_id] || p.subscription.plan_id}
                      </span>
                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: st.bg, color: st.color, fontWeight: 600, fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleActive(p)} disabled={toggling === p.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: toggling === p.id ? 0.5 : 1 }}>
                      {p.is_active
                        ? <ToggleRight size={24} color="#0D6E6E" />
                        : <ToggleLeft size={24} color="#94a3b8" />}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setSelected(p)}
                      style={{ background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Ver detalhes
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selected.name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row label="Telefone" value={selected.phone || '—'} />
              <Row label="Especialidade" value={selected.specialty || '—'} />
              <Row label="Cadastro" value={new Date(selected.created_at).toLocaleDateString('pt-BR')} />
              <Row label="Conta ativa" value={selected.is_active ? 'Sim' : 'Não'} highlight={selected.is_active ? '#16a34a' : '#dc2626'} />

              {selected.subscription && <>
                <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>Assinatura</p>
                <Row label="Plano" value={planLabels[selected.subscription.plan_id] || selected.subscription.plan_id} />
                <Row label="Status" value={statusColors[selected.subscription.status]?.label || selected.subscription.status} highlight={statusColors[selected.subscription.status]?.color} />
                <Row label="Valor mensal" value={`R$ ${selected.subscription.monthly_price?.toFixed(2) || '0.00'}`} />
                <Row label="Início" value={new Date(selected.subscription.started_at).toLocaleDateString('pt-BR')} />
                {selected.subscription.expires_at && <Row label="Expira em" value={new Date(selected.subscription.expires_at).toLocaleDateString('pt-BR')} />}
              </>}
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button onClick={() => { toggleActive(selected); setSelected(null) }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                {selected.is_active ? 'Desativar conta' : 'Ativar conta'}
              </button>
              <button onClick={() => setSelected(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#0D6E6E', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Fechar
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: highlight || '#0f172a' }}>{value}</span>
    </div>
  )
}