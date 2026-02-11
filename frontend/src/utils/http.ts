import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { useAppStore } from '../store/app'

// 响应数据类型定义
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
  success?: boolean
}

// 请求配置扩展
interface RequestConfig extends AxiosRequestConfig {
  showNotification?: boolean
}

// HTTP 状态码对应的消息
const statusCodeMessages: Record<number, string> = {
  400: '请求参数错误',
  401: '未授权，请重新登录',
  403: '禁止访问',
  404: '请求资源不存在',
  405: '请求方法不允许',
  408: '请求超时',
  429: '请求过于频繁',
  500: '服务器内部错误',
  501: '服务不可用',
  502: '网关错误',
  503: '服务暂时不可用',
  504: '网关超时',
}

class HttpClient {
  private instance: AxiosInstance
  private appStore?: ReturnType<typeof useAppStore>

  constructor(config?: AxiosRequestConfig) {
    this.instance = axios.create({
      timeout: 10000,
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    })

    this.setupInterceptors()
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 获取存储的认证令牌
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // 添加请求时间戳和请求 ID
        config.headers['X-Request-ID'] = this.generateRequestId()
        config.headers['X-Timestamp'] = Date.now().toString()

        console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`, {
          headers: config.headers,
          params: config.params,
          data: config.data,
        })

        return config
      },
      (error) => {
        console.error('[HTTP Request Error]', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        const { data, status } = response
        const config = response.config as RequestConfig

        console.log(`[HTTP Response] ${status}`, data)

        // 如果响应数据是标准格式
        if (data && typeof data === 'object' && 'code' in data) {
          const { code, message } = data as ApiResponse

          // 处理业务错误
          if (code !== 0 && code !== 200) {
            this.handleApiError(code, message, config)
            return Promise.reject(new Error(message || '请求失败'))
          }

          // 成功响应
          if (config.showNotification !== false) {
            this.showNotification(message || '请求成功', 'success')
          }
          return data
        }

        // 如果响应是标准 HTTP 成功状态
        if (status >= 200 && status < 300) {
          return data
        }

        return data
      },
      (error: AxiosError) => {
        console.error('[HTTP Response Error]', error)
        this.handleError(error)
        return Promise.reject(error)
      }
    )
  }

  /**
   * 处理 API 业务错误
   */
  private handleApiError(code: number, message: string, config: RequestConfig): void {
    if (config.showNotification === false) {
      return
    }

    if (!this.appStore) {
      this.appStore = useAppStore()
    }

    // 特殊错误码处理
    switch (code) {
      case 401:
        // 未授权，清除本地认证信息
        localStorage.removeItem('auth_token')
        this.appStore?.showNotification(message || '登录已过期，请重新登录', 'error')
        // 可以在这里添加重定向到登录页的逻辑
        break
      case 403:
        this.appStore?.showNotification(message || '没有权限访问', 'error')
        break
      default:
        this.appStore?.showNotification(message || '请求失败', 'error')
    }
  }

  /**
   * 处理网络错误
   */
  private handleError(error: AxiosError): void {
    if (!this.appStore) {
      this.appStore = useAppStore()
    }

    let message = '网络请求失败'

    if (error.response) {
      // 服务器响应了错误状态码
      const status = error.response.status
      message = statusCodeMessages[status] || `请求失败 (${status})`
    } else if (error.request) {
      // 请求已发出但没有收到响应
      message = '网络连接失败，请检查您的网络'
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时'
    }

    this.appStore?.showNotification(message, 'error')
  }

  /**
   * 显示通知
   */
  private showNotification(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ): void {
    if (!this.appStore) {
      this.appStore = useAppStore()
    }
    this.appStore?.showNotification(message, type)
  }

  /**
   * 生成唯一的请求 ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * GET 请求
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.get<T, T>(url, config)
  }

  /**
   * POST 请求
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.instance.post<T, T>(url, data, config)
  }

  /**
   * PUT 请求
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.instance.put<T, T>(url, data, config)
  }

  /**
   * PATCH 请求
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.instance.patch<T, T>(url, data, config)
  }

  /**
   * DELETE 请求
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete<T, T>(url, config)
  }

  /**
   * 设置认证令牌
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token)
    this.instance.defaults.headers.common.Authorization = `Bearer ${token}`
  }

  /**
   * 清除认证令牌
   */
  clearToken(): void {
    localStorage.removeItem('auth_token')
    delete this.instance.defaults.headers.common.Authorization
  }

  /**
   * 获取原始 axios 实例（用于高级用法）
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance
  }
}

// 创建全局 HTTP 客户端实例
const http = new HttpClient()

export default http
