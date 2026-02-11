<script setup lang="ts">
import { ref } from 'vue'
import { Button, Card, Space, message } from 'ant-design-vue'

const count = ref(0)

const handleClick = () => {
  count.value++
  message.success('你点击了按钮！')
}
</script>

<template>
  <div id="app">
    <div class="container">
      <header class="header">
        <h1>🚀 Vue 3 + TypeScript 前端项目</h1>
        <p>现代化的前端开发模板</p>
      </header>

      <main class="main">
        <Card title="项目演示" style="max-width: 600px; margin: 0 auto">
          <p><strong>框架：</strong> Vue 3 Composition API</p>
          <p><strong>语言：</strong> TypeScript</p>
          <p><strong>UI 库：</strong> Ant Design Vue 4.x</p>
          <p><strong>构建工具：</strong> Vite</p>

          <Space direction="vertical" style="width: 100%; margin-top: 1rem">
            <Button type="primary" @click="handleClick">
              点击测试 (已点击 {{ count }} 次)
            </Button>
            <p v-if="count > 0" style="color: #52c41a">
              ✓ 组件和状态管理正常运行！
            </p>
          </Space>
        </Card>
      </main>
    </div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.header p {
  font-size: 1rem;
  opacity: 0.9;
}

.main {
  display: flex;
  justify-content: center;
}
</style>
