<template>
  <div class="app-layout" :class="{ 'with-sidebar': showSidebar }">
    <!-- 顶部导航栏 (仅在 layout: 'default' 时显示) -->
    <Header v-if="showSidebar" />

    <div class="layout-body" :class="{ 'has-header': showSidebar }">
      <!-- 侧边菜单 -->
      <Sidebar v-if="showSidebar" />

      <!-- 主内容区 -->
      <main :class="{ 'with-sidebar': showSidebar }">
        <div class="content-wrapper">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';

const route = useRoute();

// 判断当前路由是否需要显示侧边栏（layout 为 'default' 时显示）
const showSidebar = computed(() => {
  return route.meta?.layout === 'default';
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
      margin-top: 64px;
    }

    main {
      flex: 1;
      transition: margin 0.3s;

      .content-wrapper {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
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
