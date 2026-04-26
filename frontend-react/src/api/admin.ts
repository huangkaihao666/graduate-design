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

// ─── 智能体审核 ──────────────────────────────────────────────

export const getPendingAgents = (params?: { page?: number; pageSize?: number; search?: string }) =>
  httpClient.get('/admin/agents/pending', { params })

export const approveAgent = (id: string) => httpClient.put(`/admin/agents/${id}/approve`)

export const rejectAgent = (id: string, reason: string) =>
  httpClient.put(`/admin/agents/${id}/reject`, { reason })

// ─── 标签管理 ────────────────────────────────────────────────

export const getAdminTags = () => httpClient.get('/admin/tags')

export const createAdminTag = (data: { name: string; color?: string; weight?: number }) =>
  httpClient.post('/admin/tags', data)

export const updateAdminTag = (id: number, data: { name?: string; color?: string; weight?: number }) =>
  httpClient.put(`/admin/tags/${id}`, data)

export const deleteAdminTag = (id: number) => httpClient.delete(`/admin/tags/${id}`)

// ─── 公告管理 ────────────────────────────────────────────────

export const getAdminAnnouncements = (params?: { page?: number; pageSize?: number }) =>
  httpClient.get('/admin/announcements', { params })

export const createAnnouncement = (data: { title: string; content: string; expireAt?: string }) =>
  httpClient.post('/admin/announcements', data)

export const deleteAnnouncement = (id: number) => httpClient.delete(`/admin/announcements/${id}`)

// ─── 知识库审核 ──────────────────────────────────────────────

export const getAdminKnowledgeBases = (params?: { page?: number; pageSize?: number; search?: string }) =>
  httpClient.get('/admin/knowledge-bases', { params })

export const deleteAdminKnowledgeBase = (id: number) => httpClient.delete(`/admin/knowledge-bases/${id}`)

export const deleteAdminKnowledgeDocument = (id: number) => httpClient.delete(`/admin/knowledge-documents/${id}`)

export const getKnowledgeDocumentContent = (id: number): Promise<{
  id: number; filename: string; mimeType: string; content: string | null; status: string
}> => httpClient.get(`/admin/knowledge-documents/${id}/content`)

export const approveKnowledgeDocument = (id: number) => httpClient.put(`/admin/knowledge-documents/${id}/approve`)

export const rejectKnowledgeDocument = (id: number) => httpClient.put(`/admin/knowledge-documents/${id}/reject`)

// ─── 情绪预警 ────────────────────────────────────────────────

export const getAdminAlerts = (params?: {
  riskLevel?: string
  isHandled?: string
  page?: number
  pageSize?: number
}) => httpClient.get('/admin/alerts', { params })

export const getAdminAlertStats = () => httpClient.get('/admin/alerts/stats')

export const handleAdminAlert = (id: number, handleNote: string) =>
  httpClient.put(`/admin/alerts/${id}/handle`, { handleNote })

