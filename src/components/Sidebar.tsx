import { useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Award, Bot, Megaphone, BarChart3, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { admin, signOut } = useAuth()

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/profissionais', icon: Users, label: 'Profissionais' },
    { path: '/planos', icon: CreditCard, label: 'Planos' },
    { path: '/embaixadores', icon: Award, label: 'Embaixadores' },
    { path: '/agentes', icon: Bot, label: 'Agentes de Sistema' },
    { path: '/campanhas', icon: Megaphone, label: 'Campanhas' },
    { path: '/metricas', icon: BarChart3, label: 'Métricas' },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo e Badge */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: '#0D6E6E' }}>
            iaprafaturar
          </span>
          <span className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: '#F4A623' }}>
            Admin
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  }`}
                  style={isActive(item.path) ? { borderLeft: `4px solid #0D6E6E`, paddingLeft: '12px' } : {}}
                >
                  <Icon size={20} style={isActive(item.path) ? { color: '#0D6E6E' } : {}} className="text-gray-600" />
                  <span className={isActive(item.path) ? 'font-semibold' : ''} style={isActive(item.path) ? { color: '#0D6E6E' } : {}}>
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Rodapé com Admin Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3">
          <p className="text-sm text-gray-600">Conectado como</p>
          <p className="font-semibold text-gray-900">{admin?.name}</p>
          <p className="text-xs text-gray-500">{admin?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#0D6E6E' }}
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}
