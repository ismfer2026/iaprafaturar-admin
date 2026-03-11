import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profissionais': 'Profissionais',
  '/planos': 'Planos',
  '/embaixadores': 'Embaixadores',
  '/agentes': 'Agentes de Sistema',
  '/campanhas': 'Campanhas',
  '/metricas': 'Métricas',
}

export function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Admin'

  const now = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <header style={{
      position: 'fixed', top: 0, left: 256, right: 0, zIndex: 40,
      height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{title}</h1>
      <span style={{ fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' }}>{now}</span>
    </header>
  )
}