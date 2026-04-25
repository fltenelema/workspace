import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { to: '/catalogos/bloques', icon: '🗺️', label: 'Bloques' },
      { to: '/catalogos/cultivos', icon: '🌱', label: 'Cultivos' },
      { to: '/catalogos/clientes', icon: '🤝', label: 'Clientes' },
      { to: '/catalogos/personal', icon: '👷', label: 'Personal' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', icon: '👥', label: 'Usuarios', adminOnly: true },
    ],
  },
]

const roleLabel: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador', USER: 'Usuario' }
const roleBg: Record<string, string> = { SUPER_ADMIN: 'bg-purple-100 text-purple-700', ADMIN: 'bg-blue-100 text-blue-700', USER: 'bg-gray-100 text-gray-600' }

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
            const visibleItems = group.items.filter(item =>
              !('adminOnly' in item && item.adminOnly) ||
              user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
            )
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

      <main className="flex-1 overflow-y-auto">
        <div className="p-7">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
