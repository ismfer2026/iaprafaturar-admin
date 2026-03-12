import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, ChevronDown, ChevronUp, CheckCircle, XCircle, Trophy, Users, DollarSign, TrendingUp } from 'lucide-react'

interface Ambassador {
  id: string
  professional_id: string
  referral_code: string
  status: 'pending' | 'active' | 'suspended'
  total_referrals: number
  active_referrals: number
  discount_percentage: number
  pix_key?: string
  balance_to_pay: number
  total_paid: number
  badge: string
  created_at: string
  professional?: { name: string; email: string }
}

interface Referral {
  id: string
  referred_professional_id: string
  status: string
  discount_months_remaining: number
  created_at: string
  referred?: { name: string; email: string }
}

const badgeInfo: Record<string, { label: string; emoji: string; color: string; bg: string; min: number }> = {
  semeador:       { label: 'Semeador',         emoji: '🌱', color: '#15803d', bg: '#f0fdf4', min: 1 },
  embaixador:     { label: 'Embaixador',        emoji: '⭐', color: '#0D6E6E', bg: '#f0fdfa', min: 5 },
  evangelista:    { label: 'Evangelista',       emoji: '🔥', color: '#d97706', bg: '#fffbeb', min: 10 },
  fundador_rede:  { label: 'Fundador da Rede',  emoji: '👑', color: '#7c3aed', bg: '#f5f3ff', min: 25 },
  lenda:          { label: 'Lenda',             emoji: '🏆', color: '#dc2626', bg: '#fef2f2', min: 50 },
}

const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendente',   color: '#d97706', bg: '#fffbeb' },
  active:    { label: 'Ativo',      color: '#16a34a', bg: '#f0fdf4' },
  suspended: { label: 'Suspenso',   color: '#dc2626', bg: '#fef2f2' },
}

function getBadge(active: number): string {
  if (active >= 50) return 'lenda'
  if (active >= 25) return 'fundador_rede'
  if (active >= 10) return 'evangelista'
  if (active >= 5)  return 'embaixador'
  return 'semeador'
}

export function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [filtered, setFiltered] = useState<Ambassador[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBadge, setFilterBadge] = useState('all')
  const [selected, setSelected] = useState<Ambassador | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [processingPix, setProcessingPix] = useState<string | null>(null)

  // KPIs
  const totalActive = ambassadors.filter(a => a.status === 'active').length
  const totalPending = ambassadors.filter(a => a.status === 'pending').length
  const totalBalancePix = ambassadors.reduce((s, a) => s + (a.balance_to_pay || 0), 0)
  const totalReferrals = ambassadors.reduce((s, a) => s + (a.active_referrals || 0), 0)

  useEffect(() => { fetchAmbassadors() }, [])

  useEffect(() => {
    let list = [...ambassadors]
    if (search) list = list.filter(a =>
      a.professional?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.professional?.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.referral_code?.toLowerCase().includes(search.toLowerCase())
    )
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus)
    if (filterBadge !== 'all') list = list.filter(a => getBadge(a.active_referrals) === filterBadge)
    setFiltered(list)
  }, [search, filterStatus, filterBadge, ambassadors])

  const fetchAmbassadors = async () => {
    setLoading(true)
    try {
      const { data: ambs } = await supabase.from('ambassadors').select('*').order('created_at', { ascending: false })
      if (!ambs) { setLoading(false); return }

      const profIds = ambs.map(a => a.professional_id).filter(Boolean)
      const { data: profs } = await supabase.from('professionals').select('id, name, email').in('id', profIds)
      const profsMap: Record<string, { name: string; email: string }> = {}
      profs?.forEach(p => { profsMap[p.id] = { name: p.name, email: p.email } })

      const enriched = ambs.map(a => ({ ...a, professional: profsMap[a.professional_id] }))
      setAmbassadors(enriched)
      setFiltered(enriched)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchReferrals = async (ambassadorId: string, professionalId: string) => {
    setLoadingReferrals(true)
    try {
      const { data } = await supabase
        .from('ambassador_referrals')
        .select('*')
        .eq('ambassador_id', ambassadorId)
        .order('created_at', { ascending: false })

      if (!data) { setReferrals([]); return }

      const ids = data.map(r => r.referred_professional_id).filter(Boolean)
      const { data: profs } = await supabase.from('professionals').select('id, name, email').in('id', ids)
      const map: Record<string, { name: string; email: string }> = {}
      profs?.forEach(p => { map[p.id] = { name: p.name, email: p.email } })

      setReferrals(data.map(r => ({ ...r, referred: map[r.referred_professional_id] })))
    } catch (e) { console.error(e) } finally { setLoadingReferrals(false) }
  }

  const toggleStatus = async (amb: Ambassador) => {
    setToggling(amb.id)
    const newStatus = amb.status === 'active' ? 'suspended' : 'active'
    try {
      await supabase.from('ambassadors').update({ status: newStatus }).eq('id', amb.id)
      setAmbassadors(prev => prev.map(a => a.id === amb.id ? { ...a, status: newStatus as Ambassador['status'] } : a))
      if (selected?.id === amb.id) setSelected({ ...selected, status: newStatus as Ambassador['status'] })
    } catch (e) { console.error(e) } finally { setToggling(null) }
  }

  const approveAmbassador = async (amb: Ambassador) => {
    setToggling(amb.id)
    try {
      await supabase.from('ambassadors').update({ status: 'active' }).eq('id', amb.id)
      setAmbassadors(prev => prev.map(a => a.id === amb.id ? { ...a, status: 'active' } : a))
      if (selected?.id === amb.id) setSelected({ ...selected, status: 'active' })
    } catch (e) { console.error(e) } finally { setToggling(null) }
  }

  const markPixPaid = async (amb: Ambassador) => {
    if (!amb.balance_to_pay || amb.balance_to_pay <= 0) return
    setProcessingPix(amb.id)
    try {
      const newTotal = (amb.total_paid || 0) + amb.balance_to_pay
      await supabase.from('ambassadors').update({ balance_to_pay: 0, total_paid: newTotal }).eq('id', amb.id)
      setAmbassadors(prev => prev.map(a => a.id === amb.id ? { ...a, balance_to_pay: 0, total_paid: newTotal } : a))
      if (selected?.id === amb.id) setSelected({ ...selected, balance_to_pay: 0, total_paid: newTotal })
    } catch (e) { console.error(e) } finally { setProcessingPix(null) }
  }

  const openDetail = (amb: Ambassador) => {
    if (selected?.id === amb.id) { setSelected(null); setReferrals([]); return }
    setSelected(amb)
    fetchReferrals(amb.id, amb.professional_id)
  }

  const BadgePill = ({ active }: { active: number }) => {
    const key = getBadge(active)
    const b = badgeInfo[key]
    return (
      <span style={{ background: b.bg, color: b.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {b.emoji} {b.label}
      </span>
    )
  }

  const StatusPill = ({ status }: { status: string }) => {
    const s = statusInfo[status] ?? statusInfo.pending
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
        {s.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Embaixadores Ativos', value: totalActive, icon: <CheckCircle size={20} color="#16a34a" />, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Aprovações Pendentes', value: totalPending, icon: <Users size={20} color="#d97706" />, bg: '#fffbeb', color: '#d97706' },
          { label: 'Indicações Ativas', value: totalReferrals, icon: <TrendingUp size={20} color="#0D6E6E" />, bg: '#f0fdfa', color: '#0D6E6E' },
          { label: 'Saldo PIX a Pagar', value: `R$ ${totalBalancePix.toFixed(2)}`, icon: <DollarSign size={20} color="#7c3aed" />, bg: '#f5f3ff', color: '#7c3aed' },
        ].map(({ label, value, icon, bg, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ background: bg, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 4px' }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Regras resumidas */}
      <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0D6E6E', margin: '0 0 8px' }}>📋 Regras do Programa</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, color: '#475569' }}>
          <span>✅ 15% desconto por indicação ativa (acumulável)</span>
          <span>🎯 7 indicações = mensalidade zero</span>
          <span>💰 Excedente vira renda PIX mensal</span>
          <span>🎁 Indicado: 30 dias grátis + 20% por 3 meses</span>
          <span>🌱 Semeador(1) → ⭐ Embaixador(5) → 🔥 Evangelista(10)</span>
          <span>👑 Fundador da Rede(25) → 🏆 Lenda(50)</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou código..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', cursor: 'pointer' }}>
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
        </select>
        <select value={filterBadge} onChange={e => setFilterBadge(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', cursor: 'pointer' }}>
          <option value="all">Todos os badges</option>
          {Object.entries(badgeInfo).map(([key, b]) => (
            <option key={key} value={key}>{b.emoji} {b.label} ({b.min}+)</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{filtered.length} embaixador(es)</span>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Nenhum embaixador encontrado.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Nome', 'Código', 'Badge', 'Status', 'Indicações Ativas', 'Desconto', 'Saldo PIX', 'Ações', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((amb, i) => {
                const isOpen = selected?.id === amb.id
                const discount = Math.min(amb.active_referrals * 15, 100)
                const isFree = amb.active_referrals >= 7
                return (
                  <>
                    <tr key={amb.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', background: isOpen ? '#f0fdf4' : i % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{amb.professional?.name ?? '—'}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{amb.professional?.email ?? '—'}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#0D6E6E' }}>{amb.referral_code}</code>
                      </td>
                      <td style={{ padding: '12px 16px' }}><BadgePill active={amb.active_referrals} /></td>
                      <td style={{ padding: '12px 16px' }}><StatusPill status={amb.status} /></td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>{amb.active_referrals}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: isFree ? '#16a34a' : '#0f172a' }}>
                          {isFree ? '🎉 Grátis' : `${discount}%`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: amb.balance_to_pay > 0 ? '#7c3aed' : '#94a3b8' }}>
                          R$ {(amb.balance_to_pay || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {amb.status === 'pending' && (
                            <button
                              onClick={() => approveAmbassador(amb)}
                              disabled={toggling === amb.id}
                              style={{ padding: '5px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Aprovar
                            </button>
                          )}
                          {amb.status === 'active' && (
                            <button
                              onClick={() => toggleStatus(amb)}
                              disabled={toggling === amb.id}
                              style={{ padding: '5px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Suspender
                            </button>
                          )}
                          {amb.status === 'suspended' && (
                            <button
                              onClick={() => toggleStatus(amb)}
                              disabled={toggling === amb.id}
                              style={{ padding: '5px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Reativar
                            </button>
                          )}
                          {amb.balance_to_pay > 0 && (
                            <button
                              onClick={() => markPixPaid(amb)}
                              disabled={processingPix === amb.id}
                              style={{ padding: '5px 12px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              PIX pago
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => openDetail(amb)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0D6E6E' }}>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </td>
                    </tr>

                    {/* Detalhe expandido */}
                    {isOpen && (
                      <tr key={`${amb.id}-detail`}>
                        <td colSpan={9} style={{ background: '#f8fffe', padding: '24px', borderTop: '1px solid #d1fae5' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                            {/* Info do embaixador */}
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#0D6E6E', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhes do Embaixador</p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                  { label: 'ID', value: amb.id },
                                  { label: 'Código de indicação', value: amb.referral_code },
                                  { label: 'PIX', value: amb.pix_key ?? '—' },
                                  { label: 'Total de indicações', value: amb.total_referrals },
                                  { label: 'Indicações ativas', value: amb.active_referrals },
                                  { label: 'Desconto atual', value: amb.active_referrals >= 7 ? '100% (Grátis)' : `${Math.min(amb.active_referrals * 15, 100)}%` },
                                  { label: 'Saldo a receber', value: `R$ ${(amb.balance_to_pay || 0).toFixed(2)}` },
                                  { label: 'Total pago', value: `R$ ${(amb.total_paid || 0).toFixed(2)}` },
                                  { label: 'Badge', value: `${badgeInfo[getBadge(amb.active_referrals)].emoji} ${badgeInfo[getBadge(amb.active_referrals)].label}` },
                                  { label: 'Membro desde', value: new Date(amb.created_at).toLocaleDateString('pt-BR') },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0, wordBreak: 'break-all' }}>{String(value)}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Próximo badge */}
                              {(() => {
                                const current = getBadge(amb.active_referrals)
                                const keys = Object.keys(badgeInfo)
                                const nextKey = keys[keys.indexOf(current) + 1]
                                if (!nextKey) return null
                                const next = badgeInfo[nextKey]
                                const remaining = next.min - amb.active_referrals
                                return (
                                  <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
                                    <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
                                      Faltam <strong>{remaining} indicação(ões)</strong> para alcançar {next.emoji} <strong>{next.label}</strong>
                                    </p>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Lista de indicados */}
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#0D6E6E', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Indicados ({referrals.length})
                              </p>
                              {loadingReferrals ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando indicados...</p>
                              ) : referrals.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum indicado ainda.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                                  {referrals.map(r => (
                                    <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{r.referred?.name ?? '—'}</p>
                                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{r.referred?.email ?? '—'}</p>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: r.status === 'active' ? '#f0fdf4' : '#fef2f2', color: r.status === 'active' ? '#16a34a' : '#dc2626' }}>
                                          {r.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                        {r.discount_months_remaining > 0 && (
                                          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>{r.discount_months_remaining} mes(es) de desconto</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
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
  )
}