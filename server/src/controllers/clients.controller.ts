import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getClients = async (_req: AuthRequest, res: Response) => {
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })
  res.json(clients)
}

export const createClient = async (req: AuthRequest, res: Response) => {
  const { name, phone, email, notes } = req.body
  if (!name) { res.status(400).json({ message: 'El nombre es requerido' }); return }
  const client = await prisma.client.create({ data: { name, phone, email, notes } })
  res.status(201).json(client)
}

export const updateClient = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { name, phone, email, notes, active } = req.body
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) { res.status(404).json({ message: 'Cliente no encontrado' }); return }
  const updated = await prisma.client.update({ where: { id }, data: { name, phone, email, notes, active } })
  res.json(updated)
}

export const deleteClient = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const sales = await prisma.sale.count({ where: { clientId: id } })
  if (sales > 0) { res.status(400).json({ message: 'No se puede eliminar un cliente con ventas registradas' }); return }
  await prisma.client.delete({ where: { id } })
  res.json({ message: 'Cliente eliminado' })
}
