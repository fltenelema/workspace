import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { SearchResult } from '../types'

const TYPE_ICONS: Record<SearchResult['type'], string> = {
  cycle: '🌾',
  block: '🗺️',
  client: '🤝',
  worker: '👷',
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await client.get<{ results: SearchResult[] }>('/search', { params: { q } })
      setResults(res.data.results)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (query.length >= 2) { search(query) } else { setResults([]) } }, 300)
    return () => clearTimeout(t)
  }, [query, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (r: SearchResult) => {
    setQuery('')
    setOpen(false)
    setResults([])
    navigate(r.link)
  }

  return (
    <div ref={ref} className="relative w-64">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar ciclos, bloques..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs animate-spin">⟳</span>}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {loading ? 'Buscando...' : 'Sin resultados'}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-2.5">
                  <span className="text-base">{TYPE_ICONS[r.type]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.label}</p>
                    {r.sublabel && <p className="text-xs text-gray-400">{r.sublabel}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
