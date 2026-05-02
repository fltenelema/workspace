import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { Cycle, Sale, Expense, Labor, Client, Variety } from '../../types'
import Modal from '../../components/Modal'
import RegistrarVentaModal from '../../components/modals/RegistrarVentaModal'
import RegistrarGastoModal from '../../components/modals/RegistrarGastoModal'
import AgregarTrabajadorModal from '../../components/modals/AgregarTrabajadorModal'

type Tab = 'resumen' | 'ventas' | 'gastos' | 'labores'
const EXPENSE_CATEGORIES = ['Semillas', 'Fertilizantes', 'Agroquímicos', 'Riego', 'Herramientas', 'Maquinaria', 'Transporte', 'Otros']

export default function CicloDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cycle, setCycle] = useState<Cycle & { sales: Sale[]; expenses: Expense[]; labors: Labor[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('resumen')
  const [modal, setModal] = useState<'venta' | 'gasto' | 'labor' | null>(null)
  const [editSale, setEditSale] = useState<Sale | null>(null)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editLabor, setEditLabor] = useState<Labor | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get(`/cycles/${id}`)
      setCycle(res.data)
    } catch {
      setError('Error al cargar el ciclo')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleDeleteSale = async (saleId: number) => {
    if (!confirm('¿Eliminar esta venta?')) return
    await client.delete(`/sales/${saleId}`)
    load()
  }

  const handleDeleteExpense = async (expId: number) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await client.delete(`/expenses/${expId}`)
    load()
  }

  const handleDeleteLabor = async (labId: number) => {
    if (!confirm('¿Eliminar esta labor?')) return
    await client.delete(`/labors/${labId}`)
    load()
  }

  const handleDeleteCycle = async () => {
    if (!confirm(`¿Eliminar el ciclo ${cycle?.code}? Esta acción eliminará todas las ventas, gastos y labores asociados.`)) return
    await client.delete(`/cycles/${id}`)
    navigate('/ciclos')
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Cargando ciclo...</div>
  if (error || !cycle) return <div className="py-20 text-center text-red-500">{error || 'Ciclo no encontrado'}</div>

  const revenue = cycle.sales.reduce((s, v) => s + v.totalUsd, 0)
  const expensesTotal = cycle.expenses.reduce((s, v) => s + v.total, 0)
  const laborTotal = cycle.labors.reduce((s, v) => s + v.total, 0)
  const totalCost = expensesTotal + laborTotal
  const profit = revenue - totalCost
  const totalKg = cycle.sales.reduce((s, v) => s + v.totalKg, 0)
  const isActive = cycle.status !== 'Cerrado'

  const harvestDate = new Date(cycle.sowingDate)
  harvestDate.setDate(harvestDate.getDate() + cycle.crop.harvestDays)
  const daysUntilHarvest = Math.ceil((harvestDate.getTime() - Date.now()) / 86400000)

  const STATUS_COLOR: Record<string, string> = {
    'En Curso': 'bg-green-100 text-green-700',
    'Cosechando': 'bg-amber-100 text-amber-700',
    'Cerrado': 'bg-gray-100 text-gray-500',
  }

  const expensesByCategory: Record<string, number> = {}
  cycle.expenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.total
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/ciclos" className="text-gray-400 hover:text-gray-600 transition-colors">← Ciclos</Link>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{cycle.code ?? `Ciclo #${cycle.id}`}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[cycle.status]}`}>{cycle.status}</span>
        </div>
        <div className="flex gap-2">
          {isActive && (
            <>
              <button onClick={() => setModal('venta')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg">+ Venta</button>
              <button onClick={() => setModal('gasto')} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg">+ Gasto</button>
              <button onClick={() => setModal('labor')} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg">+ Labor</button>
            </>
          )}
          <Link to={`/reportes?ciclo=${cycle.id}`} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg">📊 Reporte</Link>
          <button onClick={handleDeleteCycle} className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50">Eliminar</button>
        </div>
      </div>

      {/* Cycle info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-400 text-xs mb-0.5">Bloque</p><p className="font-semibold">{cycle.block.code} — {cycle.block.name}</p><p className="text-xs text-gray-400">{cycle.block.area.toLocaleString()} m²</p></div>
          <div><p className="text-gray-400 text-xs mb-0.5">Cultivo</p><p className="font-semibold">{cycle.crop.name}</p>{cycle.variety && <p className="text-xs text-gray-400">{cycle.variety.name}</p>}</div>
          <div><p className="text-gray-400 text-xs mb-0.5">Siembra</p><p className="font-semibold">{new Date(cycle.sowingDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
          <div><p className="text-gray-400 text-xs mb-0.5">{cycle.status === 'Cerrado' ? 'Cierre' : 'Cosecha estimada'}</p>
            <p className="font-semibold">{cycle.closingDate ? new Date(cycle.closingDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : harvestDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            {isActive && <p className={`text-xs font-medium ${daysUntilHarvest <= 7 ? 'text-red-500' : daysUntilHarvest <= 15 ? 'text-amber-500' : 'text-green-600'}`}>{daysUntilHarvest <= 0 ? `Vencida hace ${Math.abs(daysUntilHarvest)} días` : `En ${daysUntilHarvest} días`}</p>}
          </div>
        </div>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Ingresos', value: `$${revenue.toFixed(2)}`, color: 'text-green-700' },
          { label: 'Gastos operativos', value: `$${expensesTotal.toFixed(2)}`, color: 'text-red-600' },
          { label: 'Mano de obra', value: `$${laborTotal.toFixed(2)}`, color: 'text-orange-600' },
          { label: 'Ganancia neta', value: `$${profit.toFixed(2)}`, color: profit >= 0 ? 'text-green-700' : 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {(['resumen', 'ventas', 'gastos', 'labores'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'resumen' && `Resumen`}
            {t === 'ventas' && `Ventas (${cycle.sales.length})`}
            {t === 'gastos' && `Gastos (${cycle.expenses.length})`}
            {t === 'labores' && `Mano de obra (${cycle.labors.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'resumen' && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Resumen financiero</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total kg cosechados</span><span className="font-medium">{totalKg.toFixed(2)} {cycle.crop.unit}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Precio promedio/kg</span><span className="font-medium">${totalKg > 0 ? (revenue / totalKg).toFixed(3) : '0.000'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Rentabilidad/m²</span><span className="font-medium">${cycle.block.area > 0 ? (profit / cycle.block.area).toFixed(2) : '0.00'}</span></div>
              <hr className="my-2" />
              <div className="flex justify-between font-semibold"><span>Ganancia neta</span><span className={profit >= 0 ? 'text-green-700' : 'text-red-600'}>${profit.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Gastos por categoría</h3>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-sm text-gray-400">Sin gastos registrados</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-medium">${total.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (total / (expensesTotal + laborTotal)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Mano de obra</span>
                  <span className="font-medium">${laborTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'ventas' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {cycle.sales.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-3xl mb-3">💰</p>
              <p>Sin ventas registradas</p>
              {isActive && <button onClick={() => setModal('venta')} className="mt-3 text-blue-600 text-sm hover:underline">+ Registrar primera venta</button>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-5 py-3 text-right">Total kg</th>
                  <th className="px-5 py-3 text-right">Total USD</th>
                  <th className="px-5 py-3 text-right">USD/kg</th>
                  {isActive && <th className="px-5 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cycle.sales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm">{new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-5 py-3 text-sm font-medium">{s.client?.name}</td>
                    <td className="px-5 py-3 text-sm text-right">{s.totalKg.toFixed(2)}</td>
                    <td className="px-5 py-3 text-sm text-right font-medium text-green-700">${s.totalUsd.toFixed(2)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-500">${s.totalKg > 0 ? (s.totalUsd / s.totalKg).toFixed(3) : '—'}</td>
                    {isActive && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditSale(s)} className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                          <button onClick={() => handleDeleteSale(s.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 border-t-2 border-green-200 font-semibold text-sm">
                  <td className="px-5 py-3" colSpan={2}>Total</td>
                  <td className="px-5 py-3 text-right">{totalKg.toFixed(2)} kg</td>
                  <td className="px-5 py-3 text-right text-green-700">${revenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-gray-500">${totalKg > 0 ? (revenue / totalKg).toFixed(3) : '—'}</td>
                  {isActive && <td />}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {tab === 'gastos' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {cycle.expenses.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-3xl mb-3">📦</p>
              <p>Sin gastos registrados</p>
              {isActive && <button onClick={() => setModal('gasto')} className="mt-3 text-orange-600 text-sm hover:underline">+ Registrar primer gasto</button>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Categoría</th>
                  <th className="px-5 py-3 text-left">Ítem</th>
                  <th className="px-5 py-3 text-right">Cantidad</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  {isActive && <th className="px-5 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cycle.expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm">{new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-5 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e.category}</span></td>
                    <td className="px-5 py-3 text-sm font-medium">{e.item}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-500">{e.quantity} {e.unit}</td>
                    <td className="px-5 py-3 text-sm text-right font-medium text-red-600">${e.total.toFixed(2)}</td>
                    {isActive && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditExpense(e)} className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                          <button onClick={() => handleDeleteExpense(e.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-50 border-t-2 border-red-200 font-semibold text-sm">
                  <td className="px-5 py-3" colSpan={4}>Total gastos</td>
                  <td className="px-5 py-3 text-right text-red-600">${expensesTotal.toFixed(2)}</td>
                  {isActive && <td />}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {tab === 'labores' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {cycle.labors.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-3xl mb-3">👷</p>
              <p>Sin labores registradas</p>
              {isActive && <button onClick={() => setModal('labor')} className="mt-3 text-purple-600 text-sm hover:underline">+ Registrar primera labor</button>}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Trabajador</th>
                  <th className="px-5 py-3 text-right">Días</th>
                  <th className="px-5 py-3 text-right">Tarifa/día</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  {isActive && <th className="px-5 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cycle.labors.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm">{new Date(l.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-5 py-3 text-sm font-medium">{l.worker?.name}</td>
                    <td className="px-5 py-3 text-sm text-right">{l.days}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-500">${l.dailyRate}/día</td>
                    <td className="px-5 py-3 text-sm text-right font-medium text-orange-600">${l.total.toFixed(2)}</td>
                    {isActive && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditLabor(l)} className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                          <button onClick={() => handleDeleteLabor(l.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-orange-50 border-t-2 border-orange-200 font-semibold text-sm">
                  <td className="px-5 py-3" colSpan={4}>Total mano de obra</td>
                  <td className="px-5 py-3 text-right text-orange-600">${laborTotal.toFixed(2)}</td>
                  {isActive && <td />}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Edit Expense Modal */}
      {editExpense && (
        <EditExpenseModal
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSuccess={() => { setEditExpense(null); load() }}
        />
      )}

      {/* Edit Labor Modal */}
      {editLabor && (
        <EditLaborModal
          labor={editLabor}
          onClose={() => setEditLabor(null)}
          onSuccess={() => { setEditLabor(null); load() }}
        />
      )}

      {/* Edit Sale Modal */}
      {editSale && (
        <EditSaleModal
          sale={editSale}
          cycleUnit={cycle.crop.unit}
          varieties={cycle.crop.varieties ?? []}
          clients={[]}
          onClose={() => setEditSale(null)}
          onSuccess={() => { setEditSale(null); load() }}
        />
      )}

      {/* Create modals */}
      {modal === 'venta' && <RegistrarVentaModal onClose={() => setModal(null)} onSuccess={load} preselectedBlockId={cycle.block.id} />}
      {modal === 'gasto' && <RegistrarGastoModal onClose={() => setModal(null)} onSuccess={load} preselectedBlockId={cycle.block.id} />}
      {modal === 'labor' && <AgregarTrabajadorModal onClose={() => setModal(null)} onSuccess={load} preselectedBlockId={cycle.block.id} />}
    </div>
  )
}

/* ─── Inline edit modals ─── */
function EditExpenseModal({ expense, onClose, onSuccess }: { expense: Expense; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    category: expense.category, item: expense.item,
    quantity: String(expense.quantity), unit: expense.unit,
    cost: String(expense.cost), notes: expense.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.cost) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await client.put(`/expenses/${expense.id}`, form)
      onSuccess()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Editar Gasto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ítem</label>
            <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
            <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
            <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Costo/unidad</label>
            <input type="number" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
          <div className="flex items-end">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm font-semibold text-green-800 w-full">Total: ${total.toFixed(2)}</div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 rounded-lg text-sm">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}

function EditLaborModal({ labor, onClose, onSuccess }: { labor: Labor; onClose: () => void; onSuccess: () => void }) {
  const [days, setDays] = useState(String(labor.days))
  const [notes, setNotes] = useState(labor.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const total = (parseFloat(days) || 0) * labor.dailyRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await client.put(`/labors/${labor.id}`, { days, notes })
      onSuccess()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Editar Labor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium">{labor.worker?.name}</p>
          <p className="text-gray-500">Tarifa: ${labor.dailyRate}/día</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Días trabajados</label>
          <input type="number" min="0.5" step="0.5" value={days} onChange={e => setDays(e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
        </div>
        {parseFloat(days) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm font-semibold text-green-800">
            Total: {days} días × ${labor.dailyRate} = ${total.toFixed(2)}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 rounded-lg text-sm">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}

function EditSaleModal({ sale, cycleUnit, varieties, onClose, onSuccess }: { sale: Sale; cycleUnit: string; varieties: Variety[]; clients: Client[]; onClose: () => void; onSuccess: () => void }) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      qty: String((sale as unknown as Record<string, number>)[`qty${i + 1}`] || ''),
      price: String((sale as unknown as Record<string, number>)[`price${i + 1}`] || ''),
    }))
  )
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(String(sale.clientId))
  const [varietyId, setVarietyId] = useState(String(sale.varietyId ?? ''))
  const [notes, setNotes] = useState(sale.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get<Client[]>('/clients').then(r => setClients(r.data.filter(c => c.active)))
  }, [])

  const totalKg = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0)
  const totalUsd = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)
  const updateRow = (i: number, field: 'qty' | 'price', val: string) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalKg === 0) { setError('Ingresa al menos una cantidad'); return }
    setLoading(true)
    try {
      const payload: Record<string, unknown> = { clientId, varietyId: varietyId || undefined, notes }
      rows.forEach((r, i) => { payload[`qty${i + 1}`] = parseFloat(r.qty) || 0; payload[`price${i + 1}`] = parseFloat(r.price) || 0 })
      await client.put(`/sales/${sale.id}`, payload)
      onSuccess()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Editar Venta" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {varieties.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Variedad</label>
              <select value={varietyId} onChange={e => setVarietyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin especificar</option>
                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <div className="px-3 py-2">Clase</div>
            <div className="px-3 py-2">Cantidad ({cycleUnit})</div>
            <div className="px-3 py-2">Precio USD/{cycleUnit}</div>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 border-b border-gray-100 last:border-0 ${row.qty ? 'bg-yellow-50' : ''}`}>
              <div className="px-3 py-2 flex items-center text-sm font-medium text-gray-700">{i + 1}ra clase</div>
              <div className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={row.qty} onChange={e => updateRow(i, 'qty', e.target.value)}
                placeholder="0" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-yellow-50" /></div>
              <div className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={row.price} onChange={e => updateRow(i, 'price', e.target.value)}
                placeholder="0.00" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-yellow-50" /></div>
            </div>
          ))}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between text-sm font-semibold text-green-800">
          <span>Total: {totalKg.toFixed(2)} {cycleUnit}</span><span>USD {totalUsd.toFixed(2)}</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 rounded-lg text-sm">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}
