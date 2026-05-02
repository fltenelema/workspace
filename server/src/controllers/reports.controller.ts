import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tf = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

export const getCycleReport = async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const cycle = await prisma.cycle.findFirst({
    where: { id, ...tf(req) },
    include: {
      block: true, crop: true, variety: true,
      sales: { include: { client: true, variety: true }, orderBy: { date: 'asc' } },
      expenses: { orderBy: { date: 'asc' } },
      labors: { include: { worker: true }, orderBy: { date: 'asc' } },
    },
  })
  if (!cycle) { res.status(404).json({ message: 'Ciclo no encontrado' }); return }

  const revenue = cycle.sales.reduce((s, v) => s + v.totalUsd, 0)
  const expensesTotal = cycle.expenses.reduce((s, v) => s + v.total, 0)
  const laborTotal = cycle.labors.reduce((s, v) => s + v.total, 0)
  const totalCost = expensesTotal + laborTotal
  const profit = revenue - totalCost
  const totalKg = cycle.sales.reduce((s, v) => s + v.totalKg, 0)
  const area = cycle.block.area

  const expensesByCategory: Record<string, number> = {}
  cycle.expenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.total
  })

  res.json({
    cycle: {
      id: cycle.id, code: cycle.code, status: cycle.status,
      sowingDate: cycle.sowingDate, closingDate: cycle.closingDate, notes: cycle.notes,
    },
    block: { code: cycle.block.code, name: cycle.block.name, area },
    crop: { name: cycle.crop.name, unit: cycle.crop.unit, harvestDays: cycle.crop.harvestDays },
    variety: cycle.variety?.name ?? null,
    financials: {
      revenue, expensesTotal, laborTotal, totalCost, profit, totalKg,
      profitPerM2: area > 0 ? profit / area : 0,
      revenuePerKg: totalKg > 0 ? revenue / totalKg : 0,
    },
    expensesByCategory,
    sales: cycle.sales.map(s => ({
      id: s.id, date: s.date, client: s.client.name,
      totalKg: s.totalKg, totalUsd: s.totalUsd,
      pricePerKg: s.totalKg > 0 ? s.totalUsd / s.totalKg : 0,
      notes: s.notes,
    })),
    expenses: cycle.expenses,
    labors: cycle.labors.map(l => ({
      id: l.id, worker: l.worker.name,
      days: l.days, dailyRate: l.dailyRate, total: l.total, date: l.date,
    })),
  })
}

export const getPeriodReport = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query
  const where: Record<string, unknown> = { ...tf(req) }
  if (startDate && endDate) {
    where.sowingDate = { gte: new Date(String(startDate)), lte: new Date(String(endDate)) }
  }

  const cycles = await prisma.cycle.findMany({
    where,
    include: { block: true, crop: true, sales: true, expenses: true, labors: true },
    orderBy: { sowingDate: 'desc' },
  })

  const summary = cycles.map(c => {
    const revenue = c.sales.reduce((s, v) => s + v.totalUsd, 0)
    const expensesCost = c.expenses.reduce((s, v) => s + v.total, 0)
    const laborCost = c.labors.reduce((s, v) => s + v.total, 0)
    const totalCost = expensesCost + laborCost
    return {
      id: c.id, code: c.code, status: c.status,
      sowingDate: c.sowingDate, closingDate: c.closingDate,
      blockCode: c.block.code, blockName: c.block.name,
      cropName: c.crop.name, area: c.block.area,
      revenue, expensesCost, laborCost, totalCost,
      profit: revenue - totalCost,
      salesCount: c.sales.length,
      totalKg: c.sales.reduce((s, v) => s + v.totalKg, 0),
    }
  })

  res.json({
    cycles: summary,
    totals: {
      revenue: summary.reduce((s, c) => s + c.revenue, 0),
      expenses: summary.reduce((s, c) => s + c.expensesCost, 0),
      labor: summary.reduce((s, c) => s + c.laborCost, 0),
      totalCost: summary.reduce((s, c) => s + c.totalCost, 0),
      profit: summary.reduce((s, c) => s + c.profit, 0),
      cyclesCount: cycles.length,
      closedCount: cycles.filter(c => c.status === 'Cerrado').length,
    },
  })
}

export const getCropPerformance = async (req: AuthRequest, res: Response) => {
  const tenantFilter = tf(req)
  const crops = await prisma.crop.findMany({
    where: tenantFilter,
    include: {
      cycles: {
        where: tenantFilter,
        include: { sales: true, expenses: true, labors: true, block: true },
      },
    },
  })

  const performance = crops
    .filter(c => c.cycles.length > 0)
    .map(crop => {
      let totalRevenue = 0, totalCost = 0, totalKg = 0, totalArea = 0
      crop.cycles.forEach(c => {
        const rev = c.sales.reduce((s, v) => s + v.totalUsd, 0)
        const exp = c.expenses.reduce((s, v) => s + v.total, 0)
        const lab = c.labors.reduce((s, v) => s + v.total, 0)
        totalRevenue += rev
        totalCost += exp + lab
        totalKg += c.sales.reduce((s, v) => s + v.totalKg, 0)
        totalArea += c.block.area
      })
      return {
        id: crop.id, name: crop.name, unit: crop.unit, harvestDays: crop.harvestDays,
        totalCycles: crop.cycles.length,
        closedCycles: crop.cycles.filter(c => c.status === 'Cerrado').length,
        activeCycles: crop.cycles.filter(c => c.status !== 'Cerrado').length,
        totalRevenue, totalCost, totalProfit: totalRevenue - totalCost, totalKg,
        avgProfitPerM2: totalArea > 0 ? (totalRevenue - totalCost) / totalArea : 0,
        avgRevenuePerKg: totalKg > 0 ? totalRevenue / totalKg : 0,
      }
    })

  res.json(performance)
}

export const getWorkerPerformance = async (req: AuthRequest, res: Response) => {
  const workers = await prisma.worker.findMany({
    where: tf(req),
    include: {
      labors: { orderBy: { date: 'desc' } },
    },
  })

  const performance = workers.map(w => ({
    id: w.id, name: w.name, dailySalary: w.dailySalary, active: w.active,
    totalDays: w.labors.reduce((s, l) => s + l.days, 0),
    totalEarned: w.labors.reduce((s, l) => s + l.total, 0),
    cyclesCount: new Set(w.labors.map(l => l.cycleId)).size,
    lastActivity: w.labors[0]?.date ?? null,
  }))

  res.json(performance)
}
