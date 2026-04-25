import bcrypt from 'bcryptjs'
import prisma from './lib/prisma'
import dotenv from 'dotenv'

dotenv.config()

const users = [
  { name: 'Super Admin', email: 'superadmin@agro.com', password: 'superadmin123', role: 'SUPER_ADMIN' },
  { name: 'Administrador', email: 'admin@agro.com', password: 'admin123', role: 'ADMIN' },
  { name: 'Juan Pérez', email: 'juan@agro.com', password: 'usuario123', role: 'USER' },
  { name: 'María López', email: 'maria@agro.com', password: 'usuario123', role: 'USER' },
]

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n')
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashed },
    })
    console.log(`✅ ${u.role.padEnd(12)} | ${u.email.padEnd(25)} | contraseña: ${u.password}`)
  }
  console.log('\n✔ Seed completado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
