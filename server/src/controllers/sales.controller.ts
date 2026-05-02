import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const cycleFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

const calcTotals = (body: Record<string, unknown>) => {
  let totalKg = 0
  let totalUsd = 0
  for (let i = 1; i <= 7; i++) {
    const qty = parseFloat(String(body[`qty${i}`] ?? 0)) || 0
    const price = parseFloat(String(body[`price${i}`] ?? 0)) || 0
    totalKg += qty
    totalUsd += qty * price
  }
  return { totalKg, totalUsd }
}

export const getSales = async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query
  const where: Record<string, unknown> = {}
  if (cycleId) where.cycleId = parseInt(String(cycleId))
  if (req.userRole !== 'SUPER_ADMIN') where.cycle = { tenantId: req.tenantId ?? null }
  const sales = await prisma.sale.findMany({
    where,
    include: { client: true, variety: true, cycle: { include: { block: true, crop: true } } },
    orderBy: { date: 'desc' },
  })
  res.json(sales)
}

export const createSale = async (req: AuthRequest, res: Response) => {
  const { cycleId, clientId, varietyId, date, notes, ...rest } = req.body
  if (!cycleId || !clientId) { res.status(400).json({ message: 'Ciclo y cliente son requeridos' }); return }

  const cycle = await prisma.cycle.findFirst({
    where: { id: parseInt(cycleId), ...cycleFilter(req) },
  })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }
  if (cycle.status === 'Cerrado') { res.status(400).json({ message: 'El ciclo está cerrado' }); return }

  const hasQty = [1,2,3,4,5,6,7].some(i => parseFloat(String(rest[`qty${i}`] ?? 0)) > 0)
  if (!hasQty) { res.status(400).json({ message: 'Debe registrar al menos una cantidad' }); return }
  for (let i = 1; i <= 7; i++) {
    if (parseFloat(String(rest[`qty${i}`] ?? 0)) < 0 || parseFloat(String(rest[`price${i}`] ?? 0)) < 0) {
      res.status(400).json({ message: 'Las cantidades y precios no pueden ser negativos' }); return
    }
  }
  const { totalKg, totalUsd } = calcTotals(rest)
  const sale = await prisma.sale.create({
    data: {
      cycleId: parseInt(cycleId), clientId: parseInt(clientId),
      varietyId: varietyId ? parseInt(varietyId) : null,
      date: date ? new Date(date) : new Date(),
      qty1: parseFloat(rest.qty1 as string) || 0, price1: parseFloat(rest.price1 as string) || 0,
      qty2: parseFloat(rest.qty2 as string) || 0, price2: parseFloat(rest.price2 as string) || 0,
      qty3: parseFloat(rest.qty3 as string) || 0, price3: parseFloat(rest.price3 as string) || 0,
      qty4: parseFloat(rest.qty4 as string) || 0, price4: parseFloat(rest.price4 as string) || 0,
      qty5: parseFloat(rest.qty5 as string) || 0, price5: parseFloat(rest.price5 as string) || 0,
      qty6: parseFloat(rest.qty6 as string) || 0, price6: parseFloat(rest.price6 as string) || 0,
      qty7: parseFloat(rest.qty7 as string) || 0, price7: parseFloat(rest.price7 as string) || 0,
      totalKg, totalUsd, notes,
    },
    include: { client: true, variety: true },
  })
  res.status(201).json(sale)
}

export const updateSale = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const sale = await prisma.sale.findUnique({ where: { id }, include: { cycle: true } })
  if (!sale) { res.status(404).json({ message: 'Venta no encontrada' }); return }
  if (req.userRole !== 'SUPER_ADMIN' && sale.cycle.tenantId !== (req.tenantId ?? null)) {
    res.status(403).json({ message: 'No tienes permiso' }); return
  }
  if (sale.cycle.status === 'Cerrado') { res.status(400).json({ message: 'No se puede editar una venta de un ciclo cerrado' }); return }

  const { clientId, varietyId, date, notes, ...rest } = req.body
  for (let i = 1; i <= 7; i++) {
    if (parseFloat(String(rest[`qty${i}`] ?? 0)) < 0 || parseFloat(String(rest[`price${i}`] ?? 0)) < 0) {
      res.status(400).json({ message: 'Las cantidades y precios no pueden ser negativos' }); return
    }
  }
  const { totalKg, totalUsd } = calcTotals(rest)

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      clientId: clientId ? parseInt(clientId) : undefined,
      varietyId: varietyId ? parseInt(varietyId) : null,
      date: date ? new Date(date) : undefined,
      qty1: parseFloat(rest.qty1 as string) || 0, price1: parseFloat(rest.price1 as string) || 0,
      qty2: parseFloat(rest.qty2 as string) || 0, price2: parseFloat(rest.price2 as string) || 0,
      qty3: parseFloat(rest.qty3 as string) || 0, price3: parseFloat(rest.price3 as string) || 0,
      qty4: parseFloat(rest.qty4 as string) || 0, price4: parseFloat(rest.price4 as string) || 0,
      qty5: parseFloat(rest.qty5 as string) || 0, price5: parseFloat(rest.price5 as string) || 0,
      qty6: parseFloat(rest.qty6 as string) || 0, price6: parseFloat(rest.price6 as string) || 0,
      qty7: parseFloat(rest.qty7 as string) || 0, price7: parseFloat(rest.price7 as string) || 0,
      totalKg, totalUsd, notes,
    },
    include: { client: true, variety: true },
  })
  res.json(updated)
}

export const deleteSale = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const sale = await prisma.sale.findUnique({ where: { id }, include: { cycle: true } })
  if (!sale) { res.status(404).json({ message: 'Venta no encontrada' }); return }
  if (req.userRole !== 'SUPER_ADMIN' && sale.cycle.tenantId !== (req.tenantId ?? null)) {
    res.status(403).json({ message: 'No tienes permiso' }); return
  }
  await prisma.sale.delete({ where: { id } })
  res.json({ message: 'Venta eliminada' })
}
