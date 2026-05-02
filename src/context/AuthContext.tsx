import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { User, LoginCredentials } from '../types'
import client from '../api/client'

const INACTIVITY_MS = 2 * 60 * 1000 // 2 minutos
const ACTIVITY_KEY  = 'lastActivity'
const EVENTS        = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem(ACTIVITY_KEY)
    setUser(null)
  }

  const resetActivity = () => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
  }

  const isInactive = () => {
    const last = localStorage.getItem(ACTIVITY_KEY)
    if (!last) return false
    return Date.now() - parseInt(last) > INACTIVITY_MS
  }

  // Inicia el tracker de inactividad cuando hay sesión activa
  const startInactivityWatch = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    resetActivity()
    EVENTS.forEach(e => window.addEventListener(e, resetActivity, { passive: true }))
    timerRef.current = setInterval(() => {
      if (isInactive()) logout()
    }, 15_000)
  }

  const stopInactivityWatch = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    EVENTS.forEach(e => window.removeEventListener(e, resetActivity))
  }

  // Al cargar la app: verifica inactividad antes de validar el token
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    if (isInactive()) {
      localStorage.removeItem('token')
      localStorage.removeItem(ACTIVITY_KEY)
      setLoading(false)
      return
    }

    client.get('/auth/me')
      .then(res => {
        setUser(res.data)
        startInactivityWatch()
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem(ACTIVITY_KEY)
      })
      .finally(() => setLoading(false))

    return () => stopInactivityWatch()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (credentials: LoginCredentials) => {
    const res = await client.post('/auth/login', credentials)
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    startInactivityWatch()
  }

  const logoutHandler = () => {
    stopInactivityWatch()
    logout()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout: logoutHandler }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
