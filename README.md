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

| 软件        | 最低版本 | 推荐版本                       |
| ----------- | -------- | ------------------------------ |
| **Node.js** | 18.0     | 20.x LTS 或 22.x LTS           |
| **pnpm**    | 8.0      | 10.29.3 或更新                 |
| **npm**     | 10.0     | 10.0 或更新（仅用于安装 pnpm） |

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

### 5. 启动后端开发服务器

```bash
pnpm backend:dev
```

后端服务默认运行在 `http://localhost:3000/api/v1`

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
├── backend/                     # 后端项目 (NestJS + TypeScript)
│   ├── src/
│   │   ├── common/              # 公共模块（过滤器、拦截器、验证）
│   │   ├── modules/             # 业务模块
│   │   ├── config/              # 配置文件
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── utils/               # 工具函数
│   │   ├── app.controller.ts    # 根控制器
│   │   ├── app.module.ts        # 根模块
│   │   ├── app.service.ts       # 根服务
│   │   └── main.ts              # 入口文件
│   ├── test/                    # 测试文件
│   ├── package.json
│   ├── .env                     # 环境变量配置
│   ├── .env.example             # 环境变量示例
│   └── README.md
│
├── .husky/                     # Husky Git hooks
├── commitlint.config.js        # Commitlint 配置
├── eslint.config.js            # 根目录 ESLint 配置
├── .lintstagedrc.json          # Lint-staged 配置
├── .prettierignore             # Prettier 忽略配置
├── package.json                # Monorepo 根配置
├── pnpm-workspace.yaml         # 工作区配置
├── pnpm-lock.yaml              # 依赖锁定文件
├── HUSKY_LINT_STAGED_GUIDE.md  # Husky 和 Lint-staged 使用指南
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

### 后端 (Backend)

- **框架**: NestJS 11 + TypeScript
- **ORM**: ✅ Prisma 7.x（已集成）
- **数据库**: MySQL 8.0（支持 Prisma）
- **缓存**: Redis（待集成）
- **鉴权**: Passport + JWT（待集成）
- **文档**: Swagger（待集成）
- **验证**: class-validator + class-transformer

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

# 后端开发
pnpm backend:dev

# 后端启动（生产）
pnpm backend:start

# 后端构建
pnpm backend:build

# 后端 ESLint 检查
pnpm backend:lint

# 后端代码格式化
pnpm backend:format

# 同时启动前端和后端开发服务器
pnpm dev

# 构建前端和后端
pnpm build

# 安装所有依赖
pnpm install-all
```

### 前端专用命令

```bash
# 进入前端目录
cd frontend

# 前端开发
pnpm dev

# 前端构建
pnpm build

# 前端预览
pnpm preview

# 前端类型检查
pnpm type-check

# 前端 ESLint 检查
pnpm lint

# 前端代码格式化
pnpm format
```

### 后端专用命令

```bash
# 进入后端目录
cd backend

# 后端开发（热重载）
pnpm start:dev

# 后端启动（生产）
pnpm start

# 后端构建
pnpm build

# 后端 ESLint 检查
pnpm lint

# 后端代码格式化
pnpm format

# 后端单元测试
pnpm test

# 后端端对端测试
pnpm test:e2e

# Prisma 数据库迁移
pnpm prisma:migrate       # 创建新迁移

# 生成 Prisma Client
pnpm prisma:generate

# Prisma Studio（可视化数据管理）
pnpm prisma:studio

# 重置数据库
pnpm prisma:reset

# 生产环境迁移部署
pnpm prisma:migrate:prod
```

## 🏗️ Monorepo 工作区

### 工作区配置

```yaml
# pnpm-workspace.yaml
packages:
  - "frontend"
  - "backend"
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

### 提交代码规范

本项目使用 Husky + Lint-staged + Commitlint 来确保代码质量和提交规范。详见 [Husky & Lint-staged 使用指南](./HUSKY_LINT_STAGED_GUIDE.md)

**快速要点**:

- 提交前自动执行代码检查和格式化
- 提交信息必须遵循 Conventional Commits 格式
- 格式: `<type>(<scope>): <subject>` (例如: `feat(auth): 添加登录功能`)

### 创建新的前端组件

```vue
<!-- frontend/src/components/MyComponent.vue -->
<script setup lang="ts">
import { ref } from "vue";

interface Props {
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "默认标题",
});

const count = ref(0);
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
import { ref } from "vue";

export function useFetch(url: string) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetch = async () => {
    loading.value = true;
    try {
      const response = await fetch(url);
      data.value = await response.json();
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, fetch };
}
```

### 使用 Ant Design Vue 组件

```vue
<script setup lang="ts">
import { Button, Card, Space, message } from "ant-design-vue";
import { ref } from "vue";

const count = ref(0);

const handleClick = () => {
  count.value++;
  message.success("点击成功！");
};
</script>

<template>
  <Card title="示例">
    <Space>
      <Button type="primary" @click="handleClick"> 点击我 </Button>
      <span>{{ count }}</span>
    </Space>
  </Card>
</template>
```

## 🌍 环境变量

### 前端环境变量 (`frontend/.env*`)

- `.env.example` - 示例文件（参考用）
- `.env.development` - 开发环境
- `.env.production` - 生产环境

**在代码中使用**：

```typescript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
```

> **注意**: 前端环境变量名称必须以 `VITE_` 开头

### 后端环境变量 (`backend/.env`)

- `.env` - 本地开发环境
- `.env.example` - 示例文件（参考用）

**支持的变量**：

```bash
PORT=3000                                    # 服务器端口
NODE_ENV=development                        # 运行环境
CORS_ORIGIN=http://localhost:5173          # CORS 跨域来源

# 数据库配置（Prisma MySQL）
DATABASE_URL=mysql://root:password@localhost:3306/project_db
```

> **数据库 URL 格式**: `mysql://username:password@host:port/database`

## 📚 项目状态

### 前端

- [x] Vue 3 + TypeScript 基础框架
- [x] Ant Design Vue 4.x 集成
- [x] Vite 构建工具
- [x] Vue Router 4 路由
- [x] Pinia 状态管理
- [x] Axios HTTP 客户端
- [x] ESLint + Prettier 代码规范

### 后端

- [x] NestJS 11 + TypeScript 基础框架
- [x] 全局异常处理和响应转换
- [x] 数据验证（ValidationPipe）
- [x] CORS 配置
- [x] Health Check 端点
- [x] ✅ Prisma ORM 7.x + MySQL 数据库
- [x] ✅ Users CRUD 操作示例
- [ ] Swagger API 文档
- [ ] Passport + JWT 认证
- [ ] Redis 缓存

### 工程化

- [x] pnpm Monorepo 工作区
- [x] Husky Git Hooks
- [x] Lint-staged 代码检查
- [x] Commitlint 提交规范
- [x] 共享 ESLint 配置

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
