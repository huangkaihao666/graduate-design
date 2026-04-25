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

// ─── 关注 / 粉丝 ─────────────────────────────────────────────

export const followUser = (userId: number): Promise<{ success: boolean }> =>
  httpClient.post(`/users/${userId}/follow`)

export const unfollowUser = (userId: number): Promise<{ success: boolean }> =>
  httpClient.delete(`/users/${userId}/follow`)

export interface UserBrief {
  id: number
  name: string
  avatar?: string
  bio?: string
}

export const getFollowers = (userId: number): Promise<UserBrief[]> =>
  httpClient.get(`/users/${userId}/followers`)

export const getFollowing = (userId: number): Promise<UserBrief[]> =>
  httpClient.get(`/users/${userId}/following`)

export const getFollowCounts = (
  userId: number,
): Promise<{ followers: number; following: number }> =>
  httpClient.get(`/users/${userId}/follow-counts`)

export const isFollowing = (userId: number): Promise<{ following: boolean }> =>
  httpClient.get(`/users/${userId}/is-following`)

// ─── 关注动态流 ──────────────────────────────────────────────

export const getFeed = (params?: {
  page?: number
  pageSize?: number
}): Promise<{ data: any[]; pagination: any }> =>
  httpClient.get('/users/feed/timeline', { params })

