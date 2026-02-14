---
name: graduate-design-guide-vue
description: "Development guide for Vue 3 frontend and NestJS backend in the graduate design Monorepo. Covers tech stack (Vue 3, NestJS, TypeScript, Pinia, Ant Design Vue), authentication flows, API contracts, environment setup, development commands, CORS configuration, and coding standards. Use when working on Vue 3 frontend or NestJS backend projects."
---

# 毕业设计项目开发指南（Vue 3 版本）

这是一个完整的 Monorepo 毕业设计项目，包含 **Vue 3 前端**和 **NestJS 后端**两个子项目。

## 🏗️ 项目结构

- `frontend/`: Vue 3 前端 (端口 5173)
- `backend/`: NestJS 后端 (端口 3000)

## 📚 技术栈

**共享**: TypeScript 5.x + pnpm 10.x + Node.js 18+ + MySQL 8.0+
**后端**: NestJS 11 + Prisma + MySQL + JWT + Swagger
**前端**: Vue 3 + Vite 7 + Pinia + Axios + Ant Design Vue

## 🔑 核心要求

✅ 必须使用 pnpm（淘宝镜像）
✅ 类型导入: 使用 `import type { ... }`
✅ API 基础 URL: `http://localhost:3000/api/v1`
✅ Vue 单文件组件: `.vue` 文件包含 template/script/style

## 🔐 认证系统

### API 响应格式

所有接口统一返回格式（由 TransformInterceptor 处理）:

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "user": { "id": 1, "username": "user", "email": "user@example.com" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 关键 API 端点

- POST `/auth/login`: 登录
- POST `/auth/register`: 注册
- GET `/auth/profile`: 获取用户信息
- POST `/auth/refresh`: 刷新 Token
- POST `/auth/logout`: 登出

## 📋 开发命令

```bash
pnpm install
cd backend && npm run start:dev
cd frontend && pnpm dev
pnpm build
pnpm -r lint
```

## 📁 Vue 前端目录规范

```
frontend/src/
├── api/        # API 接口
├── components/ # 通用组件
├── views/      # 页面组件
├── router/     # 路由配置
├── stores/     # Pinia 状态管理
├── hooks/      # 自定义 Hooks
├── types/      # TypeScript 类型
├── utils/      # 工具函数
└── assets/     # 静态资源
```

## 🔄 Vue 前端关键实现

**API 客户端** (src/api/):

- Axios 实例配置
- 请求拦截器：自动添加 Authorization 请求头
- 响应拦截器：处理 401 和 Token 刷新

**认证 Composable** (src/hooks/):

- useLogin(), useRegister(), useProfile()
- useLogout(), useRefreshToken()

**状态管理** (src/stores/):

- Pinia Store 管理认证状态
- 支持 localStorage 持久化
- setAuth(), logout(), clearAuth()

## 🎯 常见开发场景

**添加新页面**:

1. 在 `src/views/` 创建 .vue 文件
2. 在 `src/router/` 中定义路由
3. 使用 Pinia Store 管理页面状态

**添加新 API**:

1. 在 `src/api/` 创建文件
2. 使用 Axios 实例发起请求
3. 响应自动被拦截器处理

## 📖 详细文档

见 STANDARDS.md 和 TROUBLESHOOTING.md
