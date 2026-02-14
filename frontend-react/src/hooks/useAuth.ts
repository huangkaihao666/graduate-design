import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { authApi } from '@/api'
import type { LoginRequest, RegisterRequest, LoginResponse } from '@/types/common'

export const useLogin = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data: LoginResponse) => {
      authStore.login(data)
      navigate('/dashboard')
    },
    onError: (error: Error | null) => {
      const errorMsg = error?.message || '登录失败'
      authStore.setError(errorMsg)
      console.error('Login error:', error)
    },
  })
}

export const useRegister = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (data: LoginResponse) => {
      authStore.login(data)
      navigate('/dashboard')
    },
    onError: (error: Error | null) => {
      const errorMsg = error?.message || '注册失败'
      authStore.setError(errorMsg)
      console.error('Register error:', error)
    },
  })
}

export const useProfile = () => {
  const authStore = useAuthStore()

  return useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
    enabled: !!authStore.accessToken,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      authStore.logout()
      navigate('/login')
    },
  })
}

export const useRefreshToken = () => {
  const authStore = useAuthStore()

  return useMutation({
    mutationFn: () => {
      const currentRefreshToken = authStore.refreshToken
      if (!currentRefreshToken) {
        return Promise.reject(new Error('没有刷新令牌'))
      }
      return authApi.refreshToken(currentRefreshToken)
    },
    onSuccess: (data) => {
      authStore.setAccessToken(data.accessToken)
    },
  })
}