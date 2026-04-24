# 📦 Monorepo 项目模板

> 基于 Vue 3 + NestJS + TypeScript + pnpm 的现代化 Monorepo 项目模板

[![Vue](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.x-ff0066.svg)](https://pnpm.io/)

## 📋 快速导航

- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [可用命令](#-可用命令)
- [项目结构](#-项目结构)
- [文档](#-文档)

## 🖥️ 环境要求

| 软件        | 版本 | 说明                      |
| ----------- | ---- | ------------------------- |
| **Node.js** | 18+  | 推荐 20.x 或 22.x LTS     |
| **pnpm**    | 8+   | Monorepo 包管理器（必需） |
| **MySQL**   | 8.0+ | 后端数据库（可选）        |

## 🚀 快速开始

### 1. 安装 pnpm

```bash
npm install -g pnpm
```

### 2. 克隆项目

```bash
git clone <项目地址>
cd graduate-design
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 启动后端

```bash
cd backend
pnpm run start:dev
```

后端运行在 `http://localhost:3000/api/v1`

### 5. 启动前端

新开一个终端：

```bash
cd frontend-react
pnpm dev
```

前端运行在 `http://localhost:5173`

## 📝 可用命令

### 前端（在 `frontend-react/` 目录下执行）

```bash
pnpm dev            # 开发模式
pnpm build          # 生产构建
pnpm preview        # 预览构建结果
```

### 后端（在 `backend/` 目录下执行）

```bash
pnpm run start:dev  # 开发模式（热重载）
pnpm build          # 生产构建
pnpm lint           # 代码检查
pnpm format         # 代码格式化
```

### 数据库（后端）

```bash
cd backend
pnpm prisma migrate deploy  # 应用迁移
pnpm prisma:generate       # 生成 Prisma Client
pnpm prisma:studio         # 数据库可视化工具
```

### 代码规范

```bash
pnpm lint               # 检查代码
pnpm lint --fix         # 自动修复
pnpm format             # 格式化代码
```

## 📁 项目结构

```
graduate-design/
├── frontend-react/           # React 18 前端项目（当前使用）
│   ├── src/
│   │   ├── components/       # 组件
│   │   ├── pages/            # 页面
│   │   ├── utils/            # 工具
│   │   └── ...
│   └── README.md            # 前端文档
│
├── backend/                  # NestJS 后端项目
│   ├── src/
│   │   ├── modules/         # 业务模块
│   │   ├── common/          # 公共模块
│   │   └── main.ts          # 入口
│   ├── prisma/              # 数据库配置
│   └── README.md            # 后端文档
│
├── package.json             # Monorepo 配置
└── pnpm-workspace.yaml      # 工作区定义
```

## 📚 技术栈

**前端**：React 18 + TypeScript + Vite + Ant Design + React Router（位于 `frontend-react/`）

**后端**：NestJS 11 + TypeScript + Prisma ORM + MySQL + Swagger

**工程化**：pnpm + ESLint + Prettier + Husky + Commitlint

## 📖 文档

- [前端项目 README](./frontend/README.md) - 前端详细说明
- [后端项目 README](./backend/README.md) - 后端详细说明
- [Husky & Lint-staged 指南](./HUSKY_LINT_STAGED_GUIDE.md) - 提交规范

## 📄 许可证

[MIT](./LICENSE) © 2024
