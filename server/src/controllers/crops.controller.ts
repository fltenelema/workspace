import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tenantFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

export const getCrops = async (req: AuthRequest, res: Response) => {
  const crops = await prisma.crop.findMany({
    where: tenantFilter(req),
    include: { varieties: true },
    orderBy: { name: 'asc' },
  })
  res.json(crops)
}

export const getCrop = async (req: AuthRequest, res: Response) => {
  const crop = await prisma.crop.findFirst({
    where: { id: parseInt(req.params.id), ...tenantFilter(req) },
    include: { varieties: true },
  })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  res.json(crop)
}

export const createCrop = async (req: AuthRequest, res: Response) => {
  const { name, unit, harvestDays, notes } = req.body
  if (!name) { res.status(400).json({ message: 'El nombre es requerido' }); return }
  if (harvestDays && parseInt(harvestDays) <= 0) { res.status(400).json({ message: 'Los días de cosecha deben ser mayor a 0' }); return }
  const tenantId = req.userRole === 'SUPER_ADMIN' ? null : (req.tenantId ?? null)
  const exists = await prisma.crop.findFirst({ where: { name, tenantId } })
  if (exists) { res.status(400).json({ message: 'Ya existe un cultivo con ese nombre' }); return }
  const crop = await prisma.crop.create({
    data: { name, unit: unit || 'kg', harvestDays: harvestDays ? parseInt(harvestDays) : 90, notes, tenantId },
    include: { varieties: true },
  })
  res.status(201).json(crop)
}

export const updateCrop = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { name, unit, harvestDays, notes } = req.body
  const crop = await prisma.crop.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  if (harvestDays && parseInt(harvestDays) <= 0) { res.status(400).json({ message: 'Los días de cosecha deben ser mayor a 0' }); return }
  const updated = await prisma.crop.update({
    where: { id },
    data: { name, unit, harvestDays: harvestDays ? parseInt(harvestDays) : undefined, notes },
    include: { varieties: true },
  })
  res.json(updated)
}

export const deleteCrop = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const crop = await prisma.crop.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  const cycles = await prisma.cycle.count({ where: { cropId: id } })
  if (cycles > 0) { res.status(400).json({ message: 'No se puede eliminar un cultivo con ciclos registrados' }); return }
  await prisma.variety.deleteMany({ where: { cropId: id } })
  await prisma.crop.delete({ where: { id } })
  res.json({ message: 'Cultivo eliminado' })
}

export const createVariety = async (req: AuthRequest, res: Response) => {
  const cropId = parseInt(req.params.id)
  const { name } = req.body
  if (!name) { res.status(400).json({ message: 'El nombre es requerido' }); return }
  const crop = await prisma.crop.findFirst({ where: { id: cropId, ...tenantFilter(req) } })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  const variety = await prisma.variety.create({ data: { name, cropId } })
  res.status(201).json(variety)
}

export const updateVariety = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.varId)
  const { name } = req.body
  if (!name) { res.status(400).json({ message: 'El nombre es requerido' }); return }
  const variety = await prisma.variety.findUnique({ where: { id } })
  if (!variety) { res.status(404).json({ message: 'Variedad no encontrada' }); return }
  const updated = await prisma.variety.update({ where: { id }, data: { name } })
  res.json(updated)
}

export const deleteVariety = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.varId)
  const cropId = parseInt(req.params.id)
  const crop = await prisma.crop.findFirst({ where: { id: cropId, ...tenantFilter(req) } })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  const variety = await prisma.variety.findFirst({ where: { id, cropId } })
  if (!variety) { res.status(404).json({ message: 'Variedad no encontrada' }); return }
  const cyclesWithVariety = await prisma.cycle.count({ where: { varietyId: id } })
  if (cyclesWithVariety > 0) { res.status(400).json({ message: 'No se puede eliminar una variedad con ciclos registrados' }); return }
  await prisma.variety.delete({ where: { id } })
  res.json({ message: 'Variedad eliminada' })
}
