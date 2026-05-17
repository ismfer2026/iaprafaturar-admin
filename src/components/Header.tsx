import { useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cadastro': 'Cadastro',
  '/profissionais': 'Profissionais',
  '/planos': 'Planos',
  '/embaixadores': 'Embaixadores',
  '/agentes': 'Agentes de Sistema',
  '/campanhas': 'Campanhas',
  '/metricas': 'Métricas',
  '/nexus': 'Nexus Sphere',
  '/melhorias': 'Melhorias',
  '/configuracoes': 'Configurações',
}

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const title = pageTitles[location.pathname] || 'Admin'

  const now = new Date().toLocaleDateString('pt-BR', {
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
          aria-label={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
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