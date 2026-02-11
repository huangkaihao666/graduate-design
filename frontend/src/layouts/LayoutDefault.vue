<script setup lang="ts">
import { Layout, Menu } from 'ant-design-vue'
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

// 当前选中的菜单项
const selectedKeys = computed(() => [route.path])

// 处理菜单点击
const handleMenuClick = (key: string) => {
  router.push(key)
}
</script>

<template>
  <Layout style="min-height: 100vh">
    <!-- 顶部导航栏 -->
    <Layout.Header style="background: #fff; padding: 0 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.1)">
      <div style="display: flex; justify-content: space-between; align-items: center; height: 100%">
        <div style="font-size: 20px; font-weight: bold; color: #1890ff">
          🚀 Vue3 App
        </div>
        <Menu
          mode="horizontal"
          :selected-keys="selectedKeys"
          style="border-bottom: none; flex: 1; margin-left: 50px"
          @click="(e) => handleMenuClick(e.key as string)"
        >
          <Menu.Item key="/">首页</Menu.Item>
          <Menu.Item key="/api-demo">API 演示</Menu.Item>
          <Menu.Item key="/about">关于</Menu.Item>
        </Menu>
      </div>
    </Layout.Header>

    <!-- 主要内容区域 -->
    <Layout.Content style="padding: 0">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </Layout.Content>

    <!-- 底部页脚 -->
    <Layout.Footer style="text-align: center; background: #f0f2f5; padding: 24px 50px">
      <div style="color: #666">
        <p style="margin: 0 0 0.5rem">Vue 3 + TypeScript + Pinia + Vue Router</p>
        <p style="margin: 0">© 2024 All Rights Reserved</p>
      </div>
    </Layout.Footer>
  </Layout>
</template>

<style scoped>
:deep(.ant-layout) {
  min-height: 100vh;
}

:deep(.ant-layout-header) {
  display: flex;
  align-items: center;
  height: 64px;
}

:deep(.ant-menu-horizontal) {
  border-bottom: none;
}
</style>
