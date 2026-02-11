# 📦 Monorepo 项目模板

> 基于 Vue 3 + NestJS + TypeScript + pnpm 的现代化 Monorepo 项目模板

[![Vue](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.x-ff0066.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 📋 目录

- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [可用命令](#-可用命令)
- [Monorepo 工作区](#-monorepo-工作区)
- [开发指南](#-开发指南)

## 🖥️ 环境要求

| 软件 | 最低版本 | 推荐版本 |
|------|--------|--------|
| **Node.js** | 18.0 | 20.x LTS 或 22.x LTS |
| **pnpm** | 8.0 | 10.29.3 或更新 |
| **npm** | 10.0 | 10.0 或更新（仅用于安装 pnpm）|

> **注意**: 本项目使用 pnpm 作为包管理器，**不支持 npm 或 yarn**

## 🚀 快速开始

### 1. 全局安装 pnpm

```bash
# 如果未安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### 2. 克隆项目

```bash
git clone <项目地址>
cd project-monorepo-template
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 启动前端开发服务器

```bash
pnpm frontend:dev
```

前端项目默认运行在 `http://localhost:5173`

### 5. 启动后端开发服务器（待实现）

```bash
pnpm backend:dev
```

后端服务默认运行在 `http://localhost:3000`

## 📁 项目结构

```
project-monorepo-template/
│
├── frontend/                    # 前端项目 (Vue 3 + TypeScript)
│   ├── src/
│   │   ├── components/          # 可复用组件
│   │   ├── views/              # 页面组件
│   │   ├── hooks/              # 自定义 Hook
│   │   ├── utils/              # 工具函数
│   │   ├── types/              # TypeScript 类型定义
│   │   ├── assets/             # 静态资源
│   │   ├── api/                # API 接口（待扩展）
│   │   ├── router/             # 路由配置（待扩展）
│   │   ├── store/              # Pinia 状态管理（待扩展）
│   │   ├── App.vue             # 根组件
│   │   └── main.ts             # 入口文件
│   ├── public/                 # 静态公共文件
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── backend/                     # 后端项目 (NestJS)（待实现）
│   ├── src/
│   ├── package.json
│   └── README.md
│
├── package.json                # Monorepo 根配置
├── pnpm-workspace.yaml         # 工作区配置
├── pnpm-lock.yaml              # 依赖锁定文件
└── README.md                   # 本文件
```

## 🛠️ 技术栈

### 前端 (Frontend)

- **框架**: Vue 3 (Composition API) + TypeScript
- **构建**: Vite
- **UI 组件**: Ant Design Vue 4.x
- **包管理**: pnpm
- **路由**: Vue Router 4（待添加）
- **状态管理**: Pinia（待添加）
- **HTTP 请求**: Axios（待添加）

### 后端 (Backend - 待实现)

- **框架**: NestJS + TypeScript
- **ORM**: TypeORM / Prisma
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **鉴权**: Passport + JWT
- **文档**: Swagger

## 📝 可用命令

### 从项目根目录运行

```bash
# 前端开发
pnpm frontend:dev

# 前端构建
pnpm frontend:build

# 前端预览
pnpm frontend:preview

# 前端类型检查
pnpm frontend:type-check

# 后端开发（待实现）
pnpm backend:dev

# 后端构建（待实现）
pnpm backend:build

# 安装所有依赖
pnpm install-all
```

### 从各子包目录运行

```bash
# 进入前端目录
cd frontend

# 前端专用命令
pnpm dev
pnpm build
pnpm preview
pnpm type-check
pnpm lint
pnpm format
```

## 🏗️ Monorepo 工作区

### 工作区配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'frontend'
```

### 在工作区中添加新包

1. 在 `pnpm-workspace.yaml` 中添加包路径
2. 为新包创建 `package.json`
3. 运行 `pnpm install`

```bash
# 例如添加 backend 包
# 1. 编辑 pnpm-workspace.yaml，添加 'backend'
# 2. mkdir backend && cd backend
# 3. pnpm init
# 4. 回到根目录运行 pnpm install
```

### 工作区命令语法

```bash
# 为特定包运行命令
pnpm --filter frontend build

# 为所有包运行命令
pnpm -r build

# 只为有该脚本的包运行
pnpm -r --if-present lint
```

## 🔧 开发指南

### 创建新的前端组件

```vue
<!-- frontend/src/components/MyComponent.vue -->
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '默认标题',
})

const count = ref(0)
</script>

<template>
  <div>
    <h3>{{ title }}</h3>
    <p>计数: {{ count }}</p>
  </div>
</template>

<style scoped>
div {
  padding: 1rem;
}
</style>
```

### 使用自定义 Hook

```typescript
// frontend/src/hooks/useFetch.ts
import { ref } from 'vue'

export function useFetch(url: string) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetch = async () => {
    loading.value = true
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetch }
}
```

### 使用 Ant Design Vue 组件

```vue
<script setup lang="ts">
import { Button, Card, Space, message } from 'ant-design-vue'
import { ref } from 'vue'

const count = ref(0)

const handleClick = () => {
  count.value++
  message.success('点击成功！')
}
</script>

<template>
  <Card title="示例">
    <Space>
      <Button type="primary" @click="handleClick">
        点击我
      </Button>
      <span>{{ count }}</span>
    </Space>
  </Card>
</template>
```

## 🌍 环境变量

### 前端环境变量

- `.env.example` - 示例文件（参考用）
- `.env.development` - 开发环境
- `.env.production` - 生产环境

### 在代码中使用

```typescript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
```

> **注意**: 环境变量名称必须以 `VITE_` 开头

## 📚 项目状态

- [x] Vue 3 + TypeScript 前端基础框架
- [x] Ant Design Vue 4.x 集成
- [x] pnpm Monorepo 工作区配置
- [x] 路径别名配置
- [x] 完整文档
- [ ] 后端 NestJS 项目
- [ ] 前端 ESLint & Prettier
- [ ] Vue Router 路由
- [ ] Pinia 状态管理
- [ ] Axios API 封装

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

[MIT](./LICENSE) © 2024

---

**快速链接**

- [前端项目 README](./frontend/README.md) - 前端项目详细文档
- [前端项目结构](./frontend/PROJECT_STRUCTURE.txt) - 前端项目结构说明
