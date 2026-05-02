import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getTenants = async (_req: AuthRequest, res: Response): Promise<void> => {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, blocks: true, cycles: true } },
      users: {
        where: { role: 'ADMIN' },
        select: { id: true, name: true, email: true, active: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tenants)
}

export const getTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, blocks: true, cycles: true, workers: true } },
      users: { select: { id: true, name: true, email: true, role: true, active: true } },
    },
  })
  if (!tenant) { res.status(404).json({ message: 'Instancia no encontrada' }); return }
  res.json(tenant)
}

export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body
  if (!name || !name.trim()) {
    res.status(400).json({ message: 'El nombre de la instancia es requerido' }); return
  }
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now()
  const tenant = await prisma.tenant.create({ data: { name: name.trim(), slug } })
  res.status(201).json(tenant)
}

export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { name } = req.body
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) { res.status(404).json({ message: 'Instancia no encontrada' }); return }
  const updated = await prisma.tenant.update({ where: { id }, data: { name } })
  res.json(updated)
}

export const deleteTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true, blocks: true, cycles: true,
          workers: true, clients: true, crops: true,
          inventory: true, tasks: true, knowledgeArticles: true,
        },
      },
    },
  })
  if (!tenant) { res.status(404).json({ message: 'Instancia no encontrada' }); return }

  const c = tenant._count
  const parts: string[] = []
  if (c.users)             parts.push(`${c.users} usuario(s)`)
  if (c.blocks)            parts.push(`${c.blocks} bloque(s)`)
  if (c.cycles)            parts.push(`${c.cycles} ciclo(s)`)
  if (c.workers)           parts.push(`${c.workers} trabajador(es)`)
  if (c.clients)           parts.push(`${c.clients} cliente(s)`)
  if (c.crops)             parts.push(`${c.crops} cultivo(s)`)
  if (c.inventory)         parts.push(`${c.inventory} ítem(s) de inventario`)
  if (c.tasks)             parts.push(`${c.tasks} tarea(s)`)
  if (c.knowledgeArticles) parts.push(`${c.knowledgeArticles} artículo(s) de conocimiento`)

  if (parts.length > 0) {
    res.status(400).json({
      message: `No se puede eliminar: la instancia tiene ${parts.join(', ')}. Elimina todos los datos primero.`,
    }); return
  }

  await prisma.tenant.delete({ where: { id } })
  res.json({ message: 'Instancia eliminada correctamente' })
}

export const toggleTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) { res.status(404).json({ message: 'Instancia no encontrada' }); return }

  const newActive = !tenant.active
  const [updated] = await Promise.all([
    prisma.tenant.update({ where: { id }, data: { active: newActive } }),
    prisma.user.updateMany({ where: { tenantId: id, role: { not: 'SUPER_ADMIN' } }, data: { active: newActive } }),
  ])
  res.json(updated)
}
