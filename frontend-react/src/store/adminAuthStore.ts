import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthData } from '@/types/common'

interface AdminAuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null

  login: (data: AuthData) => void
  clearAuth: () => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (data) =>
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
    }),
    {
      // 独立的 storage key，与用户端完全隔离
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
