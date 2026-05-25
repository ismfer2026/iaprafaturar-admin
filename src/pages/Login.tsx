import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { supabase } from '../lib/supabase'
import { Globe } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'credentials'>('email')
  const [resetEmail, setResetEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { t, locale, setLocale, localeOptions } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const TIMEOUT_MS = 20000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(t('errors.timeout'))), TIMEOUT_MS)
    )

    try {
      await Promise.race([signIn(email, password), timeoutPromise])
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas'
      const translated = msg === 'Credenciais inválidas ou acesso não autorizado'
        ? t('errors.invalid_credentials')
        : msg
      setError(translated)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setResetEmail(email)
    setForgotPasswordStep('credentials')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (newPassword !== confirmPassword) {
      setError('Senhas não coincidem')
      return
    }

    if (newPassword.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      // Validar senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resetEmail,
        password: currentPassword,
      })

      if (signInError) {
        setError('Senha atual incorreta')
        setLoading(false)
        return
      }

      // Fazer logout após validação
      await supabase.auth.signOut()

      // Chamar edge function para atualizar senha com service role
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: resetEmail,
            newPassword: newPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao atualizar senha')
      } else {
        setSuccessMessage('Senha atualizada com sucesso!')
        setTimeout(() => {
          setShowForgotPassword(false)
          setForgotPasswordStep('email')
          setResetEmail('')
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setEmail('')
          setPassword('')
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Lado esquerdo — teal */}
      <div style={{
        flex: 1, background: 'linear-gradient(145deg, #0D6E6E 0%, #094b4b 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>iaprafaturar</span>
            <span style={{ background: '#F4A623', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6 }}>Admin</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, margin: 0 }}>
            {t('login.panel_subtitle')}
          </p>

          <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '📊', key: 'login.features.metrics' },
              { icon: '👥', key: 'login.features.professionals' },
              { icon: '🤖', key: 'login.features.agents' },
              { icon: '🏆', key: 'login.features.ambassadors' },
            ].map(({ icon, key }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{t(key as any)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div style={{
        width: 480, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48,
        position: 'relative',
      }}>
        {/* Language selector */}
        <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Globe size={18} style={{ color: '#94a3b8' }} />
          <select
            value={locale}
            onChange={e => setLocale(e.target.value as any)}
            style={{
              padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0',
              borderRadius: 6, background: '#fff', cursor: 'pointer',
              color: '#64748b', outline: 'none',
            }}
          >
            {localeOptions.map(opt => (
              <option key={opt.locale} value={opt.locale}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: '100%', maxWidth: 360 }}>
          {!showForgotPassword ? (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E', margin: '0 0 6px' }}>{t('login.title')}</h2>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 36px' }}>
                {t('login.subtitle')}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('login.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('login.email_placeholder')}
                    required
                    style={{
                      width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                      borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0D6E6E'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('login.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('login.password_placeholder')}
                    required
                    style={{
                      width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                      borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0D6E6E'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#0D6E6E',
                    color: '#fff', fontWeight: 700, fontSize: 15, border: 'none',
                    borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s', marginTop: 4,
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#094b4b' }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#0D6E6E' }}
                >
                  {loading ? t('login.submitting') : t('login.submit')}
                </button>
              </form>

              <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#0D6E6E' }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setError(''); setPassword('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0D6E6E', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {t('login.forgot_password_link')}
                </button>
              </p>

              <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#cbd5e1' }}>
                {t('login.restricted')}
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E', margin: '0 0 6px' }}>{t('login.forgot_password_title')}</h2>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 36px' }}>
                {t('login.forgot_password_subtitle')}
              </p>

              {forgotPasswordStep === 'email' ? (
                <form onSubmit={handleForgotPasswordEmail} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('login.email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('login.forgot_password_placeholder')}
                      required
                      style={{
                        width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0D6E6E'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%', padding: '12px', background: '#0D6E6E',
                      color: '#fff', fontWeight: 700, fontSize: 15, border: 'none',
                      borderRadius: 8, cursor: 'pointer',
                      transition: 'background 0.2s', marginTop: 4,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#094b4b' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0D6E6E' }}
                  >
                    {t('login.forgot_password_button')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Senha Atual</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0D6E6E'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0D6E6E'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0D6E6E'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                      {error}
                    </div>
                  )}

                  {successMessage && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d' }}>
                      {successMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#0D6E6E',
                      color: '#fff', fontWeight: 700, fontSize: 15, border: 'none',
                      borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s', marginTop: 4,
                    }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#094b4b' }}
                    onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#0D6E6E' }}
                  >
                    {loading ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </form>
              )}

              <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#0D6E6E' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordStep('email')
                    setError('')
                    setSuccessMessage('')
                    setEmail('')
                    setResetEmail('')
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0D6E6E', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {t('login.forgot_password_back')}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}