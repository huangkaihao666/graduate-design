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
  username: string
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