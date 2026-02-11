import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 获取窗口尺寸的 Hook
 */
export function useWindowSize() {
  const width = ref<number>(0);
  const height = ref<number>(0);

  const updateSize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };

  onMounted(() => {
    updateSize();
    window.addEventListener('resize', updateSize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateSize);
  });

  return {
    width,
    height,
  };
}
