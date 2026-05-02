import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tf = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

const taskInclude = {
  block:      { select: { id: true, code: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
}

export const getTasks = async (req: AuthRequest, res: Response) => {
  const where: Record<string, unknown> = { ...tf(req) }
  if (req.userRole === 'SUPERVISOR') where.assignedToId = req.userId

  const { status, priority, blockId, assignedToId } = req.query
  if (status)       where.status       = status
  if (priority)     where.priority     = priority
  if (blockId)      where.blockId      = parseInt(String(blockId))
  if (assignedToId) where.assignedToId = parseInt(String(assignedToId))

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  res.json(tasks)
}

export const getTask = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const where: Record<string, unknown> = { id, ...tf(req) }
  if (req.userRole === 'SUPERVISOR') where.assignedToId = req.userId

  const task = await prisma.task.findFirst({ where, include: taskInclude })
  if (!task) { res.status(404).json({ message: 'Tarea no encontrada' }); return }
  res.json(task)
}

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, blockId, assignedToId, priority, dueDate, notes } = req.body
  if (!title || !blockId || !assignedToId || !priority || !dueDate) {
    res.status(400).json({ message: 'Título, bloque, responsable, prioridad y fecha límite son requeridos' })
    return
  }

  const VALID_PRIORITIES = ['Baja', 'Media', 'Alta', 'Urgente']
  if (!VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ message: 'Prioridad inválida' }); return
  }

  const supervisor = await prisma.user.findFirst({
    where: { id: parseInt(assignedToId), role: 'SUPERVISOR', ...tf(req) },
  })
  if (!supervisor) {
    res.status(400).json({ message: 'El responsable debe ser un Supervisor de esta instancia' }); return
  }

  const block = await prisma.block.findFirst({
    where: { id: parseInt(blockId), ...tf(req) },
  })
  if (!block) {
    res.status(404).json({ message: 'Bloque no encontrado' }); return
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      blockId:      parseInt(blockId),
      assignedToId: parseInt(assignedToId),
      priority,
      dueDate:      new Date(dueDate),
      status:       'Pendiente',
      notes:        notes || null,
      createdById:  req.userId ?? null,
      tenantId:     req.userRole === 'SUPER_ADMIN' ? null : (req.tenantId ?? null),
    },
    include: taskInclude,
  })
  res.status(201).json(task)
}

export const updateTask = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const where: Record<string, unknown> = { id, ...tf(req) }
  if (req.userRole === 'SUPERVISOR') where.assignedToId = req.userId

  const existing = await prisma.task.findFirst({ where })
  if (!existing) { res.status(404).json({ message: 'Tarea no encontrada' }); return }

  const VALID_STATUSES = ['Pendiente', 'En Proceso', 'Completada']
  const data: Record<string, unknown> = {}

  if (req.userRole === 'SUPERVISOR') {
    const { status, observations } = req.body
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ message: 'Estado inválido' }); return
      }
      data.status = status
    }
    if (observations !== undefined) data.observations = observations || null
  } else {
    const { title, description, blockId, assignedToId, priority, dueDate, status, notes } = req.body
    if (title)                  data.title       = title
    if (description !== undefined) data.description = description || null
    if (blockId)                data.blockId     = parseInt(blockId)
    if (assignedToId) {
      const sup = await prisma.user.findFirst({
        where: { id: parseInt(assignedToId), role: 'SUPERVISOR', ...tf(req) },
      })
      if (!sup) { res.status(400).json({ message: 'El responsable debe ser un Supervisor' }); return }
      data.assignedToId = parseInt(assignedToId)
    }
    if (priority) {
      if (!['Baja', 'Media', 'Alta', 'Urgente'].includes(priority)) {
        res.status(400).json({ message: 'Prioridad inválida' }); return
      }
      data.priority = priority
    }
    if (dueDate)  data.dueDate = new Date(dueDate)
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ message: 'Estado inválido' }); return
      }
      data.status = status
    }
    if (notes !== undefined) data.notes = notes || null
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  })
  res.json(updated)
}

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const task = await prisma.task.findFirst({ where: { id, ...tf(req) } })
  if (!task) { res.status(404).json({ message: 'Tarea no encontrada' }); return }
  await prisma.task.delete({ where: { id } })
  res.json({ message: 'Tarea eliminada' })
}
