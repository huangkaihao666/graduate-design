import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type Theme = 'light' | 'dark';

export const useAppStore = defineStore('app', () => {
  // State
  const theme = ref<Theme>('light');
  const sidebar = ref({
    collapsed: false,
  });
  const loading = ref(false);
  const notification = ref<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  } | null>(null);

  // Computed
  const isDarkMode = computed(() => theme.value === 'dark');

  // Actions
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    localStorage.setItem('app-theme', theme.value);
  };

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    localStorage.setItem('app-theme', newTheme);
  };

  const toggleSidebar = () => {
    sidebar.value.collapsed = !sidebar.value.collapsed;
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebar.value.collapsed = collapsed;
  };

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading;
  };

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3000
  ) => {
    notification.value = {
      type,
      message,
      duration,
    };

    if (duration > 0) {
      setTimeout(() => {
        notification.value = null;
      }, duration);
    }
  };

  const closeNotification = () => {
    notification.value = null;
  };

  // 初始化主题
  const initTheme = () => {
    const savedTheme = localStorage.getItem('app-theme') as Theme | null;
    if (savedTheme) {
      theme.value = savedTheme;
    }
  };

  return {
    // State
    theme,
    sidebar,
    loading,
    notification,

    // Computed
    isDarkMode,

    // Actions
    toggleTheme,
    setTheme,
    toggleSidebar,
    setSidebarCollapsed,
    setLoading,
    showNotification,
    closeNotification,
    initTheme,
  };
});
