import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const tenantFilter = (req: AuthRequest) =>
  req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

export const getDashboard = async (req: AuthRequest, res: Response) => {
  const today = new Date()
  const tf = tenantFilter(req)

  const [activeCycles, totalBlocks, freeBlocks] = await Promise.all([
    prisma.cycle.findMany({
      where: { status: { not: 'Cerrado' }, ...tf },
      include: {
        block: true, crop: true, variety: true,
        sales: true, expenses: true, labors: true,
      },
      orderBy: { sowingDate: 'asc' },
    }),
    prisma.block.count({ where: tf }),
    prisma.block.count({ where: { status: 'Libre', ...tf } }),
  ])

  const cycles = activeCycles.map(cycle => {
    const harvestDate = new Date(cycle.sowingDate)
    harvestDate.setDate(harvestDate.getDate() + cycle.crop.harvestDays)
    const daysUntilHarvest = Math.ceil((harvestDate.getTime() - today.getTime()) / 86400000)
    const alert: 'red' | 'yellow' | 'green' =
      daysUntilHarvest <= 7 ? 'red' : daysUntilHarvest <= 15 ? 'yellow' : 'green'

    const revenue = cycle.sales.reduce((s, v) => s + v.totalUsd, 0)
    const expenses = cycle.expenses.reduce((s, v) => s + v.total, 0)
    const laborCost = cycle.labors.reduce((s, v) => s + v.total, 0)
    const totalExpenses = expenses + laborCost
    const profit = revenue - totalExpenses

    return {
      id: cycle.id, code: cycle.code, status: cycle.status,
      sowingDate: cycle.sowingDate, harvestDate,
      block: { id: cycle.block.id, code: cycle.block.code, name: cycle.block.name, area: cycle.block.area },
      crop: { id: cycle.crop.id, name: cycle.crop.name, harvestDays: cycle.crop.harvestDays },
      variety: cycle.variety ? { id: cycle.variety.id, name: cycle.variety.name } : null,
      daysUntilHarvest, alert,
      revenue, expenses, laborCost, totalExpenses, profit,
      salesCount: cycle.sales.length,
    }
  })

  const totalRevenue = cycles.reduce((s, c) => s + c.revenue, 0)
  const totalExpenses = cycles.reduce((s, c) => s + c.totalExpenses, 0)

  res.json({
    cycles,
    stats: {
      totalBlocks, freeBlocks, activeCycles: cycles.length,
      totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses,
      alerts: {
        red: cycles.filter(c => c.alert === 'red').length,
        yellow: cycles.filter(c => c.alert === 'yellow').length,
      },
    },
  })
}
