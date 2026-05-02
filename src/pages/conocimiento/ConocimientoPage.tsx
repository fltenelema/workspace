import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'
import { KnowledgeArticle, ArticleCategory, Block, Crop, Cycle } from '../../types'

const CATEGORIES: ArticleCategory[] = ['Plagas', 'Enfermedades', 'Fertilización', 'Riego / Suelo']

const categoryColor: Record<ArticleCategory, string> = {
  'Plagas':        'bg-red-100 text-red-700 border-red-200',
  'Enfermedades':  'bg-orange-100 text-orange-700 border-orange-200',
  'Fertilización': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Riego / Suelo': 'bg-blue-100 text-blue-700 border-blue-200',
}

const emptyForm = {
  title: '', category: 'Plagas' as ArticleCategory, content: '',
  tags: '', blockId: '', cycleId: '', cropId: '',
}

export default function ConocimientoPage() {
  const { user } = useAuth()
  const isSupervisor = user?.role === 'SUPERVISOR'
  const canPublish   = ['SUPER_ADMIN', 'ADMIN', 'USER'].includes(user?.role ?? '')
  const canDelete    = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role ?? '')

  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [blocks, setBlocks]     = useState<Block[]>([])
  const [crops, setCrops]       = useState<Crop[]>([])
  const [cycles, setCycles]     = useState<Cycle[]>([])
  const [loading, setLoading]   = useState(true)

  const [showModal, setShowModal]   = useState(false)
  const [viewing, setViewing]       = useState<KnowledgeArticle | null>(null)
  const [editing, setEditing]       = useState<KnowledgeArticle | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const [search, setSearch]               = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter]     = useState('')
  const [cropFilter, setCropFilter]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get<KnowledgeArticle[]>('/knowledge')
      setArticles(res.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    Promise.all([
      client.get<Block[]>('/blocks'),
      client.get<Crop[]>('/crops'),
      client.get<Cycle[]>('/cycles'),
    ]).then(([b, cr, cy]) => {
      setBlocks(b.data)
      setCrops(cr.data)
      setCycles(cy.data)
    })
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (a: KnowledgeArticle) => {
    setEditing(a)
    setForm({
      title:    a.title,
      category: a.category,
      content:  a.content,
      tags:     a.tags ?? '',
      blockId:  a.blockId ? String(a.blockId) : '',
      cycleId:  a.cycleId ? String(a.cycleId) : '',
      cropId:   a.cropId  ? String(a.cropId)  : '',
    })
    setError('')
    setViewing(null)
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = {
        title:    form.title,
        category: form.category,
        content:  form.content,
        tags:     form.tags || undefined,
        blockId:  form.blockId || undefined,
        cycleId:  form.cycleId || undefined,
        cropId:   form.cropId  || undefined,
      }
      if (editing) {
        await client.put(`/knowledge/${editing.id}`, payload)
      } else {
        await client.post('/knowledge', payload)
      }
      closeModal()
      load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handlePublish = async (id: number) => {
    setPublishing(id)
    try {
      await client.patch(`/knowledge/${id}/publish`)
      load()
      if (viewing?.id === id) setViewing(prev => prev ? { ...prev, status: 'Publicado' } : null)
    } finally { setPublishing(null) }
  }

  const handleDelete = async (id: number) => {
    try {
      await client.delete(`/knowledge/${id}`)
      setConfirmDelete(null)
      if (viewing?.id === id) setViewing(null)
      load()
    } catch { setConfirmDelete(null) }
  }

  const filtered = articles.filter(a => {
    const q = search.toLowerCase()
    if (q && !a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q) && !(a.tags ?? '').toLowerCase().includes(q)) return false
    if (categoryFilter && a.category !== categoryFilter) return false
    if (statusFilter && a.status !== statusFilter) return false
    if (cropFilter && String(a.cropId) !== cropFilter) return false
    return true
  })

  const parseTags = (tags?: string) =>
    tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

  const canEdit = (a: KnowledgeArticle) =>
    canPublish || (isSupervisor && a.createdById === user?.id && a.status === 'Borrador')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de Conocimiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Documentación de problemas y soluciones agrícolas</p>
        </div>
        <button onClick={openCreate}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Nuevo artículo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título, contenido o etiquetas..."
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {!isSupervisor && (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Publicado">Publicado</option>
          </select>
        )}
        <select value={cropFilter} onChange={e => setCropFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos los cultivos</option>
          {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || categoryFilter || statusFilter || cropFilter) && (
          <button onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setCropFilter('') }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            Limpiar
          </button>
        )}
      </div>

      {/* Grid de artículos */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando artículos...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-base font-medium">No hay artículos{search || categoryFilter ? ' con estos filtros' : ''}</p>
          <p className="text-sm mt-1">Crea el primero documentando un problema agrícola</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 flex-1">
                {/* Estado + Categoría */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${categoryColor[a.category]}`}>
                    {a.category}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'Publicado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.status}
                  </span>
                </div>

                {/* Título */}
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{a.title}</h3>

                {/* Extracto */}
                <p className="text-xs text-gray-500 line-clamp-3 mb-3">{a.content}</p>

                {/* Etiquetas */}
                {parseTags(a.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {parseTags(a.tags).slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {parseTags(a.tags).length > 4 && (
                      <span className="text-xs text-gray-400">+{parseTags(a.tags).length - 4}</span>
                    )}
                  </div>
                )}

                {/* Vinculaciones */}
                {(a.block || a.crop || a.cycle) && (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                    {a.block && <span className="flex items-center gap-1">🗺️ {a.block.code}</span>}
                    {a.crop  && <span className="flex items-center gap-1">🌱 {a.crop.name}</span>}
                    {a.cycle && <span className="flex items-center gap-1">🌾 {a.cycle.code ?? `#${a.cycle.id}`}</span>}
                  </div>
                )}

                {/* Autor + fecha */}
                <p className="text-xs text-gray-400">
                  {a.createdBy?.name} · {new Date(a.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Acciones */}
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                <button onClick={() => setViewing(a)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors">
                  Ver
                </button>
                {canEdit(a) && (
                  <button onClick={() => openEdit(a)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">
                    Editar
                  </button>
                )}
                {canPublish && a.status === 'Borrador' && (
                  <button onClick={() => handlePublish(a.id)} disabled={publishing === a.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold transition-colors">
                    {publishing === a.id ? '...' : 'Publicar'}
                  </button>
                )}
                {canDelete && (
                  <div className="ml-auto">
                    {confirmDelete === a.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(a.id)}
                          className="text-xs px-2 py-1 rounded bg-red-600 text-white font-semibold">✓</button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Ver artículo */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${categoryColor[viewing.category]}`}>
                  {viewing.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${viewing.status === 'Publicado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {viewing.status}
                </span>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600 text-xl ml-4 shrink-0">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">{viewing.title}</h2>

              {/* Contenido */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewing.content}</p>
              </div>

              {/* Etiquetas */}
              {parseTags(viewing.tags).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Etiquetas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(viewing.tags).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Vinculaciones */}
              {(viewing.block || viewing.crop || viewing.cycle) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vinculado a</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {viewing.block && <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">🗺️ <span className="font-medium">{viewing.block.code}</span> — {viewing.block.name}</span>}
                    {viewing.crop  && <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">🌱 {viewing.crop.name}</span>}
                    {viewing.cycle && <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">🌾 Ciclo {viewing.cycle.code ?? `#${viewing.cycle.id}`}</span>}
                  </div>
                </div>
              )}

              {/* Metadatos */}
              <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                {viewing.createdBy && <p>Creado por <span className="font-medium text-gray-600">{viewing.createdBy.name}</span> · {new Date(viewing.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                {viewing.publishedBy && viewing.publishedAt && (
                  <p>Publicado por <span className="font-medium text-gray-600">{viewing.publishedBy.name}</span> · {new Date(viewing.publishedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                )}
              </div>

              {/* Acciones en modal de vista */}
              <div className="flex gap-3 pt-2">
                {canEdit(viewing) && (
                  <button onClick={() => openEdit(viewing)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                    Editar
                  </button>
                )}
                {canPublish && viewing.status === 'Borrador' && (
                  <button onClick={() => handlePublish(viewing.id)} disabled={publishing === viewing.id}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                    {publishing === viewing.id ? 'Publicando...' : '✓ Publicar artículo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Editar artículo' : 'Nuevo artículo'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Título *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Control de mosca blanca en tomate"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría *</label>
                <select required value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ArticleCategory }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Contenido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contenido *</label>
                <textarea required value={form.content} rows={7}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Describe el problema, síntomas observados, tratamiento aplicado y resultado obtenido..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>

              {/* Etiquetas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Etiquetas <span className="text-gray-400 font-normal">(separadas por coma)</span></label>
                <input type="text" value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="mosca blanca, insecticida, tomate, prevención"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                {form.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parseTags(form.tags).map(tag => (
                      <span key={tag} className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full border border-green-200">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Vinculaciones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bloque</label>
                  <select value={form.blockId}
                    onChange={e => setForm(f => ({ ...f, blockId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sin bloque</option>
                    {blocks.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cultivo</label>
                  <select value={form.cropId}
                    onChange={e => setForm(f => ({ ...f, cropId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sin cultivo</option>
                    {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciclo</label>
                  <select value={form.cycleId}
                    onChange={e => setForm(f => ({ ...f, cycleId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sin ciclo</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.code ?? `#${c.id}`} — {c.block?.code}</option>)}
                  </select>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear artículo'}
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
