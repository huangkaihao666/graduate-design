import http from '../utils/http'

export interface PaginationParams {
  page: number
  pageSize: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginationResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 通用 API 服务
 */
export const commonApi = {
  /**
   * 获取系统信息
   */
  getSystemInfo() {
    return http.get('/system/info')
  },

  /**
   * 获取应用配置
   */
  getAppConfig() {
    return http.get('/config/app', { showNotification: false })
  },

  /**
   * 健康检查
   */
  healthCheck() {
    return http.get('/health', { showNotification: false })
  },

  /**
   * 获取通用列表数据
   */
  getList<T>(endpoint: string, params?: PaginationParams) {
    return http.get<PaginationResponse<T>>(endpoint, { params })
  },

  /**
   * 获取详情
   */
  getDetail<T>(endpoint: string, id: string | number) {
    return http.get<T>(`${endpoint}/${id}`)
  },

  /**
   * 创建数据
   */
  create<T>(endpoint: string, data: any) {
    return http.post<T>(endpoint, data)
  },

  /**
   * 更新数据
   */
  update<T>(endpoint: string, id: string | number, data: any) {
    return http.put<T>(`${endpoint}/${id}`, data)
  },

  /**
   * 删除数据
   */
  delete(endpoint: string, id: string | number) {
    return http.delete(`${endpoint}/${id}`)
  },

  /**
   * 批量删除
   */
  batchDelete(endpoint: string, ids: (string | number)[]) {
    return http.post(`${endpoint}/batch-delete`, { ids })
  },

  /**
   * 上传文件
   */
  uploadFile(endpoint: string, formData: FormData) {
    return http.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * 下载文件
   */
  downloadFile(endpoint: string, filename?: string) {
    return http.get(endpoint, {
      responseType: 'blob',
      showNotification: false,
    }).then((response: any) => {
      const url = window.URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'download'
      link.click()
      window.URL.revokeObjectURL(url)
    })
  },
}

export default commonApi
