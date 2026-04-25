import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'
import { User, Role } from '../../types'

const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  USER: 'bg-gray-100 text-gray-600',
}
const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  USER: 'Usuario',
}

export default function UsuarioList() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (activeFilter !== '') params.active = activeFilter
      const res = await client.get('/users', { params })
      setUsers(res.data)
    } catch {
      setError('Error al cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, activeFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleToggle = async (id: number) => {
    try {
      const res = await client.patch(`/users/${id}/toggle`)
      setUsers(prev => prev.map(u => u.id === id ? res.data : u))
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/users/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
      setConfirmDelete(null)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
      setConfirmDelete(null)
    }
  }

  const canEditUser = (u: User) => {
    if (me?.role === 'SUPER_ADMIN') return true
    if (me?.role === 'ADMIN') return u.role === 'USER' || u.id === me.id
    return u.id === me?.id
  }

  const canToggleUser = (u: User) => {
    if (u.id === me?.id) return false
    if (me?.role === 'SUPER_ADMIN') return true
    if (me?.role === 'ADMIN') return u.role === 'USER'
    return false
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Administra los usuarios del sistema AgriControl</p>
        </div>
        <Link
          to="/usuarios/nuevo"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Nuevo usuario
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todos los roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Administrador</option>
          <option value="USER">Usuario</option>
        </select>
        <select
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">👤</span>
            <p>No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4 text-left">Usuario</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Rol</th>
                  <th className="px-6 py-4 text-left">Estado</th>
                  <th className="px-6 py-4 text-left">Registrado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                          {u.id === me?.id && <span className="text-xs text-green-600 font-medium">Tú</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.active ? '● Activo' : '● Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        {canEditUser(u) && (
                          <Link to={`/usuarios/${u.id}/editar`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Editar
                          </Link>
                        )}
                        {canToggleUser(u) && (
                          <button onClick={() => handleToggle(u.id)} className={`text-sm font-medium ${u.active ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}>
                            {u.active ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {me?.role === 'SUPER_ADMIN' && u.id !== me.id && (
                          confirmDelete === u.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleDelete(u.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Confirmar</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(u.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">
                              Eliminar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && users.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-400">
            {users.length} usuario{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
