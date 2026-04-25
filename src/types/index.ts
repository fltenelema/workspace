export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'USER'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  byRole: { SUPER_ADMIN: number; ADMIN: number; USER: number }
}
