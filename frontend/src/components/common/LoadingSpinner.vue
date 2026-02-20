<template>
  <div class="loading-spinner" :class="{ 'full-screen': fullScreen }">
    <div class="spinner">
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
    </div>
    <p v-if="text" class="loading-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  fullScreen?: boolean;
  text?: string;
}

withDefaults(defineProps<Props>(), {
  fullScreen: false,
  text: '',
});
</script>

<style scoped lang="less">
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;

  &.full-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    z-index: 9999;
  }

  .spinner {
    position: relative;
    width: 50px;
    height: 50px;

    .spinner-ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 3px solid transparent;
      border-top-color: #ff758c;
      border-radius: 50%;
      animation: spin 1.2s linear infinite;

      &:nth-child(2) {
        animation-delay: 0.4s;
        border-top-color: #ff7eb3;
      }

      &:nth-child(3) {
        animation-delay: 0.8s;
        border-top-color: #ffb0cc;
      }
    }
  }

  .loading-text {
    margin-top: 16px;
    color: #666;
    font-size: 14px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
