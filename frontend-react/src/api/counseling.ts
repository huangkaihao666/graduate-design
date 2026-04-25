import { httpClient } from './client'

export interface Session {
  id: number
  title: string
  summary?: string
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  updatedAt: string
  roomId?: number
  roomTitle?: string
  sentimentRecordId?: number
  messageCount?: number
}

export interface CounselingMessage {
  id: number
  sessionId: number
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

export const getSessions = (): Promise<Session[]> =>
  httpClient.get('/counseling/sessions') as any

export const createSession = (data: {
  roomId?: number
  roomTitle?: string
  sentimentRecordId?: number
}): Promise<Session> =>
  httpClient.post('/counseling/sessions', data) as any

export const getMessages = (sessionId: number): Promise<CounselingMessage[]> =>
  httpClient.get(`/counseling/sessions/${sessionId}/messages`) as any

export const closeSession = (sessionId: number): Promise<{ success: boolean }> =>
  httpClient.post(`/counseling/sessions/${sessionId}/close`) as any

export const deleteSession = (sessionId: number): Promise<{ success: boolean }> =>
  httpClient.delete(`/counseling/sessions/${sessionId}`) as any

export const prefetchMemories = (sessionId: number, content: string): Promise<{ success: boolean }> =>
  httpClient.post(`/counseling/sessions/${sessionId}/prefetch`, { content }) as any
