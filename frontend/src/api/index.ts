import { httpClient } from './client';
import { authApi } from './auth';
import { packagesApi } from './packages';
import { usersApi } from './users';

// 统一导出所有 API 和 HTTP 客户端
export * from './auth';
export * from './client';
export * from './packages';
export * from './users';

export { httpClient, authApi, packagesApi, usersApi };

// 创建一个统一的 API 对象
export const api = {
  httpClient,
  auth: authApi,
  packages: packagesApi,
  users: usersApi,
};

export default api;
