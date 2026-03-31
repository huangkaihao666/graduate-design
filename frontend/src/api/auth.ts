import { httpClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  /** 注册身份：user=普通用户 photographer=摄影师 makeup=妆造师；优先于 registerAsPhotographer */
  registrationType?: 'user' | 'photographer' | 'makeup';
  /** @deprecated 请使用 registrationType=photographer */
  registerAsPhotographer?: boolean;
  /** 摄影师/妆造师入驻时可选填的风格说明 */
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
