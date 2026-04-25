import { useState, useEffect } from 'react'
import client from '../../api/client'
import { Block } from '../../types'

export default function BloquesCatalog() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [form, setForm] = useState({ code: '', name: '', area: '', notes: '' })
  const [editing, setEditing] = useState<Block | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => client.get<Block[]>('/blocks').then(r => setBlocks(r.data))
  useEffect(() => { fetch() }, [])

  const save = async () => {
    setError('')
    try {
      if (editing) {
        await client.put(`/blocks/${editing.id}`, form)
      } else {
        await client.post('/blocks', form)
      }
      setForm({ code: '', name: '', area: '', notes: '' }); setEditing(null); setShowForm(false); fetch()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    }
  }

  const edit = (b: Block) => {
    setEditing(b); setForm({ code: b.code, name: b.name, area: String(b.area), notes: b.notes ?? '' }); setShowForm(true)
  }

  const del = async (id: number) => {
    if (!confirm('¿Eliminar este bloque?')) return
    try { await client.delete(`/blocks/${id}`); fetch() } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Bloques de Terreno</h1><p className="text-gray-500 text-sm mt-1">Catálogo de bloques y parcelas</p></div>
        <button onClick={() => { setEditing(null); setForm({ code: '', name: '', area: '', notes: '' }); setShowForm(true) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">+ Nuevo bloque</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar bloque' : 'Nuevo bloque'}</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Bloque A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Área (m²)</label>
              <input type="number" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="2500"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm">Guardar</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
            <th className="px-6 py-4 text-left">Código</th><th className="px-6 py-4 text-left">Nombre</th>
            <th className="px-6 py-4 text-left">Área</th><th className="px-6 py-4 text-left">Estado</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {blocks.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-green-700">{b.code}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{b.area.toLocaleString()} m²</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${b.status === 'Libre' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => edit(b)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">Editar</button>
                  {b.status === 'Libre' && <button onClick={() => del(b.id)} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {blocks.length === 0 && <div className="text-center py-12 text-gray-400">No hay bloques registrados</div>}
      </div>
    </div>
  )
}
