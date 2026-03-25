import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
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
 * 处理登出逻辑：清除 token、清除 React Query 所有缓存、重定向到登录页
 * 必须清除缓存，否则下一个登录用户会看到上一个用户的数据
 */
export const useLogout = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()

  const handleLogout = () => {
    // 1. 清除 Zustand 中的 token 和用户信息
    logout()
    // 2. 清除所有 React Query 缓存，防止用户数据泄露给下一个登录者
    queryClient.clear()
    // 3. 跳转到登录页
    navigate('/login')
  }

  return handleLogout
}
