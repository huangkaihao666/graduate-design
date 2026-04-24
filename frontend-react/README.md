# 前端项目

基于 **React 18 + TypeScript + Vite + Ant Design** 构建的前端应用。

## 快速开始

> ⚠️ 必须在 `frontend-react/` 目录下执行，不能在根目录用其他命令代替。

```bash
# 1. 先在仓库根目录安装依赖（只需执行一次）
cd graduate-design
pnpm install --registry=https://registry.npmjs.org

# 2. 进入前端目录
cd frontend-react

# 3. 启动开发服务器
pnpm dev
```

前端运行在 `http://localhost:5173`，确保后端（`http://localhost:3000`）已同时启动。

## 常用命令

| 命令           | 说明                     |
| -------------- | ------------------------ |
| `pnpm dev`     | 启动开发服务器（热重载） |
| `pnpm build`   | 生产构建，输出到 `dist/` |
| `pnpm preview` | 预览生产构建结果         |
| `pnpm lint`    | ESLint 代码检查          |

## 项目结构

```
frontend-react/
├── src/
│   ├── components/     # 公共组件
│   ├── pages/          # 页面（每个页面一个目录）
│   ├── hooks/          # 自定义 Hook
│   ├── services/       # API 请求封装
│   ├── stores/         # 状态管理
│   ├── utils/          # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
└── package.json
```

## 技术栈

- **React 18** + **TypeScript**
- **Vite** — 构建工具
- **Ant Design** — UI 组件库
- **React Router** — 路由
- **Axios** — HTTP 请求
- **Socket.IO Client** — WebSocket 通信

## 常见问题

**接口请求报 CORS 错误**

检查后端 `backend/.env` 中的 `CORS_ORIGIN` 是否包含 `http://localhost:5173`。

**页面空白 / 路由不跳转**

确认后端服务已启动，Token 未过期，可清除 localStorage 后重新登录。
