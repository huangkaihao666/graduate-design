import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types/common';
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAuthStore } = require('@/store');
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);
instance.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.code !== 0 && data.code !== 200) {
      message.error(data.message || '请求失败');
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  (error: AxiosError<ApiResponse>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAuthStore } = require('@/store');
    const authStore = useAuthStore();
    if (error.response?.status === 401) {
      message.error('登录过期，请重新登录');
      authStore.logout();
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      message.error('没有权限访问此资源');
    } else if (error.response?.status === 404) {
      message.error('请求的资源不存在');
    } else if (error.response?.status === 500) {
      message.error('服务器错误，请稍后重试');
    } else if (error.message === 'Network Error') {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error(error.response?.data?.message || error.message || '请求失败');
    }
    return Promise.reject(error);
  }
);
export const httpClient = instance;
export default instance;