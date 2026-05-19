import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '@/i18n'
import {
  Plus, X, Play, Pause, Send, ChevronDown, ChevronUp,
  Zap, ShoppingBag, RefreshCw, BookOpen, TrendingUp, Target,
  CheckCircle, Clock, Settings, Filter
} from 'lucide-react'

// ══════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════
type CampaignCategory = 'growth' | 'atlantica' | 'reactivation' | 'education' | 'upsell'
type CampaignStatus = 'draft' | 'active' | 'paused' | 'finished'
type TargetAudience = 'all_professionals' | 'selected_professionals' | 'all_clients' | 'inactive_clients' | 'atlantica_clients'

interface Campaign {
  id: string
  name: string
  description: string
  category: CampaignCategory
  status: CampaignStatus
  target_audience: TargetAudience
  message_template: string
  schedule_type: 'immediate' | 'scheduled' | 'triggered'
  scheduled_at?: string
  trigger_event?: string
  selected_professionals?: string[]
  notify_professional: boolean
  stats?: { sent: number; delivered: number; replied: number; converted: number }
  created_at: string
  updated_at: string
}

interface Professional { id: string; name: string; email: string; plan?: string }

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════
const CATEGORIES: Record<CampaignCategory, { label: string; icon: any; color: string; bg: string; border: string; description: string }> = {
  growth:      { label: 'Crescimento iaprafaturar', icon: TrendingUp, color: '#0D6E6E', bg: '#f0fdfa', border: '#99f6e4', description: 'Atrai e converte novos profissionais para a plataforma' },
  atlantica:   { label: 'Atlântica Natural', icon: ShoppingBag,  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', description: 'Vende produtos AN para clientes dos profissionais parceiros' },
  reactivation:{ label: 'Reativação de Clientes', icon: RefreshCw, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', description: 'Recupera clientes inativos dos profissionais' },
  education:   { label: 'Educação & Nutrição', icon: BookOpen,   color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', description: 'Educa clientes sobre saúde, produtos e serviços' },
  upsell:      { label: 'Upsell & Funis CRM', icon: Target,      color: '#d97706', bg: '#fffbeb', border: '#fde68a', description: 'Aumenta o ticket médio com ofertas segmentadas' },
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bg: string; icon: any }> = {
  draft:    { label: 'Rascunho',  color: '#64748b', bg: '#f1f5f9', icon: Clock },
  active:   { label: 'Ativa',     color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  paused:   { label: 'Pausada',   color: '#d97706', bg: '#fffbeb', icon: Pause },
  finished: { label: 'Concluída', color: '#7c3aed', bg: '#f5f3ff', icon: CheckCircle },
}

const getTemplates = (t: (key: string) => string): Record<CampaignCategory, { name: string; message: string; audience: TargetAudience; trigger?: string }[]> => ({
  growth: [
    { name: t('campaign_templates.growth_trial'), message: t('campaign_templates.growth_trial_msg'), audience: 'all_professionals' },
    { name: t('campaign_templates.growth_ambassadors'), message: t('campaign_templates.growth_ambassadors_msg'), audience: 'all_professionals' },
    { name: t('campaign_templates.growth_reactivation'), message: t('campaign_templates.growth_reactivation_msg'), audience: 'all_professionals' },
  ],
  atlantica: [
    { name: t('campaign_templates.atlantica_launch'), message: t('campaign_templates.atlantica_launch_msg'), audience: 'atlantica_clients' },
    { name: t('campaign_templates.atlantica_education'), message: t('campaign_templates.atlantica_education_msg'), audience: 'atlantica_clients', trigger: 'after_consultation' },
    { name: t('campaign_templates.atlantica_clearance'), message: t('campaign_templates.atlantica_clearance_msg'), audience: 'atlantica_clients' },
    { name: t('campaign_templates.atlantica_reorder'), message: t('campaign_templates.atlantica_reorder_msg'), audience: 'atlantica_clients', trigger: 'days_since_purchase' },
  ],
  reactivation: [
    { name: t('campaign_templates.reactivation_missing'), message: t('campaign_templates.reactivation_missing_msg'), audience: 'inactive_clients', trigger: 'inactive_30_days' },
    { name: t('campaign_templates.reactivation_offer'), message: t('campaign_templates.reactivation_offer_msg'), audience: 'inactive_clients' },
    { name: t('campaign_templates.reactivation_survey'), message: t('campaign_templates.reactivation_survey_msg'), audience: 'inactive_clients' },
  ],
  education: [
    { name: t('campaign_templates.education_weekly'), message: t('campaign_templates.education_weekly_msg'), audience: 'all_clients', trigger: 'weekly' },
    { name: t('campaign_templates.education_product'), message: t('campaign_templates.education_product_msg'), audience: 'atlantica_clients' },
    { name: t('campaign_templates.education_postcare'), message: t('campaign_templates.education_postcare_msg'), audience: 'all_clients', trigger: 'post_consultation' },
  ],
  upsell: [
    { name: t('campaign_templates.upsell_upgrade'), message: t('campaign_templates.upsell_upgrade_msg'), audience: 'all_professionals', trigger: 'limit_threshold' },
    { name: t('campaign_templates.upsell_credits'), message: t('campaign_templates.upsell_credits_msg'), audience: 'all_professionals', trigger: 'credits_low' },
    { name: t('campaign_templates.upsell_service'), message: t('campaign_templates.upsell_service_msg'), audience: 'all_clients', trigger: 'after_purchase' },
  ],
})

const EMPTY_CAMPAIGN: Partial<Campaign> = {
  name: '', description: '', category: 'atlantica', status: 'draft',
  target_audience: 'atlantica_clients', message_template: '',
  schedule_type: 'immediate', notify_professional: true,
  selected_professionals: [], stats: { sent: 0, delivered: 0, replied: 0, converted: 0 },
}

// ══════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ══════════════════════════════════════════════════════════
function StatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

function CategoryBadge({ category }: { category: CampaignCategory }) {
  const cfg = CATEGORIES[category]
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, border: `1px solid ${cfg.border}` }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0 }}>{value.toLocaleString('pt-BR')}</p>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
export function CampaignsPage() {
  const { t } = useI18n()
  const CAMPAIGN_TEMPLATES = getTemplates(t)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<CampaignCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'campanhas' | 'templates'>('campanhas')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [profSearch, setProfSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data: c } = await supabase.from('admin_campaigns').select('*').order('created_at', { ascending: false })
      const { data: p } = await supabase.from('professionals').select('id, name, email, plan_type').limit(100)
      setCampaigns((c || []).map(r => ({ ...r, stats: r.stats || { sent: 0, delivered: 0, replied: 0, converted: 0 } })))
      setProfessionals(p || [])
    } catch { setCampaigns([]); setProfessionals([]) } finally { setLoading(false) }
  }

  const saveCampaign = async () => {
    if (!editing) return
    setSaving(true)
    try {
      if (editing.id) {
        const { error } = await supabase.from('admin_campaigns').update({ ...editing, updated_at: new Date().toISOString() }).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('admin_campaigns').insert({ ...editing, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        if (error) throw error
      }
      setShowModal(false); setEditing(null); await fetchAll()
    } catch (e) {
      console.error('Erro ao salvar campanha:', e)
    } finally { setSaving(false) }
  }

  const toggleStatus = async (c: Campaign) => {
    const next: CampaignStatus = c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : 'active'
    try {
      const { error } = await supabase.from('admin_campaigns').update({ status: next, updated_at: new Date().toISOString() }).eq('id', c.id)
      if (error) throw error
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x))
    } catch (e) {
      console.error('Erro ao alterar status da campanha:', e)
    }
  }

  const openCreate = (template?: { name: string; message: string; audience: TargetAudience }, category?: CampaignCategory) => {
    setEditing({
      ...EMPTY_CAMPAIGN,
      ...(template ? { name: template.name, message_template: template.message, target_audience: template.audience, category: category || 'atlantica' } : {}),
    })
    setShowModal(true)
  }

  const filtered = campaigns.filter(c =>
    (filterCategory === 'all' || c.category === filterCategory) &&
    (filterStatus === 'all' || c.status === filterStatus)
  )

  // KPIs
  const totalSent      = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0)
  const totalConverted = campaigns.reduce((s, c) => s + (c.stats?.converted || 0), 0)
  const activeCnt      = campaigns.filter(c => c.status === 'active').length
  const convRate       = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0'

  const filteredProfs = professionals.filter(p =>
    p.name.toLowerCase().includes(profSearch.toLowerCase()) || p.email.toLowerCase().includes(profSearch.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('campaigns.title')}</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{t('campaigns.subtitle')}</p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([
          { id: 'campanhas', label: '📣 Campanhas' },
          { id: 'templates', label: '📐 Biblioteca de Templates' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#0D6E6E' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ABA: CAMPANHAS ── */}
      {activeTab === 'campanhas' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Campanhas Ativas', value: activeCnt, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Total Enviados', value: totalSent.toLocaleString('pt-BR'), color: '#0D6E6E', bg: '#f0fdfa' },
              { label: 'Convertidos', value: totalConverted.toLocaleString('pt-BR'), color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Taxa de Conversão', value: `${convRate}%`, color: '#d97706', bg: '#fffbeb' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filtros + botão */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={14} color="#64748b" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}>
              <option value="all">{t('campaigns.filter_all_categories')}</option>
              {(Object.entries(CATEGORIES) as [CampaignCategory, any][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}>
              <option value="all">{t('campaigns.filter_all_status')}</option>
              {(Object.entries(STATUS_CONFIG) as [CampaignStatus, any][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={() => openCreate()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={15} /> Nova Campanha
            </button>
          </div>

          {/* Lista de campanhas */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Carregando campanhas...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', background: '#f8fafc', borderRadius: 14, border: '2px dashed #e2e8f0' }}>
              <Zap size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px' }}>Nenhuma campanha ainda</p>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 20px' }}>Crie sua primeira campanha ou use um template da biblioteca</p>
              <button onClick={() => setActiveTab('templates')}
                style={{ padding: '9px 20px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Ver Templates
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(camp => {
                const catCfg = CATEGORIES[camp.category]
                const CatIcon = catCfg.icon
                const isOpen = expandedId === camp.id
                const stats = camp.stats || { sent: 0, delivered: 0, replied: 0, converted: 0 }
                const delivRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0
                const replyRate = stats.delivered > 0 ? Math.round((stats.replied / stats.delivered) * 100) : 0

                return (
                  <div key={camp.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isOpen ? catCfg.color : '#e2e8f0'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                    {/* Linha principal */}
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Ícone categoria */}
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: catCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CatIcon size={20} color={catCfg.color} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{camp.name}</p>
                          <StatusBadge status={camp.status} />
                          <CategoryBadge category={camp.category} />
                          {camp.notify_professional && (
                            <span style={{ fontSize: 10, color: '#0284c7', background: '#f0f9ff', padding: '2px 7px', borderRadius: 10, border: '1px solid #bae6fd' }}>Profissional notificado</span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{camp.description || '—'}</p>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                        <StatPill label="Enviados" value={stats.sent} color="#0D6E6E" />
                        <StatPill label="Entregues" value={stats.delivered} color="#0284c7" />
                        <StatPill label="Respondidos" value={stats.replied} color="#d97706" />
                        <StatPill label="Convertidos" value={stats.converted} color="#7c3aed" />
                      </div>

                      {/* Ações */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {camp.status !== 'finished' && (
                          <button onClick={() => toggleStatus(camp)} title={camp.status === 'active' ? 'Pausar' : 'Ativar'}
                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', background: camp.status === 'active' ? '#fff7ed' : '#f0fdf4', color: camp.status === 'active' ? '#d97706' : '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                            {camp.status === 'active' ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Ativar</>}
                          </button>
                        )}
                        <button onClick={() => { setEditing({ ...camp }); setShowModal(true) }}
                          style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', background: '#f8fafc', color: '#475569', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                          <Settings size={12} /> Editar
                        </button>
                        <button onClick={() => setExpandedId(isOpen ? null : camp.id)}
                          style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', background: '#f8fafc', color: '#64748b' }}>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Painel expandido */}
                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${catCfg.border}`, background: catCfg.bg, padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* Template */}
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: catCfg.color, textTransform: 'uppercase', margin: '0 0 8px' }}>Template da Mensagem</p>
                          <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: `1px solid ${catCfg.border}`, fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {camp.message_template || <span style={{ color: '#94a3b8' }}>Sem template definido</span>}
                          </div>
                        </div>

                        {/* Configurações + taxas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: catCfg.color, textTransform: 'uppercase', margin: '0 0 8px' }}>Configurações</p>
                            <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: `1px solid ${catCfg.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {[
                                { label: 'Público-alvo', value: camp.target_audience.replace(/_/g, ' ') },
                                { label: 'Agendamento', value: camp.schedule_type },
                                { label: 'Notifica profissional', value: camp.notify_professional ? 'Sim' : 'Não' },
                                { label: 'Profissionais selecionados', value: camp.selected_professionals?.length ? `${camp.selected_professionals.length} profissionais` : 'Todos' },
                              ].map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: catCfg.color, textTransform: 'uppercase', margin: '0 0 8px' }}>Taxas de Performance</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {[
                                { label: 'Entrega', value: `${delivRate}%`, color: '#0284c7' },
                                { label: 'Resposta', value: `${replyRate}%`, color: '#d97706' },
                                { label: 'Conversão', value: stats.sent > 0 ? `${Math.round((stats.converted / stats.sent) * 100)}%` : '0%', color: '#7c3aed' },
                                { label: 'Custo/conv.', value: stats.converted > 0 ? 'R$ —' : '—', color: '#0D6E6E' },
                              ].map(({ label, value, color }) => (
                                <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: `1px solid ${catCfg.border}`, textAlign: 'center' }}>
                                  <p style={{ fontSize: 18, fontWeight: 900, color, margin: '0 0 2px' }}>{value}</p>
                                  <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>{label}</p>
                                </div>
                              ))}
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
        </>
      )}

      {/* ── ABA: TEMPLATES ── */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(Object.entries(CAMPAIGN_TEMPLATES) as [CampaignCategory, any[]][]).map(([cat, templates]) => {
            const cfg = CATEGORIES[cat]
            const CatIcon = cfg.icon
            return (
              <div key={cat}>
                {/* Cabeçalho categoria */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${cfg.border}` }}>
                    <CatIcon size={18} color={cfg.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: cfg.color, margin: 0 }}>{cfg.label}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{cfg.description}</p>
                  </div>
                </div>

                {/* Grid de templates */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {templates.map((t, i) => {
                    const tKey = `${cat}-${i}`
                    const isSelected = selectedTemplate === tKey
                    return (
                      <div key={i} onClick={() => setSelectedTemplate(isSelected ? null : tKey)}
                        style={{ background: isSelected ? cfg.bg : '#fff', borderRadius: 12, border: `2px solid ${isSelected ? cfg.color : '#e2e8f0'}`, padding: 16, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t.name}</p>
                            {t.trigger && (
                              <span style={{ fontSize: 10, background: '#f0f9ff', color: '#0284c7', padding: '2px 8px', borderRadius: 10, border: '1px solid #bae6fd' }}>
                                Gatilho: {t.trigger}
                              </span>
                            )}
                          </div>
                          {isSelected && <CheckCircle size={18} color={cfg.color} />}
                        </div>
                        <div style={{ background: isSelected ? '#fff' : '#f8fafc', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 12, border: '1px solid #f1f5f9' }}>
                          {t.message.length > 120 ? t.message.slice(0, 120) + '...' : t.message}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Público: {t.audience.replace(/_/g, ' ')}</span>
                          <button onClick={e => { e.stopPropagation(); openCreate(t, cat) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: cfg.color, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            <Plus size={12} /> Usar template
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══════ MODAL CRIAR/EDITAR ══════ */}
      {showModal && editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>
                {editing.id ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditing(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Linha 1: nome + categoria */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nome da campanha *</label>
                  <input value={editing.name || ''} placeholder={t('campaigns.modal_name_placeholder')}
                    onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Categoria *</label>
                  <select value={editing.category || 'atlantica'} onChange={e => setEditing(p => ({ ...p!, category: e.target.value as CampaignCategory }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}>
                    {(Object.entries(CATEGORIES) as [CampaignCategory, any][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Descrição interna</label>
                <input value={editing.description || ''} placeholder={t('campaigns.modal_description_placeholder')}
                  onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Público + agendamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Público-alvo</label>
                  <select value={editing.target_audience || 'all_professionals'} onChange={e => setEditing(p => ({ ...p!, target_audience: e.target.value as TargetAudience }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="all_professionals">{t('campaigns.audience_all_professionals')}</option>
                    <option value="selected_professionals">{t('campaigns.audience_selected_professionals')}</option>
                    <option value="all_clients">{t('campaigns.audience_all_clients')}</option>
                    <option value="inactive_clients">{t('campaigns.audience_inactive_clients')}</option>
                    <option value="atlantica_clients">{t('campaigns.audience_atlantica_clients')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Agendamento</label>
                  <select value={editing.schedule_type || 'immediate'} onChange={e => setEditing(p => ({ ...p!, schedule_type: e.target.value as any }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="immediate">{t('campaigns.schedule_immediate')}</option>
                    <option value="scheduled">{t('campaigns.schedule_scheduled')}</option>
                    <option value="triggered">{t('campaigns.schedule_triggered')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Status inicial</label>
                  <select value={editing.status || 'draft'} onChange={e => setEditing(p => ({ ...p!, status: e.target.value as CampaignStatus }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativa</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>
              </div>

              {/* Data agendada */}
              {editing.schedule_type === 'scheduled' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Data e hora do disparo</label>
                  <input type="datetime-local" value={editing.scheduled_at || ''}
                    onChange={e => setEditing(p => ({ ...p!, scheduled_at: e.target.value }))}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
                </div>
              )}

              {/* Gatilho */}
              {editing.schedule_type === 'triggered' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Evento gatilho</label>
                  <select value={editing.trigger_event || ''} onChange={e => setEditing(p => ({ ...p!, trigger_event: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="">Selecione um gatilho</option>
                    <option value="inactive_30_days">Cliente inativo há 30 dias</option>
                    <option value="inactive_60_days">Cliente inativo há 60 dias</option>
                    <option value="after_consultation">Após consulta</option>
                    <option value="days_since_purchase">X dias após compra</option>
                    <option value="post_consultation">Pós-atendimento</option>
                    <option value="limit_threshold">Limite do plano atingido</option>
                    <option value="credits_low">Créditos IA abaixo de 20%</option>
                    <option value="after_purchase">Após compra de produto</option>
                    <option value="weekly">Semanal automático</option>
                    <option value="trial_expired">Trial expirado</option>
                  </select>
                </div>
              )}

              {/* Seleção de profissionais */}
              {editing.target_audience === 'selected_professionals' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    Profissionais selecionados ({editing.selected_professionals?.length || 0})
                  </label>
                  <input placeholder={t('campaigns.search_placeholder')} value={profSearch} onChange={e => setProfSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {filteredProfs.map(p => {
                      const sel = editing.selected_professionals?.includes(p.id)
                      return (
                        <div key={p.id} onClick={() => {
                          const cur = editing.selected_professionals || []
                          setEditing(prev => ({ ...prev!, selected_professionals: sel ? cur.filter(id => id !== p.id) : [...cur, p.id] }))
                        }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: sel ? '#f0fdfa' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? '#0D6E6E' : '#cbd5e1'}`, background: sel ? '#0D6E6E' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {sel && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{p.name}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{p.email}</p>
                          </div>
                          {p.plan && <span style={{ marginLeft: 'auto', fontSize: 10, background: '#f0fdfa', color: '#0D6E6E', padding: '2px 7px', borderRadius: 10 }}>{p.plan}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Template da mensagem */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Template da mensagem
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>Use {'{nome}'}, {'{produto}'}, {'{link}'} etc.</span>
                </label>
                <textarea value={editing.message_template || ''} rows={5}
                  placeholder={t('campaigns.modal_template_placeholder')}
                  onChange={e => setEditing(p => ({ ...p!, message_template: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {/* Toggle notificar profissional */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <button onClick={() => setEditing(p => ({ ...p!, notify_professional: !p!.notify_professional }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 40, height: 22, borderRadius: 11, background: editing.notify_professional ? '#0D6E6E' : '#cbd5e1', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: editing.notify_professional ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </button>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', margin: 0 }}>Notificar profissional sobre o disparo</p>
                  <p style={{ fontSize: 11, color: '#0284c7', margin: '2px 0 0' }}>O profissional receberá um aviso que a campanha foi disparada para os clientes dele</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => { setShowModal(false); setEditing(null) }}
                style={{ padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                Cancelar
              </button>
              <button onClick={saveCampaign} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94a3b8' : '#0D6E6E', color: '#fff', border: 'none' }}>
                <Send size={14} /> {saving ? 'Salvando...' : editing.id ? 'Salvar campanha' : 'Criar campanha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}