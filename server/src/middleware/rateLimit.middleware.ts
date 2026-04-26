import { Request, Response, NextFunction } from 'express'

const attempts = new Map<string, { count: number; resetAt: number }>()

export const loginRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const maxAttempts = 15

  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs })
    next()
    return
  }

  if (entry.count >= maxAttempts) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000)
    res.status(429).json({ message: `Demasiados intentos. Intenta de nuevo en ${minutesLeft} minutos.` })
    return
  }

  entry.count++
  next()
}
