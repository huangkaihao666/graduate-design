---
name: graduate-design-guide
description: "React 18 frontend and NestJS backend development guide. Use when working on React frontend or NestJS backend projects."
---

# 毕业设计项目开发指南

Monorepo 毕业设计项目，包含 **React 18 前端**和 **NestJS 后端**两个子项目。

## 🏗️ 项目结构

- `frontend-react/`: React 18 前端 (端口 5174)
- `backend/`: NestJS 后端 (端口 3000)

## 📚 技术栈

**后端**: NestJS 11 + Prisma + MySQL + JWT + Swagger
**前端**: React 18 + Vite + Zustand + Axios + Ant Design 6 + Less

## 🔑 核心要求

✅ 必须使用 pnpm（淘宝镜像）
✅ React 前端: 只用 Less（.less），不用 .css
✅ 类型导入: 使用 import type
✅ API 基础 URL: http://localhost:3000/api/v1

## 开发命令

pnpm install
cd backend && npm run start:dev
cd frontend-react && pnpm dev

## 详细文档

见 STANDARDS.md 和 TROUBLESHOOTING.md
