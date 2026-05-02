import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const safeUser = (user: {
  id: number; name: string; email: string; role: string
  active: boolean; tenantId?: number | null; createdAt: Date; updatedAt: Date
  tenant?: { name: string } | null
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  tenantId: user.tenantId ?? null,
  tenantName: user.tenant?.name ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ message: 'Email y contraseña son requeridos' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { name: true } } },
  })
  if (!user) {
    res.status(401).json({ message: 'Credenciales inválidas' })
    return
  }
  if (!user.active) {
    res.status(401).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ message: 'Credenciales inválidas' })
    return
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, tenantId: user.tenantId ?? null },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '24h' }
  )

  res.json({ token, user: safeUser(user) })
}

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { tenant: { select: { name: true } } },
  })
  if (!user) {
    res.status(404).json({ message: 'Usuario no encontrado' })
    return
  }
  res.json(safeUser(user))
}
