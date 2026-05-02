import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tenantFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

export const getBlocks = async (req: AuthRequest, res: Response) => {
  const blocks = await prisma.block.findMany({
    where: tenantFilter(req),
    orderBy: { code: 'asc' },
  })
  res.json(blocks)
}

export const getFreeBlocks = async (req: AuthRequest, res: Response) => {
  const blocks = await prisma.block.findMany({
    where: { status: 'Libre', ...tenantFilter(req) },
    orderBy: { code: 'asc' },
  })
  res.json(blocks)
}

export const getBlock = async (req: AuthRequest, res: Response) => {
  const block = await prisma.block.findFirst({
    where: { id: parseInt(req.params.id), ...tenantFilter(req) },
  })
  if (!block) { res.status(404).json({ message: 'Bloque no encontrado' }); return }
  res.json(block)
}

export const createBlock = async (req: AuthRequest, res: Response) => {
  const { code, name, area, notes } = req.body
  if (!code || !name || !area) {
    res.status(400).json({ message: 'Código, nombre y área son requeridos' }); return
  }
  const tenantId = req.userRole === 'SUPER_ADMIN' ? null : (req.tenantId ?? null)
  if (parseFloat(area) <= 0) { res.status(400).json({ message: 'El área debe ser mayor a 0' }); return }
  const exists = await prisma.block.findFirst({ where: { code, tenantId } })
  if (exists) { res.status(400).json({ message: 'Ya existe un bloque con ese código' }); return }
  const block = await prisma.block.create({ data: { code, name, area: parseFloat(area), notes, tenantId } })
  res.status(201).json(block)
}

export const updateBlock = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { code, name, area, notes } = req.body
  const block = await prisma.block.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!block) { res.status(404).json({ message: 'Bloque no encontrado' }); return }
  if (area !== undefined && parseFloat(area) <= 0) { res.status(400).json({ message: 'El área debe ser mayor a 0' }); return }
  const updated = await prisma.block.update({
    where: { id },
    data: { code, name, area: area ? parseFloat(area) : undefined, notes },
  })
  res.json(updated)
}

export const deleteBlock = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const block = await prisma.block.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!block) { res.status(404).json({ message: 'Bloque no encontrado' }); return }
  const cycles = await prisma.cycle.count({ where: { blockId: id } })
  if (cycles > 0) { res.status(400).json({ message: 'No se puede eliminar un bloque con ciclos registrados' }); return }
  await prisma.block.delete({ where: { id } })
  res.json({ message: 'Bloque eliminado' })
}
