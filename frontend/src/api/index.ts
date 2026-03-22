import { authApi } from './auth';
import { httpClient } from './client';
import { ordersApi } from './orders';
import { paymentsApi } from './payments';
import { packagesApi } from './packages';
import { photographersApi } from './photographers';
import { spotsApi } from './spots';
import { styleTagsApi } from './styleTags';
import { usersApi } from './users';

// 统一导出所有 API 和 HTTP 客户端
export * from './auth';
export * from './client';
export * from './orders';
export * from './payments';
export * from './packages';
export * from './photographers';
export * from './spots';
export * from './styleTags';
export * from './users';

export {
  authApi,
  httpClient,
  ordersApi,
  packagesApi,
  paymentsApi,
  photographersApi,
  spotsApi,
  styleTagsApi,
  usersApi,
};

// 创建一个统一的 API 对象
export const api = {
  httpClient,
  auth: authApi,
  packages: packagesApi,
  photographers: photographersApi,
  users: usersApi,
  orders: ordersApi,
  payments: paymentsApi,
  spots: spotsApi,
  styleTags: styleTagsApi,
};

export default api;
