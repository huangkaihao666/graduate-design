import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { authApi } from '@/api'
import type { LoginRequest, LoginResponse } from '@/types/common'

export const useLogin = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data: LoginResponse) => {
      authStore.login(data)
      navigate('/dashboard')
    },
  })
}

export const useRegister = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  return useMutation({
    mutationFn: (data: Parameters<typeof authApi.register>[0]) => authApi.register(data),
    onSuccess: (data: LoginResponse) => {
      authStore.login(data)
      navigate('/dashboard')
    },
  })
}

export const useCurrentUser = () => {
  const authStore = useAuthStore()
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!authStore.token,
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

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) => authApi.changePassword(data),
  })
}