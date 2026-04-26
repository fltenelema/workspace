import { useState, useEffect, FormEvent } from 'react'
import Modal from '../Modal'
import client from '../../api/client'
import { Block, Cycle, Worker } from '../../types'

interface Props { onClose: () => void; onSuccess: () => void; preselectedBlockId?: number }

export default function AgregarTrabajadorModal({ onClose, onSuccess, preselectedBlockId }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [blockId, setBlockId] = useState(preselectedBlockId ? String(preselectedBlockId) : '')
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [workerId, setWorkerId] = useState('')
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [days, setDays] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([
      client.get<Block[]>('/blocks'),
      client.get<Worker[]>('/workers'),
    ]).then(([b, w]) => {
      setBlocks(b.data.filter(b => b.status === 'En Cultivo'))
      setWorkers(w.data.filter(w => w.active))
      if (preselectedBlockId) onBlockChange(String(preselectedBlockId))
    })
  }, [preselectedBlockId])

  const onBlockChange = async (id: string) => {
    setBlockId(id)
    setActiveCycle(null)
    if (!id) return
    const [r1, r2] = await Promise.all([
      client.get<Cycle[]>('/cycles', { params: { status: 'En Curso' } }),
      client.get<Cycle[]>('/cycles', { params: { status: 'Cosechando' } }),
    ])
    const cycle = [...r1.data, ...r2.data].find(c => c.blockId === parseInt(id))
    if (cycle) setActiveCycle(cycle)
  }

  const onWorkerChange = (id: string) => {
    setWorkerId(id)
    setSelectedWorker(workers.find(w => String(w.id) === id) ?? null)
  }

  const total = (parseFloat(days) || 0) * (selectedWorker?.dailySalary ?? 0)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!activeCycle) { setError('El bloque no tiene ciclo activo'); return }
    if (!selectedWorker) { setError('Selecciona un trabajador'); return }
    setConfirming(true)
  }

  const handleConfirm = async () => {
    if (!activeCycle || !selectedWorker) return
    setLoading(true)
    setError('')
    try {
      await client.post('/labors', { cycleId: activeCycle.id, workerId, days, date, notes })
      setDone(true)
      setConfirming(false)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <Modal title="👷 Agregar Trabajador" onClose={onClose}>
      <div className="text-center py-4">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Labor registrada</h3>
        <div className="bg-green-50 rounded-xl p-4 text-sm space-y-1 text-left mb-6">
          <p><span className="font-medium">Trabajador:</span> {selectedWorker?.name}</p>
          <p><span className="font-medium">Días:</span> {days}</p>
          <p><span className="font-medium">Total:</span> ${total.toFixed(2)}</p>
        </div>
        <button onClick={() => { onSuccess(); onClose() }} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg">Cerrar</button>
      </div>
    </Modal>
  )

  if (confirming) return (
    <Modal title="👷 Confirmar Labor" onClose={() => setConfirming(false)}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-800 mb-3">¿Confirmas el registro de esta labor?</p>
          <div className="space-y-1 text-sm text-amber-700">
            <p><span className="font-medium">Ciclo:</span> {activeCycle?.code} — {activeCycle?.crop.name}</p>
            <p><span className="font-medium">Trabajador:</span> {selectedWorker?.name}</p>
            <p><span className="font-medium">Salario/día:</span> ${selectedWorker?.dailySalary}</p>
            <p><span className="font-medium">Días:</span> {days}</p>
            <p className="pt-1 font-bold text-amber-900">Total: ${total.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg text-sm">
            {loading ? 'Guardando...' : 'Confirmar y guardar'}
          </button>
          <button onClick={() => setConfirming(false)} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm">Corregir</button>
        </div>
      </div>
    </Modal>
  )

  return (
    <Modal title="👷 Agregar Trabajador" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Bloque</label>
          <select required value={blockId} onChange={e => onBlockChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Seleccionar bloque...</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
          </select>
        </div>

        {activeCycle && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-800">Ciclo: <span className="font-mono">{activeCycle.code}</span> — {activeCycle.crop.name}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Trabajador</label>
          <select required value={workerId} onChange={e => onWorkerChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Seleccionar trabajador...</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name} — ${w.dailySalary}/día</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Días trabajados</label>
            <input type="number" min="0.5" step="0.5" required value={days} onChange={e => setDays(e.target.value)}
              placeholder="ej. 3.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {selectedWorker && parseFloat(days) > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm font-semibold text-green-800">
            Total: {days} días × ${selectedWorker.dailySalary} = <span className="text-lg">${total.toFixed(2)}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={!activeCycle}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg text-sm">
            Revisar y confirmar
          </button>
          <button type="button" onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}
