import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getExpenses = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query
  const where = cycleId ? { cycleId: parseInt(String(cycleId)) } : {}
  const expenses = await prisma.expense.findMany({
    where,
    include: { cycle: { include: { block: true, crop: true } } },
    orderBy: { date: 'desc' },
  })
  res.json(expenses)
}

export const createExpense = async (req: AuthRequest, res: Response) => {
  const { cycleId, category, item, quantity, unit, cost, date, notes } = req.body
  if (!cycleId || !category || !item || !cost) {
    res.status(400).json({ message: 'Ciclo, categoría, ítem y costo son requeridos' }); return
  }
  const cycle = await prisma.cycle.findUnique({ where: { id: parseInt(cycleId) } })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }
  if (cycle.status === 'Cerrado') { res.status(400).json({ message: 'El ciclo está cerrado' }); return }

  const qty = parseFloat(quantity) || 1
  const cst = parseFloat(cost)
  const total = qty * cst

  const expense = await prisma.expense.create({
    data: {
      cycleId: parseInt(cycleId), category, item,
      quantity: qty, unit: unit || 'unidad', cost: cst, total,
      date: date ? new Date(date) : new Date(), notes,
    },
  })
  res.status(201).json(expense)
}

export const updateExpense = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const expense = await prisma.expense.findUnique({ where: { id }, include: { cycle: true } })
  if (!expense) { res.status(404).json({ message: 'Gasto no encontrado' }); return }
  if (expense.cycle.status === 'Cerrado') { res.status(400).json({ message: 'No se puede editar un gasto de un ciclo cerrado' }); return }

  const { category, item, quantity, unit, cost, date, notes } = req.body
  const qty = quantity !== undefined ? parseFloat(quantity) : expense.quantity
  const cst = cost !== undefined ? parseFloat(cost) : expense.cost
  const total = qty * cst

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      category: category ?? undefined,
      item: item ?? undefined,
      quantity: qty, unit: unit ?? undefined, cost: cst, total,
      date: date ? new Date(date) : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  })
  res.json(updated)
}

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) { res.status(404).json({ message: 'Gasto no encontrado' }); return }
  await prisma.expense.delete({ where: { id } })
  res.json({ message: 'Gasto eliminado' })
}
