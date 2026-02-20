/**
 * 全局类型定义
 */

/**
 * API 响应通用类型
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 分页响应数据
 */
export interface PaginationResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 路由 Meta 类型定义
 */
export interface RouteMeta {
  title?: string;
  layout?: 'default' | 'full' | 'none';
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  hideHeader?: boolean;
  hideSidebar?: boolean;
}
