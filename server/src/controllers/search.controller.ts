import { Response } from 'express'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

export const globalSearch = async (req: AuthRequest, res: Response) => {
  const { q } = req.query
  if (!q || String(q).length < 2) { res.json({ results: [] }); return }

  const search = String(q)
  const tf = req.userRole === 'SUPER_ADMIN' ? {} : { tenantId: req.tenantId ?? null }

  const [cycles, clients, workers, blocks] = await Promise.all([
    prisma.cycle.findMany({
      where: {
        ...tf,
        OR: [
          { code: { contains: search } },
          { block: { code: { contains: search } } },
          { block: { name: { contains: search } } },
          { crop: { name: { contains: search } } },
        ],
      },
      include: { block: true, crop: true },
      take: 5,
    }),
    prisma.client.findMany({
      where: { ...tf, OR: [{ name: { contains: search } }, { email: { contains: search } }] },
      take: 5,
    }),
    prisma.worker.findMany({
      where: { ...tf, name: { contains: search } },
      take: 5,
    }),
    prisma.block.findMany({
      where: { ...tf, OR: [{ code: { contains: search } }, { name: { contains: search } }] },
      take: 5,
    }),
  ])

  const results = [
    ...cycles.map(c => ({
      type: 'cycle' as const, id: c.id,
      label: `${c.code ?? 'Sin código'} — ${c.block.code} · ${c.crop.name}`,
      sublabel: c.status, link: `/ciclos/${c.id}`,
    })),
    ...blocks.map(b => ({
      type: 'block' as const, id: b.id,
      label: `${b.code} — ${b.name}`,
      sublabel: b.status, link: '/catalogos/bloques',
    })),
    ...clients.map(c => ({
      type: 'client' as const, id: c.id,
      label: c.name, sublabel: c.email ?? '', link: '/catalogos/clientes',
    })),
    ...workers.map(w => ({
      type: 'worker' as const, id: w.id,
      label: w.name, sublabel: `$${w.dailySalary}/día`, link: '/catalogos/personal',
    })),
  ]

  res.json({ results })
}
