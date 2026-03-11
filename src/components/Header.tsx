import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export function Header() {
  const location = useLocation()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getPageTitle = () => {
    const titles: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/profissionais': 'Profissionais',
      '/planos': 'Planos',
      '/embaixadores': 'Embaixadores',
      '/agentes': 'Agentes de Sistema',
      '/campanhas': 'Campanhas',
      '/metricas': 'Métricas',
    }
    return titles[location.pathname] || 'Página'
  }

  const formatDate = () => {
    return currentTime.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      <h1 className="text-2xl font-bold" style={{ color: '#1A1A2E' }}>
        {getPageTitle()}
      </h1>
      <p className="text-sm text-gray-600">
        {formatDate()}
      </p>
    </header>
  )
}
