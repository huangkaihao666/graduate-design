import { httpClient } from './client'

export const updateProfile = (userId: number, data: { name?: string; avatar?: string; bio?: string }) => {
  return httpClient.put(`/users/${userId}/profile`, data)
}

export const updatePassword = (userId: number, data: { oldPassword: string; newPassword: string }) => {
  return httpClient.put(`/users/${userId}/password`, data)
}

export const getMyRooms = (userId: number, params?: { page?: number; pageSize?: number; status?: string }) => {
  return httpClient.get(`/users/${userId}/rooms`, { params })
}

export const getMyVotes = (userId: number, params?: { page?: number; pageSize?: number }) => {
  return httpClient.get(`/users/${userId}/votes`, { params })
}

export const getMyDiagnosis = (userId: number) => {
  return httpClient.get(`/users/${userId}/diagnosis`)
}

export const getMyStats = (userId: number) => {
  return httpClient.get(`/users/${userId}/stats`)
}

