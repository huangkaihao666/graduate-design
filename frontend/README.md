# 🚀 前端项目 - Vue 3 + TypeScript + Vite

> 基于 Vue 3 + TypeScript + Ant Design Vue + pnpm 的前端项目

[![Vue](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-9946cc.svg)](https://vitejs.dev/)
[![Ant Design Vue](https://img.shields.io/badge/Ant%20Design%20Vue-4.2-1890ff.svg)](https://www.antdv.com/)

## 📋 快速导航

- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [常用命令](#-常用命令)
- [项目结构](#-项目结构)
- [路径别名](#-路径别名)

## 🖥️ 环境要求

| 软件        | 版本 | 说明                  |
| ----------- | ---- | --------------------- |
| **Node.js** | 18+  | 推荐 20.x 或 22.x LTS |
| **pnpm**    | 8+   | 包管理器（**必需**）  |

## 🚀 快速开始

### 1. 安装 pnpm

```bash
npm install -g pnpm
```

### 2. 安装依赖

```bash
cd frontend
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5173`

### 4. 构建生产版本

```bash
pnpm build
```

输出到 `dist/` 目录

## 📝 常用命令

```bash
pnpm dev            # 开发服务器
pnpm build          # 生产构建
pnpm preview        # 预览构建结果
pnpm type-check     # 类型检查
pnpm lint           # 代码检查
pnpm lint --fix     # 自动修复
pnpm format         # 代码格式化
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── components/          # 可复用组件
│   ├── views/              # 页面组件
│   ├── hooks/              # 自定义 Hook
│   ├── utils/              # 工具函数
│   ├── types/              # 类型定义
│   ├── api/                # API 接口
│   ├── router/             # 路由配置
│   ├── store/              # Pinia 状态管理
│   ├── assets/             # 静态资源
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── public/                 # 公共资源
├── vite.config.ts          # Vite 配置
└── tsconfig.json           # TypeScript 配置
```

## 🔗 路径别名

```typescript
// ✅ 推荐用别名
import Button from '@/components/Button.vue';

// ❌ 避免相对路径
import Button from '../../../components/Button.vue';
```

可用别名：`@/components`、`@/views`、`@/utils`、`@/api` 等

## 🛠️ 技术栈

- **Vue 3** - 渐进式框架
- **TypeScript** - 静态类型检查
- **Vite** - 快速构建工具
- **Ant Design Vue** - UI 组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理

## 🌍 环境变量

项目支持多个环境配置：

- `.env.example` - 示例文件
- `.env.development` - 开发环境
- `.env.production` - 生产环境

在代码中使用（必须以 `VITE_` 前缀）：

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## 🔧 常见问题

### 模块找不到

```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 开发服务器无法访问

检查 5173 端口是否被占用，在 `vite.config.ts` 中修改端口

### pnpm 命令未找到

```bash
npm install -g pnpm
pnpm --version
```

## 📄 许可证

[MIT](../LICENSE) © 2024
