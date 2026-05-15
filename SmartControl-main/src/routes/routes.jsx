import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/SupabaseAuthContext'
import Layout from '@/components/Layout'
import LoadingScreen from '@/components/LoadingScreen'
import { isSessionExpired } from '@/lib/security'

// Lazy loading dos componentes
const loadHome = () => import('@/pages/Home')
const loadLogin = () => import('@/pages/Login')
const loadRegister = () => import('@/pages/Register')
const loadAuthCallback = () => import('@/pages/AuthCallback')
const loadDashboard = () => import('@/pages/Dashboard')
const loadDevices = () => import('@/pages/Devices')
const loadAddDevice = () => import('@/pages/AddDevices')
const loadDeviceDetail = () => import('@/pages/DeviceDetail')
const loadShop = () => import('@/pages/Shop')
const loadSettings = () => import('@/pages/Settings')
const loadAdmin = () => import('@/pages/Admin')
const loadSubscription = () => import('@/pages/Subscription')
const loadBillingCheckout = () => import('@/pages/BillingCheckout')
const loadBillingResult = () => import('@/pages/BillingResult')

const Home = React.lazy(loadHome)
const Login = React.lazy(loadLogin)
const Register = React.lazy(loadRegister)
const AuthCallback = React.lazy(loadAuthCallback)
const Dashboard = React.lazy(loadDashboard)
const Devices = React.lazy(loadDevices)
const AddDevice = React.lazy(loadAddDevice)
const DeviceDetail = React.lazy(loadDeviceDetail)
const Shop = React.lazy(loadShop)
const Settings = React.lazy(loadSettings)
const Admin = React.lazy(loadAdmin)
const Subscription = React.lazy(loadSubscription)
const BillingCheckout = React.lazy(loadBillingCheckout)
const BillingResult = React.lazy(loadBillingResult)

export const preloadPrivateRoutes = () => {
  [
    loadDashboard,
    loadDevices,
    loadDeviceDetail,
    loadAddDevice,
  ].forEach((loadRoute) => {
    loadRoute().catch((error) => {
      console.warn('Nao foi possivel pre-carregar rota privada:', error.message)
    })
  })
}


// Componentes de Rota Protegida
const PrivateRoute = ({ children }) => {
  const { user, session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  const redirect = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)
  return user && session && !isSessionExpired(session) ? children : <Navigate to={`/login?redirect=${redirect}`} replace />
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
  { path: '/auth/callback', element: <AuthCallback />, isPublic: true, noLayout: true },
  { path: '/dashboard', element: <Dashboard />, isPrivate: true },
  { path: '/devices', element: <Devices />, isPrivate: true },
  { path: '/devices/:id', element: <DeviceDetail />, isPrivate: true },
  { path: '/add-device', element: <AddDevice />, isPrivate: true },
  { path: '/subscription', element: <Subscription />, isPrivate: true },
  { path: '/billing/checkout', element: <BillingCheckout />, isPrivate: true },
  { path: '/billing/success', element: <BillingResult />, isPrivate: true },
  { path: '/billing/cancel', element: <BillingResult />, isPrivate: true },
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
