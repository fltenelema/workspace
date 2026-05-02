import { useState, useEffect } from 'react'
import client from '../../api/client'
import { Tenant } from '../../types'

interface TenantRow extends Tenant {
  users: { id: number; name: string; email: string; active: boolean }[]
  _count: { users: number; blocks: number; cycles: number }
}

export default function InstanciasPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Editar nombre
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  // Eliminar
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    client.get('/tenants').then(r => setTenants(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const startEdit = (t: TenantRow) => {
    setEditingId(t.id)
    setEditName(t.name)
    setError('')
  }

  const cancelEdit = () => { setEditingId(null); setEditName('') }

  const handleSave = async (id: number) => {
    if (!editName.trim()) { setError('El nombre no puede estar vacío'); return }
    setSaving(true)
    setError('')
    try {
      await client.put(`/tenants/${id}`, { name: editName.trim() })
      setEditingId(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: number) => {
    setError('')
    try {
      await client.patch(`/tenants/${id}/toggle`)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Error al cambiar estado')
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    setError('')
    try {
      await client.delete(`/tenants/${id}`)
      setConfirmDelete(null)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Error al eliminar')
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const admin = (t: TenantRow) => t.users[0] ?? null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instancias</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestión de instancias de clientes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando instancias...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No hay instancias registradas</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Instancia</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Administrador</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Usuarios</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Bloques</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Ciclos</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(t => {
                const adm = admin(t)
                const isEditing = editingId === t.id
                const isConfirmingDelete = confirmDelete === t.id
                return (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${!t.active ? 'opacity-60' : ''}`}>
                    {/* Nombre */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSave(t.id); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full border border-green-400 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.slug}</p>
                        </>
                      )}
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3">
                      {adm ? (
                        <>
                          <p className="text-gray-800">{adm.name}</p>
                          <p className="text-xs text-gray-400">{adm.email}</p>
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Sin administrador</span>
                      )}
                    </td>

                    {/* Contadores */}
                    <td className="px-4 py-3 text-center text-gray-700">{t._count.users}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{t._count.blocks}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{t._count.cycles}</td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {t.active ? '● Activa' : '● Inactiva'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSave(t.id)}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold transition-colors"
                          >
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deleting}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold transition-colors"
                          >
                            {deleting ? '...' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(t)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggle(t.id)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                              t.active
                                ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {t.active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(t.id); setError('') }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-400">
            {tenants.length} instancia{tenants.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
