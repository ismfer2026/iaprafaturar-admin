import { useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../i18n'

const pageTitleKeys: Record<string, string> = {
  '/dashboard': 'navigation.dashboard',
  '/profissionais': 'navigation.professionals',
  '/planos': 'navigation.plans',
  '/embaixadores': 'navigation.ambassadors',
  '/agentes': 'navigation.agents',
  '/campanhas': 'navigation.campaigns',
  '/metricas': 'navigation.metrics',
  '/nexus': 'navigation.nexus',
  '/melhorias': 'navigation.improvements',
  '/configuracoes': 'navigation.settings',
}

const localeMap = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'es-AL': 'es-AR',
}

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { t, locale } = useI18n()

  const titleKey = pageTitleKeys[location.pathname]
  const title = titleKey ? t(titleKey) : 'Admin'

  const dateLocale = localeMap[locale] || 'pt-BR'
  const now = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const isoDate = new Date().toISOString().split('T')[0]

  return (
    <header style={{
      position: 'fixed', top: 0, left: 256, right: 0, zIndex: 40,
      height: 64, background: 'var(--background)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <time dateTime={isoDate} style={{ fontSize: 13, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
          {now}
        </time>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? t('shell.toggle_dark') : t('shell.toggle_light')}
          style={{
            background: 'var(--secondary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--foreground)',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  )
}