import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, accessToken } = useAuthStore()

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute