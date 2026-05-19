import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas'
      const translated = msg === 'Credenciais inválidas ou acesso não autorizado' ? t('errors.invalid_credentials') : msg
      setError(translated)
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
              { icon: '📊', text: 'Métricas financeiras em tempo real' },
              { icon: '👥', text: 'Gestão de profissionais e planos' },
              { icon: '🤖', text: 'Controle de agentes de IA' },
              { icon: '🏆', text: 'Programa de embaixadores' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div style={{
        width: 480, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
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

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#cbd5e1' }}>
            {t('login.restricted')}
          </p>
        </div>
      </div>
    </div>
  )
}