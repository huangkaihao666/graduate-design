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
  Me,
  AdminLayout,
  AdminHome,
  AdminLogin,
  RoomsAdmin,
  UsersAdmin,
  MessagesAdmin,
  StatsAdmin,
  Counseling,
  CreateAgent,
  Feed,
} from '@/pages'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'

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
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminHome />,
      },
      {
        path: 'rooms',
        element: <RoomsAdmin />,
      },
      {
        path: 'users',
        element: <UsersAdmin />,
      },
      {
        path: 'messages',
        element: <MessagesAdmin />,
      },
      {
        path: 'stats',
        element: <StatsAdmin />,
      },
    ],
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
    path: '/me',
    element: (
      <ProtectedRoute>
        <Me />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: <Navigate to="/me" replace />,
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
    path: '/counseling',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Counseling />,
      },
    ],
  },
  {
    path: '/create-agent',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CreateAgent />,
      },
    ],
  },
  {
    path: '/feed',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Feed />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])