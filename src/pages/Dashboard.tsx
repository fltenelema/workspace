import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { DashboardData, DashboardCycle } from '../types'
import NuevoCicloModal from '../components/modals/NuevoCicloModal'
import CerrarCosechaModal from '../components/modals/CerrarCosechaModal'
import RegistrarVentaModal from '../components/modals/RegistrarVentaModal'
import RegistrarGastoModal from '../components/modals/RegistrarGastoModal'
import AgregarTrabajadorModal from '../components/modals/AgregarTrabajadorModal'

type ModalType = 'nuevo-ciclo' | 'cerrar-cosecha' | 'registrar-venta' | 'registrar-gasto' | 'agregar-trabajador' | null

const ALERT_CONFIG = {
  red: { border: 'border-red-300', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', dot: '🔴', label: 'Urgente' },
  yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', dot: '🟡', label: 'Próxima' },
  green: { border: 'border-gray-200', bg: 'bg-white', badge: 'bg-green-100 text-green-700', dot: '🟢', label: 'Normal' },
}

const QUICK_ACTIONS = [
  { id: 'nuevo-ciclo', icon: '🌱', label: 'Nuevo Ciclo', desc: 'Inicia un nuevo ciclo en un bloque libre', color: 'border-green-200 hover:border-green-400 hover:bg-green-50' },
  { id: 'cerrar-cosecha', icon: '🌾', label: 'Cerrar Cosecha', desc: 'Cierra un ciclo activo y libera el bloque', color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50' },
  { id: 'registrar-venta', icon: '💰', label: 'Registrar Venta', desc: 'Registra una venta de cosecha por clases', color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50' },
  { id: 'registrar-gasto', icon: '📦', label: 'Registrar Gasto', desc: 'Ingresa un gasto del ciclo en curso', color: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50' },
  { id: 'agregar-trabajador', icon: '👷', label: 'Agregar Trabajador', desc: 'Registra días trabajados de un empleado', color: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50' },
] as const

function CycleCard({ cycle }: { cycle: DashboardCycle }) {
  const cfg = ALERT_CONFIG[cycle.alert]
  const dayLabel = cycle.daysUntilHarvest < 0
    ? `Venció hace ${Math.abs(cycle.daysUntilHarvest)} días`
    : cycle.daysUntilHarvest === 0 ? '¡Cosechar hoy!'
    : `${cycle.daysUntilHarvest} días para cosecha`

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{cycle.block.code}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-700 font-medium">{cycle.crop.name}</span>
            {cycle.variety && <span className="text-gray-500 text-sm">{cycle.variety.name}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{cycle.code}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}>
          {cfg.dot} {dayLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
        <div className="bg-white/70 rounded-lg p-2 text-center">
          <p className="font-bold text-green-700">${cycle.revenue.toFixed(0)}</p>
          <p className="text-gray-500">Ingresos</p>
        </div>
        <div className="bg-white/70 rounded-lg p-2 text-center">
          <p className="font-bold text-red-600">${cycle.totalExpenses.toFixed(0)}</p>
          <p className="text-gray-500">Gastos</p>
        </div>
        <div className="bg-white/70 rounded-lg p-2 text-center">
          <p className={`font-bold ${cycle.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            ${cycle.profit.toFixed(0)}
          </p>
          <p className="text-gray-500">Ganancia</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Sembrado: {new Date(cycle.sowingDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
        <span>{cycle.block.area.toLocaleString()} m² · {cycle.salesCount} ventas</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [modal, setModal] = useState<ModalType>(null)

  const load = useCallback(() => {
    client.get<DashboardData>('/dashboard').then(r => setData(r.data)).catch(() => null)
  }, [])

  useEffect(() => { load() }, [load])

  const onSuccess = () => load()

  const stats = data?.stats
  const cycles = data?.cycles ?? []
  const redCycles = cycles.filter(c => c.alert === 'red')
  const yellowCycles = cycles.filter(c => c.alert === 'yellow')
  const greenCycles = cycles.filter(c => c.alert === 'green')

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Sistema de Gestión Agrícola · Panel de Control</p>
      </div>

      {/* Alerts banner */}
      {(stats?.alerts.red ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <p className="font-semibold text-red-800">{stats!.alerts.red} cosecha{stats!.alerts.red > 1 ? 's' : ''} urgente{stats!.alerts.red > 1 ? 's' : ''} (≤ 7 días)</p>
            <p className="text-sm text-red-600">Revisa los ciclos marcados en rojo y registra las ventas pendientes.</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">⚡ Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map(action => (
            <button key={action.id} onClick={() => setModal(action.id as ModalType)}
              className={`bg-white border-2 ${action.color} rounded-xl p-4 text-left transition-all hover:shadow-md active:scale-95`}>
              <div className="text-3xl mb-2">{action.icon}</div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{action.label}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Bloques libres', value: `${stats.freeBlocks}/${stats.totalBlocks}`, icon: '🗺️', color: 'text-blue-700' },
            { label: 'Ciclos activos', value: stats.activeCycles, icon: '🌱', color: 'text-green-700' },
            { label: 'Ingresos totales', value: `$${stats.totalRevenue.toFixed(0)}`, icon: '💰', color: 'text-emerald-700' },
            { label: 'Ganancia neta', value: `$${stats.profit.toFixed(0)}`, icon: stats.profit >= 0 ? '📈' : '📉', color: stats.profit >= 0 ? 'text-green-700' : 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{s.icon}</span>
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cycles */}
      {cycles.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">🌾 Ciclos Activos</h2>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 mb-4">
            <span>🔴 Cosecha urgente (≤7 días)</span>
            <span>🟡 Cosecha próxima (≤15 días)</span>
            <span>🟢 Sin alertas</span>
          </div>

          {redCycles.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">🔴 Urgente</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {redCycles.map(c => <CycleCard key={c.id} cycle={c} />)}
              </div>
            </div>
          )}
          {yellowCycles.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2">🟡 Próximas</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {yellowCycles.map(c => <CycleCard key={c.id} cycle={c} />)}
              </div>
            </div>
          )}
          {greenCycles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">🟢 En Curso</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {greenCycles.map(c => <CycleCard key={c.id} cycle={c} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {cycles.length === 0 && data && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-5xl mb-4">🌱</p>
          <p className="text-gray-500 font-medium">No hay ciclos activos</p>
          <p className="text-sm text-gray-400 mt-1">Presiona "Nuevo Ciclo" para iniciar la temporada</p>
        </div>
      )}

      {/* Modals */}
      {modal === 'nuevo-ciclo' && <NuevoCicloModal onClose={() => setModal(null)} onSuccess={onSuccess} />}
      {modal === 'cerrar-cosecha' && <CerrarCosechaModal onClose={() => setModal(null)} onSuccess={onSuccess} />}
      {modal === 'registrar-venta' && <RegistrarVentaModal onClose={() => setModal(null)} onSuccess={onSuccess} />}
      {modal === 'registrar-gasto' && <RegistrarGastoModal onClose={() => setModal(null)} onSuccess={onSuccess} />}
      {modal === 'agregar-trabajador' && <AgregarTrabajadorModal onClose={() => setModal(null)} onSuccess={onSuccess} />}
    </div>
  )
}
