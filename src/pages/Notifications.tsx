import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, X, Send, ChevronDown, ChevronUp, Filter,
  Bell, Info, AlertTriangle, AlertCircle, CheckCircle, Sparkles,
  Users, Clock, Smartphone, MessageCircle, GitMerge
} from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '../i18n'

type NotifType = 'info' | 'alert' | 'warning' | 'success' | 'update'
type Channel = 'push_only' | 'push_with_whatsapp_fallback' | 'whatsapp_only'

interface ProfWithPrefs {
  id: string
  name: string
  email: string
  push_enabled: boolean
  whatsapp_enabled: boolean
}

interface Broadcast {
  broadcast_id: string
  title: string
  body: string
  type: NotifType
  priority: number
  recipient_count: number
  read_count: number
  sent_at: string
}

const TYPE_CONFIG_DEFAULTS: Record<NotifType, { color: string; bg: string; border: string; icon: any }> = {
  info:    { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: Info },
  alert:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: AlertTriangle },
  warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: AlertCircle },
  success: { color: '#16a34a', bg: '#f0fdf4', border: '#a7f3d0', icon: CheckCircle },
  update:  { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: Sparkles },
}

const NOTIF_TYPES: NotifType[] = ['info', 'alert', 'warning', 'success', 'update']

function normalizeNotifType(value: unknown): NotifType {
  return typeof value === 'string' && NOTIF_TYPES.includes(value as NotifType)
    ? value as NotifType
    : 'info'
}

export function NotificationsPage() {
  const { t } = useI18n()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [professionals, setProfessionals] = useState<ProfWithPrefs[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [profSearch, setProfSearch] = useState('')
  const [selectedProfs, setSelectedProfs] = useState<string[]>([])
  const [audienceType, setAudienceType] = useState<'all' | 'selected'>('all')
  const [showAllBroadcasts, setShowAllBroadcasts] = useState(false)

  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info' as NotifType,
    priority: 5,
    channel: 'push_only' as Channel,
  })

  const CHANNEL_OPTIONS: { value: Channel; labelKey: string; descKey: string; icon: any; color: string }[] = [
    { value: 'push_only',                  labelKey: 'notifications.channel_push_only',    descKey: 'notifications.channel_push_only_desc',    icon: Smartphone,     color: '#0284c7' },
    { value: 'push_with_whatsapp_fallback', labelKey: 'notifications.channel_push_whatsapp', descKey: 'notifications.channel_push_whatsapp_desc', icon: GitMerge,       color: '#0D6E6E' },
    { value: 'whatsapp_only',              labelKey: 'notifications.channel_whatsapp_only', descKey: 'notifications.channel_whatsapp_only_desc', icon: MessageCircle,  color: '#16a34a' },
  ]

  const getTypeConfig = () => ({
    info:    { ...TYPE_CONFIG_DEFAULTS.info, label: t('notifications.broadcast_type_info') },
    alert:   { ...TYPE_CONFIG_DEFAULTS.alert, label: t('notifications.broadcast_type_alert') },
    warning: { ...TYPE_CONFIG_DEFAULTS.warning, label: t('notifications.broadcast_type_warning') },
    success: { ...TYPE_CONFIG_DEFAULTS.success, label: t('notifications.broadcast_type_success') },
    update:  { ...TYPE_CONFIG_DEFAULTS.update, label: t('notifications.broadcast_type_update') },
  })

  useEffect(() => { fetchAll() }, [])

  const deleteOldBroadcasts = async (daysOld: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-notifications', {
        body: { action: 'delete_old', days_old: daysOld },
      })

      if (error) throw error
      if (!data?.deleted) {
        toast.info(t('notifications.toast_clear_none', { days: daysOld }))
        return
      }
      toast.success(`${data.deleted} ${t('notifications.toast_clear_success')}`)
      await fetchAll()
    } catch (e) {
      console.error('Erro ao limpar:', e)
      toast.error(t('notifications.toast_clear_error'))
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-notifications', {
        body: { action: 'list' },
      })

      if (error) throw error

      setProfessionals(data?.professionals || [])
      setBroadcasts((data?.broadcasts || []).map((broadcast: Broadcast) => ({
        ...broadcast,
        type: normalizeNotifType(broadcast.type),
      })))
    } catch (e) {
      console.error('Erro ao buscar broadcasts:', e)
    } finally {
      setLoading(false)
    }
  }

  const sendBroadcast = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error(t('notifications.toast_title_required'))
      return
    }

    setSending(true)
    try {
      const targetIds = audienceType === 'all'
        ? professionals.map(p => p.id)
        : selectedProfs

      if (targetIds.length === 0) {
        toast.error(t('notifications.toast_select_profs'))
        setSending(false)
        return
      }

      // Invocar Edge Function admin-broadcast (usa service_role, ignora RLS)
      const { data, error } = await supabase.functions.invoke('admin-broadcast', {
        body: {
          professional_ids: targetIds,
          title: form.title,
          body: form.body,
          type: form.type,
          priority: form.priority,
          channel: form.channel,
        },
      })

      if (error) throw error

      const result = data as any
      const pushCount = result?.pushed || 0
      const waCount = result?.whatsapp_sent || 0

      const parts: string[] = []
      if (pushCount > 0) parts.push(`${pushCount} push`)
      if (waCount > 0) parts.push(`${waCount} WhatsApp`)
      const message = parts.length > 0
        ? t('notifications.toast_sent_channels', { parts: parts.join(' + '), total: targetIds.length })
        : t('notifications.toast_saved_db', { count: targetIds.length })

      toast.success(message)
      setShowModal(false)
      setForm({ title: '', body: '', type: 'info', priority: 5, channel: 'push_only' })
      setSelectedProfs([])
      setAudienceType('all')
      await fetchAll()
    } catch (e) {
      console.error('Erro ao enviar broadcast:', e)
      toast.error(t('notifications.toast_send_error'))
    } finally {
      setSending(false)
    }
  }

  const filteredProfs = professionals.filter(p =>
    p.name.toLowerCase().includes(profSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(profSearch.toLowerCase())
  )

  // KPIs
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentBroadcasts = broadcasts.filter(b => new Date(b.sent_at) > thirtyDaysAgo)
  const displayBroadcasts = showAllBroadcasts ? broadcasts : recentBroadcasts

  const totalBroadcasts = broadcasts.length
  const totalRecipients = displayBroadcasts.reduce((s, b) => s + b.recipient_count, 0)
  const totalRead = displayBroadcasts.reduce((s, b) => s + b.read_count, 0)
  const readRate = totalRecipients > 0 ? ((totalRead / totalRecipients) * 100).toFixed(0) : '0'
  const hiddenCount = totalBroadcasts - recentBroadcasts.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Título */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('notifications.title')}</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{t('notifications.subtitle')}</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: t('notifications.kpi_total'), value: totalBroadcasts, color: '#0D6E6E' },
          { label: t('notifications.kpi_recipients'), value: totalRecipients.toLocaleString('pt-BR'), color: '#0284c7' },
          { label: t('notifications.kpi_read_rate'), value: `${readRate}%`, color: '#16a34a' },
          { label: t('notifications.kpi_active_profs'), value: professionals.length, color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#64748b', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + botões */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={14} color="#64748b" />
        {hiddenCount > 0 && (
          <button onClick={() => setShowAllBroadcasts(!showAllBroadcasts)}
            style={{ padding: '6px 12px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {showAllBroadcasts ? t('notifications.show_recent') : t('notifications.show_old', { count: hiddenCount })}
          </button>
        )}
        {broadcasts.length > 50 && (
          <button onClick={() => deleteOldBroadcasts(30)}
            style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t('notifications.clear_old')}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> {t('notifications.new_notification')}
        </button>
      </div>

      {/* Lista de broadcasts */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>{t('notifications.loading')}</div>
      ) : displayBroadcasts.length === 0 ? (
        <div style={{ padding: 64, textAlign: 'center', background: '#f8fafc', borderRadius: 14, border: '2px dashed #e2e8f0' }}>
          <Bell size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px' }}>{showAllBroadcasts ? t('notifications.empty_title') : t('notifications.empty_recent')}</p>
          <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 20px' }}>{t('notifications.empty_message')}</p>
          <button onClick={() => setShowModal(true)}
            style={{ padding: '9px 20px', background: '#0D6E6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {t('notifications.send_button')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayBroadcasts.map(bcast => {
            const TYPE_CONFIG = getTypeConfig()
            const cfg = TYPE_CONFIG[bcast.type]
            const TypeIcon = cfg.icon
            const isOpen = expandedId === bcast.broadcast_id
            const readPct = bcast.recipient_count > 0 ? Math.round((bcast.read_count / bcast.recipient_count) * 100) : 0

            return (
              <div key={bcast.broadcast_id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isOpen ? cfg.color : '#e2e8f0'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                {/* Linha principal */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Ícone tipo */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TypeIcon size={20} color={cfg.color} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{bcast.title}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}>
                        P{bcast.priority}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={14} /> {bcast.recipient_count} {t('notifications.recipients_label')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} /> {new Date(bcast.sent_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div style={{ minWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{t('notifications.read_label')}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{readPct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: cfg.color, width: `${readPct}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Toggle expand */}
                  <button onClick={() => setExpandedId(isOpen ? null : bcast.broadcast_id)}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', background: '#f8fafc', color: '#64748b' }}>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Painel expandido */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${cfg.border}`, background: cfg.bg, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Corpo */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', margin: '0 0 8px' }}>{t('notifications.message_label')}</p>
                      <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: `1px solid ${cfg.border}`, fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {bcast.body}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {[
                        { label: t('notifications.read_label'), value: bcast.read_count, color: cfg.color },
                        { label: t('notifications.not_read_label'), value: bcast.recipient_count - bcast.read_count, color: '#94a3b8' },
                        { label: t('notifications.rate_label'), value: `${readPct}%`, color: cfg.color },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: `1px solid ${cfg.border}`, textAlign: 'center' }}>
                          <p style={{ fontSize: 16, fontWeight: 900, color, margin: '0 0 2px' }}>{value}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══════ MODAL CRIAR ══════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{t('notifications.new_notification')}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Linha 1: título + tipo */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('notifications.broadcast_title')} *</label>
                  <input value={form.title} placeholder={t('notifications.title_placeholder')}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('notifications.broadcast_type')}</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as NotifType }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}>
                    {(Object.entries(getTypeConfig()) as [NotifType, any][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prioridade */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  {t('notifications.broadcast_priority')}: <span style={{ color: '#0D6E6E', fontWeight: 700 }}>{form.priority}</span>
                </label>
                <input type="range" min="1" max="10" value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>

              {/* Corpo */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('notifications.broadcast_message')} *</label>
                <textarea value={form.body} rows={5} placeholder={t('notifications.broadcast_placeholder')}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {/* Canal de envio */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  {t('notifications.broadcast_channel')}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CHANNEL_OPTIONS.map(opt => {
                    const selected = form.channel === opt.value
                    const Icon = opt.icon
                    return (
                      <div key={opt.value} onClick={() => setForm(p => ({ ...p, channel: opt.value }))}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                          borderRadius: 10, border: `2px solid ${selected ? opt.color : '#e2e8f0'}`,
                          background: selected ? `${opt.color}08` : '#fafafa',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: selected ? opt.color : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <Icon size={16} color={selected ? '#fff' : '#94a3b8'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: selected ? opt.color : '#374151', margin: '0 0 2px' }}>
                            {t(opt.labelKey)}
                          </p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                            {t(opt.descKey)}
                          </p>
                        </div>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? opt.color : '#cbd5e1'}`, background: selected ? opt.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 6 }}>
                          {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Público-alvo */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>{t('notifications.audience')}</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {(['all', 'selected'] as const).map(opt => (
                    <button key={opt} onClick={() => { setAudienceType(opt); setSelectedProfs([]); }}
                      style={{
                        flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: audienceType === opt ? '#0D6E6E' : '#fff', color: audienceType === opt ? '#fff' : '#475569', cursor: 'pointer'
                      }}>
                      {opt === 'all' ? t('notifications.audience_all') : t('notifications.audience_selected')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seleção de profissionais */}
              {audienceType === 'selected' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    {t('notifications.selected_count', { count: selectedProfs.length })}
                  </label>
                  <input placeholder={t('notifications.search_placeholder')} value={profSearch} onChange={e => setProfSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {filteredProfs.map(p => {
                      const sel = selectedProfs.includes(p.id)
                      return (
                        <div key={p.id} onClick={() => {
                          setSelectedProfs(prev => sel ? prev.filter(id => id !== p.id) : [...prev, p.id])
                        }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: sel ? '#f0fdfa' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? '#0D6E6E' : '#cbd5e1'}`, background: sel ? '#0D6E6E' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {sel && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{p.name}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{p.email}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                {t('notifications.modal_cancel')}
              </button>
              <button onClick={sendBroadcast} disabled={sending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', background: sending ? '#94a3b8' : '#0D6E6E', color: '#fff', border: 'none' }}>
                <Send size={14} /> {sending ? t('notifications.modal_sending') : t('notifications.modal_send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
