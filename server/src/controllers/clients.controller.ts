import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tenantFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

export const getClients = async (req: AuthRequest, res: Response) => {
  const clients = await prisma.client.findMany({
    where: tenantFilter(req),
    orderBy: { name: 'asc' },
  })
  res.json(clients)
}

export const createClient = async (req: AuthRequest, res: Response) => {
  const { name, phone, email, notes } = req.body
  if (!name) { res.status(400).json({ message: 'El nombre es requerido' }); return }
  const tenantId = req.userRole === 'SUPER_ADMIN' ? null : (req.tenantId ?? null)
  const client = await prisma.client.create({ data: { name, phone, email, notes, tenantId } })
  res.status(201).json(client)
}

export const updateClient = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { name, phone, email, notes, active } = req.body
  const client = await prisma.client.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!client) { res.status(404).json({ message: 'Cliente no encontrado' }); return }
  const updated = await prisma.client.update({ where: { id }, data: { name, phone, email, notes, active } })
  res.json(updated)
}

export const deleteClient = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const client = await prisma.client.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!client) { res.status(404).json({ message: 'Cliente no encontrado' }); return }
  const sales = await prisma.sale.count({ where: { clientId: id } })
  if (sales > 0) { res.status(400).json({ message: 'No se puede eliminar un cliente con ventas registradas' }); return }
  await prisma.client.delete({ where: { id } })
  res.json({ message: 'Cliente eliminado' })
}
