<script setup lang="ts">
import { useAppStore } from './store/app';

const appStore = useAppStore();
</script>

<template>
  <div id="app" :class="{ 'dark-mode': appStore.isDarkMode }">
    <router-view />
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
