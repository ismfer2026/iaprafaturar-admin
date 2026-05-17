import { useLocation, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Award, Bot, Megaphone, BarChart3, LogOut, Settings, Shield, Rocket, Bell } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// 🆕 ADICIONADO: { path: '/configuracoes', icon: Settings, label: 'Configurações' }
const navItems =[
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/nexus', icon: Shield, label: 'Nexus Sphere' },
  { path: '/profissionais', icon: Users, label: 'Profissionais' },
  { path: '/planos', icon: CreditCard, label: 'Planos' },
  { path: '/embaixadores', icon: Award, label: 'Embaixadores' },
  { path: '/agentes', icon: Bot, label: 'Agentes de Sistema' },
  { path: '/campanhas', icon: Megaphone, label: 'Campanhas' },
  { path: '/notificacoes', icon: Bell, label: 'Notificações' },
  { path: '/metricas', icon: BarChart3, label: 'Métricas' },
  { path: '/melhorias', icon: Rocket, label: 'Melhorias' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { admin, signOut } = useAuth()

  const handleLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar do painel administrativo?')) {
      return
    }
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      aria-label="Navegação do painel"
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: 256, background: '#0D6E6E', color: '#fff',
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>iaprafaturar</span>
          <span style={{ background: '#F4A623', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Menu principal" style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', borderRadius: 8, marginBottom: 2,
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                color: '#fff', textDecoration: 'none', textAlign: 'left',
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
            >
              <Icon size={17} style={{ opacity: active ? 1 : 0.8 }} aria-hidden={true} />
              <span>{label}</span>
              {active && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#F4A623' }} aria-hidden={true} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Conectado como</p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 0' }}>{admin?.name ?? 'Admin'}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin?.email ?? ''}</p>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Sair da conta"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 8, background: '#fff', color: '#0D6E6E',
            fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
          }}
        >
          <LogOut size={16} aria-hidden={true} />
          Sair
        </button>
      </div>
    </aside>
  )
}