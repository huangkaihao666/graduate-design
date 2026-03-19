import { httpClient } from './client'

export const getAdminRooms = (params?: {
  page?: number
  pageSize?: number
  status?: string
  search?: string
}) => httpClient.get('/admin/rooms', { params })

export const updateAdminRoomStatus = (roomId: number, status: string) =>
  httpClient.put(`/admin/rooms/${roomId}/status`, { status })

export const deleteAdminRoom = (roomId: number) => httpClient.delete(`/admin/rooms/${roomId}`)

export const getAdminUsers = (params?: {
  page?: number
  pageSize?: number
  role?: string
  status?: string
  search?: string
}) => httpClient.get('/admin/users', { params })

export const updateAdminUserRole = (userId: number, role: string) =>
  httpClient.put(`/admin/users/${userId}/role`, { role })

export const updateAdminUserStatus = (userId: number, isActive: boolean) =>
  httpClient.put(`/admin/users/${userId}/status`, { isActive })

export const getAdminViolations = (params?: { page?: number; pageSize?: number; search?: string }) =>
  httpClient.get('/admin/messages/violations', { params })

export const deleteAdminMessage = (messageId: number) => httpClient.delete(`/admin/messages/${messageId}`)

export const banAdminUser = (userId: number) => httpClient.put(`/admin/users/${userId}/ban`)

export const getAdminOverview = () => httpClient.get('/admin/stats/overview')

export const getAdminTrends = (days = 14) => httpClient.get('/admin/stats/trends', { params: { days } })

export const getAdminHotTopics = (limit = 10) => httpClient.get('/admin/stats/hotTopics', { params: { limit } })

