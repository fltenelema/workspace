import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'
import { User, Role } from '../../types'

export default function UsuarioForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { user: me } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' as Role, active: true })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isEditing) return
    client.get<User>(`/users/${id}`)
      .then(res => {
        const u = res.data
        setForm({ name: u.name, email: u.email, password: '', role: u.role, active: u.active })
      })
      .catch(() => setError('No se pudo cargar el usuario'))
      .finally(() => setFetching(false))
  }, [id, isEditing])

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
      }
      if (form.password) payload.password = form.password

      if (isEditing) {
        await client.put(`/users/${id}`, payload)
        setSuccess('Usuario actualizado correctamente')
        setTimeout(() => navigate('/usuarios'), 1200)
      } else {
        payload.password = form.password
        await client.post('/users', payload)
        setSuccess('Usuario creado correctamente')
        setTimeout(() => navigate('/usuarios'), 1200)
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const canAssignRole = me?.role === 'SUPER_ADMIN'
  const isOwnProfile = id === String(me?.id)

  if (fetching) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Cargando...</div>
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/usuarios" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? (isOwnProfile ? 'Mi Perfil' : 'Editar Usuario') : 'Nuevo Usuario'}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-5 text-sm">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Juan Pérez"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="juan@agro.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Contraseña */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña {isEditing && <span className="text-gray-400 font-normal">(dejar en blanco para no cambiar)</span>}
              </label>
              <input
                type="password"
                required={!isEditing}
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
                minLength={isEditing && !form.password ? undefined : 6}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
              {canAssignRole ? (
                <select
                  value={form.role}
                  onChange={e => handleChange('role', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              ) : (
                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-500">
                  {{
                    SUPER_ADMIN: 'Super Admin',
                    ADMIN: 'Administrador',
                    USER: 'Usuario',
                  }[form.role]}
                </div>
              )}
            </div>

            {/* Estado */}
            {isEditing && !isOwnProfile && me?.role !== 'USER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                <select
                  value={String(form.active)}
                  onChange={e => handleChange('active', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
            <Link
              to="/usuarios"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
