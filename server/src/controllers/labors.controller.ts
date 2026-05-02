import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const cycleFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

export const getLabors = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query
  const where: Record<string, unknown> = {}
  if (cycleId) where.cycleId = parseInt(String(cycleId))
  if (req.userRole !== 'SUPER_ADMIN') where.cycle = { tenantId: req.tenantId ?? null }
  const labors = await prisma.labor.findMany({
    where,
    include: { worker: true, cycle: { include: { block: true, crop: true } } },
    orderBy: { date: 'desc' },
  })
  res.json(labors)
}

export const createLabor = async (req: AuthRequest, res: Response) => {
  const { cycleId, workerId, days, date, notes } = req.body
  if (!cycleId || !workerId || !days) {
    res.status(400).json({ message: 'Ciclo, trabajador y días son requeridos' }); return
  }
  const cycle = await prisma.cycle.findFirst({
    where: { id: parseInt(cycleId), ...cycleFilter(req) },
  })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }
  if (cycle.status === 'Cerrado') { res.status(400).json({ message: 'El ciclo está cerrado' }); return }

  const worker = await prisma.worker.findUnique({ where: { id: parseInt(workerId) } })
  if (!worker) { res.status(404).json({ message: 'Trabajador no encontrado' }); return }

  const daysNum = parseFloat(days)
  if (isNaN(daysNum) || daysNum <= 0) { res.status(400).json({ message: 'Los días deben ser mayor a 0' }); return }
  const labor = await prisma.labor.create({
    data: {
      cycleId: parseInt(cycleId), workerId: parseInt(workerId),
      days: daysNum, dailyRate: worker.dailySalary, total: daysNum * worker.dailySalary,
      date: date ? new Date(date) : new Date(), notes,
    },
    include: { worker: true },
  })
  res.status(201).json(labor)
}

export const updateLabor = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const labor = await prisma.labor.findUnique({ where: { id }, include: { cycle: true, worker: true } })
  if (!labor) { res.status(404).json({ message: 'Labor no encontrada' }); return }
  if (req.userRole !== 'SUPER_ADMIN' && labor.cycle.tenantId !== (req.tenantId ?? null)) {
    res.status(403).json({ message: 'No tienes permiso' }); return
  }
  if (labor.cycle.status === 'Cerrado') { res.status(400).json({ message: 'No se puede editar una labor de un ciclo cerrado' }); return }

  const { days, date, notes } = req.body
  const daysNum = days !== undefined ? parseFloat(days) : labor.days

  const updated = await prisma.labor.update({
    where: { id },
    data: { days: daysNum, total: daysNum * labor.dailyRate, date: date ? new Date(date) : undefined, notes: notes !== undefined ? notes : undefined },
    include: { worker: true },
  })
  res.json(updated)
}

export const deleteLabor = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const labor = await prisma.labor.findUnique({ where: { id }, include: { cycle: true } })
  if (!labor) { res.status(404).json({ message: 'Labor no encontrada' }); return }
  if (req.userRole !== 'SUPER_ADMIN' && labor.cycle.tenantId !== (req.tenantId ?? null)) {
    res.status(403).json({ message: 'No tienes permiso' }); return
  }
  await prisma.labor.delete({ where: { id } })
  res.json({ message: 'Labor eliminada' })
}
