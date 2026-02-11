import { httpClient } from './client';
import { authApi } from './auth';

// 统一导出所有 API 和 HTTP 客户端
export * from './auth';
export * from './client';

export { httpClient, authApi };

// 创建一个统一的 API 对象
export const api = {
  httpClient,
  auth: authApi,
};

export default api;
