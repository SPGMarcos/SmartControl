import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/SupabaseAuthContext'
import Layout from '@/components/Layout'
import LoadingScreen from '@/components/LoadingScreen'
import { isSessionExpired } from '@/lib/security'

// Lazy loading dos componentes
const Home = React.lazy(() => import('@/pages/Home'))
const Login = React.lazy(() => import('@/pages/Login'))
const Register = React.lazy(() => import('@/pages/Register'))
const Dashboard = React.lazy(() => import('@/pages/Dashboard'))
const Devices = React.lazy(() => import('@/pages/Devices'))
const AddDevice = React.lazy(() => import('@/pages/AddDevices'))
const DeviceDetail = React.lazy(() => import('@/pages/DeviceDetail'))
const Shop = React.lazy(() => import('@/pages/Shop'))
const Settings = React.lazy(() => import('@/pages/Settings'))
const Admin = React.lazy(() => import('@/pages/Admin'))


// Componentes de Rota Protegida
const PrivateRoute = ({ children }) => {
  const { user, session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user && session && !isSessionExpired(session) ? children : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }) => {
  const { user, session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  const role = user?.app_metadata?.role || user?.user_metadata?.role
  return user && session && !isSessionExpired(session) && role === 'admin'
    ? children
    : <Navigate to="/dashboard" replace />
}

// Configuração das rotas
const routes = [
  {
    path: '/',
    element: <Home />,
    isPublic: true
  },
  {
    path: '/login',
    element: <Login />,
    isPublic: true,
    noLayout: true
  },
  { path: '/register', element: <Register />, isPublic: true, noLayout: true },
  { path: '/dashboard', element: <Dashboard />, isPrivate: true },
  { path: '/devices', element: <Devices />, isPrivate: true },
  { path: '/devices/:id', element: <DeviceDetail />, isPrivate: true },
  { path: '/add-device', element: <AddDevice />, isPrivate: true },
  { path: '/shop', element: <Shop />, isPublic: true },
  { path: '/settings', element: <Settings />, isPrivate: true },
  { path: '/admin', element: <Admin />, isAdmin: true },
  { path: '*', element: <Navigate to="/" replace />, isPublic: true }
]

export default function AppRoutes() {
  return (
    <Routes>
      {routes.map(({ path, element, isPrivate, isAdmin, noLayout }) => (
        <Route
          key={path}
          path={path}
          element={
            isAdmin ? (
              <AdminRoute>
                {element}
              </AdminRoute>
            ) : isPrivate ? (
              <PrivateRoute>
                {element}
              </PrivateRoute>
            ) : (
              noLayout ? element : <Layout>{element}</Layout>
            )
          }
        />
      ))}
    </Routes>
  )
}
