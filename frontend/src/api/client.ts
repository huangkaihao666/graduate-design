import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'ant-design-vue';

// 创建单一的 axios 实例
const instance: AxiosInstance = axios.create({
  // 默认使用相对路径，配合 Vite devServer proxy，避免在局域网/多设备访问时被 localhost 指向"本机"导致 Network Error
  // 若有独立后端地址（如部署环境），可通过 VITE_API_BASE_URL 覆盖
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 从 localStorage 获取 token（避免循环依赖）
const getTokenFromStorage = (): string | null => {
  try {
    return localStorage.getItem('accessToken');
  } catch (e) {
    // localStorage 可能不可用（如 SSR 环境）
    return null;
  }
};

// 请求拦截器 - 添加认证信息
instance.interceptors.request.use(
  (config) => {
    try {
      // 直接从 localStorage 读取 token（store 初始化时也会从这里读取）
      const token = getTokenFromStorage();

      // 如果找到了 token，添加到请求头
      if (token && typeof token === 'string' && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // 如果读取失败，继续发送请求（不添加 token）
      console.warn('Failed to add auth token to request:', error);
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
  async (error) => {
    // 处理错误
    // 如果是 401 未授权错误，清除 token 并重定向到登录
    if (error.response?.status === 401) {
      try {
        // 清除 localStorage 中的 token
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // 尝试清除 store（如果可用）
        try {
          // 使用动态导入避免循环依赖
          const { useAuthStore } = await import('@/store/auth');
          const authStore = useAuthStore();
          authStore.clearAuth();
        } catch {
          // store 可能未初始化，忽略错误
        }

        // 重定向到登录页
        window.location.href = '/login';
        message.error('登录已过期，请重新登录');
      } catch (e) {
        // 如果清除失败，至少重定向到登录页
        window.location.href = '/login';
      }
    }

    // 其他错误信息
    if (error.response?.status === 400) {
      const raw = error.response?.data?.message;
      const text = Array.isArray(raw)
        ? raw.join('; ')
        : typeof raw === 'string' && raw.trim()
          ? raw
          : '请求参数错误';
      message.error(text);
    } else if (error.response?.status === 403) {
      const raw403 = error.response?.data?.message;
      const text403 = Array.isArray(raw403)
        ? raw403.join('; ')
        : typeof raw403 === 'string' && raw403.trim()
          ? raw403
          : '权限不足';
      message.error(text403);
    } else if (error.response?.status === 404) {
      message.error('请求的资源不存在');
    } else if (error.response?.status === 409) {
      const raw409 = error.response?.data?.message;
      const text409 = Array.isArray(raw409)
        ? raw409.join('; ')
        : typeof raw409 === 'string' && raw409.trim()
          ? raw409
          : '操作冲突';
      message.error(text409);
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
