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
  tagId?: number
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

/**
 * 结案
 */
export const closeRoom = (roomId: number) => {
  return httpClient.post(`/rooms/${roomId}/close`)
}

/**
 * 获取结案报告
 */
export const getRoomReport = (roomId: number) => {
  return httpClient.get(`/rooms/${roomId}/report`)
}

/**
 * 获取评论列表
 */
export const getComments = (roomId: number, page = 1, pageSize = 20) => {
  return httpClient.get(`/rooms/${roomId}/comments`, { params: { page, pageSize } })
}

/**
 * 发表评论（parentId 有值时为回复）
 */
export const addComment = (roomId: number, content: string, parentId?: number) => {
  return httpClient.post(`/rooms/${roomId}/comments`, { content, parentId })
}

/**
 * 点赞评论
 */
export const likeComment = (roomId: number, commentId: number) => {
  return httpClient.post(`/rooms/${roomId}/comments/${commentId}/like`)
}

/**
 * 取消点赞
 */
export const unlikeComment = (roomId: number, commentId: number) => {
  return httpClient.delete(`/rooms/${roomId}/comments/${commentId}/like`)
}

/**
 * 获取案件点赞/收藏状态
 */
export const getRoomInteractionStatus = (roomId: number) => {
  return httpClient.get(`/rooms/${roomId}/interaction`)
}

/**
 * 点赞案件
 */
export const likeRoom = (roomId: number) => {
  return httpClient.post(`/rooms/${roomId}/like`)
}

/**
 * 取消点赞案件
 */
export const unlikeRoom = (roomId: number) => {
  return httpClient.delete(`/rooms/${roomId}/like`)
}

/**
 * 收藏案件
 */
export const favoriteRoom = (roomId: number) => {
  return httpClient.post(`/rooms/${roomId}/favorite`)
}

/**
 * 取消收藏案件
 */
export const unfavoriteRoom = (roomId: number) => {
  return httpClient.delete(`/rooms/${roomId}/favorite`)
}

/**
 * 获取我的收藏列表
 */
export const getMyFavorites = (page = 1, pageSize = 12) => {
  return httpClient.get('/rooms/my/favorites', { params: { page, pageSize } })
}

/**
 * 获取我点赞的案件列表
 */
export const getMyLikes = (page = 1, pageSize = 12) => {
  return httpClient.get('/rooms/my/likes', { params: { page, pageSize } })
}
