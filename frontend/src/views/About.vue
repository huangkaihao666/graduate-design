<script setup lang="ts">
import { Card, Divider } from 'ant-design-vue';
</script>

<template>
  <div class="about">
    <header class="header">
      <h1>📚 关于项目</h1>
    </header>

    <main class="main">
      <Card title="项目信息" style="max-width: 800px; margin: 0 auto">
        <div class="section">
          <h3>项目简介</h3>
          <p>
            这是一个现代化的 Vue 3 + TypeScript
            前端开发模板项目，集成了最新的前端技术栈，为毕业设计和企业项目提供可靠的基础架构。
          </p>
        </div>

        <Divider />

        <div class="section">
          <h3>核心技术栈</h3>
          <ul>
            <li><strong>框架：</strong> Vue 3 Composition API</li>
            <li><strong>语言：</strong> TypeScript 5.6</li>
            <li><strong>构建工具：</strong> Vite 5.4</li>
            <li><strong>UI 组件库：</strong> Ant Design Vue 4.x</li>
            <li><strong>状态管理：</strong> Pinia</li>
            <li><strong>路由管理：</strong> Vue Router 4.x</li>
            <li><strong>包管理：</strong> pnpm</li>
          </ul>
        </div>

        <Divider />

        <div class="section">
          <h3>项目特点</h3>
          <ul>
            <li>✨ 基于 Vue 3 Composition API，代码更简洁</li>
            <li>✨ 完整的 TypeScript 支持，类型安全有保障</li>
            <li>✨ Pinia 状态管理，模块化易维护</li>
            <li>✨ Vue Router 路由管理，支持动态路由</li>
            <li>✨ Ant Design Vue UI 组件库，企业级设计</li>
            <li>✨ Vite 构建工具，开发效率高</li>
            <li>✨ pnpm 包管理，依赖安装快</li>
          </ul>
        </div>

        <Divider />

        <div class="section">
          <h3>快速开始</h3>
          <div
            style="
              background: #f5f5f5;
              padding: 1rem;
              border-radius: 4px;
              font-family: 'Courier New';
            "
          >
            <p style="margin: 0.5rem 0"># 安装依赖</p>
            <p style="margin: 0.5rem 0">pnpm install</p>
            <p style="margin: 1rem 0 0.5rem 0"># 开发模式</p>
            <p style="margin: 0.5rem 0">pnpm run dev</p>
            <p style="margin: 1rem 0 0.5rem 0"># 生产构建</p>
            <p style="margin: 0.5rem 0">pnpm run build</p>
          </div>
        </div>

        <Divider />

        <div class="section">
          <h3>目录结构</h3>
          <div
            style="
              background: #f5f5f5;
              padding: 1rem;
              border-radius: 4px;
              font-family: 'Courier New';
              font-size: 0.9rem;
            "
          >
            <p style="margin: 0.25rem 0">src/</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── components/ # 可复用组件</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── router/ # 路由配置</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── store/ # Pinia 状态管理</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── views/ # 页面组件</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── api/ # API 请求</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── utils/ # 工具函数</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">├── types/ # TypeScript 类型</p>
            <p style="margin: 0.25rem 0; margin-left: 2rem">└── main.ts # 应用入口</p>
          </div>
        </div>
      </Card>
    </main>
  </div>
</template>

<style scoped>
.about {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 2rem;
}

.header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem 0;
  text-align: center;
  color: white;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.main {
  display: flex;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
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
  line-height: 1.6;
}

.section ul {
  padding-left: 1.5rem;
  color: #333;
}

.section ul li {
  margin: 0.5rem 0;
  line-height: 1.6;
}
</style>
