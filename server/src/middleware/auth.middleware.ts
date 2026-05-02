import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: number
  userRole?: string
  tenantId?: number | null
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token no proporcionado' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) { res.status(500).json({ message: 'Configuración de servidor inválida' }); return }
    const payload = jwt.verify(token, secret) as {
      id: number; role: string; tenantId?: number | null
    }
    req.userId = payload.id
    req.userRole = payload.role
    req.tenantId = payload.tenantId ?? null
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ message: 'No tienes permiso para esta acción' })
      return
    }
    next()
  }
}
