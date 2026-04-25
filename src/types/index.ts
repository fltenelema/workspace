export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER'
export type CycleStatus = 'En Curso' | 'Cosechando' | 'Cerrado'
export type Alert = 'red' | 'yellow' | 'green'

export interface User {
  id: number; name: string; email: string; role: Role; active: boolean; createdAt: string; updatedAt: string
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
  id: number; name: string; phone?: string; email?: string; active: boolean
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
