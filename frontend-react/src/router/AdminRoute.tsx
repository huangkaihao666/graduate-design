import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuthStore } from '@/store'

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAdminAuthStore()

  if (!accessToken) return <Navigate to="/admin/login" replace />
  if ((user as any)?.role !== 'ADMIN') return <Navigate to="/admin/login" replace />

  return <>{children}</>
}

export default AdminRoute

