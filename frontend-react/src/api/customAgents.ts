import { httpClient } from './client'

export interface CustomAgent {
  id: string
  name: string
  personality?: string
  description?: string
  prompt?: string
  avatar?: string
  domains?: string
  domainsArr?: string[]
  isPublic: boolean
  status: string // PENDING / APPROVED / REJECTED / PRIVATE
  winRate: number
  participateCount: number
  fans: number
  createdAt: string
  knowledgeBaseId?: number
  creator?: { id: number; name: string; avatar?: string }
}

export interface KnowledgeBase {
  id: number
  name: string
  cozeKbId: string
  description?: string
  createdAt: string
  documents: KnowledgeDocument[]
}

export interface KnowledgeDocument {
  id: number
  kbId: number
  filename: string
  cozeDocId: string
  size: number
  createdAt: string
}

export interface CozeWorkspace {
  id: string
  name: string
  role_type: string
  workspace_type: string
  icon_url?: string
}

export interface CozeDocument {
  document_id: string
  name: string
  size: number
  status: number // 0=处理中 1=完成 2=失败
  type: string
  create_time: number
}

// ─── 工作空间 ────────────────────────────────────────────────

export const getWorkspaces = (): Promise<CozeWorkspace[]> =>
  httpClient.get('/custom-agents/workspaces')

// ─── 我的智能体 ──────────────────────────────────────────────

export const getMyAgents = (): Promise<CustomAgent[]> =>
  httpClient.get('/custom-agents/mine')

export const getPublicCustomAgents = (params?: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ data: CustomAgent[]; pagination: { total: number; page: number; pageSize: number } }> =>
  httpClient.get('/custom-agents/public', { params })

export const createAgent = (data: {
  name: string
  personality?: string
  description?: string
  prompt: string
  avatar?: string
  domains?: string
  isPublic?: boolean
}): Promise<CustomAgent> => httpClient.post('/custom-agents', data)

export const updateAgent = (
  id: string,
  data: Partial<{
    name: string
    personality: string
    description: string
    prompt: string
    avatar: string
    domains: string
  }>,
): Promise<CustomAgent> => httpClient.put(`/custom-agents/${id}`, data)

export const deleteAgent = (id: string): Promise<{ success: boolean }> =>
  httpClient.delete(`/custom-agents/${id}`)

export const publishAgent = (id: string): Promise<CustomAgent> =>
  httpClient.post(`/custom-agents/${id}/publish`)

/** 手动重新发布到 Coze API 渠道 */
export const cozePublishBot = (id: string): Promise<{ success: boolean; message: string }> =>
  httpClient.post(`/custom-agents/${id}/coze-publish`)

// ─── 知识库 ──────────────────────────────────────────────────

export const getMyKnowledgeBases = (): Promise<KnowledgeBase[]> =>
  httpClient.get('/custom-agents/knowledge-bases')

export const createKnowledgeBase = (data: {
  name: string
  description?: string
}): Promise<KnowledgeBase> => httpClient.post('/custom-agents/knowledge-bases', data)

export const uploadDocument = (
  kbId: number,
  file: File,
): Promise<KnowledgeDocument> => {
  const form = new FormData()
  form.append('file', file, file.name)
  return httpClient.post(`/custom-agents/knowledge-bases/${kbId}/documents`, form, {
    timeout: 120000,
    headers: { 'Content-Type': undefined },
  })
}

export const deleteDocument = (
  kbId: number,
  docId: number,
): Promise<{ success: boolean }> =>
  httpClient.delete(`/custom-agents/knowledge-bases/${kbId}/documents/${docId}`)

/** 从 Coze 平台同步文档列表 */
export const syncCozeDocuments = (kbId: number): Promise<CozeDocument[]> =>
  httpClient.get(`/custom-agents/knowledge-bases/${kbId}/coze-documents`)

export const bindKnowledgeBase = (
  agentId: string,
  kbId: number,
): Promise<CustomAgent> =>
  httpClient.post(`/custom-agents/${agentId}/bind-kb`, { kbId })

export const unbindKnowledgeBase = (agentId: string): Promise<CustomAgent> =>
  httpClient.post(`/custom-agents/${agentId}/unbind-kb`)
