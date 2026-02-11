<script setup lang="ts">
import { Button, Result } from 'ant-design-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleGoHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="not-found">
    <Result
      status="404"
      title="404"
      sub-title="抱歉，您访问的页面不存在"
      style="margin-top: 5rem"
    >
      <template #extra>
        <Button type="primary" @click="handleGoHome">
          返回首页
        </Button>
      </template>
    </Result>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
