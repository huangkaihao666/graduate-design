import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'ant-design-vue';

// 创建单一的 axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 获取 auth store 的函数
const getAuthStore = () => {
  // 这里使用延迟导入以避免循环依赖

  // @ts-ignore
  const { useAuthStore } = require('@/store/auth');
  return useAuthStore();
};

// 请求拦截器 - 添加认证信息
instance.interceptors.request.use(
  (config) => {
    try {
      const authStore = getAuthStore();
      if (authStore.accessToken) {
        config.headers.Authorization = `Bearer ${authStore.accessToken}`;
      }
    } catch {
      // 如果 store 未初始化，继续发送请求
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理响应数据和错误
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 返回响应数据
    return response.data;
  },
  (error) => {
    // 处理错误
    try {
      const authStore = getAuthStore();

      // 如果是 401 未授权错误，清除 token 并重定向到登录
      if (error.response?.status === 401) {
        authStore.clearAuth();
        window.location.href = '/login';
        message.error('登录已过期，请重新登录');
      }
    } catch {
      // store 可能未初始化
    }

    // 其他错误信息
    if (error.response?.status === 400) {
      message.error(error.response?.data?.message || '请求参数错误');
    } else if (error.response?.status === 403) {
      message.error('权限不足');
    } else if (error.response?.status === 404) {
      message.error('请求的资源不存在');
    } else if (error.response?.status === 500) {
      message.error('服务器内部错误');
    } else if (error.message === 'Network Error') {
      message.error('网络连接失败');
    }

    return Promise.reject(error.response?.data || error);
  }
);

// HTTP 客户端类，提供 get、post、put、delete 等方法
class HttpClient {
  private instance: AxiosInstance;

  constructor(instance: AxiosInstance) {
    this.instance = instance;
  }

  // GET 请求
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get<any, T>(url, config);
  }

  // POST 请求
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post<any, T>(url, data, config);
  }

  // PUT 请求
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put<any, T>(url, data, config);
  }

  // PATCH 请求
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch<any, T>(url, data, config);
  }

  // DELETE 请求
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete<any, T>(url, config);
  }

  // 上传文件
  upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post<any, T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  }

  // 下载文件
  async download(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.instance.get<any, any>(url, { responseType: 'blob' });
      const blob = response instanceof Blob ? response : new Blob([response]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      message.error('文件下载失败');
      throw error;
    }
  }
}

// 导出全局 HTTP 客户端实例
export const httpClient = new HttpClient(instance);

// 导出原始 axios 实例供需要时使用
export default instance;
