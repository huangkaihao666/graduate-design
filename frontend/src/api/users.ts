import { httpClient } from './client';

export interface User {
  id: number;
  email: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
}

export const usersApi = {
  // 获取用户信息
  getUser: (id: number) => httpClient.get<User>(`/users/${id}`),

  // 更新用户信息
  updateUser: (id: number, data: UpdateUserRequest) => httpClient.put<User>(`/users/${id}`, data),
};
