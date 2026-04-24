export interface ApiResponse<T = Record<string, string>> {
  code: number
  message: string
  data?: T
}

export interface User {
  id: number | string
  name?: string
  username?: string
  email: string
  avatar?: string
  bio?: string
  roles?: string[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken?: string
  user: User
}

export interface AuthData {
  accessToken: string
  refreshToken?: string
  user: User
}

export interface Room {
  id: number
  title: string
  content: string
  image?: string
  status: 'WAITING' | 'LIVE' | 'CLOSED'
  ownerId: number
  owner?: User
  agents: string[]
  viewCount: number
  commentCount: number
  likeCount: number
  favoriteCount: number
  liked?: boolean
  favorited?: boolean
  votes?: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface CreateRoomRequest {
  title: string
  content: string
  image?: string
  agents: string[]
}

export interface Agent {
  id: string
  name: string
  personality: string
  description: string
  avatar?: string
  signature?: string
  winRate: number
  participateCount: number
  fans: number
}