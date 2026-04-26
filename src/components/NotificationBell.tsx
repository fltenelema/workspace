import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { Notification } from '../types'

const TYPE_CONFIG = {
  error: { bg: 'bg-red-50 border-red-200', icon: '🔴', text: 'text-red-800' },
  warning: { bg: 'bg-amber-50 border-amber-200', icon: '🟡', text: 'text-amber-800' },
  info: { bg: 'bg-blue-50 border-blue-200', icon: '🔵', text: 'text-blue-800' },
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    client.get<Notification[]>('/notifications').then(r => setNotifications(r.data)).catch(() => null)
    const interval = setInterval(() => {
      client.get<Notification[]>('/notifications').then(r => setNotifications(r.data)).catch(() => null)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const urgent = notifications.filter(n => n.type === 'error' || n.type === 'warning').length
  const total = notifications.length

  const handleClick = (n: Notification) => {
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <span className="text-lg">🔔</span>
        {total > 0 && (
          <span className={`absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${urgent > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
            {total > 0 && <span className="text-xs text-gray-400">{total} alerta{total !== 1 ? 's' : ''}</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm">Sin alertas pendientes</p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const cfg = TYPE_CONFIG[n.type]
                return (
                  <button
                    key={i}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{cfg.icon}</span>
                      <div>
                        <p className={`text-xs font-semibold ${cfg.text}`}>{n.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
