import { Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'USER']

const selectFields = {
  id: true, name: true, email: true,
  role: true, active: true, tenantId: true, createdAt: true, updatedAt: true,
  tenant: { select: { name: true } },
}

const mapUser = (u: { tenant?: { name: string } | null; [k: string]: unknown }) => {
  const { tenant, ...rest } = u
  return { ...rest, tenantName: tenant?.name ?? null }
}

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, role, active, tenantId } = req.query
  const where: Record<string, unknown> = {}

  if (req.userRole === 'ADMIN') {
    where.tenantId = req.tenantId ?? null
  }

  // SUPER_ADMIN puede filtrar por instancia (tenantId)
  if (req.userRole === 'SUPER_ADMIN' && tenantId) {
    where.tenantId = parseInt(String(tenantId))
  }

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
  res.json(users.map(mapUser))
}

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const where: Record<string, unknown> = { id }
  if (req.userRole === 'ADMIN') where.tenantId = req.tenantId ?? null
  const user = await prisma.user.findFirst({ where, select: selectFields })
  if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
  res.json(mapUser(user))
}

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' }); return
  }
  if (password.length < 6) {
    res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' }); return
  }
  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ message: 'Rol inválido' }); return
  }
  if (req.userRole === 'ADMIN' && role && !['USER', 'SUPERVISOR'].includes(role)) {
    res.status(403).json({ message: 'Los administradores solo pueden crear usuarios y supervisores' }); return
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) { res.status(400).json({ message: 'El email ya está registrado' }); return }

  let tenantId: number | null = null

  if (req.userRole === 'ADMIN') {
    tenantId = req.tenantId ?? null
  } else if (req.userRole === 'SUPER_ADMIN') {
    if (role === 'ADMIN') {
      const tenantName = req.body.tenantName?.trim()
      if (!tenantName) {
        res.status(400).json({ message: 'Debes ingresar el nombre de la instancia para el administrador' }); return
      }
      const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now()
      const tenant = await prisma.tenant.create({ data: { name: tenantName, slug } })
      tenantId = tenant.id
    }
  }

  const user = await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10), role: role || 'USER', tenantId },
    select: selectFields,
  })
  res.status(201).json(mapUser(user))
}

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { name, email, password, role, active } = req.body

  const targetWhere: Record<string, unknown> = { id }
  if (req.userRole === 'ADMIN') targetWhere.tenantId = req.tenantId ?? null
  const target = await prisma.user.findFirst({ where: targetWhere })
  if (!target) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

  if (req.userRole === 'ADMIN') {
    const isOther = target.id !== req.userId
    if (isOther && (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN')) {
      res.status(403).json({ message: 'No puedes editar a un administrador' }); return
    }
    if (role && !['USER', 'SUPERVISOR'].includes(role)) {
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
  res.json(mapUser(user))
}

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  if (id === req.userId) { res.status(400).json({ message: 'No puedes eliminarte a ti mismo' }); return }

  const targetWhere: Record<string, unknown> = { id }
  if (req.userRole === 'ADMIN') targetWhere.tenantId = req.tenantId ?? null
  const user = await prisma.user.findFirst({ where: targetWhere })
  if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

  await prisma.user.delete({ where: { id } })
  res.json({ message: 'Usuario eliminado correctamente' })
}

export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  if (id === req.userId) { res.status(400).json({ message: 'No puedes desactivarte a ti mismo' }); return }

  const targetWhere: Record<string, unknown> = { id }
  if (req.userRole === 'ADMIN') targetWhere.tenantId = req.tenantId ?? null
  const target = await prisma.user.findFirst({ where: targetWhere })
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

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const tf = req.userRole === 'ADMIN' ? { tenantId: req.tenantId ?? null } : {}
  const [total, active, superAdmins, admins, users] = await Promise.all([
    prisma.user.count({ where: tf }),
    prisma.user.count({ where: { active: true, ...tf } }),
    prisma.user.count({ where: { role: 'SUPER_ADMIN', ...tf } }),
    prisma.user.count({ where: { role: 'ADMIN', ...tf } }),
    prisma.user.count({ where: { role: 'USER', ...tf } }),
  ])
  res.json({ total, active, inactive: total - active, byRole: { SUPER_ADMIN: superAdmins, ADMIN: admins, USER: users } })
}
