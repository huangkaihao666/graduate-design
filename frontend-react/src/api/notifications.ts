import { httpClient } from './client'

export interface NotificationItem {
  id: number
  type: 'LIKE_COMMENT' | 'NEW_COMMENT' | 'NEW_REPLY'
  fromUserId: number
  roomId: number
  messageId?: number
  isRead: boolean
  createdAt: string
  fromUser?: {
    id: number
    name: string
    avatar?: string
  }
}

/**
 * 获取通知列表（最新30条）
 */
export const getNotifications = (): Promise<NotificationItem[]> => {
  return httpClient.get('/notifications')
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
