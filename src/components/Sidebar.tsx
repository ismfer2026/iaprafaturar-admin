import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Award,
  Bot,
  Megaphone,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const BRAND_TEAL = 'bg-[#0D6E6E]'

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
    <aside
      className={[
        'fixed left-0 top-0 z-50 h-screen w-64',
        BRAND_TEAL,
        'text-white',
        'flex flex-col',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">iaprafaturar</span>
          <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#F4A623] text-white">
            Admin
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <li key={item.path}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={[
                    'w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-left',
                    'transition-colors',
                    active
                      ? 'bg-white/15 ring-1 ring-white/15'
                      : 'hover:bg-white/10',
                  ].join(' ')}
                >
                  <Icon
                    size={18}
                    className={active ? 'text-white' : 'text-white/80'}
                  />
                  <span className={active ? 'font-semibold' : 'font-medium'}>
                    {item.label}
                  </span>

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#F4A623]" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Rodapé */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="mb-3">
          <p className="text-xs text-white/70">Conectado como</p>
          <p className="text-sm font-semibold leading-tight">
            {admin?.name ?? 'Admin'}
          </p>
          <p className="text-xs text-white/70 truncate">
            {admin?.email ?? ''}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={[
            'w-full flex items-center justify-center gap-2',
            'rounded-lg px-4 py-2.5',
            'bg-white text-[#0D6E6E] font-bold',
            'hover:bg-white/90 transition-colors',
          ].join(' ')}
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}