import { authApi, type LoginRequest, type RegisterRequest } from '@/api/auth';
import { resetMakeupAdviceDraftInStorage } from '@/utils/workerMakeupAdviceStorage';
import { resetPhotographerShootDraftInStorage } from '@/utils/workerPhotographerShootAdviceStorage';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

function unwrapApiData<T = any>(res: any): T {
  // httpClient 响应拦截器已返回 response.data，因此这里的 res 通常是：
  // { statusCode, message, data: <payload> }
  // Auth 接口 payload 又是：{ statusCode, message, data: { user, accessToken, refreshToken } }
  const outer = res && typeof res === 'object' ? res : {};
  const level1 = outer?.data ?? outer;
  const level2 = level1?.data ?? level1;
  return level2 as T;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null);
  const accessToken = ref<string>('');
  const refreshToken = ref<string>('');
  const loading = ref(false);
  const error = ref<string>('');

  // 计算属性
  const isAuthenticated = computed(() => !!accessToken.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isWorker = computed(() => user.value?.role === 'worker');

  // 从本地存储恢复 token
  const initializeAuth = () => {
    try {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken) {
        accessToken.value = storedAccessToken;
      }
      if (storedRefreshToken) {
        refreshToken.value = storedRefreshToken;
      }
      if (storedUser) {
        try {
          user.value = JSON.parse(storedUser);
        } catch (e) {
          // 如果 JSON 解析失败，清除该数据
          localStorage.removeItem('user');
          user.value = null;
        }
      }
    } catch (e) {
      // 忽略 localStorage 访问错误
      console.warn('Failed to initialize auth from localStorage:', e);
    }
  };

  // 登录
  const login = async (credentials: LoginRequest) => {
    loading.value = true;
    error.value = '';
    try {
      const response = await authApi.login(credentials);
      const authData = unwrapApiData<{
        user: any;
        accessToken: string;
        refreshToken: string;
        tokenType?: string;
      }>(response);

      // 保存 token 和用户信息
      accessToken.value = authData.accessToken;
      refreshToken.value = authData.refreshToken;
      user.value = authData.user;

      // 存储到本地存储
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      return response;
    } catch (err: any) {
      error.value = err?.message || '登录失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 本地管理员登录（用于管理端演示）
  const loginAsAdminLocal = () => {
    const adminUser = {
      id: 0,
      name: '系统管理员',
      email: 'admin',
      role: 'admin',
    };
    const adminToken = 'local-admin-token';
    const adminRefreshToken = 'local-admin-refresh-token';

    user.value = adminUser;
    accessToken.value = adminToken;
    refreshToken.value = adminRefreshToken;

    localStorage.setItem('accessToken', adminToken);
    localStorage.setItem('refreshToken', adminRefreshToken);
    localStorage.setItem('user', JSON.stringify(adminUser));
  };

  // 注册
  const register = async (data: RegisterRequest) => {
    loading.value = true;
    error.value = '';
    try {
      const response = await authApi.register(data);

      // 自动登录
      const authData = unwrapApiData<{
        user: any;
        accessToken: string;
        refreshToken: string;
        tokenType?: string;
      }>(response);
      accessToken.value = authData.accessToken;
      refreshToken.value = authData.refreshToken;
      user.value = authData.user;

      // 存储到本地存储
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('user', JSON.stringify(authData.user));

      return response;
    } catch (err: any) {
      error.value = err?.message || '注册失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 刷新 token
  const refreshAccessToken = async () => {
    try {
      const response = await authApi.refreshToken(refreshToken.value);
      const data = unwrapApiData<{ accessToken: string; refreshToken: string }>(response);
      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      return response;
    } catch (err) {
      clearAuth();
      throw err;
    }
  };

  // 获取当前用户信息
  const getProfile = async () => {
    const response = await authApi.getProfile();
    const profile = unwrapApiData<any>(response);
    user.value = profile;
    localStorage.setItem('user', JSON.stringify(profile));
    return response;
  };

  // 登出
  const logout = () => {
    clearAuth();
  };

  // 清除认证信息
  const clearAuth = () => {
    const uid = user.value?.id;
    if (uid !== undefined && uid !== null && uid !== '') {
      resetMakeupAdviceDraftInStorage(uid);
      resetPhotographerShootDraftInStorage(uid);
    }
    user.value = null;
    accessToken.value = '';
    refreshToken.value = '';
    error.value = '';

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  return {
    // 状态
    user,
    accessToken,
    refreshToken,
    loading,
    error,

    // 计算属性
    isAuthenticated,
    isAdmin,
    isWorker,

    // 方法
    initializeAuth,
    login,
    loginAsAdminLocal,
    register,
    refreshAccessToken,
    getProfile,
    logout,
    clearAuth,
  };
});
