import { useState, useEffect, useCallback, FormEvent } from 'react'
import client from '../../api/client'
import { InventoryItem } from '../../types'

const CATEGORIES = ['Semillas', 'Fertilizantes', 'Agroquímicos', 'Riego', 'Herramientas', 'Maquinaria', 'Transporte', 'Otros']

const empty = { name: '', category: '', quantity: '0', unit: 'unidad', minStock: '0', cost: '0', notes: '' }

export default function InventarioCatalog() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get<InventoryItem[]>('/inventory')
      setItems(res.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const startCreate = () => { setForm(empty); setEditing(null); setCreating(true); setError('') }
  const startEdit = (item: InventoryItem) => {
    setForm({ name: item.name, category: item.category, quantity: String(item.quantity), unit: item.unit, minStock: String(item.minStock), cost: String(item.cost), notes: item.notes ?? '' })
    setEditing(item); setCreating(false); setError('')
  }
  const cancel = () => { setCreating(false); setEditing(null); setError('') }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await client.put(`/inventory/${editing.id}`, form)
      } else {
        await client.post('/inventory', form)
      }
      cancel()
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este ítem del inventario?')) return
    await client.delete(`/inventory/${id}`)
    load()
  }

  const isLow = (item: InventoryItem) => item.minStock > 0 && item.quantity <= item.minStock

  const filtered = items.filter(i => {
    if (catFilter && i.category !== catFilter) return false
    if (showLowOnly && !isLow(i)) return false
    return true
  })

  const lowCount = items.filter(isLow).length

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Insumos</h1>
          <p className="text-gray-500 text-sm mt-1">Control de materiales y stock disponible</p>
        </div>
        <button onClick={startCreate}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Nuevo ítem
        </button>
      </div>

      {lowCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-amber-800 font-medium">{lowCount} ítem{lowCount > 1 ? 's' : ''} con stock bajo o agotado</p>
          <button onClick={() => setShowLowOnly(!showLowOnly)} className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${showLowOnly ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
            {showLowOnly ? 'Mostrar todos' : 'Ver solo estos'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Form */}
      {(creating || editing) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar ítem' : 'Nuevo ítem'}</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del ítem</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ej. Fertilizante NPK 50kg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <select required value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Seleccionar...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad actual</label>
                <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo (alerta)</label>
                <input type="number" min="0" step="0.01" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Costo unitario (USD)</label>
                <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm">
                {editing ? 'Guardar cambios' : 'Crear ítem'}
              </button>
              <button type="button" onClick={cancel} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Cargando inventario...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">📦</span>
            <p>No hay ítems en el inventario</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-4 text-left">Ítem</th>
                  <th className="px-5 py-4 text-left">Categoría</th>
                  <th className="px-5 py-4 text-right">Stock actual</th>
                  <th className="px-5 py-4 text-right">Mínimo</th>
                  <th className="px-5 py-4 text-right">Costo unit.</th>
                  <th className="px-5 py-4 text-right">Valor stock</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isLow(item) ? 'bg-amber-50 hover:bg-amber-100' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {isLow(item) && <span className="text-amber-500 text-sm" title="Stock bajo">⚠️</span>}
                        <div>
                          <p className="font-medium text-sm text-gray-900">{item.name}</p>
                          {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{item.category}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-semibold text-sm ${item.quantity === 0 ? 'text-red-600' : isLow(item) ? 'text-amber-600' : 'text-gray-900'}`}>
                        {item.quantity} {item.unit}
                      </span>
                      {isLow(item) && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Stock bajo</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-400">{item.minStock > 0 ? `${item.minStock} ${item.unit}` : '—'}</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">{item.cost > 0 ? `$${item.cost}` : '—'}</td>
                    <td className="px-5 py-4 text-right text-sm font-medium text-gray-700">
                      {item.cost > 0 ? `$${(item.quantity * item.cost).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(item)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        <button onClick={() => handleDelete(item.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-400 flex justify-between">
            <span>{filtered.length} ítem{filtered.length !== 1 ? 's' : ''}</span>
            {items.some(i => i.cost > 0) && (
              <span>Valor total: <span className="font-medium text-gray-700">${filtered.reduce((s, i) => s + i.quantity * i.cost, 0).toFixed(2)}</span></span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
