import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Save,
  Server,
  ShieldCheck,
  TestTube2,
  XCircle,
} from 'lucide-react'
import * as Sentry from '@sentry/react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '@/i18n'

type FieldKey = 'evolution_api_url' | 'evolution_global_key' | 'master_instance_name'

const page: CSSProperties = {
  minHeight: 'calc(100vh - 72px)',
  padding: '28px 32px 56px',
  background: '#f6f8fb',
}

const shell: CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 320px',
  gap: 20,
  alignItems: 'start',
}

const panel: CSSProperties = {
  background: '#fff',
  border: '1px solid #dbe3ee',
  borderRadius: 10,
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
  overflow: 'hidden',
}

const panelHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  padding: '18px 20px',
  borderBottom: '1px solid #e8edf4',
  background: '#fbfcfe',
}

const formGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
}

const inputStyle: CSSProperties = {
  width: '100%',
  height: 42,
  boxSizing: 'border-box',
  border: '1px solid #cfd8e6',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
  fontSize: 14,
  padding: '0 12px',
  outline: 'none',
}

const mutedText: CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.5,
  margin: 0,
}

const primaryButton: CSSProperties = {
  height: 40,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: 'none',
  borderRadius: 8,
  background: '#0D6E6E',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  padding: '0 16px',
  cursor: 'pointer',
}

const secondaryButton: CSSProperties = {
  ...primaryButton,
  background: '#0f172a',
}

const iconButton: CSSProperties = {
  width: 42,
  height: 42,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #cfd8e6',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  cursor: 'pointer',
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: '#e8f5f5', color: '#0D6E6E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{title}</h2>
        <p style={{ ...mutedText, marginTop: 3 }}>{subtitle}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, color: '#334155', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{label}</label>
      {children}
      {hint && <p style={{ ...mutedText, marginTop: 6, fontSize: 12 }}>{hint}</p>}
    </div>
  )
}

function StatusItem({
  tone,
  icon,
  text,
}: {
  tone: 'good' | 'warn' | 'bad'
  icon: ReactNode
  text: string
}) {
  const colors = {
    good: { bg: '#ecfdf5', border: '#bbf7d0', text: '#166534' },
    warn: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    bad: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  }[tone]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, fontWeight: 700 }}>
      {icon}
      <span>{text}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { admin } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const [formData, setFormData] = useState({
    evolution_api_url: '',
    evolution_global_key: '',
    master_instance_name: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error
      if (data) {
        setConfigId(data.id)
        setFormData({
          evolution_api_url: data.evolution_api_url || '',
          evolution_global_key: data.evolution_global_key || '',
          master_instance_name: data.master_instance_name || '',
        })
      }
    } catch (error) {
      console.error('Erro ao buscar configuracoes globais:', error)
      toast.error(t('settings.toast_config_load_error'))
    } finally {
      setLoading(false)
    }
  }

  const setField = (key: FieldKey, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!configId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          evolution_api_url: formData.evolution_api_url,
          evolution_global_key: formData.evolution_global_key,
          master_instance_name: formData.master_instance_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', configId)

      if (error) throw error
      toast.success(t('settings.toast_config_updated'))
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error(t('settings.toast_config_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword.trim()) {
      toast.error(t('settings.toast_password_empty'))
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t('settings.toast_password_short'))
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('settings.toast_password_mismatch'))
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast.success(t('settings.toast_password_updated'))
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      toast.error(t('settings.toast_password_error'))
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
        {t('settings.loading')}
      </div>
    )
  }

  const passwordsStarted = Boolean(passwordForm.newPassword || passwordForm.confirmPassword)
  const passwordValid = passwordForm.newPassword.length >= 6
  const passwordMatches = passwordForm.newPassword === passwordForm.confirmPassword && Boolean(passwordForm.confirmPassword)
  const canChangePassword = passwordValid && passwordMatches && !changingPassword

  return (
    <div style={page}>
      <div style={{ maxWidth: 1180, margin: '0 auto 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <p style={{ margin: '0 0 6px', color: '#0D6E6E', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Admin Console</p>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 30, lineHeight: 1.1, fontWeight: 950 }}>{t('settings.platform_title')}</h1>
            <p style={{ ...mutedText, marginTop: 8 }}>Credenciais da plataforma, segurança da conta e monitoramento.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid #dbe3ee', borderRadius: 10 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e' }} />
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Conectado como</p>
              <p style={{ margin: 0, color: '#0f172a', fontSize: 14, fontWeight: 900 }}>{admin?.name || 'Admin'}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={shell}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section style={panel}>
            <div style={panelHeader}>
              <SectionTitle
                icon={<Server size={19} />}
                title="Evolution API"
                subtitle="Motor de WhatsApp usado pelas rotinas administrativas."
              />
              <button onClick={handleSave} disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.65 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="URL da API" hint="Ex: https://evo.israel-miranda.cloud/manager/">
                <input
                  value={formData.evolution_api_url}
                  onChange={e => setField('evolution_api_url', e.target.value)}
                  placeholder="https://sua-api.evolution.ai"
                  style={inputStyle}
                />
              </Field>

              <div style={formGrid}>
                <Field label="Chave global">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.evolution_global_key}
                      onChange={e => setField('evolution_global_key', e.target.value)}
                      placeholder="Chave global da Evolution"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => setShowApiKey(prev => !prev)} aria-label={showApiKey ? 'Ocultar chave' : 'Mostrar chave'} style={iconButton}>
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>

                <Field label="Instância master" hint="Nome único da instância no Evolution.">
                  <input
                    value={formData.master_instance_name}
                    onChange={e => setField('master_instance_name', e.target.value)}
                    placeholder="instancia-master"
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section style={panel}>
            <div style={panelHeader}>
              <SectionTitle
                icon={<Lock size={19} />}
                title="Alterar senha"
                subtitle="Atualize a senha do administrador autenticado."
              />
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10, padding: 13, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <ShieldCheck size={18} color="#0D6E6E" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={mutedText}>Você será desconectado após alterar a senha. A nova senha será usada no próximo acesso.</p>
              </div>

              <div style={formGrid}>
                <Field label="Nova senha">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => setShowNewPassword(prev => !prev)} aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'} style={iconButton}>
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirmar senha">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && canChangePassword) handleChangePassword()
                      }}
                      placeholder="Repita a nova senha"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => setShowConfirmPassword(prev => !prev)} aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'} style={iconButton}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
              </div>

              {passwordsStarted && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  {passwordValid ? (
                    <StatusItem tone="good" icon={<CheckCircle2 size={17} />} text="Comprimento adequado" />
                  ) : (
                    <StatusItem tone="warn" icon={<AlertCircle size={17} />} text="Mínimo 6 caracteres" />
                  )}
                  {passwordMatches ? (
                    <StatusItem tone="good" icon={<CheckCircle2 size={17} />} text="Senhas coincidem" />
                  ) : (
                    <StatusItem tone="bad" icon={<XCircle size={17} />} text="Senhas não coincidem" />
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleChangePassword}
                  disabled={!canChangePassword}
                  style={{ ...secondaryButton, opacity: canChangePassword ? 1 : 0.45, cursor: canChangePassword ? 'pointer' : 'not-allowed' }}
                >
                  <KeyRound size={16} />
                  {changingPassword ? 'Alterando...' : 'Alterar senha'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section style={panel}>
            <div style={{ padding: 18 }}>
              <SectionTitle
                icon={<TestTube2 size={19} />}
                title="Monitoramento"
                subtitle="Envie um erro controlado para validar o Sentry."
              />
              <div style={{ marginTop: 16, padding: 13, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <p style={{ ...mutedText, color: '#92400e' }}>Este teste registra uma exception proposital no dashboard do Sentry.</p>
              </div>
              <button
                onClick={() => {
                  Sentry.captureException(new Error('Teste Sentry - erro proposital para validacao'))
                  toast.success('Erro enviado para Sentry - verifique o dashboard')
                }}
                style={{ ...primaryButton, width: '100%', marginTop: 14, background: '#d97706' }}
              >
                <TestTube2 size={16} />
                Disparar erro de teste
              </button>
            </div>
          </section>

          <section style={{ ...panel, background: '#0f172a', borderColor: '#0f172a' }}>
            <div style={{ padding: 18 }}>
              <p style={{ margin: '0 0 6px', color: '#99f6e4', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Escopo</p>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 900 }}>Configurações globais</h3>
              <p style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
                Alterações aqui afetam integrações administrativas da plataforma. Dados de profissionais e clientes continuam isolados no CRM.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
