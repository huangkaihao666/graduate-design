import { httpClient } from './client'

export type NotificationType =
  | 'LIKE_COMMENT'
  | 'NEW_COMMENT'
  | 'NEW_REPLY'
  | 'LIKE_ROOM'
  | 'FAVORITE_ROOM'
  | 'FOLLOW_NEW_ROOM'
  | 'ACHIEVEMENT_UNLOCKED'

export interface NotificationItem {
  id: number
  type: NotificationType
  fromUserId: number
  roomId?: number | null
  messageId?: number
  isRead: boolean
  createdAt: string
  fromUser?: {
    id: number
    name: string
    avatar?: string
  }
  room?: {
    id: number
    title: string
  }
}

export interface NotificationsResponse {
  data: NotificationItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取通知列表（支持 type 过滤和分页）
 */
export const getNotifications = (params?: {
  type?: string
  page?: number
  pageSize?: number
}): Promise<NotificationsResponse> => {
  return httpClient.get('/notifications', { params })
}

/**
 * 获取未读通知数
 */
export const getUnreadCount = (): Promise<{ count: number }> => {
  return httpClient.get('/notifications/unread-count')
}

/**
 * 全部标记已读
 */
export const markAllRead = () => {
  return httpClient.patch('/notifications/read-all')
}

/**
 * 标记单条已读
 */
export const markRead = (id: number) => {
  return httpClient.patch(`/notifications/${id}/read`)
}
