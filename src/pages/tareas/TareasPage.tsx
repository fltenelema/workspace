import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'
import { Task, TaskPriority, TaskStatus, Block, User } from '../../types'

const PRIORITIES: TaskPriority[] = ['Baja', 'Media', 'Alta', 'Urgente']
const STATUSES: TaskStatus[]     = ['Pendiente', 'En Proceso', 'Completada']

const priorityColor: Record<TaskPriority, string> = {
  Baja:    'bg-gray-100 text-gray-600',
  Media:   'bg-blue-100 text-blue-700',
  Alta:    'bg-orange-100 text-orange-700',
  Urgente: 'bg-red-100 text-red-700',
}
const statusColor: Record<TaskStatus, string> = {
  Pendiente:    'bg-yellow-100 text-yellow-700',
  'En Proceso': 'bg-blue-100 text-blue-700',
  Completada:   'bg-green-100 text-green-700',
}

const emptyForm = {
  title: '', description: '', blockId: '', assignedToId: '',
  priority: 'Media' as TaskPriority, dueDate: '', status: 'Pendiente' as TaskStatus,
  notes: '', observations: '',
}

export default function TareasPage() {
  const { user } = useAuth()
  const isSupervisor = user?.role === 'SUPERVISOR'
  const canCreate    = ['SUPER_ADMIN', 'ADMIN', 'USER'].includes(user?.role ?? '')
  const canDelete    = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role ?? '')

  const [tasks, setTasks]           = useState<Task[]>([])
  const [blocks, setBlocks]         = useState<Block[]>([])
  const [supervisors, setSupervisors] = useState<Pick<User, 'id' | 'name'>[]>([])
  const [loading, setLoading]       = useState(true)

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Task | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const [statusFilter, setStatusFilter]     = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get<Task[]>('/tasks')
      setTasks(res.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    if (!isSupervisor) {
      Promise.all([
        client.get<Block[]>('/blocks'),
        client.get<Pick<User, 'id' | 'name'>[]>('/users', { params: { role: 'SUPERVISOR' } }),
      ]).then(([b, s]) => {
        setBlocks(b.data)
        setSupervisors(s.data)
      })
    }
  }, [load, isSupervisor])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (t: Task) => {
    setEditing(t)
    setForm({
      title:        t.title,
      description:  t.description ?? '',
      blockId:      String(t.blockId),
      assignedToId: String(t.assignedToId),
      priority:     t.priority,
      dueDate:      t.dueDate.split('T')[0],
      status:       t.status,
      notes:        t.notes ?? '',
      observations: t.observations ?? '',
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        const payload = isSupervisor
          ? { status: form.status }
          : {
              title: form.title, description: form.description,
              blockId: form.blockId, assignedToId: form.assignedToId,
              priority: form.priority, dueDate: form.dueDate,
              status: form.status, notes: form.notes,
            }
        await client.put(`/tasks/${editing.id}`, payload)
      } else {
        await client.post('/tasks', {
          title: form.title, description: form.description,
          blockId: form.blockId, assignedToId: form.assignedToId,
          priority: form.priority, dueDate: form.dueDate, notes: form.notes,
        })
      }
      closeModal()
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/tasks/${id}`)
      setConfirmDelete(null)
      load()
    } catch (err: unknown) {
      setConfirmDelete(null)
    }
  }

  const filtered = tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    return true
  })

  const isOverdue = (t: Task) =>
    t.status !== 'Completada' && new Date(t.dueDate) < new Date()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isSupervisor ? 'Tareas asignadas a ti' : 'Gestión de tareas por bloque'}
          </p>
        </div>
        {canCreate && (
          <button onClick={openCreate}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            + Nueva tarea
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todas las prioridades</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(statusFilter || priorityFilter) && (
          <button onClick={() => { setStatusFilter(''); setPriorityFilter('') }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando tareas...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-base font-medium">No hay tareas{statusFilter || priorityFilter ? ' con estos filtros' : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-5 py-3 text-left">Tarea</th>
                  <th className="px-5 py-3 text-left">Bloque</th>
                  {!isSupervisor && <th className="px-5 py-3 text-left">Responsable</th>}
                  <th className="px-5 py-3 text-center">Prioridad</th>
                  <th className="px-5 py-3 text-center">Fecha límite</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${t.status === 'Completada' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{t.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{t.block.code}</p>
                      <p className="text-xs text-gray-400">{t.block.name}</p>
                    </td>
                    {!isSupervisor && (
                      <td className="px-5 py-3 text-gray-700">{t.assignedTo.name}</td>
                    )}
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColor[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={isOverdue(t) ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {new Date(t.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {isOverdue(t) && <p className="text-xs text-red-500">Vencida</p>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(t)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">
                          {isSupervisor ? 'Actualizar' : 'Editar'}
                        </button>
                        {canDelete && (
                          confirmDelete === t.id ? (
                            <>
                              <button onClick={() => handleDelete(t.id)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
                                Confirmar
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDelete(t.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
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
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? (isSupervisor ? 'Detalle y avance de tarea' : 'Editar Tarea') : 'Nueva Tarea'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {!isSupervisor && (
                <>
                  {/* Título */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Título *</label>
                    <input type="text" required value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ej: Preparar terreno bloque A"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
                    <textarea value={form.description} rows={2}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Descripción detallada de la tarea..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bloque */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Bloque *</label>
                      <select required value={form.blockId}
                        onChange={e => setForm(f => ({ ...f, blockId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Seleccionar bloque...</option>
                        {blocks.map(b => (
                          <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Responsable */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsable (Supervisor) *</label>
                      <select required value={form.assignedToId}
                        onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Seleccionar supervisor...</option>
                        {supervisors.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Prioridad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridad *</label>
                      <select required value={form.priority}
                        onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    {/* Fecha límite */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha límite *</label>
                      <input type="date" required value={form.dueDate}
                        onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>

                  {/* Estado (solo en edición) */}
                  {editing && (
                    <div className="w-full md:w-1/2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                      <select value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Vista SUPERVISOR: info de solo lectura + días restantes */}
              {isSupervisor && editing && (() => {
                const due   = new Date(editing.dueDate)
                const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0)
                const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000)
                const daysLabel = diff > 0
                  ? `${diff} día${diff !== 1 ? 's' : ''} restante${diff !== 1 ? 's' : ''}`
                  : diff === 0 ? 'Vence hoy' : `Vencida hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`
                const daysColor = diff > 3 ? 'bg-green-50 text-green-700 border-green-200'
                  : diff >= 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-red-50 text-red-700 border-red-200'

                return (
                  <div className="space-y-4">
                    {/* Tarjeta de información */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información de la tarea</p>

                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Título</p>
                        <p className="text-sm font-semibold text-gray-900">{editing.title}</p>
                      </div>

                      {editing.description && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Descripción</p>
                          <p className="text-sm text-gray-700">{editing.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Bloque</p>
                          <p className="text-sm font-medium text-gray-800">{editing.block.code} — {editing.block.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Prioridad</p>
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${priorityColor[editing.priority]}`}>
                            {editing.priority}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Fecha límite</p>
                          <p className="text-sm font-medium text-gray-800">
                            {new Date(editing.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Tiempo</p>
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold border ${daysColor}`}>
                            {daysLabel}
                          </span>
                        </div>
                      </div>

                      {editing.notes && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Notas del asignador</p>
                          <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">{editing.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Estado editable */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                      <select value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )
              })()}

              {/* Notas: editable para ADMIN/USER, oculto para SUPERVISOR (va en la tarjeta) */}
              {!isSupervisor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
                  <textarea value={form.notes} rows={2}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Instrucciones adicionales para el supervisor..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              )}


              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tarea'}
                </button>
                <button type="button" onClick={closeModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
