import bcrypt from 'bcryptjs'
import prisma from './lib/prisma'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  console.log('🌱 Iniciando seed...\n')

  // SUPER_ADMIN (no tenant)
  await prisma.user.upsert({
    where: { email: 'superadmin@agro.com' },
    update: {},
    create: {
      name: 'Super Admin', email: 'superadmin@agro.com',
      password: await bcrypt.hash('superadmin123', 10), role: 'SUPER_ADMIN',
    },
  })

  // Tenant for demo admin
  let tenant = await prisma.tenant.findFirst({ where: { slug: 'finca-demo' } })
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: 'Finca Demo', slug: 'finca-demo' } })
  }
  const tid = tenant.id

  // ADMIN + USER (scoped to tenant)
  for (const u of [
    { name: 'Administrador', email: 'admin@agro.com', password: 'admin123', role: 'ADMIN', tenantId: tid },
    { name: 'Juan Pérez', email: 'juan@agro.com', password: 'usuario123', role: 'USER', tenantId: tid },
  ]) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: await bcrypt.hash(u.password, 10) },
    })
  }
  console.log('✅ 3 usuarios')

  // Blocks (tenant-scoped)
  const blocks = await Promise.all([
    prisma.block.upsert({ where: { code_tenantId: { code: 'A', tenantId: tid } }, update: {}, create: { code: 'A', name: 'Bloque A', area: 2500, tenantId: tid } }),
    prisma.block.upsert({ where: { code_tenantId: { code: 'B', tenantId: tid } }, update: {}, create: { code: 'B', name: 'Bloque B', area: 1800, tenantId: tid } }),
    prisma.block.upsert({ where: { code_tenantId: { code: 'C', tenantId: tid } }, update: {}, create: { code: 'C', name: 'Bloque C', area: 3200, tenantId: tid } }),
    prisma.block.upsert({ where: { code_tenantId: { code: 'D', tenantId: tid } }, update: {}, create: { code: 'D', name: 'Bloque D', area: 1500, tenantId: tid } }),
    prisma.block.upsert({ where: { code_tenantId: { code: 'E', tenantId: tid } }, update: {}, create: { code: 'E', name: 'Bloque E', area: 2100, tenantId: tid } }),
  ])
  console.log(`✅ ${blocks.length} bloques`)

  // Crops + varieties (tenant-scoped)
  const cropData = [
    { name: 'Tomate', unit: 'kg', harvestDays: 90, varieties: ['Cherry', 'Pera', 'Saladette'] },
    { name: 'Pepino', unit: 'kg', harvestDays: 60, varieties: ['Europeo', 'Persa'] },
    { name: 'Pimiento', unit: 'kg', harvestDays: 120, varieties: ['Rojo', 'Amarillo', 'Verde'] },
    { name: 'Lechuga', unit: 'unidad', harvestDays: 45, varieties: ['Romana', 'Iceberg'] },
    { name: 'Zanahoria', unit: 'kg', harvestDays: 80, varieties: ['Nantesa', 'Chantenay'] },
  ]
  const crops: Record<string, { id: number; varieties: { name: string; id: number }[] }> = {}
  for (const c of cropData) {
    const crop = await prisma.crop.upsert({
      where: { name_tenantId: { name: c.name, tenantId: tid } },
      update: {},
      create: { name: c.name, unit: c.unit, harvestDays: c.harvestDays, tenantId: tid },
    })
    const varieties = []
    for (const v of c.varieties) {
      const variety = await prisma.variety.upsert({
        where: { id: (await prisma.variety.findFirst({ where: { name: v, cropId: crop.id } }))?.id ?? 0 },
        update: {},
        create: { name: v, cropId: crop.id },
      })
      varieties.push({ name: v, id: variety.id })
    }
    crops[c.name] = { id: crop.id, varieties }
  }
  console.log(`✅ ${cropData.length} cultivos con variedades`)

  // Clients (tenant-scoped)
  const clientNames = ['Mercado Central', 'Supermercado La Cosecha', 'Restaurante El Campo', 'Distribuidora Agro', 'Exportaciones Verde']
  for (const name of clientNames) {
    const exists = await prisma.client.findFirst({ where: { name, tenantId: tid } })
    if (!exists) await prisma.client.create({ data: { name, tenantId: tid } })
  }
  console.log(`✅ ${clientNames.length} clientes`)

  // Workers (tenant-scoped)
  const workerData = [
    { name: 'Carlos Mendoza', dailySalary: 25 }, { name: 'María Rodríguez', dailySalary: 22 },
    { name: 'José García', dailySalary: 25 },    { name: 'Ana Martínez', dailySalary: 20 },
    { name: 'Luis Torres', dailySalary: 22 },    { name: 'Rosa López', dailySalary: 20 },
    { name: 'Pedro Sánchez', dailySalary: 25 },  { name: 'Elena Díaz', dailySalary: 18 },
  ]
  for (const w of workerData) {
    const exists = await prisma.worker.findFirst({ where: { name: w.name, tenantId: tid } })
    if (!exists) await prisma.worker.create({ data: { ...w, tenantId: tid } })
  }
  console.log(`✅ ${workerData.length} trabajadores`)

  // Active cycles (only if none exist for this tenant)
  const existingCycles = await prisma.cycle.count({ where: { tenantId: tid } })
  if (existingCycles === 0) {
    const today = new Date()
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }

    const c1 = await prisma.cycle.create({
      data: { blockId: blocks[0].id, cropId: crops['Tomate'].id, varietyId: crops['Tomate'].varieties[0].id, sowingDate: daysAgo(65), status: 'En Curso', tenantId: tid },
    })
    await prisma.cycle.update({ where: { id: c1.id }, data: { code: `CIC-${today.getFullYear()}-001` } })
    await prisma.block.update({ where: { id: blocks[0].id }, data: { status: 'En Cultivo' } })

    const c2 = await prisma.cycle.create({
      data: { blockId: blocks[1].id, cropId: crops['Pepino'].id, varietyId: crops['Pepino'].varieties[0].id, sowingDate: daysAgo(55), status: 'Cosechando', tenantId: tid },
    })
    await prisma.cycle.update({ where: { id: c2.id }, data: { code: `CIC-${today.getFullYear()}-002` } })
    await prisma.block.update({ where: { id: blocks[1].id }, data: { status: 'En Cultivo' } })

    const c3 = await prisma.cycle.create({
      data: { blockId: blocks[3].id, cropId: crops['Pimiento'].id, varietyId: crops['Pimiento'].varieties[0].id, sowingDate: daysAgo(20), status: 'En Curso', tenantId: tid },
    })
    await prisma.cycle.update({ where: { id: c3.id }, data: { code: `CIC-${today.getFullYear()}-003` } })
    await prisma.block.update({ where: { id: blocks[3].id }, data: { status: 'En Cultivo' } })

    const client = await prisma.client.findFirst({ where: { name: 'Mercado Central', tenantId: tid } })
    const worker = await prisma.worker.findFirst({ where: { name: 'Carlos Mendoza', tenantId: tid } })
    if (client) {
      await prisma.sale.create({
        data: {
          cycleId: c1.id, clientId: client.id, varietyId: crops['Tomate'].varieties[0].id,
          date: daysAgo(10), qty1: 150, price1: 2.5, qty2: 80, price2: 1.8, qty3: 40, price3: 1.2,
          totalKg: 270, totalUsd: 150 * 2.5 + 80 * 1.8 + 40 * 1.2,
        },
      })
    }
    await prisma.expense.create({
      data: { cycleId: c1.id, category: 'Semillas', item: 'Semilla Tomate Cherry', quantity: 5, unit: 'sobres', cost: 12, total: 60, date: daysAgo(70) },
    })
    if (worker) {
      await prisma.labor.create({
        data: { cycleId: c1.id, workerId: worker.id, days: 8, dailyRate: worker.dailySalary, total: 8 * worker.dailySalary, date: daysAgo(30) },
      })
    }
    console.log('✅ 3 ciclos activos con datos de ejemplo')
  }

  console.log('\n✔ Seed completado')
}

main().catch(console.error).finally(() => prisma.$disconnect())
