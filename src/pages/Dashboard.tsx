import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { DashboardData, DashboardCycle, Block } from '../types'
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
    <Link to={`/ciclos/${cycle.id}`} className={`block rounded-xl border-2 ${cfg.border} ${cfg.bg} p-4 hover:shadow-md transition-shadow`}>
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
        <div className="text-right">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}>
            {cfg.dot} {dayLabel}
          </span>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(cycle.harvestDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
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
    </Link>
  )
}

function BlockMap({ blocks, cycles }: { blocks: Block[]; cycles: DashboardCycle[] }) {
  const cyclesByBlock = new Map(cycles.map(c => [c.block.id, c]))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700">🗺️ Mapa de Bloques</h2>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" />Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" />En cultivo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" />Urgente</span>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {blocks.map(b => {
          const cycle = cyclesByBlock.get(b.id)
          const alert = cycle?.alert
          const bg = b.status === 'Libre'
            ? 'bg-green-100 border-green-200 hover:bg-green-200'
            : alert === 'red' ? 'bg-red-100 border-red-300 hover:bg-red-200'
            : alert === 'yellow' ? 'bg-amber-100 border-amber-300 hover:bg-amber-200'
            : 'bg-orange-100 border-orange-200 hover:bg-orange-200'

          return (
            <Link
              key={b.id}
              to={cycle ? `/ciclos/${cycle.id}` : '/catalogos/bloques'}
              className={`${bg} border rounded-lg p-2.5 text-center transition-colors`}
              title={cycle ? `${cycle.crop.name}${cycle.variety ? ` · ${cycle.variety.name}` : ''}` : 'Libre'}
            >
              <p className="text-xs font-bold text-gray-700">{b.code}</p>
              <p className="text-[10px] text-gray-500 truncate">{cycle ? cycle.crop.name : 'Libre'}</p>
              {cycle && <p className="text-[10px] font-medium mt-0.5">{cycle.daysUntilHarvest <= 0 ? '⚠️ Vencido' : `${cycle.daysUntilHarvest}d`}</p>}
            </Link>
          )
        })}
      </div>
      {blocks.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin bloques registrados</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [modal, setModal] = useState<ModalType>(null)

  const load = useCallback(() => {
    Promise.all([
      client.get<DashboardData>('/dashboard'),
      client.get<Block[]>('/blocks'),
    ]).then(([d, b]) => {
      setData(d.data)
      setBlocks(b.data)
    }).catch(() => null)
  }, [])

  useEffect(() => { load() }, [load])

  const onSuccess = () => load()

  const stats = data?.stats
  const cycles = data?.cycles ?? []
  const redCycles = cycles.filter(c => c.alert === 'red')
  const yellowCycles = cycles.filter(c => c.alert === 'yellow')
  const greenCycles = cycles.filter(c => c.alert === 'green')

  // Top crops by profit
  const cropProfits: Record<string, number> = {}
  cycles.forEach(c => {
    cropProfits[c.crop.name] = (cropProfits[c.crop.name] || 0) + c.profit
  })
  const topCrops = Object.entries(cropProfits).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.name} 👋</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Sistema de Gestión Agrícola · Panel de Control</p>
        </div>
        <Link to="/reportes" className="text-sm text-green-700 hover:text-green-800 font-medium bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
          📊 Ver reportes
        </Link>
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

      {/* Block map + Top crops */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <BlockMap blocks={blocks} cycles={cycles} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">🏆 Cultivos más rentables</h2>
          {topCrops.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos de rentabilidad</p>
          ) : (
            <div className="space-y-3">
              {topCrops.map(([name, profit], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>${profit.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              <Link to="/reportes?tab=cultivos" className="block text-xs text-blue-600 hover:underline pt-2 border-t border-gray-100">Ver análisis completo →</Link>
            </div>
          )}

          {(stats?.alerts.yellow ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-yellow-700 mb-2">🟡 Cosechas próximas</p>
              <p className="text-sm text-gray-500">{stats!.alerts.yellow} ciclo{stats!.alerts.yellow > 1 ? 's' : ''} en ≤ 15 días</p>
            </div>
          )}
        </div>
      </div>

      {/* Cycles */}
      {cycles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700">🌾 Ciclos Activos</h2>
            <Link to="/ciclos" className="text-sm text-blue-600 hover:text-blue-800">Ver historial completo →</Link>
          </div>

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
