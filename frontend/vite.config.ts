import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/router': path.resolve(__dirname, './src/router'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/views': path.resolve(__dirname, './src/views'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false,
    // 将前端对 /api 的请求代理到后端，避免本地开发/局域网访问时因写死 localhost 导致 Network Error，
    // 同时也能减少 CORS 带来的环境差异。
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'http',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
  },
});
