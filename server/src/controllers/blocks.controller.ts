import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getBlocks = async (_req: AuthRequest, res: Response) => {
  const blocks = await prisma.block.findMany({ orderBy: { code: 'asc' } })
  res.json(blocks)
}

export const getFreeBlocks = async (_req: AuthRequest, res: Response) => {
  const blocks = await prisma.block.findMany({ where: { status: 'Libre' }, orderBy: { code: 'asc' } })
  res.json(blocks)
}

export const getBlock = async (req: AuthRequest, res: Response) => {
  const block = await prisma.block.findUnique({ where: { id: parseInt(req.params.id) } })
  if (!block) { res.status(404).json({ message: 'Bloque no encontrado' }); return }
  res.json(block)
}

export const createBlock = async (req: AuthRequest, res: Response) => {
  const { code, name, area, notes } = req.body
  if (!code || !name || !area) { res.status(400).json({ message: 'Código, nombre y área son requeridos' }); return }
  const exists = await prisma.block.findUnique({ where: { code } })
  if (exists) { res.status(400).json({ message: 'Ya existe un bloque con ese código' }); return }
  const block = await prisma.block.create({ data: { code, name, area: parseFloat(area), notes } })
  res.status(201).json(block)
}

export const updateBlock = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { code, name, area, notes } = req.body
  const block = await prisma.block.findUnique({ where: { id } })
  if (!block) { res.status(404).json({ message: 'Bloque no encontrado' }); return }
  const updated = await prisma.block.update({
    where: { id },
    data: { code, name, area: area ? parseFloat(area) : undefined, notes },
  })
  res.json(updated)
}

export const deleteBlock = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const cycles = await prisma.cycle.count({ where: { blockId: id } })
  if (cycles > 0) { res.status(400).json({ message: 'No se puede eliminar un bloque con ciclos registrados' }); return }
  await prisma.block.delete({ where: { id } })
  res.json({ message: 'Bloque eliminado' })
}
