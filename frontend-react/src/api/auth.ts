import { httpClient } from './client'
import type { LoginRequest, LoginResponse, User } from '@/types/common'

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await httpClient.post('/auth/login', data)
  return response.data
}

export const register = async (data: { username: string; email: string; password: string }): Promise<LoginResponse> => {
  const response = await httpClient.post('/auth/register', data)
  return response.data
}

export const getCurrentUser = async (): Promise<User> => {
  const response = await httpClient.get('/auth/profile')
  return response.data
}

export const refreshToken = async (): Promise<{ accessToken: string }> => {
  const response = await httpClient.post('/auth/refresh')
  return response.data
}

export const logout = async (): Promise<void> => {
  await httpClient.post('/auth/logout')
}

export const changePassword = async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
  await httpClient.put('/auth/password', data)
}