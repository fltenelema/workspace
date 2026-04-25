import { useState, useEffect } from 'react'
import Modal from '../Modal'
import client from '../../api/client'
import { Cycle } from '../../types'

interface Props { onClose: () => void; onSuccess: () => void }

export default function CerrarCosechaModal({ onClose, onSuccess }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selected, setSelected] = useState<Cycle | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    client.get<Cycle[]>('/cycles', { params: { status: 'En Curso' } }).then(r1 =>
      client.get<Cycle[]>('/cycles', { params: { status: 'Cosechando' } }).then(r2 =>
        setCycles([...r1.data, ...r2.data])
      )
    )
  }, [])

  const handleClose = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await client.patch(`/cycles/${selected.id}/close`)
      setDone(true)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <Modal title="🌾 Cerrar Cosecha" onClose={onClose}>
      <div className="text-center py-4">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Cosecha cerrada</h3>
        <p className="text-gray-500 mb-2">
          Ciclo <span className="font-mono font-bold">{selected?.code}</span> cerrado.
        </p>
        <p className="text-sm text-green-600 mb-6">
          El Bloque {selected?.block.code} está ahora <strong>Libre</strong>.
        </p>
        <button onClick={() => { onSuccess(); onClose() }} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg">
          Ver Dashboard actualizado
        </button>
      </div>
    </Modal>
  )

  if (confirming && selected) return (
    <Modal title="🌾 Confirmar Cierre" onClose={() => setConfirming(false)}>
      <div className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-800 mb-3">¿Confirmas el cierre de este ciclo?</p>
          <div className="space-y-1 text-sm text-amber-700">
            <p><span className="font-medium">Ciclo:</span> {selected.code}</p>
            <p><span className="font-medium">Bloque:</span> {selected.block.code} — {selected.block.name}</p>
            <p><span className="font-medium">Cultivo:</span> {selected.crop.name}{selected.variety ? ` · ${selected.variety.name}` : ''}</p>
            <p><span className="font-medium">Fecha de cierre:</span> {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">Esta acción registrará la fecha de hoy como fecha de cierre y liberará el bloque.</p>
        <div className="flex gap-3">
          <button onClick={handleClose} disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm">
            {loading ? 'Cerrando...' : 'Sí, cerrar cosecha'}
          </button>
          <button onClick={() => setConfirming(false)} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )

  return (
    <Modal title="🌾 Cerrar Cosecha" onClose={onClose}>
      {cycles.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No hay ciclos activos</p>
          <p className="text-sm mt-1">No existen ciclos en curso o cosechando actualmente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Selecciona el ciclo que deseas cerrar:</p>
          {cycles.map(c => (
            <button key={c.id} onClick={() => { setSelected(c); setConfirming(true) }}
              className="w-full text-left border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{c.block.code} — {c.block.name}</p>
                  <p className="text-sm text-gray-500">{c.crop.name}{c.variety ? ` · ${c.variety.name}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sembrado: {new Date(c.sowingDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'Cosechando' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {c.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
