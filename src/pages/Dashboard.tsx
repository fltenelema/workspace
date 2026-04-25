import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { UserStats } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      client.get('/users/stats').then(res => setStats(res.data)).catch(() => null)
    }
  }, [user])

  const statCards = stats ? [
    { label: 'Total usuarios', value: stats.total, color: 'bg-blue-50 text-blue-700', icon: '👥' },
    { label: 'Usuarios activos', value: stats.active, color: 'bg-green-50 text-green-700', icon: '✅' },
    { label: 'Inactivos', value: stats.inactive, color: 'bg-red-50 text-red-700', icon: '🚫' },
    { label: 'Administradores', value: stats.byRole.ADMIN, color: 'bg-purple-50 text-purple-700', icon: '🔑' },
  ] : []

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">Panel de control del sistema agrícola</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{card.icon}</span>
                <span className={`text-2xl font-bold ${card.color.split(' ')[1]}`}>{card.value}</span>
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modules */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Módulos del sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <Link to="/usuarios" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-green-300 transition-all group">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Gestión de Usuarios</h3>
            <p className="text-sm text-gray-500 mt-1">Administrar usuarios, roles y permisos del sistema</p>
          </Link>
        )}
        {[
          { icon: '🌾', title: 'Cultivos', desc: 'Control y seguimiento de cultivos activos' },
          { icon: '🗺️', title: 'Parcelas', desc: 'Gestión de parcelas y terrenos agrícolas' },
          { icon: '💧', title: 'Riego', desc: 'Control del sistema de riego automatizado' },
          { icon: '🧪', title: 'Insumos', desc: 'Inventario de fertilizantes y agroquímicos' },
          { icon: '📊', title: 'Reportes', desc: 'Reportes y análisis de producción' },
        ].map(m => (
          <div key={m.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm opacity-60 cursor-not-allowed">
            <div className="text-3xl mb-3">{m.icon}</div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-700">{m.title}</h3>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Próximo</span>
            </div>
            <p className="text-sm text-gray-400">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
