import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { Cycle, CycleStatus } from '../../types'

const STATUS_BADGE: Record<CycleStatus, string> = {
  'En Curso': 'bg-green-100 text-green-700',
  'Cosechando': 'bg-amber-100 text-amber-700',
  'Cerrado': 'bg-gray-100 text-gray-500',
}

export default function CiclosList() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchCycles = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const res = await client.get<Cycle[]>('/cycles', { params })
      setCycles(res.data)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchCycles() }, [fetchCycles])

  const filtered = cycles.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.code?.toLowerCase().includes(q) ||
      c.block?.code?.toLowerCase().includes(q) ||
      c.block?.name?.toLowerCase().includes(q) ||
      c.crop?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ciclos de Cultivo</h1>
          <p className="text-gray-500 text-sm mt-1">Historial completo de todos los ciclos</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por código, bloque o cultivo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Todos los estados</option>
          <option value="En Curso">En Curso</option>
          <option value="Cosechando">Cosechando</option>
          <option value="Cerrado">Cerrado</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Cargando ciclos...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">🌾</span>
            <p>No se encontraron ciclos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4 text-left">Código</th>
                  <th className="px-6 py-4 text-left">Bloque</th>
                  <th className="px-6 py-4 text-left">Cultivo</th>
                  <th className="px-6 py-4 text-left">Estado</th>
                  <th className="px-6 py-4 text-left">Siembra</th>
                  <th className="px-6 py-4 text-left">Cierre</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">{c.code ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm text-gray-900">{c.block?.code}</p>
                      <p className="text-xs text-gray-400">{c.block?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{c.crop?.name}</p>
                      {c.variety && <p className="text-xs text-gray-400">{c.variety.name}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status as CycleStatus]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(c.sowingDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {c.closingDate
                        ? new Date(c.closingDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/ciclos/${c.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-400">
            {filtered.length} ciclo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
