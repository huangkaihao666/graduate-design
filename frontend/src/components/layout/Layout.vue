<template>
  <div class="app-layout" :class="{ 'with-sidebar': showSidebar }">
    <!-- 顶部导航栏 (仅在 layout: 'default' 时显示) -->
    <Header v-if="showHeader" />

    <div class="layout-body">
      <!-- 侧边菜单（仅管理员保留） -->
      <Sidebar v-if="showSidebar" />

      <!-- 主内容区 -->
      <main :class="{ 'with-sidebar': showSidebar }">
        <div
          class="content-wrapper"
          :class="{
            'dashboard-home-wrapper': isDashboardHome,
            'full-bleed-wrapper': isFullBleed || isWorkerShell,
            'user-end-bleed': isUserEndLayout,
          }"
        >
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';

const route = useRoute();
const authStore = useAuthStore();

const isHeaderLayout = computed(
  () => route.meta?.layout === 'default' || route.meta?.layout === 'full'
);
const isFullBleed = computed(() => route.meta?.layout === 'full');
const isWorkerShell = computed(() => route.path.startsWith('/worker'));
const isAdmin = computed(() => authStore.user?.role === 'admin');
const isDashboardHome = computed(() => route.path === '/dashboard');

/** 普通用户端：主内容贴顶、左右铺满（不含管理员后台、工作台、已 full 布局页） */
const isUserEndLayout = computed(() => {
  const p = route.path;
  if (p.startsWith('/admin') || p.startsWith('/worker')) return false;
  if (isFullBleed.value || isWorkerShell.value) return false;
  return true;
});

// 用户端改为顶部导航，管理员保留侧边栏
const showHeader = computed(() => isHeaderLayout.value && !route.meta?.hideHeader);
const showSidebar = computed(() => {
  // 仅 default 布局下管理员显示侧边栏；full 布局用于全宽页面（不显示侧边栏）
  if (route.meta?.hideSidebar) return false;
  return route.meta?.layout === 'default' && isAdmin.value;
});
</script>

<style scoped lang="less">
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #fff;

  &.with-sidebar {
    .layout-body {
      display: flex;

      main {
        margin-left: 240px;

        @media (max-width: 1200px) {
          margin-left: 80px;
        }
      }
    }
  }

  .layout-body {
    display: flex;
    flex: 1;
    margin-top: 0;

    /* Header 为 sticky 已在文档流中占位，勿再 margin-top，避免与顶栏之间出现白条 */

    main {
      flex: 1;
      transition: margin 0.3s;

      .content-wrapper {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;

        &.dashboard-home-wrapper {
          padding-top: 8px;
        }

        &.full-bleed-wrapper,
        &.user-end-bleed {
          padding: 0;
          max-width: none;
          margin: 0;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .app-layout {
    .layout-body {
      flex-direction: column;

      main {
        margin-left: 0 !important;

        .content-wrapper:not(.user-end-bleed):not(.full-bleed-wrapper) {
          padding: 16px;
        }

        .content-wrapper.user-end-bleed,
        .content-wrapper.full-bleed-wrapper {
          padding: 0;
        }
      }
    }
  }
}
</style>
