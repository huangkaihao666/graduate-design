import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  themeMode: 'light' | 'dark'
  messageCount: number
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setThemeMode: (mode: 'light' | 'dark') => void
  toggleTheme: () => void
  setMessageCount: (count: number) => void
}

// 读取系统颜色偏好作为默认值
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      themeMode: getSystemTheme(),
      messageCount: 0,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      // store 只管状态，data-theme DOM 同步由 App.tsx useEffect 处理
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleTheme: () =>
        set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),
      setMessageCount: (count) => set({ messageCount: count }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ themeMode: state.themeMode }),
    }
  )
)
