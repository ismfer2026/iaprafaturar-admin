import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Search, ChevronDown, ChevronUp, CheckCircle, Users,
  DollarSign, TrendingUp, Plus, X, Copy, Clock
} from 'lucide-react'

const BASE_SIGNUP_URL = "https://app.iaprafaturar.com.br/signup";

interface AffiliatePartner {
  id: string
  professional_id: string | null
  name: string | null
  email: string | null
  affiliate_code: string
  status: 'pendente' | 'ativo' | 'suspenso' | 'inativo' | string
  total_conversions: number
  active_conversions: number
  commission_pct: number
  pix_key?: string
  pending_payment: number
  total_earned: number
  created_at: string
}

interface AffiliateConversion {
  id: string
  affiliate_id: string
  referred_professional_id: string
  status: string
  plan_slug?: string
  commission_monthly_value?: number
  created_at: string
  referred?: { name: string; email: string }
}

const badgeInfo: Record<string, { label: string; emoji: string; color: string; bg: string; min: number }> = {
  semeador:       { label: 'Semeador',         emoji: '🌱', color: '#15803d', bg: '#f0fdf4', min: 1 },
  embaixador:     { label: 'Embaixador',       emoji: '⭐', color: '#0D6E6E', bg: '#f0fdfa', min: 5 },
  evangelista:    { label: 'Evangelista',      emoji: '🔥', color: '#d97706', bg: '#fffbeb', min: 10 },
  fundador_rede:  { label: 'Fundador da Rede', emoji: '👑', color: '#7c3aed', bg: '#f5f3ff', min: 25 },
  lenda:          { label: 'Lenda',            emoji: '🏆', color: '#dc2626', bg: '#fef2f2', min: 50 },
}

// ✅ CORREÇÃO 1: statusInfo com chaves em português (compatível com o banco)
const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
  pendente:  { label: 'Pendente',   color: '#d97706', bg: '#fffbeb' },
  ativo:     { label: 'Ativo',      color: '#16a34a', bg: '#f0fdf4' },
  suspenso:  { label: 'Suspenso',   color: '#dc2626', bg: '#fef2f2' },
  inativo:   { label: 'Inativo',    color: '#64748b', bg: '#f1f5f9' },
}

function getBadge(active: number): string {
  if (active >= 50) return 'lenda'
  if (active >= 25) return 'fundador_rede'
  if (active >= 10) return 'evangelista'
  if (active >= 5)  return 'embaixador'
  return 'semeador'
}

export function AmbassadorsPage() {
  const [partners, setPartners] = useState<AffiliatePartner[]>([])
  const [filtered, setFiltered] = useState<AffiliatePartner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterBadge, setFilterBadge] = useState('all')
  const [selected, setSelected] = useState<AffiliatePartner | null>(null)
  const [referrals, setReferrals] = useState<AffiliateConversion[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [processingPix, setProcessingPix] = useState<string | null>(null)
  
  // 🆕 Estados para modal de novo parceiro
  const [showNewPartnerModal, setShowNewPartnerModal] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({ name: '', email: '', pix_key: '', commission_pct: 30, phone_whatsapp: '' });
  const [issubmitting, setIsSubmitting] = useState(false)

  // KPIs
  const totalActive = partners.filter(a => a.status === 'ativo').length
  const totalPending = partners.filter(a => a.status === 'pendente').length
  const totalBalancePix = partners.reduce((s, a) => s + (Number(a.pending_payment) || 0), 0)
  const totalReferrals = partners.reduce((s, a) => s + (Number(a.active_conversions) || 0), 0)
  const [trialCount, setTrialCount] = useState(0)

  const fetchTrialCount = async () => {
    try {
      const { count, error } = await supabase
        .from('affiliate_conversions')
        .select('*', { count: 'exact' })

      if (error) throw error
      setTrialCount(count ?? 0)
    } catch (e) {
      console.error('Erro ao buscar trials:', e)
    }
  }

  useEffect(() => { fetchPartners(); fetchTrialCount() }, [])

  useEffect(() => {
    let list = [...partners]
    if (search) list = list.filter(a =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.affiliate_code?.toLowerCase().includes(search.toLowerCase())
    )
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus)
    if (filterBadge !== 'all') list = list.filter(a => getBadge(a.active_conversions) === filterBadge)
    setFiltered(list)
  }, [search, filterStatus, filterBadge, partners])

  // ✅ CORREÇÃO 4: fetchPartners com profissionais + parceiros B2B
  const fetchPartners = async () => {
    setLoading(true)
    try {
      console.log('📊 [Ambassadors] Carregando afiliados (profissionais + parceiros)...')

      // 1. Buscar profissionais com referral_code
      const { data: allProfessionals, error: profError } = await supabase
        .from('professionals')
        .select('id, name, email, referral_code, created_at')
        .order('created_at', { ascending: false })

      if (profError) {
        console.error('❌ Erro ao buscar professionals:', profError)
        throw profError
      }

      console.log('✅ Total de professionals:', allProfessionals?.length || 0)
      console.log('📋 Profissionais carregados:', allProfessionals?.map(p => ({ name: p.name, referral_code: p.referral_code })))

      // Filtrar apenas os com referral_code
      const professionals = allProfessionals?.filter(p => p.referral_code) || []
      console.log('✅ professionals com referral_code:', professionals.length, 'registros')

      // 2. Buscar parceiros B2B
      const { data: partners, error: partError } = await supabase
        .from('affiliate_partners')
        .select('*')
        .order('created_at', { ascending: false })

      if (partError) {
        console.error('❌ Erro ao buscar affiliate_partners:', partError)
        throw partError
      }

      console.log('✅ affiliate_partners carregado:', partners?.length || 0, 'registros')

      // 3. Buscar conversões para calcular comissões
      const { data: conversions, error: convError } = await supabase
        .from('affiliate_conversions')
        .select('*')

      if (convError) console.warn('⚠️ Erro ao buscar conversions:', convError)

      // Mapa de conversões por affiliate_id
      const conversionsByAffiliate: Record<string, any[]> = {}
      conversions?.forEach(c => {
        if (!conversionsByAffiliate[c.affiliate_id]) conversionsByAffiliate[c.affiliate_id] = []
        conversionsByAffiliate[c.affiliate_id].push(c)
      })

      // 4. Combinar profissionais + parceiros com estatísticas
      const combined: AffiliatePartner[] = [
        ...(professionals.map(p => {
          const affiliateConversions = conversionsByAffiliate[`prof_${p.id}`] || []
          const activeConversions = affiliateConversions.filter(c => c.status === 'ativo').length
          const pendingPayment = affiliateConversions
            .filter(c => c.status === 'ativo' && c.commission_monthly_value)
            .reduce((sum, c) => sum + (Number(c.commission_monthly_value) || 0), 0)

          return {
            id: `prof_${p.id}`,
            professional_id: p.id,
            name: p.name,
            email: p.email,
            affiliate_code: p.referral_code,
            status: 'ativo' as const,
            total_conversions: affiliateConversions.length,
            active_conversions: activeConversions,
            commission_pct: 15,
            pending_payment: pendingPayment,
            total_earned: 0,
            created_at: p.created_at
          }
        }) || []),
        ...(partners || [])
      ]

      console.log('✅ Dados combinados:', combined.length, 'afiliados')
      setPartners(combined)
      setFiltered(combined)
    } catch (e) {
      console.error('❌ Erro geral:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchReferrals = async (partnerId: string) => {
    setLoadingReferrals(true)
    try {
      const { data, error } = await supabase
        .from('affiliate_conversions')
        .select('*')
        .eq('affiliate_id', partnerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data) { setReferrals([]); return }

      const ids = data.map(r => r.referred_professional_id).filter(Boolean)
      const { data: profs } = await supabase.from('professionals').select('id, name, email').in('id', ids)
      const map: Record<string, { name: string; email: string }> = {}
      profs?.forEach(p => { map[p.id] = { name: p.name, email: p.email } })

      setReferrals(data.map(r => ({ ...r, referred: map[r.referred_professional_id] })))
    } catch (e) { 
      console.error('Erro ao buscar indicações:', e) 
    } finally { 
      setLoadingReferrals(false) 
    }
  }

  // ✅ CORREÇÃO 2: handleCreatePartner com status: 'ativo'
  const handleCreatePartner = async () => {
    if (!newPartnerForm.name || !newPartnerForm.email) {
      alert('Nome e E-mail são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    const baseName = newPartnerForm.name.toUpperCase().replace(/\s/g, '').substring(0, 4);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${baseName}${randomNum}`;

    try {
      const { error } = await supabase
        .from('affiliate_partners')
        .insert([{
          name: newPartnerForm.name,
          email: newPartnerForm.email,
          pix_key: newPartnerForm.pix_key,
          commission_pct: Number(newPartnerForm.commission_pct),
          phone_whatsapp: newPartnerForm.phone_whatsapp || null,
          affiliate_code: code,
          status: 'ativo'
        }])
        .select();

      if (error) {
        throw error;
      }

      alert('Parceiro cadastrado com sucesso!');
      setShowNewPartnerModal(false);
      setNewPartnerForm({ name: '', email: '', pix_key: '', commission_pct: 15, phone_whatsapp: '' });
      fetchPartners();
    } catch (err: any) {
      alert('Erro ao salvar parceiro: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ CORREÇÃO 3: toggleStatus alternando entre 'ativo' e 'suspenso'
  const toggleStatus = async (amb: AffiliatePartner) => {
    setToggling(amb.id)
    // Altera entre 'ativo' e 'suspenso' (termos do seu ENUM em português)
    const newStatus = amb.status === 'ativo' ? 'suspenso' : 'ativo'
    try {
      await supabase.from('affiliate_partners').update({ status: newStatus }).eq('id', amb.id)
      setPartners(prev => prev.map(a => a.id === amb.id ? { ...a, status: newStatus } : a))
      if (selected?.id === amb.id) setSelected({ ...selected, status: newStatus })
    } catch (e) { console.error(e) } finally { setToggling(null) }
  }

  const approveAmbassador = async (amb: AffiliatePartner) => {
    setToggling(amb.id)
    try {
      await supabase.from('affiliate_partners').update({ status: 'ativo', approved_at: new Date().toISOString() }).eq('id', amb.id)
      setPartners(prev => prev.map(a => a.id === amb.id ? { ...a, status: 'ativo' } : a))
      if (selected?.id === amb.id) setSelected({ ...selected, status: 'ativo' })
    } catch (e) { console.error(e) } finally { setToggling(null) }
  }

  const markPixPaid = async (amb: AffiliatePartner) => {
    if (!amb.pending_payment || amb.pending_payment <= 0) return
    setProcessingPix(amb.id)
    try {
      const amountToPay = Number(amb.pending_payment)
      const newTotal = Number(amb.total_earned || 0) + amountToPay

      const { error: updateError } = await supabase.from('affiliate_partners').update({ pending_payment: 0, total_earned: newTotal }).eq('id', amb.id)
      if (updateError) throw updateError

      const { error: insertError } = await supabase.from('affiliate_payments').insert({
        affiliate_id: amb.id,
        gross_amount: amountToPay,
        net_amount: amountToPay,
        status: 'paid',
        pix_key: amb.pix_key,
        paid_at: new Date().toISOString()
      })
      if (insertError) throw insertError

      setPartners(prev => prev.map(a => a.id === amb.id ? { ...a, pending_payment: 0, total_earned: newTotal } : a))
      if (selected?.id === amb.id) setSelected({ ...selected, pending_payment: 0, total_earned: newTotal })
    } catch (e) {
      console.error('Erro ao registrar pagamento PIX:', e)
    } finally { setProcessingPix(null) }
  }

  const openDetail = (amb: AffiliatePartner) => {
    if (selected?.id === amb.id) { setSelected(null); setReferrals([]); return }
    setSelected(amb)
    fetchReferrals(amb.id)
  }

  const BadgePill = ({ active }: { active: number }) => {
    const key = getBadge(active)
    const b = badgeInfo[key]
    return (
      <span style={{ background: b.bg, color: b.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {b.emoji} {b.label}
      </span>
    )
  }

  const StatusPill = ({ status }: { status: string }) => {
    // ✅ Usa statusInfo com chaves em português
    const s = statusInfo[status] ?? statusInfo.inativo
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
        {s.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Afiliados e Parceiros</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Gerencie o programa B2B de indicações, comissões e pagamentos via PIX.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[
          { label: 'Parceiros Ativos', value: totalActive, icon: <CheckCircle size={20} color="#16a34a" />, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Aprovações Pendentes', value: totalPending, icon: <Users size={20} color="#d97706" />, bg: '#fffbeb', color: '#d97706' },
          { label: 'Conversões Ativas', value: totalReferrals, icon: <TrendingUp size={20} color="#0D6E6E" />, bg: '#f0fdfa', color: '#0D6E6E' },
          { label: 'Trials Aguardando Ativação', value: trialCount, icon: <Clock size={20} color="#0284c7" />, bg: '#f0f9ff', color: '#0284c7' },
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
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0D6E6E', margin: '0 0 8px' }}>📋 Tabela de Benefícios B2B</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, color: '#475569' }}>
          <span>✅ Comissão: Percentual do plano escolhido pelo indicado.</span>
          <span>💰 Pagamento em dinheiro: Lançado via PIX após confirmação.</span>
          <span>📅 Recebimento Mensal: Os parceiros recebem a cada mensalidade paga pelo indicado.</span>
          <span>🌱 Semeador (1 conv) → ⭐ Embaixador (5 conv)</span>
          <span>🔥 Evangelista (10) → 👑 Fundador (25) → 🏆 Lenda (50)</span>
        </div>
      </div>

      {/* Filtros e Botão Novo Parceiro */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou código..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', cursor: 'pointer' }}>
          <option value="all">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="inativo">Inativo</option>
        </select>
        <select value={filterBadge} onChange={e => setFilterBadge(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', cursor: 'pointer' }}>
          <option value="all">Todos os badges</option>
          {Object.entries(badgeInfo).map(([key, b]) => (
            <option key={key} value={key}>{b.emoji} {b.label} ({b.min}+)</option>
          ))}
        </select>
        
        {/* Botão Novo Parceiro */}
        <button 
          onClick={() => setShowNewPartnerModal(true)}
          style={{ background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Novo Parceiro
        </button>
        
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>{filtered.length} Afiliado(s)</span>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#0D6E6E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Carregando dados de parceiros...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Nenhum parceiro ou afiliado encontrado.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Afiliado', 'Código', 'Badge', 'Status', 'Conversões', 'Comissão', 'Saldo a Pagar', 'Ações', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((amb, i) => {
                const isOpen = selected?.id === amb.id
                const partnerLink = `${BASE_SIGNUP_URL}?ref=${amb.affiliate_code}`;
                
                return (
                  <>
                    <tr key={amb.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', background: isOpen ? '#f0fdf4' : '#fff', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{amb.name ?? '—'}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{amb.email ?? '—'}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#0D6E6E' }}>{amb.affiliate_code}</code>
                      </td>
                      <td style={{ padding: '12px 16px' }}><BadgePill active={amb.active_conversions || 0} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        {/* ✅ StatusPill agora usa statusInfo em português */}
                        <StatusPill status={amb.status} />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>{amb.active_conversions || 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>
                          {amb.commission_pct || 0}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: (amb.pending_payment || 0) > 0 ? '#7c3aed' : '#94a3b8' }}>
                          R$ {(amb.pending_payment || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {amb.status === 'pendente' && (
                            <button
                              onClick={() => approveAmbassador(amb)}
                              disabled={toggling === amb.id}
                              style={{ padding: '5px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Aprovar
                            </button>
                          )}
                          {amb.status === 'ativo' && (
                            <button
                              onClick={() => toggleStatus(amb)}
                              disabled={toggling === amb.id}
                              style={{ padding: '5px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Suspender
                            </button>
                          )}
                          {amb.status === 'suspenso' && (
                            <button
                              onClick={() => toggleStatus(amb)}
                              disabled={toggling === amb.id}
                              style={{ padding: '5px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Reativar
                            </button>
                          )}
                          {(amb.pending_payment || 0) > 0 && (
                            <button
                              onClick={() => markPixPaid(amb)}
                              disabled={processingPix === amb.id}
                              style={{ padding: '5px 12px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              PIX Pago
                            </button>
                          )}
                          <button
                            onClick={() => { 
                              navigator.clipboard.writeText(partnerLink); 
                              alert('Link copiado!'); 
                            }}
                            style={{ padding: '5px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#0D6E6E' }}
                            title="Copiar link de divulgação"
                          >
                            <Copy size={14} /> Link
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={() => openDetail(amb)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* Detalhe expandido */}
                    {isOpen && (
                      <tr key={`${amb.id}-detail`}>
                        <td colSpan={9} style={{ background: '#f8fffe', padding: '24px', borderTop: '1px solid #d1fae5', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

                            {/* Info do embaixador */}
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 800, color: '#0D6E6E', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16}/> Detalhes do Parceiro</p>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 12px', background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                {[
                                  { label: 'Chave PIX', value: amb.pix_key ?? 'Não informada' },
                                  { label: 'Comissão', value: `${amb.commission_pct || 0}% por mensalidade` },
                                  { label: 'Total de conversões', value: amb.total_conversions || 0 },
                                  { label: 'Conversões ativas', value: amb.active_conversions || 0 },
                                  { label: 'Saldo pendente (PIX)', value: `R$ ${(amb.pending_payment || 0).toFixed(2)}` },
                                  { label: 'Total pago (Vida)', value: `R$ ${(amb.total_earned || 0).toFixed(2)}` },
                                  { label: 'Ranking/Badge', value: `${badgeInfo[getBadge(amb.active_conversions || 0)].emoji} ${badgeInfo[getBadge(amb.active_conversions || 0)].label}` },
                                  { label: 'Parceiro desde', value: new Date(amb.created_at).toLocaleDateString('pt-BR') },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0, wordBreak: 'break-all' }}>{String(value)}</p>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Seção de Link de Divulgação */}
                              <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px' }}>Link de Divulgação</p>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <code style={{ flex: 1, background: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#0D6E6E', border: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {partnerLink}
                                  </code>
                                  <button 
                                    onClick={() => { 
                                      navigator.clipboard.writeText(partnerLink); 
                                      alert('Link copiado!'); 
                                    }}
                                    style={{ padding: '8px 12px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Copy size={14} /> Copiar
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Lista de indicados */}
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 800, color: '#0D6E6E', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={16}/> Profissionais Indicados ({referrals.length})</p>
                              
                              {loadingReferrals ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando dados da carteira...</p>
                              ) : referrals.length === 0 ? (
                                <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 30, textAlign: 'center' }}>
                                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Nenhuma assinatura ou cadastro concluído pelo link deste parceiro ainda.</p>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                  {referrals.map(r => (
                                    <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{r.referred?.name ?? 'Clínica Desconhecida'}</p>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{r.referred?.email ?? '—'}</p>
                                        {r.plan_slug && <p style={{ fontSize: 11, fontWeight: 600, color: '#0D6E6E', margin: '4px 0 0' }}>Plano: {r.plan_slug}</p>}
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: r.status === 'ativo' ? '#f0fdf4' : '#fef2f2', color: r.status === 'ativo' ? '#16a34a' : '#dc2626' }}>
                                          {r.status === 'ativo' ? 'Rendendo Comissão' : 'Inativo / Cancelou'}
                                        </span>
                                        {r.commission_monthly_value && (
                                          <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', margin: '6px 0 0' }}>+ R$ {r.commission_monthly_value.toFixed(2)}/mês</p>
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

      {/* MODAL: Novo Parceiro B2B */}
      {showNewPartnerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNewPartnerModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Novo Parceiro B2B</h2>
              <button onClick={() => setShowNewPartnerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nome do Parceiro *</label>
                <input value={newPartnerForm.name} onChange={e => setNewPartnerForm({...newPartnerForm, name: e.target.value})} placeholder="Ex: Agência XYZ" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>E-mail *</label>
                <input type="email" value={newPartnerForm.email} onChange={e => setNewPartnerForm({...newPartnerForm, email: e.target.value})} placeholder="contato@agencia.com" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>WhatsApp (com DDD)</label>
                <input
                  value={newPartnerForm.phone_whatsapp}
                  onChange={e => setNewPartnerForm({...newPartnerForm, phone_whatsapp: e.target.value})}
                  placeholder="11999999999"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Chave PIX</label>
                  <input 
                    value={newPartnerForm.pix_key} 
                    onChange={e => setNewPartnerForm({...newPartnerForm, pix_key: e.target.value})} 
                    placeholder="CPF/CNPJ/Email" 
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Comissão (%)</label>
                  <input
                    type="number"
                    value={newPartnerForm.commission_pct}
                    onChange={e => setNewPartnerForm({...newPartnerForm, commission_pct: Number(e.target.value)})}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleCreatePartner} 
                disabled={issubmitting}
                style={{ 
                  marginTop: 8, 
                  padding: '12px', 
                  background: '#0D6E6E', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontWeight: 600, 
                  cursor: issubmitting ? 'not-allowed' : 'pointer',
                  opacity: issubmitting ? 0.6 : 1
                }}
              >
                {issubmitting ? 'Salvando...' : 'Cadastrar e Gerar Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}