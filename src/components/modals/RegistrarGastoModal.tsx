import { useState, useEffect, FormEvent } from 'react'
import Modal from '../Modal'
import client from '../../api/client'
import { Block, Cycle } from '../../types'

interface Props { onClose: () => void; onSuccess: () => void }

const CATEGORIES = ['Semillas', 'Fertilizantes', 'Agroquímicos', 'Riego', 'Herramientas', 'Maquinaria', 'Transporte', 'Otros']

export default function RegistrarGastoModal({ onClose, onSuccess }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [blockId, setBlockId] = useState('')
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [form, setForm] = useState({ category: '', item: '', quantity: '1', unit: 'unidad', cost: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    client.get<Block[]>('/blocks').then(r => setBlocks(r.data.filter(b => b.status === 'En Cultivo')))
  }, [])

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

  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.cost) || 0)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeCycle) { setError('El bloque no tiene un ciclo activo'); return }
    setConfirming(true)
  }

  const handleConfirm = async () => {
    if (!activeCycle) return
    setLoading(true)
    setError('')
    try {
      await client.post('/expenses', { ...form, cycleId: activeCycle.id })
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
    <Modal title="📦 Registrar Gasto" onClose={onClose}>
      <div className="text-center py-4">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Gasto registrado</h3>
        <div className="bg-green-50 rounded-xl p-4 text-sm space-y-1 text-left mb-6">
          <p><span className="font-medium">Ciclo:</span> {activeCycle?.code}</p>
          <p><span className="font-medium">Ítem:</span> {form.item}</p>
          <p><span className="font-medium">Total:</span> ${total.toFixed(2)}</p>
        </div>
        <button onClick={() => { onSuccess(); onClose() }} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg">Cerrar</button>
      </div>
    </Modal>
  )

  if (confirming) return (
    <Modal title="📦 Confirmar Gasto" onClose={() => setConfirming(false)}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-800 mb-3">¿Confirmas el registro de este gasto?</p>
          <div className="space-y-1 text-sm text-amber-700">
            <p><span className="font-medium">Ciclo:</span> {activeCycle?.code} — {activeCycle?.crop.name}</p>
            <p><span className="font-medium">Categoría:</span> {form.category}</p>
            <p><span className="font-medium">Ítem:</span> {form.item}</p>
            <p><span className="font-medium">Cantidad:</span> {form.quantity} {form.unit}</p>
            <p><span className="font-medium">Costo unitario:</span> ${form.cost}</p>
            <p className="pt-1 font-bold text-amber-900"><span>Total:</span> ${total.toFixed(2)}</p>
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
    <Modal title="📦 Registrar Gasto" onClose={onClose}>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
            <select required value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Seleccionar...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ítem / Descripción</label>
          <input type="text" required value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))}
            placeholder="ej. Nitrato de calcio 25kg"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad</label>
            <input type="number" min="0" step="0.01" required value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Unidad</label>
            <input type="text" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Costo/unidad</label>
            <input type="number" min="0" step="0.01" required value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50" />
          </div>
        </div>

        {(parseFloat(form.quantity) > 0 && parseFloat(form.cost) > 0) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm font-semibold text-green-800">
            Total calculado: ${total.toFixed(2)}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
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
