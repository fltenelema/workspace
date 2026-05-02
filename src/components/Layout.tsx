import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import SearchBar from './SearchBar'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/ciclos',   icon: '🌾', label: 'Ciclos' },
      { to: '/tareas',       icon: '✅', label: 'Tareas',       supervisorVisible: true },
      { to: '/conocimiento', icon: '📚', label: 'Conocimiento', supervisorVisible: true },
      { to: '/reportes',     icon: '📊', label: 'Reportes' },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { to: '/catalogos/bloques', icon: '🗺️', label: 'Bloques' },
      { to: '/catalogos/cultivos', icon: '🌱', label: 'Cultivos' },
      { to: '/catalogos/clientes', icon: '🤝', label: 'Clientes' },
      { to: '/catalogos/personal', icon: '👷', label: 'Personal' },
      { to: '/catalogos/inventario', icon: '📦', label: 'Inventario' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', icon: '👥', label: 'Usuarios', adminOnly: true },
      { to: '/instancias', icon: '🏢', label: 'Instancias', superAdminOnly: true },
    ],
  },
]

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', USER: 'Usuario',
}
const roleBg: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  SUPERVISOR: 'bg-orange-100 text-orange-700',
  USER: 'bg-gray-100 text-gray-600',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <div>
              <h1 className="text-base font-bold text-green-700 leading-tight">AgroControl</h1>
              <p className="text-xs text-gray-400">Sistema Agrícola</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {navGroups.map(group => {
            if (user?.role === 'SUPERVISOR' && group.label !== 'Principal') {
              const hasSupervisorItem = group.items.some(i => 'supervisorVisible' in i && i.supervisorVisible)
              if (!hasSupervisorItem) return null
            }
            const visibleItems = group.items.filter(item => {
              if ('superAdminOnly' in item && item.superAdminOnly) return user?.role === 'SUPER_ADMIN'
              if ('adminOnly' in item && item.adminOnly) return ['SUPER_ADMIN', 'ADMIN'].includes(user?.role ?? '')
              if (user?.role === 'SUPERVISOR') return 'supervisorVisible' in item && item.supervisorVisible
              return true
            })
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{group.label}</p>
                {visibleItems.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBg[user?.role || 'USER']}`}>
                {roleLabel[user?.role || 'USER']}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-sm text-gray-500 hover:text-red-600 px-2 py-1.5 rounded hover:bg-red-50 transition-colors">
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Instance banner — visible only for non-SUPER_ADMIN users with a tenant */}
        {user && user.role !== 'SUPER_ADMIN' && user.tenantName && (
          <div className="bg-gradient-to-r from-green-700 to-emerald-500 px-6 py-2.5 flex items-center justify-center gap-3 shrink-0">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 shrink-0">
              <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)" />
              <rect x="8" y="22" width="24" height="13" rx="0.5" fill="#92400e" />
              <polygon points="5,22 20,10 35,22" fill="#78350f" />
              <rect x="16" y="27" width="8" height="8" rx="0.5" fill="#78350f" />
              <rect x="9.5" y="24.5" width="5" height="4" rx="0.5" fill="#fef3c7" />
              <rect x="25.5" y="24.5" width="5" height="4" rx="0.5" fill="#fef3c7" />
              <circle cx="32" cy="11" r="3" fill="#fbbf24" />
              <line x1="32" y1="6" x2="32" y2="4" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="36" y1="8" x2="37.5" y2="6.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="37" y1="11" x2="39" y2="11" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-white font-extrabold text-2xl tracking-wide leading-tight drop-shadow">{user.tenantName}</p>
          </div>
        )}

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            <SearchBar />
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
