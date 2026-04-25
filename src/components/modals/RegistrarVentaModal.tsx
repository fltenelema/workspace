import { useState, useEffect, FormEvent } from 'react'
import Modal from '../Modal'
import client from '../../api/client'
import { Block, Client, Cycle, Variety } from '../../types'

interface Props { onClose: () => void; onSuccess: () => void }

type ClassRow = { qty: string; price: string }

const emptyRows = (): ClassRow[] => Array.from({ length: 7 }, () => ({ qty: '', price: '' }))

export default function RegistrarVentaModal({ onClose, onSuccess }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null)
  const [varieties, setVarieties] = useState<Variety[]>([])

  const [blockId, setBlockId] = useState('')
  const [clientId, setClientId] = useState('')
  const [varietyId, setVarietyId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<ClassRow[]>(emptyRows())
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([
      client.get<Block[]>('/blocks'),
      client.get<Client[]>('/clients'),
    ]).then(([b, c]) => {
      setBlocks(b.data.filter(b => b.status === 'En Cultivo'))
      setClients(c.data.filter(c => c.active))
    })
  }, [])

  const onBlockChange = async (id: string) => {
    setBlockId(id)
    setActiveCycle(null)
    setVarieties([])
    if (!id) return
    const res = await client.get<Cycle[]>('/cycles', { params: { status: 'En Curso' } })
    const res2 = await client.get<Cycle[]>('/cycles', { params: { status: 'Cosechando' } })
    const all = [...res.data, ...res2.data]
    const cycle = all.find(c => c.blockId === parseInt(id))
    if (cycle) {
      setActiveCycle(cycle)
      setVarieties(cycle.crop?.varieties ?? [])
      setVarietyId(String(cycle.varietyId ?? ''))
    }
  }

  const updateRow = (i: number, field: 'qty' | 'price', val: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const totalKg = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0)
  const totalUsd = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeCycle) { setError('El bloque seleccionado no tiene un ciclo activo'); return }
    if (totalKg === 0) { setError('Ingresa al menos una cantidad'); return }
    setError('')
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        cycleId: activeCycle.id, clientId, varietyId: varietyId || undefined, date, notes,
      }
      rows.forEach((r, i) => {
        payload[`qty${i + 1}`] = parseFloat(r.qty) || 0
        payload[`price${i + 1}`] = parseFloat(r.price) || 0
      })
      await client.post('/sales', payload)
      setDone(true)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <Modal title="💰 Registrar Venta" onClose={onClose}>
      <div className="text-center py-4">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Venta registrada</h3>
        <div className="bg-green-50 rounded-xl p-4 text-sm space-y-1 text-left mb-6">
          <p><span className="font-medium">Bloque:</span> {activeCycle?.block.code} — {activeCycle?.block.name}</p>
          <p><span className="font-medium">Total kg:</span> {totalKg.toFixed(2)} {activeCycle?.crop.unit}</p>
          <p><span className="font-medium">Total USD:</span> ${totalUsd.toFixed(2)}</p>
        </div>
        <button onClick={() => { onSuccess(); onClose() }} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg">
          Cerrar
        </button>
      </div>
    </Modal>
  )

  return (
    <Modal title="💰 Registrar Venta" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bloque</label>
            <select required value={blockId} onChange={e => onBlockChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Seleccionar...</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {activeCycle && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-800">Ciclo detectado: <span className="font-mono">{activeCycle.code}</span></p>
            <p className="text-green-700">{activeCycle.crop.name}{activeCycle.variety ? ` · ${activeCycle.variety.name}` : ''}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente</label>
            <select required value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Seleccionar...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {varieties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Variedad</label>
              <select value={varietyId} onChange={e => setVarietyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin especificar</option>
                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Classes table */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cantidades por clase</label>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <div className="px-4 py-2">Clase</div>
              <div className="px-4 py-2">Cantidad (kg)</div>
              <div className="px-4 py-2">Precio (USD/kg)</div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-gray-100 last:border-0 ${row.qty ? 'bg-yellow-50' : ''}`}>
                <div className="px-4 py-2 flex items-center text-sm font-medium text-gray-700">{i + 1}ra clase</div>
                <div className="px-2 py-1.5">
                  <input type="number" min="0" step="0.01" value={row.qty} onChange={e => updateRow(i, 'qty', e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-yellow-50" />
                </div>
                <div className="px-2 py-1.5">
                  <input type="number" min="0" step="0.01" value={row.price} onChange={e => updateRow(i, 'price', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-yellow-50" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2 flex justify-between text-sm font-semibold text-green-800">
            <span>Total: {totalKg.toFixed(2)} kg</span>
            <span>USD {totalUsd.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || !activeCycle}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg text-sm">
            {loading ? 'Guardando...' : 'Registrar venta'}
          </button>
          <button type="button" onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}
