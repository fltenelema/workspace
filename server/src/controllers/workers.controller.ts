import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getWorkers = async (_req: AuthRequest, res: Response) => {
  const workers = await prisma.worker.findMany({ orderBy: { name: 'asc' } })
  res.json(workers)
}

export const createWorker = async (req: AuthRequest, res: Response) => {
  const { name, dailySalary, phone } = req.body
  if (!name || !dailySalary) { res.status(400).json({ message: 'Nombre y salario diario son requeridos' }); return }
  const worker = await prisma.worker.create({ data: { name, dailySalary: parseFloat(dailySalary), phone } })
  res.status(201).json(worker)
}

export const updateWorker = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { name, dailySalary, phone, active } = req.body
  const worker = await prisma.worker.findUnique({ where: { id } })
  if (!worker) { res.status(404).json({ message: 'Trabajador no encontrado' }); return }
  const updated = await prisma.worker.update({
    where: { id },
    data: { name, dailySalary: dailySalary ? parseFloat(dailySalary) : undefined, phone, active },
  })
  res.json(updated)
}

export const getWorkerStats = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const worker = await prisma.worker.findUnique({ where: { id } })
  if (!worker) { res.status(404).json({ message: 'Trabajador no encontrado' }); return }

  const labors = await prisma.labor.findMany({
    where: { workerId: id },
    include: { cycle: { include: { block: true, crop: true } } },
    orderBy: { date: 'desc' },
  })

  const totalDays = labors.reduce((s, l) => s + l.days, 0)
  const totalEarned = labors.reduce((s, l) => s + l.total, 0)
  const cycleIds = [...new Set(labors.map(l => l.cycleId))]

  res.json({
    worker, totalDays, totalEarned,
    cyclesCount: cycleIds.length,
    recentLabors: labors.slice(0, 10),
  })
}

export const deleteWorker = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const labors = await prisma.labor.count({ where: { workerId: id } })
  if (labors > 0) { res.status(400).json({ message: 'No se puede eliminar un trabajador con labores registradas' }); return }
  await prisma.worker.delete({ where: { id } })
  res.json({ message: 'Trabajador eliminado' })
}
