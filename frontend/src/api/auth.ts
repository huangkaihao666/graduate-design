import { httpClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  /** 摄影师入驻：创建 worker + 摄影师档案（draft，需提交审核） */
  registerAsPhotographer?: boolean;
  shootingStyleForPhotographer?: string;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  data: {
    user: {
      id: number;
      email: string;
      name: string;
      role?: 'user' | 'worker' | 'admin' | string;
    };
    accessToken: string;
    refreshToken: string;
    tokenType: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) => httpClient.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => httpClient.post<AuthResponse>('/auth/register', data),
  refreshToken: (refreshToken: string) => httpClient.post('/auth/refresh', { refreshToken }),
  getProfile: () => httpClient.get('/auth/profile'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    httpClient.post('/auth/change-password', body),
  bindPhone: (body: { phone: string }) => httpClient.patch('/auth/phone', body),
};
