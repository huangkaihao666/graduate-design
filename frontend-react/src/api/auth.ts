import { httpClient } from './client'
import type { LoginRequest, RegisterRequest, LoginResponse, User } from '@/types/common'

export const register = async (data: RegisterRequest) => {
  return httpClient.post<LoginResponse>('/auth/register', data)
}

export const login = async (data: LoginRequest) => {
  return httpClient.post<LoginResponse>('/auth/login', data)
}

export const adminLogin = async (data: LoginRequest) => {
  return httpClient.post<LoginResponse>('/auth/admin/login', data)
}

export const getProfile = async () => {
  return httpClient.get<User>('/auth/profile')
}

export const refreshToken = async (refreshToken: string) => {
  return httpClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken })
}

export const logout = async () => {
  return httpClient.post('/auth/logout')
}