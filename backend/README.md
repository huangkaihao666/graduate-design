# 🚀 后端 API 服务

> 基于 NestJS + TypeScript 的现代化 REST API 服务

## 📋 目录

- [项目介绍](#-项目介绍)
- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [常用命令](#-常用命令)
- [API 文档](#-api-文档)
- [常见问题](#-常见问题)
- [项目结构](#-项目结构)
- [代码规范](#-代码规范)

## 📖 项目介绍

这是一个使用 **NestJS 11** + **TypeScript** 构建的现代化 REST API 后端服务。

**主要特性**：

- ✅ 全局异常处理
- ✅ 统一响应转换
- ✅ 数据验证和转换
- ✅ CORS 跨域支持
- ✅ MySQL 数据库集成（Prisma ORM）
- ✅ Swagger API 文档自动生成
- ✅ 模块化架构设计

## 🖥️ 环境要求

| 软件        | 最低版本 | 说明                      |
| ----------- | -------- | ------------------------- |
| **Node.js** | 18.0     | 推荐 20.x LTS 或 22.x LTS |
| **pnpm**    | 8.0      | Monorepo 包管理工具       |
| **MySQL**   | 8.0      | 数据库服务                |

## 🚀 快速开始

### 新手必读（5 分钟启动项目）

第一次拉取项目，按这些步骤操作即可：

```bash
# 1️⃣ 克隆项目
git clone <项目地址>
cd graduate-design

# 2️⃣ 安装依赖
pnpm install

# 3️⃣ 进入后端目录
cd backend

# 4️⃣ 配置数据库（见下面详细说明）
# 需要本地 MySQL 已启动且配置好用户

# 5️⃣ 应用数据库迁移
pnpm prisma migrate deploy

# 6️⃣ 启动项目
pnpm start:dev
```

✅ 完成后访问：`http://localhost:3000/api/v1/health`

---

### 详细配置指南

#### 第 1 步：启动 MySQL

**方案 A：使用 Docker（推荐）**

```bash
docker run --name mysql-grad -e MYSQL_ROOT_PASSWORD=root123 -p 3306:3306 -d mysql:8.0
```

**方案 B：本地安装**

- 下载安装：https://dev.mysql.com/downloads/mysql/
- 启动 MySQL 服务

#### 第 2 步：创建数据库和用户

```bash
# 连接 MySQL
mysql -u root -p
# 输入 root 密码

# 在 MySQL 命令行执行：
CREATE DATABASE IF NOT EXISTS `graduate-design`;
CREATE USER 'your_username'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON `graduate-design`.* TO 'your_username'@'localhost';
GRANT ALL PRIVILEGES ON *.* TO 'your_username'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

**记住创建的用户名和密码！**

#### 第 3 步：配置环境变量

项目已包含 `.env` 文件，默认配置为：

```
DATABASE_URL="mysql://huangkaihao:hkh618618@localhost:3306/graduate-design"
```

如果使用了不同的用户名和密码，编辑 `.env`：

```
DATABASE_URL="mysql://your_username:your_password@localhost:3306/graduate-design"
```

#### 第 4 步：应用数据库迁移

```bash
cd backend
pnpm prisma migrate deploy
```

#### 第 5 步：启动服务

```bash
pnpm start:dev
```

✅ 看到 `NestApplication successfully started` 表示启动成功！

#### 第 6 步：验证服务

打开浏览器访问：

```
http://localhost:3000/api/v1/health
```

或用命令：

```bash
curl http://localhost:3000/api/v1/health
```

#### 第 7 步：查看 API 文档（可选）

```
http://localhost:3000/api/docs
```

---

## 📝 常用命令

### 开发

```bash
# 启动开发服务器（热重载）
pnpm start:dev

# 构建项目
pnpm build

# 生产模式启动
pnpm start
```

### 代码质量

```bash
# ESLint 检查
pnpm lint

# 自动修复
pnpm lint --fix

# 代码格式化
pnpm format
```

### 数据库

```bash
# 应用迁移
pnpm prisma migrate deploy

# 创建新迁移
pnpm prisma migrate dev

# 生成 Prisma Client
pnpm prisma:generate

# 可视化管理数据
pnpm prisma:studio
```

## 📚 API 文档

启动项目后，访问 Swagger UI 查看所有 API：

```
http://localhost:3000/api/docs
```

**主要端点**：

- `GET /api/v1/health` - 健康检查
- `GET /api/v1/users` - 获取所有用户
- `POST /api/v1/users` - 创建用户
- `GET /api/v1/users/:id` - 获取特定用户
- `PUT /api/v1/users/:id` - 更新用户
- `DELETE /api/v1/users/:id` - 删除用户

---

## 💾 数据库表说明

### 1. 虚拍历史表 (`virtual_try_on_histories`)

**用途**：存储 AI 虚拍功能的请求和结果数据

| 字段                 | 类型             | 说明                                                                       |
| -------------------- | ---------------- | -------------------------------------------------------------------------- |
| `id`                 | INTEGER UNSIGNED | 主键，自增                                                                 |
| `imageUrl`           | LONGTEXT         | 用户上传的原始图片 URL                                                     |
| `style`              | VARCHAR(50)      | 拍摄风格（romantic, artistic, bohemian, minimalist, classical, adventure） |
| `preferences`        | JSON             | 用户偏好设置（妆容、发型、服饰等）                                         |
| `modifiedImageUrl`   | LONGTEXT         | AI 生成的修改后图片 URL                                                    |
| `virtualAdvice`      | TEXT             | 虚拍建议                                                                   |
| `makeupAdvice`       | TEXT             | 妆容建议                                                                   |
| `hairstyleAdvice`    | TEXT             | 发型建议                                                                   |
| `dressAdvice`        | TEXT             | 服饰建议                                                                   |
| `shootingTips`       | JSON             | 拍摄技巧数组                                                               |
| `previewDescription` | TEXT             | 预览描述                                                                   |
| `userId`             | INTEGER UNSIGNED | 关联用户 ID（可选）                                                        |
| `status`             | VARCHAR(50)      | 处理状态（success/failed），默认 success                                   |
| `errorMessage`       | TEXT             | 错误信息（失败时记录）                                                     |
| `createdAt`          | DATETIME(3)      | 创建时间                                                                   |
| `updatedAt`          | DATETIME(3)      | 更新时间                                                                   |

**索引**：`userId`, `style`, `createdAt`

**API 端点**：

- `POST /api/v1/ai/virtual-try-on` - 生成虚拍

---

### 2. 风格推荐历史表 (`style_recommendation_histories`)

**用途**：存储 AI 风格推荐功能的请求和结果数据

| 字段                 | 类型             | 说明                                                            |
| -------------------- | ---------------- | --------------------------------------------------------------- |
| `id`                 | INTEGER UNSIGNED | 主键，自增                                                      |
| `preferences`        | TEXT             | 用户偏好描述                                                    |
| `budget`             | INTEGER UNSIGNED | 预算范围（元）                                                  |
| `occasions`          | JSON             | 适合场景数组（如：室内、户外、海滩等）                          |
| `recommendedStyles`  | JSON             | 推荐风格数组，包含：name, description, season, budget, topSpots |
| `personalizedAdvice` | TEXT             | 个性化建议                                                      |
| `userId`             | INTEGER UNSIGNED | 关联用户 ID（可选）                                             |
| `status`             | VARCHAR(50)      | 处理状态（success/failed），默认 success                        |
| `errorMessage`       | TEXT             | 错误信息（失败时记录）                                          |
| `createdAt`          | DATETIME(3)      | 创建时间                                                        |
| `updatedAt`          | DATETIME(3)      | 更新时间                                                        |

**索引**：`userId`, `createdAt`

**API 端点**：

- `POST /api/v1/ai/style-recommendation` - 生成风格推荐

**推荐风格结构示例**：

```json
{
  "name": "浪漫梦幻",
  "description": "强调柔和光线和优雅气质...",
  "season": "全年适宜，春季和秋季最佳",
  "budget": "¥8000-¥15000",
  "topSpots": ["城市夜景街道", "复古建筑", "花卉婚礼场景", ...]
}
```

---

### 3. 行程规划历史表 (`itinerary_planning_histories`)

**用途**：存储 AI 行程规划功能的请求和结果数据

| 字段            | 类型             | 说明                                                            |
| --------------- | ---------------- | --------------------------------------------------------------- |
| `id`            | INTEGER UNSIGNED | 主键，自增                                                      |
| `destination`   | VARCHAR(255)     | 目的地                                                          |
| `duration`      | INTEGER UNSIGNED | 行程天数                                                        |
| `style`         | VARCHAR(50)      | 拍摄风格                                                        |
| `interests`     | JSON             | 兴趣爱好数组                                                    |
| `overview`      | TEXT             | 行程概述                                                        |
| `dailySchedule` | JSON             | 每日日程数组，包含：day, theme, schedule, spots, bestTime, tips |
| `packingList`   | JSON             | 打包清单数组                                                    |
| `localTips`     | TEXT             | 当地实用建议                                                    |
| `userId`        | INTEGER UNSIGNED | 关联用户 ID（可选）                                             |
| `status`        | VARCHAR(50)      | 处理状态（success/failed），默认 success                        |
| `errorMessage`  | TEXT             | 错误信息（失败时记录）                                          |
| `createdAt`     | DATETIME(3)      | 创建时间                                                        |
| `updatedAt`     | DATETIME(3)      | 更新时间                                                        |

**索引**：`userId`, `destination`, `createdAt`

**API 端点**：

- `POST /api/v1/ai/itinerary-planning` - 生成行程规划

**日程结构示例**：

```json
{
  "day": 1,
  "theme": "第1天 - 浪漫梦幻风格拍摄",
  "schedule": "上午拍摄自然光人像，中午休息调整妆容，下午拍摄风景及全身照...",
  "spots": ["景点A", "景点B", "特色建筑"],
  "bestTime": "06:00-08:00 (日出)",
  "tips": "充分利用自然光，避免中午强光..."
}
```

---

### 数据库关系图

```
User (用户表)
  ├── 1 ──→ ∞ VirtualTryOnHistory (虚拍历史)
  ├── 1 ──→ ∞ StyleRecommendationHistory (风格推荐历史)
  └── 1 ──→ ∞ ItineraryPlanningHistory (行程规划历史)
```

**关系说明**：

- 所有 AI 功能的历史记录都与用户关联（`userId` 外键）
- 删除用户时，对应的历史记录不会被删除，`userId` 会被设为 NULL
- 这样保留了数据分析的完整性

---

### 查询示例

**获取某用户的所有虚拍历史**：

```typescript
const histories = await prisma.virtualTryOnHistory.findMany({
  where: { userId: 1 },
  orderBy: { createdAt: 'desc' },
  take: 10, // 最新 10 条
});
```

**获取特定风格的推荐历史**：

```typescript
const recommendations = await prisma.styleRecommendationHistory.findMany({
  where: {
    status: 'success',
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近 7 天
    },
  },
});
```

**统计行程规划数据**：

```typescript
const stats = await prisma.itineraryPlanningHistory.groupBy({
  by: ['destination'],
  _count: { id: true },
});
```

## 🔧 常见问题

### MySQL 连接失败

**错误**：`connect ECONNREFUSED 127.0.0.1:3306`

**解决**：

1. 确保 MySQL 服务已启动
2. 检查 `.env` 中的 `DATABASE_URL` 是否正确
3. 验证用户名和密码

### Prisma Client 未生成

**错误**：`Cannot find module '@prisma/client'`

**解决**：

```bash
cd backend
pnpm prisma:generate
```

### 数据库权限不足

**错误**：`Error P1013` 或 `Error P1010`

**解决**：

```bash
mysql -u root -p
GRANT ALL PRIVILEGES ON *.* TO 'your_username'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### NestJS 依赖未安装

**错误**：`Cannot find module 'nest'`

**解决**：

```bash
cd backend
pnpm install
```

### CORS 错误

**错误**：`Access-Control-Allow-Origin`

**解决**：编辑 `.env`，更新 `CORS_ORIGIN` 为正确的前端地址。

---

## 📁 项目结构

```
backend/
├── src/
│   ├── common/              # 公共模块（过滤器、拦截器等）
│   ├── modules/             # 业务模块
│   │   ├── health/          # 健康检查
│   │   └── users/           # 用户管理（CRUD）
│   ├── prisma/              # Prisma 配置
│   ├── app.module.ts        # 根模块
│   └── main.ts              # 应用入口
├── prisma/                  # 数据库迁移和模型定义
├── package.json
├── .env                     # 环境变量
└── README.md                # 本文件
```

## 📦 已集成功能

- ✅ **Prisma ORM + MySQL** - 数据库管理
- ✅ **Swagger** - API 文档自动生成
- ✅ **全局异常处理** - 统一错误响应
- ✅ **数据验证** - 请求数据自动校验
- ✅ **CORS** - 跨域资源共享
- ✅ **AI 模块** - 集成 DeepSeek 和火山引擎 API（虚拍、风格推荐、行程规划）
- ✅ **AI 历史记录** - 自动保存 AI 功能的请求和结果数据到数据库

## 🎯 待集成功能

- [ ] **Passport + JWT 认证** - 用户认证和授权
- [ ] **Redis 缓存** - 高性能缓存

## 🤝 代码规范

提交代码前运行检查：

```bash
pnpm lint
pnpm format
```

## 📚 相关文档

- [NestJS 官方文档](https://docs.nestjs.com)
- [项目根目录 README](../README.md)

## 📄 许可证

[MIT](../LICENSE) © 2024
