<template>
  <div class="itinerary-planning">
    <div class="header">
      <h1>🗺️ 智能行程规划</h1>
      <p>一键生成最优拍摄路线，让旅拍更加轻松愉悦</p>
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
.itinerary-planning {
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
