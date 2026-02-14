<template>
  <div class="virtual-try-on">
    <div class="header">
      <h1>🤖 AI 虚拟试拍</h1>
      <p>上传您的照片，一键生成高保真婚纱预览图</p>
    </div>
    <div class="content">
      <a-empty description="功能开发中..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Empty } from 'ant-design-vue';
</script>

<style scoped>
.virtual-try-on {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  text-align: center;
  margin-bottom: 40px;
}
.header h1 {
  font-size: 2rem;
  margin-bottom: 10px;
}
.content {
  background: white;
  padding: 60px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
