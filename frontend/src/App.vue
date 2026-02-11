<script setup lang="ts">
import { Button, Card, Space, message, Divider, Select, Collapse } from 'ant-design-vue'
import { useUserStore } from './store/user'
import { useAppStore } from './store/app'

// 使用 stores
const userStore = useUserStore()
const appStore = useAppStore()

const handleLogin = () => {
  userStore.login('demo-user', 'password')
  appStore.showNotification('登录成功！', 'success')
}

const handleLogout = () => {
  userStore.logout()
  appStore.showNotification('已登出', 'info')
}

const handleToggleTheme = () => {
  appStore.toggleTheme()
  appStore.showNotification(
    `切换到${appStore.isDarkMode ? '暗' : '亮'}色主题`,
    'success'
  )
}

const themeOptions = [
  { label: '亮色', value: 'light' },
  { label: '暗色', value: 'dark' },
]
</script>

<template>
  <div id="app">
    <div class="container">
      <header class="header">
        <h1>🚀 Vue 3 + TypeScript + Pinia 项目</h1>
        <p>现代化的前端开发模板</p>
      </header>

      <main class="main">
        <!-- 通知提示 -->
        <div v-if="appStore.notification" class="notification" :class="appStore.notification.type">
          {{ appStore.notification.message }}
        </div>

        <Card title="项目演示" style="max-width: 800px; margin: 0 auto">
          <!-- 技术栈信息 -->
          <Collapse
            :items="[
              {
                key: '1',
                label: '📦 技术栈',
                children: [
                  { content: 'Vue 3 Composition API' },
                  { content: 'TypeScript 5.6' },
                  { content: 'Vite 5.4' },
                  { content: 'Ant Design Vue 4.x' },
                  { content: 'Pinia 状态管理' },
                ].map(item => item.content).join(', '),
              },
            ]"
            accordion
          />

          <Divider />

          <!-- 用户状态演示 -->
          <div class="section">
            <h3>👤 用户状态管理</h3>
            <p v-if="!userStore.isLoggedIn">
              <strong>状态：</strong>
              <span style="color: #ff4d4f">未登录</span>
            </p>
            <div v-else>
              <p><strong>用户名：</strong> {{ userStore.userFullName }}</p>
              <p><strong>邮箱：</strong> {{ userStore.user?.email }}</p>
              <p><strong>角色：</strong> {{ userStore.user?.role }}</p>
              <p v-if="userStore.hasAdminRole" style="color: #1890ff">
                ⭐ 管理员权限
              </p>
            </div>

            <Space style="margin-top: 1rem">
              <Button
                v-if="!userStore.isLoggedIn"
                type="primary"
                @click="handleLogin"
                :loading="userStore.loading"
              >
                登录
              </Button>
              <Button v-else type="primary" danger @click="handleLogout">
                登出
              </Button>
            </Space>
          </div>

          <Divider />

          <!-- 应用状态演示 -->
          <div class="section">
            <h3>🎨 应用配置</h3>
            <div style="margin: 1rem 0">
              <p><strong>主题：</strong></p>
              <Select
                v-model:value="appStore.theme"
                :options="themeOptions"
                style="width: 120px"
              />
              <Button type="primary" @click="handleToggleTheme" style="margin-left: 0.5rem">
                切换主题
              </Button>
            </div>

            <div>
              <Button @click="appStore.toggleSidebar">
                {{ appStore.sidebar.collapsed ? '显示' : '隐藏' }}侧边栏
              </Button>
              <p style="margin-top: 0.5rem; color: #666">
                侧边栏状态：{{ appStore.sidebar.collapsed ? '已隐藏' : '已显示' }}
              </p>
            </div>
          </div>

          <Divider />

          <!-- 状态总结 -->
          <div class="section" style="background: #f5f5f5; padding: 1rem; border-radius: 4px">
            <h3>✅ 功能验证</h3>
            <ul style="margin: 0.5rem 0">
              <li>✓ Pinia 状态管理已初始化</li>
              <li>✓ 用户 Store 正常运行</li>
              <li>✓ 应用 Store 正常运行</li>
              <li>✓ Ant Design Vue 组件正常使用</li>
              <li>✓ 通知系统正常工作</li>
            </ul>
          </div>
        </Card>
      </main>
    </div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 2rem;
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

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.notification.success {
  background-color: #52c41a;
}

.notification.error {
  background-color: #ff4d4f;
}

.notification.warning {
  background-color: #faad14;
}

.notification.info {
  background-color: #1890ff;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.section {
  margin: 1rem 0;
}

.section h3 {
  margin: 1rem 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.section p {
  margin: 0.5rem 0;
  color: #666;
}

.section ul {
  padding-left: 1.5rem;
  color: #333;
}

.section ul li {
  margin: 0.25rem 0;
}
</style>
