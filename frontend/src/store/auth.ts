import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type LoginRequest, type RegisterRequest } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null);
  const accessToken = ref<string>('');
  const refreshToken = ref<string>('');
  const loading = ref(false);
  const error = ref<string>('');

  // 计算属性
  const isAuthenticated = computed(() => !!accessToken.value);

  // 从本地存储恢复 token
  const initializeAuth = () => {
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
      user.value = JSON.parse(storedUser);
    }
  };

  // 登录
  const login = async (credentials: LoginRequest) => {
    loading.value = true;
    error.value = '';
    try {
      const response = await authApi.login(credentials);
      const { data } = response;

      // 保存 token 和用户信息
      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      user.value = data.user;

      // 存储到本地存储
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      return response;
    } catch (err: any) {
      error.value = err?.message || '登录失败';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 注册
  const register = async (data: RegisterRequest) => {
    loading.value = true;
    error.value = '';
    try {
      const response = await authApi.register(data);

      // 自动登录
      const authData = response.data;
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
      accessToken.value = response.data.accessToken;
      refreshToken.value = response.data.refreshToken;

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);

      return response;
    } catch (err) {
      clearAuth();
      throw err;
    }
  };

  // 获取当前用户信息
  const getProfile = async () => {
    const response = await authApi.getProfile();
    user.value = response.data;
    localStorage.setItem('user', JSON.stringify(response.data));
    return response;
  };

  // 登出
  const logout = () => {
    clearAuth();
  };

  // 清除认证信息
  const clearAuth = () => {
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

    // 方法
    initializeAuth,
    login,
    register,
    refreshAccessToken,
    getProfile,
    logout,
    clearAuth,
  };
});
