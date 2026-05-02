import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    const tf = req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }
    const notifications: Array<{
      type: 'error' | 'warning' | 'info'
      title: string; message: string; link?: string
    }> = []

    const [activeCycles, cyclesNoSales] = await Promise.all([
      prisma.cycle.findMany({
        where: { status: { not: 'Cerrado' }, ...tf },
        include: { block: true, crop: true },
      }),
      prisma.cycle.findMany({
        where: { status: 'Cosechando', sales: { none: {} }, ...tf },
        include: { block: true, crop: true },
      }),
    ])

    activeCycles.forEach(cycle => {
      const harvestDate = new Date(cycle.sowingDate)
      harvestDate.setDate(harvestDate.getDate() + cycle.crop.harvestDays)
      const days = Math.ceil((harvestDate.getTime() - today.getTime()) / 86400000)

      if (days <= 0) {
        notifications.push({
          type: 'error', title: 'Cosecha vencida',
          message: `${cycle.block.code} — ${cycle.crop.name} debía cosecharse hace ${Math.abs(days)} día(s)`,
          link: `/ciclos/${cycle.id}`,
        })
      } else if (days <= 7) {
        notifications.push({
          type: 'warning', title: 'Cosecha urgente',
          message: `${cycle.block.code} — ${cycle.crop.name} en ${days} día(s)`,
          link: `/ciclos/${cycle.id}`,
        })
      } else if (days <= 15) {
        notifications.push({
          type: 'info', title: 'Cosecha próxima',
          message: `${cycle.block.code} — ${cycle.crop.name} en ${days} días`,
          link: `/ciclos/${cycle.id}`,
        })
      }
    })

    cyclesNoSales.forEach(cycle => {
      notifications.push({
        type: 'info', title: 'Ciclo en cosecha sin ventas',
        message: `${cycle.block.code} — ${cycle.crop.name} no tiene ventas registradas`,
        link: `/ciclos/${cycle.id}`,
      })
    })

    try {
      const lowStock = await (prisma as unknown as {
        inventory: { findMany: (args: unknown) => Promise<Array<{ name: string; quantity: number; unit: string; minStock: number }>> }
      }).inventory.findMany({ where: { minStock: { gt: 0 }, ...tf } })
      lowStock.forEach(item => {
        if (item.quantity <= item.minStock) {
          notifications.push({
            type: 'warning', title: 'Stock bajo',
            message: `${item.name}: ${item.quantity} ${item.unit} (mínimo: ${item.minStock})`,
            link: '/catalogos/inventario',
          })
        }
      })
    } catch { /* inventory model not yet available */ }

    res.json(notifications)
  } catch {
    res.json([])
  }
}
