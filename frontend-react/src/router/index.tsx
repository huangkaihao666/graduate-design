import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import NotFound from '@/pages/NotFound'
import ProtectedRoute from './ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])