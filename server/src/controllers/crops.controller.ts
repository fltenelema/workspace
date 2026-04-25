import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getCrops = async (_req: AuthRequest, res: Response) => {
  const crops = await prisma.crop.findMany({ include: { varieties: true }, orderBy: { name: 'asc' } })
  res.json(crops)
}

export const getCrop = async (req: AuthRequest, res: Response) => {
  const crop = await prisma.crop.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { varieties: true },
  })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  res.json(crop)
}

export const createCrop = async (req: AuthRequest, res: Response) => {
  const { name, unit, harvestDays, notes } = req.body
  if (!name) { res.status(400).json({ message: 'El nombre es requerido' }); return }
  const exists = await prisma.crop.findUnique({ where: { name } })
  if (exists) { res.status(400).json({ message: 'Ya existe un cultivo con ese nombre' }); return }
  const crop = await prisma.crop.create({
    data: { name, unit: unit || 'kg', harvestDays: harvestDays ? parseInt(harvestDays) : 90, notes },
    include: { varieties: true },
  })
  res.status(201).json(crop)
}

export const updateCrop = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { name, unit, harvestDays, notes } = req.body
  const crop = await prisma.crop.findUnique({ where: { id } })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  const updated = await prisma.crop.update({
    where: { id },
    data: { name, unit, harvestDays: harvestDays ? parseInt(harvestDays) : undefined, notes },
    include: { varieties: true },
  })
  res.json(updated)
}

export const deleteCrop = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
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
  const crop = await prisma.crop.findUnique({ where: { id: cropId } })
  if (!crop) { res.status(404).json({ message: 'Cultivo no encontrado' }); return }
  const variety = await prisma.variety.create({ data: { name, cropId } })
  res.status(201).json(variety)
}

export const deleteVariety = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.varId)
  await prisma.variety.delete({ where: { id } })
  res.json({ message: 'Variedad eliminada' })
}
