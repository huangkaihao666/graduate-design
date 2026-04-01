import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const accessToken = useAuthStore((state) => state.accessToken)
  const location = useLocation()

  if (!isAuthenticated || !accessToken) {
    // 把当前完整路径（含 search/hash）作为 redirect 参数传给登录页
    const redirect = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute