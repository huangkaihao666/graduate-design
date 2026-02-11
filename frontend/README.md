# 🚀 前端项目 - Vue 3 + TypeScript + Vite

> 基于 Vue 3 + TypeScript + Ant Design Vue + pnpm 的现代化前端项目模板

[![Vue](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-9946cc.svg)](https://vitejs.dev/)
[![Ant Design Vue](https://img.shields.io/badge/Ant%20Design%20Vue-4.2-1890ff.svg)](https://www.antdv.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10.29-ff0066.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 📋 目录

- [系统要求](#-系统要求)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [可用命令](#-可用命令)
- [开发指南](#-开发指南)
- [路径别名](#-路径别名)
- [常见问题](#-常见问题)

## 🖥️ 系统要求

### 必需环境

| 软件 | 版本要求 | 说明 |
|------|--------|------|
| **Node.js** | >= 18.0.0 | JavaScript 运行时环境 |
| **pnpm** | >= 8.0.0 | 高效的包管理器（**必须**，项目使用 pnpm 而非 npm/yarn） |
| **npm** | >= 10.0.0 | 用于全局安装 pnpm（如未安装） |

### 推荐版本（最优体验）

```bash
Node.js: 20.x LTS 或 22.x LTS
pnpm: 10.29.3 或更新版本
```

### 版本检查命令

```bash
# 检查 Node.js 版本
node --version

# 检查 pnpm 版本
pnpm --version
```

## 🚀 快速开始

### 1. 安装 pnpm（如未安装）

> **重要**：本项目使用 pnpm 作为包管理器，不支持 npm 或 yarn

```bash
# 使用 npm 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### 2. 克隆或复制项目

```bash
cd frontend
```

### 3. 安装依赖

```bash
pnpm install
```

> 首次安装可能需要 1-2 分钟，之后的安装会显著加快。如遇到问题，尝试：
> ```bash
> pnpm store prune  # 清理过期缓存
> pnpm install      # 重新安装
> ```

### 4. 启动开发服务器

```bash
pnpm dev
```

开发服务器将自动打开 `http://localhost:5173`

### 5. 构建生产版本

```bash
pnpm build
```

构建输出将生成在 `dist/` 目录

## 📁 项目结构

```
frontend/
├── src/
│   ├── App.vue                 # 根组件
│   ├── main.ts                 # 应用入口文件
│   ├── vite-env.d.ts          # Vite 环境变量类型声明
│   │
│   ├── components/             # 可复用组件目录
│   │   └── Button.vue         # 示例按钮组件
│   │
│   ├── views/                  # 页面组件目录（待扩展）
│   │
│   ├── hooks/                  # 自定义 Hook 目录
│   │   └── useWindowSize.ts   # 获取窗口尺寸 Hook
│   │
│   ├── utils/                  # 工具函数目录
│   │   └── index.ts           # 防抖、节流、深拷贝等工具函数
│   │
│   ├── types/                  # TypeScript 类型定义目录
│   │   └── index.ts           # 全局类型定义（API 响应、分页等）
│   │
│   ├── api/                    # API 接口目录（待扩展）
│   │
│   ├── router/                 # 路由配置目录（待扩展）
│   │
│   ├── store/                  # Pinia 状态管理目录（待扩展）
│   │
│   └── assets/                 # 静态资源
│       ├── images/             # 图片资源
│       └── styles/
│           └── global.css     # 全局样式
│
├── public/                     # 静态公共文件
├── index.html                  # HTML 入口文件
├── package.json                # 项目依赖配置
├── pnpm-lock.yaml             # 依赖版本锁定文件（必须提交）
├── .npmrc                       # pnpm 配置文件
│
├── 配置文件
│   ├── vite.config.ts          # Vite 构建工具配置
│   ├── tsconfig.json           # TypeScript 主配置文件
│   ├── tsconfig.app.json       # TypeScript 应用配置（含路径别名）
│   ├── tsconfig.node.json      # TypeScript Node 配置
│   ├── .editorconfig           # 编辑器统一配置
│   ├── .gitignore              # Git 忽略文件配置
│   └── .env.*                  # 环境变量配置
│
└── 文档
    ├── README.md               # 本文件
    └── PROJECT_STRUCTURE.txt   # 项目结构详细说明
```

## 🛠️ 技术栈

### 核心框架

- **Vue 3** (v3.5.x) - 渐进式 JavaScript 框架，使用 Composition API
- **TypeScript** (v5.6) - 静态类型检查语言，提升代码质量
- **Vite** (v5.4) - 下一代前端构建工具，开发体验优秀

### UI 组件库

- **Ant Design Vue** (v4.2.6) - 企业级 UI 设计系统
  - 包含 Button、Card、Table、Form、Modal 等丰富组件
  - 支持主题定制和国际化

### 包管理器

- **pnpm** (v10.29.3) - 快速、节省磁盘空间的包管理器
  - 相比 npm 速度快 2-3 倍
  - 磁盘占用减少 70% 以上

### 开发工具

- **@vitejs/plugin-vue** - Vite 的 Vue 3 支持
- **vue-tsc** - TypeScript 类型检查工具
- **terser** - 代码压缩工具

## 📝 可用命令

### 开发相关

```bash
# 启动开发服务器（自动打开浏览器）
pnpm dev

# 类型检查（不生成代码）
pnpm type-check

# 构建生产版本
pnpm build

# 预览构建后的生产版本
pnpm preview
```

### 代码规范（待配置）

```bash
# ESLint 检查和修复
pnpm lint

# Prettier 代码格式化
pnpm format
```

### 依赖管理

```bash
# 安装全部依赖
pnpm install

# 添加新依赖
pnpm add package-name

# 添加开发依赖
pnpm add -D package-name

# 删除依赖
pnpm remove package-name

# 更新依赖
pnpm update

# 查看已安装的依赖
pnpm list

# 清理过期缓存
pnpm store prune
```

## 🔗 路径别名

项目已配置路径别名，支持简化导入路径：

```typescript
// ❌ 不推荐：相对路径
import Button from '../../../components/Button.vue'

// ✅ 推荐：使用别名
import Button from '@/components/Button.vue'
```

### 可用别名

| 别名 | 路径 |
|-----|------|
| `@/` | `src/` |
| `@/api/*` | `src/api/*` |
| `@/components/*` | `src/components/*` |
| `@/hooks/*` | `src/hooks/*` |
| `@/router/*` | `src/router/*` |
| `@/store/*` | `src/store/*` |
| `@/views/*` | `src/views/*` |
| `@/utils/*` | `src/utils/*` |
| `@/types/*` | `src/types/*` |
| `@/assets/*` | `src/assets/*` |

## 🔧 开发指南

### 创建新组件

```vue
<!-- src/components/MyComponent.vue -->
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '默认标题',
  disabled: false,
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
// src/hooks/useFetch.ts
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
  message.success(`已点击 ${count.value} 次！`)
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

项目支持多个环境配置：

### 文件说明

- `.env.example` - 环境变量示例（参考用）
- `.env.development` - 开发环境变量（`pnpm dev` 使用）
- `.env.production` - 生产环境变量（`pnpm build` 使用）

### 创建本地环境变量

```bash
# 复制示例文件
cp .env.example .env.local

# 编辑本地环境变量（不会被 git 提交）
# 修改 .env.local 中的配置
```

### 在代码中使用

```typescript
// 访问环境变量
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const appName = import.meta.env.VITE_APP_NAME
```

> **注意**：环境变量名称必须以 `VITE_` 开头才能在浏览器中访问

## ⚠️ 常见问题

### Q1: 运行 `pnpm dev` 时报错 "模块找不到"

**解决方案**：
```bash
# 清理缓存并重新安装
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Q2: 构建时出现 "terser not found" 错误

**解决方案**：
```bash
# 确保已安装 terser
pnpm add -D terser

# 重新构建
pnpm build
```

### Q3: TypeScript 类型检查失败

**解决方案**：
```bash
# 运行类型检查查看详细错误
pnpm type-check

# 确保所有导入都有正确的类型
# 检查 tsconfig.app.json 的配置
```

### Q4: Node.js 版本不符合要求

**解决方案**：
```bash
# 使用 nvm 管理 Node.js 版本
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js 20 LTS
nvm install 20

# 切换到 Node.js 20
nvm use 20
```

### Q5: pnpm 命令未找到

**解决方案**：
```bash
# 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version

# 如果仍然未找到，检查 npm 全局路径
npm config get prefix
```

### Q6: 开发服务器无法访问

**解决方案**：
- 检查 5173 端口是否被占用
- 在 `vite.config.ts` 中修改端口号
- 确保防火墙未阻止该端口

```typescript
// vite.config.ts
server: {
  port: 5174,  // 改为其他端口
}
```

### Q7: 如何在项目中使用 npm 依赖？

**注意**：项目必须使用 pnpm！不支持 npm 或 yarn

```bash
# ✅ 正确做法
pnpm add axios

# ❌ 不推荐
npm install axios

# ❌ 不支持
yarn add axios
```

## 🔒 pnpm-lock.yaml

- 这是 pnpm 的依赖锁定文件，**必须** 提交到 git
- 确保团队成员使用完全相同的依赖版本
- 不要手动编辑此文件

```bash
# 不要删除或修改
git add pnpm-lock.yaml
git commit -m "docs: add pnpm-lock.yaml"
```

## 📊 项目体积

| 指标 | 大小 |
|-----|------|
| node_modules | ~500MB |
| dist (生产构建) | ~130KB (gzip) |
| 初始加载 JS | ~408KB |
| 初始加载 CSS | ~0.43KB |

## 🚀 下一步

- [ ] 配置 ESLint 和 Prettier
- [ ] 配置 Husky 和 Lint-staged
- [ ] 配置 Commitlint 规范提交信息
- [ ] 添加 Vue Router 路由
- [ ] 添加 Pinia 状态管理
- [ ] 添加 Axios 和 API 请求封装
- [ ] 定制 Ant Design Vue 主题
- [ ] 编写单元测试和集成测试

## 📄 许可证

[MIT](./LICENSE) © 2024

## 💬 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

**最后更新**: 2024-02-12

**维护者**: [Your Name]

**问题反馈**: [Issues](./issues)
