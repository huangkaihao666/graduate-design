import { httpClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  data: {
    user: {
      id: number;
      email: string;
      name: string;
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
};
