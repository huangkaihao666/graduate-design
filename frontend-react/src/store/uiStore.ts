import { create } from 'zustand';
interface UIState {
  sidebarCollapsed: boolean;
  themeMode: 'light' | 'dark';
  messageCount: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  setMessageCount: (count: number) => void;
}
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  themeMode: 'light',
  messageCount: 0,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setMessageCount: (count) => set({ messageCount: count }),
}));