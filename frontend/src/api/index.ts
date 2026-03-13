import { httpClient } from './client';
import { authApi } from './auth';
import { packagesApi } from './packages';

// 统一导出所有 API 和 HTTP 客户端
export * from './auth';
export * from './client';
export * from './packages';

export { httpClient, authApi, packagesApi };

// 创建一个统一的 API 对象
export const api = {
  httpClient,
  auth: authApi,
  packages: packagesApi,
};

export default api;
