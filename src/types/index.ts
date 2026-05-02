export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'USER'
export type CycleStatus = 'En Curso' | 'Cosechando' | 'Cerrado'
export type Alert = 'red' | 'yellow' | 'green'

export interface Tenant {
  id: number; name: string; slug: string; active: boolean; createdAt: string; updatedAt: string
  _count?: { users: number; blocks: number; cycles: number; workers?: number }
  users?: Pick<User, 'id' | 'name' | 'email' | 'active'>[]
}

export interface User {
  id: number; name: string; email: string; role: Role; active: boolean
  tenantId: number | null; tenantName: string | null; createdAt: string; updatedAt: string
}

export interface Block {
  id: number; code: string; name: string; area: number; status: 'Libre' | 'En Cultivo'; notes?: string; createdAt: string
}

export interface Variety {
  id: number; name: string; cropId: number
}

export interface Crop {
  id: number; name: string; unit: string; harvestDays: number; notes?: string; varieties: Variety[]
}

export interface Client {
  id: number; name: string; phone?: string; email?: string; notes?: string; active: boolean
}

export interface Worker {
  id: number; name: string; dailySalary: number; phone?: string; active: boolean
}

export interface Cycle {
  id: number; code?: string; blockId: number; cropId: number; varietyId?: number
  status: CycleStatus; sowingDate: string; closingDate?: string; notes?: string; createdAt: string
  block: Block; crop: Crop; variety?: Variety
}

export interface Sale {
  id: number; cycleId: number; clientId: number; varietyId?: number; date: string
  qty1: number; price1: number; qty2: number; price2: number; qty3: number; price3: number
  qty4: number; price4: number; qty5: number; price5: number; qty6: number; price6: number
  qty7: number; price7: number; totalKg: number; totalUsd: number; notes?: string
  client: Client; variety?: Variety; cycle?: Cycle
}

export interface Expense {
  id: number; cycleId: number; category: string; item: string; quantity: number
  unit: string; cost: number; total: number; date: string; notes?: string
}

export interface Labor {
  id: number; cycleId: number; workerId: number; days: number; dailyRate: number
  total: number; date: string; notes?: string; worker: Worker
}

export interface DashboardCycle {
  id: number; code?: string; status: CycleStatus; sowingDate: string; harvestDate: string
  block: Pick<Block, 'id' | 'code' | 'name' | 'area'>
  crop: Pick<Crop, 'id' | 'name' | 'harvestDays'>
  variety?: Pick<Variety, 'id' | 'name'>
  daysUntilHarvest: number; alert: Alert
  revenue: number; expenses: number; laborCost: number; totalExpenses: number; profit: number; salesCount: number
}

export interface DashboardData {
  cycles: DashboardCycle[]
  stats: {
    totalBlocks: number; freeBlocks: number; activeCycles: number
    totalRevenue: number; totalExpenses: number; profit: number
    alerts: { red: number; yellow: number }
  }
}

export interface LoginCredentials { email: string; password: string }
export interface AuthResponse { token: string; user: User }
export interface UserStats {
  total: number; active: number; inactive: number; byRole: { SUPER_ADMIN: number; ADMIN: number; USER: number }
}

export interface InventoryItem {
  id: number; name: string; category: string; quantity: number; unit: string
  minStock: number; cost: number; notes?: string; createdAt: string; updatedAt: string
}

export interface Notification {
  type: 'error' | 'warning' | 'info'
  title: string; message: string; link?: string
}

export interface SearchResult {
  type: 'cycle' | 'block' | 'client' | 'worker'
  id: number; label: string; sublabel: string; link: string
}

export interface CycleReport {
  cycle: { id: number; code?: string; status: string; sowingDate: string; closingDate?: string; notes?: string }
  block: { code: string; name: string; area: number }
  crop: { name: string; unit: string; harvestDays: number }
  variety: string | null
  financials: {
    revenue: number; expensesTotal: number; laborTotal: number; totalCost: number
    profit: number; profitPerM2: number; revenuePerKg: number; totalKg: number
  }
  expensesByCategory: Record<string, number>
  sales: Array<{ id: number; date: string; client: string; totalKg: number; totalUsd: number; pricePerKg: number; notes?: string }>
  expenses: Expense[]
  labors: Array<{ id: number; worker: string; days: number; dailyRate: number; total: number; date: string }>
}

export interface PeriodReportCycle {
  id: number; code?: string; status: string; sowingDate: string; closingDate?: string
  blockCode: string; blockName: string; cropName: string; area: number
  revenue: number; expensesCost: number; laborCost: number; totalCost: number; profit: number
  salesCount: number; totalKg: number
}

export interface PeriodReport {
  cycles: PeriodReportCycle[]
  totals: {
    revenue: number; expenses: number; labor: number; totalCost: number; profit: number
    cyclesCount: number; closedCount: number
  }
}

export interface CropPerformance {
  id: number; name: string; unit: string; harvestDays: number
  totalCycles: number; closedCycles: number; activeCycles: number
  totalRevenue: number; totalCost: number; totalProfit: number; totalKg: number
  avgProfitPerM2: number; avgRevenuePerKg: number
}

export type ArticleCategory = 'Plagas' | 'Enfermedades' | 'Fertilización' | 'Riego / Suelo'
export type ArticleStatus   = 'Borrador' | 'Publicado'

export interface KnowledgeArticle {
  id: number; title: string; category: ArticleCategory; content: string
  tags?: string; status: ArticleStatus
  blockId?: number;  block?:  Pick<Block,  'id' | 'code' | 'name'>
  cycleId?: number;  cycle?:  Pick<Cycle,  'id' | 'code' | 'status'>
  cropId?:  number;  crop?:   Pick<Crop,   'id' | 'name'>
  createdById?:   number; createdBy?:   Pick<User, 'id' | 'name'>
  publishedById?: number; publishedBy?: Pick<User, 'id' | 'name'>
  publishedAt?: string; tenantId: number | null
  createdAt: string; updatedAt: string
}

export type TaskPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente'
export type TaskStatus   = 'Pendiente' | 'En Proceso' | 'Completada'

export interface Task {
  id: number; title: string; description?: string
  blockId: number; block: Pick<Block, 'id' | 'code' | 'name'>
  assignedToId: number; assignedTo: Pick<User, 'id' | 'name'>
  priority: TaskPriority; dueDate: string; status: TaskStatus
  notes?: string; observations?: string; createdById?: number; createdBy?: Pick<User, 'id' | 'name'>
  tenantId: number | null; createdAt: string; updatedAt: string
}

export interface WorkerPerformance {
  id: number; name: string; dailySalary: number; active: boolean
  totalDays: number; totalEarned: number; cyclesCount: number; lastActivity: string | null
}
