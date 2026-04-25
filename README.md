# 📦 Monorepo 项目模板

> 基于 Vue 3 + NestJS + TypeScript + pnpm 的现代化 Monorepo 项目模板

[![Vue](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.x-ff0066.svg)](https://pnpm.io/)

## 📋 快速导航

- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [RAG 微服务](#-rag-微服务-opinion-service)
- [可用命令](#-可用命令)
- [项目结构](#-项目结构)
- [文档](#-文档)

## 🖥️ 环境要求

| 软件        | 版本  | 说明                          |
| ----------- | ----- | ----------------------------- |
| **Node.js** | 18+   | 推荐 20.x 或 22.x LTS         |
| **pnpm**    | 8+    | Monorepo 包管理器（必需）     |
| **MySQL**   | 8.0+  | 后端数据库                    |
| **Python**  | 3.10+ | RAG 微服务（opinion-service） |
| **Ollama**  | 最新  | 本地嵌入模型运行时            |

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

## 🤖 RAG 微服务（opinion-service）

本地 RAG 服务，实现辩论室弹幕过滤（第三层）和 AI 共情师情绪记忆（第四层）。  
技术栈：FastAPI + ChromaDB + Ollama（全部开源免费，无需 API Key）。

### 前置条件

1. **安装 Ollama**：前往 [ollama.com](https://ollama.com) 下载并安装

2. **拉取嵌入模型**（约 274MB，只需执行一次）：
   ```bash
   ollama pull nomic-embed-text
   ```

### 启动步骤

```bash
# 进入微服务目录
cd opinion-service

# 创建并激活 Python 虚拟环境（推荐）
python3 -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate       # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务（端口 8001）
uvicorn main:app --reload --port 8001
```

启动时会自动：

- 预热 Ollama 嵌入模型（消除第一次请求的冷启动延迟）
- 将 `knowledge/` 目录下的示例写入 ChromaDB

服务运行在 `http://localhost:8001`，可访问 `http://localhost:8001/docs` 查看接口文档。

### 环境变量

在 `backend/.env` 中添加（可选，默认值已内置）：

```env
RAG_SERVICE_URL=http://localhost:8001   # RAG 微服务地址
COZE_SUMMARY_BOT_ID=                   # 用于生成会话摘要的 Coze Bot ID（不填则复用 COZE_BOT_ID）
```

### 注意事项

- ChromaDB 数据持久化在 `opinion-service/chroma_data/` 目录，不要删除
- RAG 服务不可用时，NestJS 会自动降级（弹幕视为有效/中立，共情师跳过历史记忆注入）
- 首次启动 Ollama 嵌入较慢（约 2-5 秒），后续请求约 200-800ms

---

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
├── frontend-react/           # React 18 前端项目
│   ├── src/
│   │   ├── components/       # 组件
│   │   ├── pages/            # 页面
│   │   ├── utils/            # 工具
│   │   └── ...
│   └── README.md
│
├── backend/                  # NestJS 后端项目
│   ├── src/
│   │   ├── modules/         # 业务模块
│   │   │   ├── rag/         # RAG 服务封装（HTTP 调用 opinion-service）
│   │   │   ├── counseling/  # AI 共情师（接入第四层 RAG）
│   │   │   └── ...
│   │   ├── common/          # 公共模块
│   │   └── main.ts
│   ├── prisma/              # 数据库配置
│   └── README.md
│
├── opinion-service/          # Python RAG 微服务（FastAPI + ChromaDB + Ollama）
│   ├── main.py              # FastAPI 入口（端口 8001）
│   ├── embedder.py          # Ollama 嵌入（两层共用）
│   ├── relevance_checker.py # 第三层：弹幕相关性检测
│   ├── stance_detector.py   # 第三层：立场识别
│   ├── deduplicator.py      # 第三层：语义去重
│   ├── memory_store.py      # 第四层：用户情绪记忆存取
│   ├── chroma_store.py      # ChromaDB 读写
│   ├── knowledge_loader.py  # 启动时加载知识库
│   ├── knowledge/           # 预构建知识库示例文本
│   ├── chroma_data/         # ChromaDB 持久化数据（自动生成，勿删）
│   └── requirements.txt
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
