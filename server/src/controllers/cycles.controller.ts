import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tenantFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

const cycleInclude = {
  block: true, crop: true, variety: true,
  sales: { include: { client: true, variety: true } },
  expenses: true,
  labors: { include: { worker: true } },
}

export const getCycles = async (req: AuthRequest, res: Response) => {
  const { status } = req.query
  const where = { ...tenantFilter(req), ...(status ? { status: String(status) } : {}) }
  const cycles = await prisma.cycle.findMany({
    where,
    include: { block: true, crop: true, variety: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(cycles)
}

export const getActiveCycles = async (req: AuthRequest, res: Response) => {
  const cycles = await prisma.cycle.findMany({
    where: { status: { not: 'Cerrado' }, ...tenantFilter(req) },
    include: cycleInclude,
    orderBy: { sowingDate: 'asc' },
  })
  res.json(cycles)
}

export const getCycle = async (req: AuthRequest, res: Response) => {
  const cycle = await prisma.cycle.findFirst({
    where: { id: parseInt(req.params.id), ...tenantFilter(req) },
    include: cycleInclude,
  })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }
  res.json(cycle)
}

export const createCycle = async (req: AuthRequest, res: Response) => {
  const { blockId, cropId, varietyId, sowingDate, notes } = req.body
  if (!blockId || !cropId || !sowingDate) {
    res.status(400).json({ message: 'Bloque, cultivo y fecha de siembra son requeridos' }); return
  }
  const tenantId = req.userRole === 'SUPER_ADMIN' ? null : (req.tenantId ?? null)
  const block = await prisma.block.findFirst({
    where: { id: parseInt(blockId), ...tenantFilter(req) },
  })
  if (!block) { res.status(404).json({ message: 'Bloque no encontrado' }); return }
  if (block.status !== 'Libre') { res.status(400).json({ message: 'El bloque no está disponible' }); return }

  const cycle = await prisma.cycle.create({
    data: {
      blockId: parseInt(blockId), cropId: parseInt(cropId),
      varietyId: varietyId ? parseInt(varietyId) : null,
      sowingDate: new Date(sowingDate), notes, tenantId,
    },
    include: { block: true, crop: true, variety: true },
  })

  const code = `CIC-${new Date().getFullYear()}-${String(cycle.id).padStart(3, '0')}`
  const [updated] = await Promise.all([
    prisma.cycle.update({ where: { id: cycle.id }, data: { code }, include: { block: true, crop: true, variety: true } }),
    prisma.block.update({ where: { id: parseInt(blockId) }, data: { status: 'En Cultivo' } }),
  ])
  res.status(201).json(updated)
}

export const closeCycle = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const cycle = await prisma.cycle.findFirst({
    where: { id, ...tenantFilter(req) },
    include: { block: true },
  })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }
  if (cycle.status === 'Cerrado') { res.status(400).json({ message: 'El ciclo ya está cerrado' }); return }

  const [updated] = await Promise.all([
    prisma.cycle.update({
      where: { id },
      data: { status: 'Cerrado', closingDate: new Date() },
      include: cycleInclude,
    }),
    prisma.block.update({ where: { id: cycle.blockId }, data: { status: 'Libre' } }),
  ])
  res.json(updated)
}

export const updateCycleStatus = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const { status } = req.body
  const valid = ['En Curso', 'Cosechando', 'Cerrado']
  if (!valid.includes(status)) { res.status(400).json({ message: 'Estado inválido' }); return }
  const cycle = await prisma.cycle.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }
  const updated = await prisma.cycle.update({ where: { id }, data: { status }, include: { block: true, crop: true } })
  res.json(updated)
}

export const deleteCycle = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const cycle = await prisma.cycle.findFirst({ where: { id, ...tenantFilter(req) } })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }

  await prisma.$transaction([
    prisma.sale.deleteMany({ where: { cycleId: id } }),
    prisma.expense.deleteMany({ where: { cycleId: id } }),
    prisma.labor.deleteMany({ where: { cycleId: id } }),
    prisma.knowledgeArticle.updateMany({ where: { cycleId: id }, data: { cycleId: null } }),
    prisma.cycle.delete({ where: { id } }),
    ...(cycle.status !== 'Cerrado'
      ? [prisma.block.update({ where: { id: cycle.blockId }, data: { status: 'Libre' } })]
      : []),
  ])
  res.json({ message: 'Ciclo eliminado' })
}
