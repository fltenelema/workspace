import { Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'USER']

const selectFields = {
  id: true, name: true, email: true,
  role: true, active: true, createdAt: true, updatedAt: true,
}

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, role, active } = req.query
  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { name: { contains: String(search) } },
      { email: { contains: String(search) } },
    ]
  }
  if (role) where.role = role
  if (active !== undefined && active !== '') where.active = active === 'true'

  const users = await prisma.user.findMany({
    where,
    select: selectFields,
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
}

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const user = await prisma.user.findUnique({ where: { id }, select: selectFields })
  if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
  res.json(user)
}

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' }); return
  }
  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ message: 'Rol inválido' }); return
  }
  if (req.userRole === 'ADMIN' && role && role !== 'USER') {
    res.status(403).json({ message: 'Los administradores solo pueden crear usuarios normales' }); return
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) { res.status(400).json({ message: 'El email ya está registrado' }); return }

  const user = await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10), role: role || 'USER' },
    select: selectFields,
  })
  res.status(201).json(user)
}

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { name, email, password, role, active } = req.body

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

  if (req.userRole === 'ADMIN') {
    const isOther = target.id !== req.userId
    if (isOther && (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN')) {
      res.status(403).json({ message: 'No puedes editar a un administrador' }); return
    }
    if (role && role !== 'USER') {
      res.status(403).json({ message: 'No tienes permiso para asignar ese rol' }); return
    }
  }
  if (req.userRole === 'USER' && id !== req.userId) {
    res.status(403).json({ message: 'Solo puedes editar tu propio perfil' }); return
  }

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) data.password = await bcrypt.hash(password, 10)
  if (role && req.userRole === 'SUPER_ADMIN') data.role = role
  if (active !== undefined && req.userRole !== 'USER') data.active = active

  const user = await prisma.user.update({ where: { id }, data, select: selectFields })
  res.json(user)
}

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  if (id === req.userId) { res.status(400).json({ message: 'No puedes eliminarte a ti mismo' }); return }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

  await prisma.user.delete({ where: { id } })
  res.json({ message: 'Usuario eliminado correctamente' })
}

export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  if (id === req.userId) { res.status(400).json({ message: 'No puedes desactivarte a ti mismo' }); return }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

  if (req.userRole === 'ADMIN' && (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN')) {
    res.status(403).json({ message: 'No tienes permiso para modificar este usuario' }); return
  }

  const user = await prisma.user.update({
    where: { id },
    data: { active: !target.active },
    select: selectFields,
  })
  res.json(user)
}

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [total, active, superAdmins, admins, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'USER' } }),
  ])
  res.json({ total, active, inactive: total - active, byRole: { SUPER_ADMIN: superAdmins, ADMIN: admins, USER: users } })
}
