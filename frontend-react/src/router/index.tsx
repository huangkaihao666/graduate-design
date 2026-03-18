import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import {
  Login,
  Dashboard,
  NotFound,
  Home,
  Profile,
  Settings,
  MyCases,
  CreateCase,
  CaseDetail,
  DebateRoom,
  RoomReport,
  Agents,
} from '@/pages'
import ProtectedRoute from './ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/cases" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/cases',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: ':id',
        element: <CaseDetail />,
      },
    ],
  },
  {
    path: '/debate/:id',
    element: (
      <ProtectedRoute>
        <DebateRoom />
      </ProtectedRoute>
    ),
  },
  {
    path: '/rooms/:id/report',
    element: (
      <ProtectedRoute>
        <RoomReport />
      </ProtectedRoute>
    ),
  },
  {
    path: '/create',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CreateCase />,
      },
    ],
  },
  {
    path: '/my-cases',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <MyCases />,
      },
    ],
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Profile />,
      },
    ],
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Settings />,
      },
    ],
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
    path: '/agents',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Agents />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])