import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id?: number
  username?: string
  email?: string
  avatar?: string
  role?: string
}

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null)
  const isLoggedIn = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const userFullName = computed(() => {
    return user.value?.username || 'Guest'
  })

  const hasAdminRole = computed(() => {
    return user.value?.role === 'admin'
  })

  // Actions
  const setUser = (userData: User) => {
    user.value = userData
    isLoggedIn.value = true
    error.value = null
  }

  const login = async (username: string, password: string) => {
    loading.value = true
    error.value = null
    try {
      // 这里应该是调用真实的登录 API
      // const response = await api.login(username, password)
      // setUser(response.data)

      // 模拟登录
      setUser({
        id: 1,
        username,
        email: `${username}@example.com`,
        avatar: 'https://api.example.com/avatar.jpg',
        role: 'user',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    isLoggedIn.value = false
    error.value = null
  }

  const updateProfile = (updates: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    user,
    isLoggedIn,
    loading,
    error,

    // Computed
    userFullName,
    hasAdminRole,

    // Actions
    setUser,
    login,
    logout,
    updateProfile,
    clearError,
  }
})
