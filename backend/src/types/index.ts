/**
 * API 响应类型
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
