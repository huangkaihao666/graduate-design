<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAppStore } from './store/app';
import Layout from '@/components/layout/Layout.vue';

const appStore = useAppStore();
const route = useRoute();

// 判断当前路由是否需要使用默认 Layout
const useDefaultLayout = () => {
  const meta = route.meta;
  // 如果 layout 为 'none'，就不使用 Layout
  // 如果 layout 为 'default' 或 undefined（默认值），使用 Layout
  return meta?.layout !== 'none';
};
</script>

<template>
  <div id="app" :class="{ 'dark-mode': appStore.isDarkMode }">
    <Layout v-if="useDefaultLayout()">
      <router-view />
    </Layout>
    <router-view v-else />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body,
html {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
    'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  height: 100%;
}

#app.dark-mode {
  background-color: #1f1f1f;
  color: #e1e1e1;
}
</style>
