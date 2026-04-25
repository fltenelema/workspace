import { useState, useEffect } from 'react'
import client from '../../api/client'
import { Worker } from '../../types'

export default function TrabajadoresCatalog() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [form, setForm] = useState({ name: '', dailySalary: '', phone: '' })
  const [editing, setEditing] = useState<Worker | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => client.get<Worker[]>('/workers').then(r => setWorkers(r.data))
  useEffect(() => { fetch() }, [])

  const save = async () => {
    setError('')
    try {
      if (editing) await client.put(`/workers/${editing.id}`, form)
      else await client.post('/workers', form)
      setForm({ name: '', dailySalary: '', phone: '' }); setEditing(null); setShowForm(false); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Personal</h1><p className="text-gray-500 text-sm mt-1">Trabajadores con salario base</p></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', dailySalary: '', phone: '' }); setShowForm(true) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">+ Nuevo trabajador</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Salario/día (USD)</label>
              <input type="number" value={form.dailySalary} onChange={e => setForm(p => ({ ...p, dailySalary: e.target.value }))} placeholder="25"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
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
            <th className="px-6 py-4 text-left">Nombre</th><th className="px-6 py-4 text-left">Salario/día</th>
            <th className="px-6 py-4 text-left">Teléfono</th><th className="px-6 py-4 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {workers.map(w => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{w.name}</td>
                <td className="px-6 py-4 text-sm font-semibold text-green-700">${w.dailySalary}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{w.phone || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setEditing(w); setForm({ name: w.name, dailySalary: String(w.dailySalary), phone: w.phone ?? '' }); setShowForm(true) }}
                    className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {workers.length === 0 && <div className="text-center py-12 text-gray-400">No hay trabajadores registrados</div>}
      </div>
    </div>
  )
}
