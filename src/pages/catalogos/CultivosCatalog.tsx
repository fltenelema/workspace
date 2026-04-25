import { useState, useEffect } from 'react'
import client from '../../api/client'
import { Crop } from '../../types'

export default function CultivosCatalog() {
  const [crops, setCrops] = useState<Crop[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'kg', harvestDays: '90', notes: '' })
  const [newVariety, setNewVariety] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState<Crop | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => client.get<Crop[]>('/crops').then(r => setCrops(r.data))
  useEffect(() => { fetch() }, [])

  const save = async () => {
    setError('')
    try {
      if (editing) await client.put(`/crops/${editing.id}`, form)
      else await client.post('/crops', form)
      setForm({ name: '', unit: 'kg', harvestDays: '90', notes: '' }); setEditing(null); setShowForm(false); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error') }
  }

  const addVariety = async (cropId: number) => {
    const name = newVariety[cropId]?.trim()
    if (!name) return
    await client.post(`/crops/${cropId}/varieties`, { name })
    setNewVariety(p => ({ ...p, [cropId]: '' })); fetch()
  }

  const delVariety = async (cropId: number, varId: number) => {
    if (!confirm('¿Eliminar variedad?')) return
    await client.delete(`/crops/${cropId}/varieties/${varId}`); fetch()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Cultivos y Variedades</h1><p className="text-gray-500 text-sm mt-1">Catálogo de cultivos</p></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', unit: 'kg', harvestDays: '90', notes: '' }); setShowForm(true) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">+ Nuevo cultivo</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar cultivo' : 'Nuevo cultivo'}</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Tomate"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidad de venta</label>
              <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="kg"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Días a cosecha</label>
              <input type="number" value={form.harvestDays} onChange={e => setForm(p => ({ ...p, harvestDays: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm">Guardar</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {crops.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">🌱</span>
                <div>
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.unit} · {c.harvestDays} días · {c.varieties.length} variedades</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={e => { e.stopPropagation(); setEditing(c); setForm({ name: c.name, unit: c.unit, harvestDays: String(c.harvestDays), notes: c.notes ?? '' }); setShowForm(true) }}
                  className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                <span className="text-gray-400">{expanded === c.id ? '▲' : '▼'}</span>
              </div>
            </div>
            {expanded === c.id && (
              <div className="border-t border-gray-100 px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Variedades</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {c.varieties.map(v => (
                    <span key={v.id} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-sm">
                      {v.name}
                      <button onClick={() => delVariety(c.id, v.id)} className="text-green-400 hover:text-red-500 ml-1">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newVariety[c.id] ?? ''} onChange={e => setNewVariety(p => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="Nueva variedad..."
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
                  <button onClick={() => addVariety(c.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Agregar</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {crops.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">No hay cultivos registrados</div>}
      </div>
    </div>
  )
}
