import { httpClient } from './client'
import type { CreateRoomRequest } from '@/types/common'

/**
 * 创建案件
 */
export const createRoom = (data: CreateRoomRequest) => {
  return httpClient.post('/rooms', data)
}

/**
 * 获取案件列表
 */
export const getRooms = (params: {
  page?: number
  pageSize?: number
  status?: string
  search?: string
  sort?: string
}) => {
  return httpClient.get('/rooms', { params })
}

/**
 * 获取案件详情
 */
export const getRoomById = (roomId: number) => {
  return httpClient.get(`/rooms/${roomId}`)
}

/**
 * 更新案件
 */
export const updateRoom = (roomId: number, data: Partial<CreateRoomRequest>) => {
  return httpClient.put(`/rooms/${roomId}`, data)
}

/**
 * 删除案件
 */
export const deleteRoom = (roomId: number) => {
  return httpClient.delete(`/rooms/${roomId}`)
}

/**
 * 获取所有 Agents
 */
export const getAllAgents = () => {
  return httpClient.get('/rooms/agents/list')
}
