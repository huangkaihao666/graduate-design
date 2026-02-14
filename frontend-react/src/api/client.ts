import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'
import axios from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types/common'
import { useAuthStore } from '@/store'

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState()

    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }

    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

instance.interceptors.response.use(
  (response) => {
    // 后端返回格式: { statusCode, message, data }
    // 我们需要返回 data 部分给上层处理
    return response.data.data || response.data
  },
  (error: AxiosError<ApiResponse>) => {
    const authStore = useAuthStore.getState()

    // 先检查服务器返回的业务错误
    if (error.response?.status === 401) {
      message.error('登录已过期，请重新登录')
      authStore.clearAuth()
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      message.error('没有权限访问此资源')
    } else if (error.response?.status === 404) {
      message.error('请求的资源不存在')
    } else if (error.response?.status === 500) {
      message.error('服务器错误，请稍后重试')
    } else if (error.message === 'Network Error') {
      message.error('网络错误，请检查网络连接')
    } else {
      message.error(error.response?.data?.message || error.message || '请求失败')
    }

    return Promise.reject(error)
  }
)

export const httpClient = instance
export default instance