import http from '../utils/http';
import userApi from './user';
import commonApi from './common';

// 统一导出所有 API 和 HTTP 客户端
export * from './user';
export * from './common';

export { http, userApi, commonApi };

// 创建一个统一的 API 对象
export const api = {
  http,
  user: userApi,
  common: commonApi,
};

export default api;
