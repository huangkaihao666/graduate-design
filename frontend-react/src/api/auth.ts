import { httpClient } from './client'
import type { LoginRequest, RegisterRequest, LoginResponse, User } from '@/types/common'

export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const response = await httpClient.post('/auth/register', data)
  return response.data
}

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await httpClient.post('/auth/login', data)
  return response.data
}

export const getProfile = async (): Promise<User> => {
  const response = await httpClient.get('/auth/profile')
  return response.data
}

export const refreshToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  const response = await httpClient.post('/auth/refresh', { refreshToken })
  return response.data
}

export const logout = async (): Promise<void> => {
  await httpClient.post('/auth/logout')
}