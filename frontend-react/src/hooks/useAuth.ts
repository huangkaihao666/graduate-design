import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

/**
 * 认证 Hook
 * 提供登录状态、用户信息等认证相关功能
 */
export const useAuth = () => {
  const store = useAuthStore()

  return {
    // 状态
    user: store.user,
    accessToken: store.accessToken,
    refreshToken: store.refreshToken,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,

    // 操作
    setUser: store.setUser,
    setAccessToken: store.setAccessToken,
    setRefreshToken: store.setRefreshToken,
    setLoading: store.setLoading,
    setError: store.setError,
    setAuthenticated: store.setAuthenticated,
    login: store.login,
    logout: store.logout,
    updateUser: store.updateUser,
    clearAuth: store.clearAuth,
  }
}

/**
 * 登出 Hook
 * 处理登出逻辑并重定向到登录页
 */
export const useLogout = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return handleLogout
}
