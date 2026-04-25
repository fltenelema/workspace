import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes'
import usersRoutes from './routes/users.routes'
import blocksRoutes from './routes/blocks.routes'
import cropsRoutes from './routes/crops.routes'
import clientsRoutes from './routes/clients.routes'
import workersRoutes from './routes/workers.routes'
import cyclesRoutes from './routes/cycles.routes'
import salesRoutes from './routes/sales.routes'
import expensesRoutes from './routes/expenses.routes'
import laborsRoutes from './routes/labors.routes'
import dashboardRoutes from './routes/dashboard.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/blocks', blocksRoutes)
app.use('/api/crops', cropsRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/workers', workersRoutes)
app.use('/api/cycles', cyclesRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/labors', laborsRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.listen(PORT, () => {
  console.log(`🌱 AgroControl API corriendo en http://localhost:${PORT}`)
})
