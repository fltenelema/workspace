import { useState, useEffect } from 'react'
import client from '../../api/client'
import { Client } from '../../types'

export default function ClientesCatalog() {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [editing, setEditing] = useState<Client | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => client.get<Client[]>('/clients').then(r => setClients(r.data))
  useEffect(() => { fetch() }, [])

  const save = async () => {
    setError('')
    try {
      if (editing) await client.put(`/clients/${editing.id}`, form)
      else await client.post('/clients', form)
      setForm({ name: '', phone: '', email: '', notes: '' }); setEditing(null); setShowForm(false); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Clientes</h1><p className="text-gray-500 text-sm mt-1">Compradores habituales</p></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', notes: '' }); setShowForm(true) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">+ Nuevo cliente</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[{ k: 'name', label: 'Nombre', placeholder: 'Mercado Central' }, { k: 'phone', label: 'Teléfono', placeholder: '' }, { k: 'email', label: 'Email', placeholder: '' }, { k: 'notes', label: 'Notas', placeholder: '' }]
              .map(f => (
                <div key={f.k}><label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={(form as Record<string, string>)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
              ))}
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
            <th className="px-6 py-4 text-left">Nombre</th><th className="px-6 py-4 text-left">Teléfono</th>
            <th className="px-6 py-4 text-left">Email</th><th className="px-6 py-4 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.email || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setEditing(c); setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '' }); setShowForm(true) }}
                    className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && <div className="text-center py-12 text-gray-400">No hay clientes registrados</div>}
      </div>
    </div>
  )
}
