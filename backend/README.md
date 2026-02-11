# 🚀 后端 API 服务

> 基于 NestJS + TypeScript 的现代化 REST API 服务

## 📋 目录

- [项目介绍](#-项目介绍)
- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [可用命令](#-可用命令)
- [API 端点](#-api-端点)
- [配置说明](#-配置说明)
- [开发指南](#-开发指南)
- [集成指南](#-集成指南)

## 📖 项目介绍

这是一个使用 **NestJS 11** + **TypeScript** 构建的现代化 REST API 后端服务。项目包含以下特性：

- ✅ 全局异常处理（HttpExceptionFilter）
- ✅ 统一响应转换（TransformInterceptor）
- ✅ 数据验证和转换（ValidationPipe）
- ✅ CORS 跨域支持
- ✅ 健康检查端点
- ✅ 模块化架构设计
- ✅ TypeScript 类型安全

## 🖥️ 环境要求

| 软件           | 最低版本 | 推荐版本             | 说明                                                |
| -------------- | -------- | -------------------- | --------------------------------------------------- |
| **Node.js**    | 18.0     | 20.x LTS 或 22.x LTS | NestJS 11 运行时环境                                |
| **pnpm**       | 8.0      | 10.29.3 或更新       | Monorepo 包管理工具（必需，不支持 npm 和 yarn）     |
| **NestJS CLI** | 11.0     | 11.0 或更新          | NestJS 命令行工具（可选，用于快速生成模块和控制器） |
| **MySQL**      | 8.0      | 8.0 或 5.7           | 数据库服务（需单独安装或使用 Docker）               |
| **TypeScript** | 5.7      | 5.7 或更新           | 类型检查（包含在项目依赖中）                        |

## 🚀 快速开始

### 前置准备

#### 安装 NestJS CLI（可选但推荐）

```bash
# 全局安装 NestJS CLI（用于快速生成代码）
npm install -g @nestjs/cli

# 验证安装
nest --version
```

#### 启动 MySQL 数据库

**方案 1：使用 Docker（推荐）**

```bash
# 运行 MySQL 容器
docker run --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=project_db \
  -p 3306:3306 \
  -d mysql:8.0
```

**方案 2：本地安装 MySQL**

- 下载并安装 [MySQL 8.0](https://dev.mysql.com/downloads/mysql/)
- 启动 MySQL 服务
- 创建数据库：`CREATE DATABASE project_db;`

### 1. 安装依赖

从项目根目录运行：

```bash
pnpm install
```

或在后端目录运行：

```bash
cd backend
pnpm install
```

> **注意**：如果看到 peer dependency 警告可以忽略，不影响项目运行。

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改数据库连接配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，确保数据库 URL 正确：

```bash
# .env 文件示例
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# MySQL 数据库连接（使用 Prisma）
DATABASE_URL="mysql://root:password@localhost:3306/project_db"
```

> **重要**：确保 MySQL 服务已启动，且数据库存在。

### 3. 初始化数据库（Prisma 迁移）

首次运行时需要应用数据库迁移：

```bash
# 进入后端目录
cd backend

# 生成 Prisma Client（如果还未生成）
pnpm prisma:generate

# 创建并应用数据库迁移
pnpm prisma:migrate
```

系统会提示输入迁移名称，例如 `init`。完成后，数据库表会自动创建。

### 4. 启动开发服务器

```bash
# 从根目录
pnpm backend:dev

# 或从后端目录
cd backend
pnpm start:dev
```

预期输出：

```
[Nest] 12345  - 02/12/2024, 3:00:00 PM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 02/12/2024, 3:00:01 PM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 02/12/2024, 3:00:01 PM     LOG [RoutesResolver] AppController {/api/v1}:
[Nest] 12345  - 02/12/2024, 3:00:01 PM     LOG [RouterExplorer] Mapped {/, GET} route
[Nest] 12345  - 02/12/2024, 3:00:01 PM     LOG [NestApplication] Nest application successfully started
```

服务器会在 `http://localhost:3000/api/v1` 启动。

### 5. 验证服务

#### 5.1 健康检查

```bash
curl http://localhost:3000/api/v1/health
```

预期响应：

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "status": "ok",
    "timestamp": "2024-02-12T02:30:00.000Z"
  }
}
```

#### 5.2 测试用户 API

创建用户：

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com",
    "password": "password123"
  }'
```

查看所有用户：

```bash
curl http://localhost:3000/api/v1/users
```

### 🔧 常见问题排查

#### 问题 1：Cannot find module '@prisma/client'

**原因**：Prisma Client 未生成

**解决方案**：

```bash
cd backend
pnpm prisma:generate
```

#### 问题 2：connect ECONNREFUSED 127.0.0.1:3306

**原因**：MySQL 数据库未启动或连接配置错误

**解决方案**：

1. 检查 `.env` 中的 `DATABASE_URL` 是否正确
2. 确保 MySQL 服务已启动
3. 验证数据库用户名和密码是否正确
4. 如使用 Docker，检查容器是否运行：`docker ps`

#### 问题 3：Cannot find module 'nest'

**原因**：NestJS 依赖未正确安装

**解决方案**：

```bash
cd backend
pnpm install
pnpm run build
```

#### 问题 4：CORS 错误 - Access-Control-Allow-Origin

**原因**：前端请求源未配置在 CORS_ORIGIN

**解决方案**：
编辑 `.env`，更新 `CORS_ORIGIN` 为正确的前端地址：

```bash
CORS_ORIGIN=http://localhost:5173
```

#### 问题 5：构建时出现 TypeScript 错误

**原因**：TypeScript 类型检查失败

**解决方案**：

```bash
# 运行类型检查
pnpm type-check

# 运行 ESLint 检查
pnpm lint

# 尝试自动修复
pnpm lint --fix
```

## 📁 项目结构

```
backend/
├── src/
│   ├── common/                    # 公共模块
│   │   ├── decorators/            # 自定义装饰器
│   │   ├── filters/               # HTTP 异常过滤器
│   │   ├── interceptors/          # 响应转换拦截器
│   │   └── pipes/                 # 数据验证管道
│   ├── modules/                   # 业务模块
│   │   └── health/                # 健康检查模块
│   ├── config/                    # 配置文件
│   ├── types/                     # TypeScript 类型定义
│   ├── utils/                     # 工具函数
│   ├── app.controller.ts          # 根控制器
│   ├── app.module.ts              # 根模块
│   ├── app.service.ts             # 根服务
│   └── main.ts                    # 应用入口
├── test/                          # 测试文件
├── dist/                          # 编译输出
├── package.json                   # 项目依赖
├── tsconfig.json                  # TypeScript 配置
├── eslint.config.mjs              # ESLint 配置
├── .env                           # 环境变量（本地）
├── .env.example                   # 环境变量示例
└── README.md                      # 本文件
```

## 📝 可用命令

### 开发相关

```bash
# 启动开发服务器（热重载）
pnpm start:dev

# 启动生产模式
pnpm start

# 构建项目
pnpm build

# 调试模式启动
pnpm start:debug
```

### 代码质量

```bash
# ESLint 代码检查
pnpm lint

# ESLint 自动修复
pnpm lint --fix

# 代码格式化
pnpm format

# 检查格式（不修改）
pnpm format:check
```

### 测试相关

```bash
# 单元测试
pnpm test

# 监听模式测试
pnpm test:watch

# 测试覆盖率
pnpm test:cov

# 端对端测试
pnpm test:e2e

# 调试测试
pnpm test:debug
```

## 🔌 API 端点

### 根端点

```bash
GET /api/v1
```

返回 API 基本信息。

**响应示例**：

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "name": "Project API",
    "version": "1.0.0",
    "description": "RESTful API",
    "status": "running"
  }
}
```

### 健康检查

```bash
GET /api/v1/health
```

检查服务健康状态。

**响应示例**：

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "status": "ok",
    "timestamp": "2024-02-12T02:30:00.000Z"
  }
}
```

## ⚙️ 配置说明

### 环境变量 (.env)

```bash
# 服务器配置
PORT=3000                              # 服务监听端口
NODE_ENV=development                   # 运行环境 (development/production)

# CORS 配置
CORS_ORIGIN=http://localhost:5173      # 允许的跨域来源
```

### 全局配置

所有全局配置定义在 `src/config/index.ts`：

```typescript
export const appConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
```

## 🛠️ 开发指南

### 创建新模块

使用 NestJS CLI 快速创建模块：

```bash
# 进入后端目录
cd backend

# 创建模块（会自动创建控制器、服务等）
npx nest generate module modules/users
npx nest generate controller modules/users
npx nest generate service modules/users
```

生成的结构：

```
modules/
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── dto/
    │   ├── create-user.dto.ts
    │   └── update-user.dto.ts
    └── users.controller.spec.ts
```

### 创建 DTO (数据传输对象)

```typescript
// users/dto/create-user.dto.ts
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### 创建服务

```typescript
// users/users.service.ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  async create(createUserDto: CreateUserDto) {
    // 实现创建用户逻辑
    return {
      id: 1,
      ...createUserDto,
    };
  }

  async findAll() {
    // 实现查询所有用户逻辑
    return [];
  }
}
```

### 创建控制器

```typescript
// users/users.controller.ts
import { Controller, Post, Get, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

## 📦 集成指南

### 已集成的功能

#### ✅ Prisma ORM + MySQL 数据库

**项目已集成 Prisma ORM 用于数据库操作**

##### 数据库配置

更新 `.env` 文件：

```bash
# 数据库 URL 配置
# 格式: mysql://username:password@host:port/database
DATABASE_URL="mysql://root:password@localhost:3306/project_db"
```

##### 数据库模型定义

数据模型定义在 `prisma/schema.prisma`：

```prisma
// 用户模型
model User {
  id        Int     @id @default(autoincrement()) @db.UnsignedInt
  email     String  @unique @db.VarChar(255)
  name      String  @db.VarChar(100)
  password  String  @db.VarChar(255)
  isActive  Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]

  @@map("users")
  @@index([email])
}

// 文章模型
model Post {
  id        Int     @id @default(autoincrement()) @db.UnsignedInt
  title     String  @db.VarChar(255)
  content   String  @db.LongText
  published Boolean @default(false)

  authorId  Int     @db.UnsignedInt
  author    User    @relation(fields: [authorId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("posts")
  @@index([authorId])
}
```

##### 数据库迁移命令

```bash
# 创建新的迁移（基于 schema.prisma 变更）
pnpm prisma:migrate

# 生成 Prisma Client
pnpm prisma:generate

# 使用 Prisma Studio 可视化管理数据
pnpm prisma:studio

# 重置数据库（清空所有数据并重新迁移）
pnpm prisma:reset

# 生产环境迁移部署
pnpm prisma:migrate:prod
```

##### 在服务中使用 Prisma

```typescript
// 在模块中导入 PrismaModule
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}

// 在服务中注入 PrismaService
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
```

##### API 端点示例

Users 模块已实现基本 CRUD 操作：

```bash
# 获取所有用户
GET /api/v1/users

# 获取特定用户
GET /api/v1/users/:id

# 创建新用户
POST /api/v1/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}

# 更新用户
PUT /api/v1/users/:id
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}

# 删除用户
DELETE /api/v1/users/:id
```

### 待集成的功能

以下功能已在规划中，可按需集成：

#### Swagger API 文档

```bash
pnpm add @nestjs/swagger swagger-ui-express
```

#### Passport + JWT 认证

```bash
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt
pnpm add -D @types/passport-jwt
```

#### Redis 缓存

```bash
pnpm add redis @nestjs/cache-manager cache-manager
```

## 🤝 代码规范

本项目遵循以下规范：

- **代码检查**: ESLint（参考根目录配置）
- **代码格式化**: Prettier
- **提交规范**: Conventional Commits（参考 Husky & Lint-staged 指南）

提交前请确保通过所有检查：

```bash
pnpm lint
pnpm format
```

## 📚 相关文档

- [NestJS 官方文档](https://docs.nestjs.com)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [项目根目录 README](../README.md)
- [Husky & Lint-staged 使用指南](../HUSKY_LINT_STAGED_GUIDE.md)

## 📄 许可证

[MIT](../LICENSE) © 2024
