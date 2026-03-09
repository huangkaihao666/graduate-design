import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'
import axios from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types/common'
import { useAuthStore } from '@/store'
import * as authApi from './auth'

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 用于防止多次刷新 Token 的标志
let isRefreshing = false
// 存储等待刷新 Token 时的请求队列
let failedQueue: Array<{ resolve: (value: any) => void; reject: (error: any) => void }> = []

// 处理等待队列的请求
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  isRefreshing = false
  failedQueue = []
}

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState()

    // 添加 accessToken 到请求头
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }

    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

instance.interceptors.response.use(
  (response) => {
    // 后端统一规范：所有接口返回 { statusCode, message, data }
    // 其中 data 是实际业务数据，可能是：
    //   - 数组: [...]
    //   - 对象: { field: value, ... }
    //   - 分页对象: { data: [...], pagination: {...} }
    //   - 认证响应: { user: {...}, accessToken, refreshToken, ... }
    const response_data = response.data as any

    if (response_data && response_data.data !== undefined) {
      // 直接返回 data 部分给前端使用
      // data 可能是任何形式（数组、对象、嵌套对象等），前端需要根据具体接口处理
      return response_data.data
    }

    // 如果响应格式不符合规范，返回整个响应
    return response_data
  },
  async (error: AxiosError<ApiResponse>) => {
    const authStore = useAuthStore.getState()
    const originalRequest = error.config as any

    // 处理 Token 过期的情况
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新 Token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return instance(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 尝试使用 refreshToken 刷新 accessToken
        if (authStore.refreshToken) {
          const response = await authApi.refreshToken(authStore.refreshToken)
          const newAccessToken = (response as any).accessToken
          authStore.setAccessToken(newAccessToken)
          processQueue(null, newAccessToken)
          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return instance(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        message.error('登录已过期，请重新登录')
        authStore.clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // 处理其他错误
    if (error.response?.status === 403) {
      message.error('没有权限访问此资源')
    } else if (error.response?.status === 404) {
      message.error('请求的资源不存在')
    } else if (error.response?.status === 400) {
      // 处理验证错误
      const responseData = error.response.data as any
      if (Array.isArray(responseData?.message)) {
        // 如果 message 是数组，显示第一条错误信息
        message.error(responseData.message[0] || '参数验证失败')
      } else {
        message.error(responseData?.message || '参数验证失败')
      }
    } else if (error.response?.status === 500) {
      message.error('服务器错误，请稍后重试')
    } else if (error.message === 'Network Error') {
      message.error('网络错误，请检查网络连接')
    } else if (error.response?.status !== 401) {
      message.error(error.response?.data?.message || error.message || '请求失败')
    }

    return Promise.reject(error)
  }
)

export const httpClient = instance
export default instance
