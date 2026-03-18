import { httpClient } from './client'

export type AgentSort = 'winRate' | 'participateCount' | 'fans' | 'name'

export const getAgents = (params?: {
  search?: string
  sort?: AgentSort
  order?: 'asc' | 'desc'
}) => {
  return httpClient.get('/agents', { params })
}

export const getAgentById = (id: string) => {
  return httpClient.get(`/agents/${id}`)
}

export const getAgentCases = (id: string, limit = 5) => {
  return httpClient.get(`/agents/${id}/cases`, { params: { limit } })
}

