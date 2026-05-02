import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UsuarioList from './pages/usuarios/UsuarioList'
import UsuarioForm from './pages/usuarios/UsuarioForm'
import BloquesCatalog from './pages/catalogos/BloquesCatalog'
import CultivosCatalog from './pages/catalogos/CultivosCatalog'
import ClientesCatalog from './pages/catalogos/ClientesCatalog'
import TrabajadoresCatalog from './pages/catalogos/TrabajadoresCatalog'
import InventarioCatalog from './pages/catalogos/InventarioCatalog'
import CiclosList from './pages/ciclos/CiclosList'
import CicloDetail from './pages/ciclos/CicloDetail'
import ReportesPage from './pages/reportes/ReportesPage'
import InstanciasPage from './pages/instancias/InstanciasPage'
import TareasPage from './pages/tareas/TareasPage'
import ConocimientoPage from './pages/conocimiento/ConocimientoPage'
import Layout from './components/Layout'
import { Role } from './types'
import { ReactNode } from 'react'

function ProtectedRoute({ children, roles, supervisorBlocked }: { children: ReactNode; roles?: Role[]; supervisorBlocked?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-green-700">🌱 Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'SUPERVISOR' && supervisorBlocked) return <Navigate to="/dashboard" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-green-700">🌱 Cargando...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Ciclos */}
        <Route path="ciclos" element={<ProtectedRoute supervisorBlocked><CiclosList /></ProtectedRoute>} />
        <Route path="ciclos/:id" element={<ProtectedRoute supervisorBlocked><CicloDetail /></ProtectedRoute>} />

        {/* Tareas */}
        <Route path="tareas" element={<ProtectedRoute><TareasPage /></ProtectedRoute>} />

        {/* Base de conocimiento */}
        <Route path="conocimiento" element={<ProtectedRoute><ConocimientoPage /></ProtectedRoute>} />

        {/* Reportes */}
        <Route path="reportes" element={<ProtectedRoute supervisorBlocked><ReportesPage /></ProtectedRoute>} />

        {/* Catálogos */}
        <Route path="catalogos/bloques" element={<ProtectedRoute supervisorBlocked><BloquesCatalog /></ProtectedRoute>} />
        <Route path="catalogos/cultivos" element={<ProtectedRoute supervisorBlocked><CultivosCatalog /></ProtectedRoute>} />
        <Route path="catalogos/clientes" element={<ProtectedRoute supervisorBlocked><ClientesCatalog /></ProtectedRoute>} />
        <Route path="catalogos/personal" element={<ProtectedRoute supervisorBlocked><TrabajadoresCatalog /></ProtectedRoute>} />
        <Route path="catalogos/inventario" element={<ProtectedRoute supervisorBlocked><InventarioCatalog /></ProtectedRoute>} />

        {/* Usuarios */}
        <Route path="usuarios" element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}><UsuarioList /></ProtectedRoute>} />
        <Route path="usuarios/nuevo" element={<ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}><UsuarioForm /></ProtectedRoute>} />
        <Route path="usuarios/:id/editar" element={<ProtectedRoute><UsuarioForm /></ProtectedRoute>} />

        {/* Instancias — solo SUPER_ADMIN */}
        <Route path="instancias" element={<ProtectedRoute roles={['SUPER_ADMIN']}><InstanciasPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
