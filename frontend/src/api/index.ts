import { httpClient } from './client';
import { authApi } from './auth';
import { packagesApi } from './packages';
import { usersApi } from './users';
import { ordersApi } from './orders';
import { spotsApi } from './spots';
import { styleTagsApi } from './styleTags';

// 统一导出所有 API 和 HTTP 客户端
export * from './auth';
export * from './client';
export * from './packages';
export * from './users';
export * from './orders';
export * from './spots';
export * from './styleTags';

export { httpClient, authApi, packagesApi, usersApi, ordersApi, spotsApi, styleTagsApi };

// 创建一个统一的 API 对象
export const api = {
  httpClient,
  auth: authApi,
  packages: packagesApi,
  users: usersApi,
  orders: ordersApi,
  spots: spotsApi,
  styleTags: styleTagsApi,
};

export default api;
