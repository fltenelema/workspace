import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

type InventoryPrisma = {
  findMany: (args?: unknown) => Promise<unknown[]>
  create: (args: unknown) => Promise<unknown>
  findUnique: (args: unknown) => Promise<unknown | null>
  update: (args: unknown) => Promise<unknown>
  delete: (args: unknown) => Promise<unknown>
}

function getInventoryModel(): InventoryPrisma | null {
  return ((prisma as unknown as Record<string, unknown>).inventory as InventoryPrisma) ?? null
}

export const getInventory = async (_req: AuthRequest, res: Response) => {
  const inv = getInventoryModel()
  if (!inv) { res.status(503).json({ message: 'Módulo de inventario no disponible. Ejecuta "npx prisma generate" en el servidor.' }); return }
  const items = await inv.findMany({ orderBy: { name: 'asc' } } as unknown)
  res.json(items)
}

export const createInventoryItem = async (req: AuthRequest, res: Response) => {
  const inv = getInventoryModel()
  if (!inv) { res.status(503).json({ message: 'Módulo de inventario no disponible.' }); return }
  const { name, category, quantity, unit, minStock, cost, notes } = req.body
  if (!name || !category) { res.status(400).json({ message: 'Nombre y categoría son requeridos' }); return }
  const item = await inv.create({
    data: {
      name, category,
      quantity: quantity !== undefined ? parseFloat(quantity) : 0,
      unit: unit || 'unidad',
      minStock: minStock !== undefined ? parseFloat(minStock) : 0,
      cost: cost !== undefined ? parseFloat(cost) : 0,
      notes,
    },
  })
  res.status(201).json(item)
}

export const updateInventoryItem = async (req: AuthRequest, res: Response) => {
  const inv = getInventoryModel()
  if (!inv) { res.status(503).json({ message: 'Módulo de inventario no disponible.' }); return }
  const id = parseInt(req.params.id)
  const item = await inv.findUnique({ where: { id } })
  if (!item) { res.status(404).json({ message: 'Ítem no encontrado' }); return }
  const { name, category, quantity, unit, minStock, cost, notes } = req.body
  const updated = await inv.update({
    where: { id },
    data: {
      name: name ?? undefined,
      category: category ?? undefined,
      quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      unit: unit ?? undefined,
      minStock: minStock !== undefined ? parseFloat(minStock) : undefined,
      cost: cost !== undefined ? parseFloat(cost) : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  })
  res.json(updated)
}

export const deleteInventoryItem = async (req: AuthRequest, res: Response) => {
  const inv = getInventoryModel()
  if (!inv) { res.status(503).json({ message: 'Módulo de inventario no disponible.' }); return }
  const id = parseInt(req.params.id)
  const item = await inv.findUnique({ where: { id } })
  if (!item) { res.status(404).json({ message: 'Ítem no encontrado' }); return }
  await inv.delete({ where: { id } })
  res.json({ message: 'Ítem eliminado' })
}
