import http from '../utils/http'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
    email: string
    role: string
  }
}

export interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
  role: string
  createdAt?: string
}

export interface UpdateProfileRequest {
  email?: string
  avatar?: string
  [key: string]: any
}

/**
 * 用户相关 API
 */
export const userApi = {
  /**
   * 登录
   */
  login(payload: LoginRequest) {
    return http.post<LoginResponse>('/auth/login', payload)
  },

  /**
   * 登出
   */
  logout() {
    return http.post<void>('/auth/logout', {})
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return http.get<UserInfo>('/users/current')
  },

  /**
   * 更新用户信息
   */
  updateProfile(data: UpdateProfileRequest) {
    return http.put<UserInfo>('/users/profile', data)
  },

  /**
   * 修改密码
   */
  changePassword(oldPassword: string, newPassword: string) {
    return http.post<void>('/auth/change-password', {
      oldPassword,
      newPassword,
    })
  },

  /**
   * 注册新用户
   */
  register(payload: { username: string; email: string; password: string }) {
    return http.post<LoginResponse>('/auth/register', payload)
  },

  /**
   * 刷新令牌
   */
  refreshToken() {
    return http.post<{ token: string }>('/auth/refresh-token', {})
  },
}

export default userApi
