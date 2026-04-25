import { useState, useEffect, FormEvent } from 'react'
import Modal from '../Modal'
import client from '../../api/client'
import { Block, Crop, Variety } from '../../types'

interface Props { onClose: () => void; onSuccess: () => void }

export default function NuevoCicloModal({ onClose, onSuccess }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [varieties, setVarieties] = useState<Variety[]>([])
  const [form, setForm] = useState({ blockId: '', cropId: '', varietyId: '', sowingDate: new Date().toISOString().split('T')[0], notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ code: string; block: string; crop: string } | null>(null)

  useEffect(() => {
    Promise.all([
      client.get<Block[]>('/blocks/free'),
      client.get<Crop[]>('/crops'),
    ]).then(([b, c]) => { setBlocks(b.data); setCrops(c.data) })
  }, [])

  const onCropChange = (cropId: string) => {
    setForm(p => ({ ...p, cropId, varietyId: '' }))
    const crop = crops.find(c => String(c.id) === cropId)
    setVarieties(crop?.varieties ?? [])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/cycles', {
        blockId: form.blockId, cropId: form.cropId,
        varietyId: form.varietyId || undefined,
        sowingDate: form.sowingDate, notes: form.notes,
      })
      setResult({ code: res.data.code, block: res.data.block.name, crop: res.data.crop.name })
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <Modal title="🌱 Nuevo Ciclo" onClose={onClose}>
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Ciclo creado exitosamente</h3>
        <p className="text-gray-500 mb-4">ID generado: <span className="font-mono font-bold text-green-700">{result.code}</span></p>
        <div className="bg-green-50 rounded-xl p-4 text-sm text-left space-y-1 mb-6">
          <p><span className="font-medium text-gray-600">Bloque:</span> {result.block}</p>
          <p><span className="font-medium text-gray-600">Cultivo:</span> {result.crop}</p>
          <p><span className="font-medium text-gray-600">Siembra:</span> {new Date(form.sowingDate).toLocaleDateString('es-ES')}</p>
        </div>
        <button onClick={() => { onSuccess(); onClose() }} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg">
          Ver Dashboard
        </button>
      </div>
    </Modal>
  )

  return (
    <Modal title="🌱 Nuevo Ciclo de Cultivo" onClose={onClose}>
      {blocks.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <p className="text-4xl mb-3">🏚️</p>
          <p className="font-medium">No hay bloques disponibles</p>
          <p className="text-sm mt-1">Todos los bloques están en cultivo o no existen bloques registrados.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bloque disponible</label>
            <select required value={form.blockId} onChange={e => setForm(p => ({ ...p, blockId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Seleccionar bloque...</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name} ({b.area.toLocaleString()} m²)</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cultivo</label>
            <select required value={form.cropId} onChange={e => onCropChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Seleccionar cultivo...</option>
              {crops.map(c => <option key={c.id} value={c.id}>{c.name} ({c.harvestDays} días)</option>)}
            </select>
          </div>

          {varieties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Variedad</label>
              <select value={form.varietyId} onChange={e => setForm(p => ({ ...p, varietyId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin especificar</option>
                {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de siembra</label>
            <input type="date" required value={form.sowingDate} onChange={e => setForm(p => ({ ...p, sowingDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
              {loading ? 'Creando ciclo...' : 'Iniciar ciclo'}
            </button>
            <button type="button" onClick={onClose} className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
