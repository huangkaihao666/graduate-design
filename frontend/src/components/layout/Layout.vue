<template>
  <div class="app-layout" :class="{ 'with-sidebar': showSidebar }">
    <!-- 顶部导航栏 (仅在 layout: 'default' 时显示) -->
    <Header v-if="showHeader" />

    <div class="layout-body" :class="{ 'has-header': showHeader }">
      <!-- 侧边菜单（仅管理员保留） -->
      <Sidebar v-if="showSidebar" />

      <!-- 主内容区 -->
      <main :class="{ 'with-sidebar': showSidebar }">
        <div
          class="content-wrapper"
          :class="{
            'dashboard-home-wrapper': isDashboardHome,
            'full-bleed-wrapper': isFullBleed,
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
const isAdmin = computed(() => authStore.user?.role === 'admin');
const isDashboardHome = computed(() => route.path === '/dashboard');

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
    transition: margin-top 0.3s;

    &.has-header {
      margin-top: 72px;
    }

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

        &.full-bleed-wrapper {
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

        .content-wrapper {
          padding: 16px;
        }
      }
    }
  }
}
</style>
