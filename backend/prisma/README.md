# Prisma 数据库操作指南

本项目使用 **Prisma ORM + MySQL**，所有数据库结构定义在 `schema.prisma`，下面记录常用操作。

根目录另有 **`prisma.config.ts`**：供 Prisma CLI 配置（`schema` 路径、`migrations` 路径、`datasource.url`）。执行 `migrate` / `generate` 时会读取；若提示未加载环境变量，请确保在 **`backend` 目录**下执行命令，且已配置 `backend/.env` 中的 `DATABASE_URL`。

---

## 目录结构

```
prisma/
├── schema.prisma        # 数据模型定义（核心文件）
├── seed.ts              # 基础种子数据（系统智能体 + 标签）
├── seed.demo.ts         # 演示数据（完整案件列表 + 演示账号）★ 协作者首次部署时运行
├── migrations/          # 自动生成的迁移 SQL 历史
│   └── 20260424000000_init/   # 全量初始化（2026-04-24 合并重建）
└── README.md            # 本文件
```

### 当前迁移说明

| 迁移目录              | 内容                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260424000000_init` | 全量建表，包含所有 19 张表：`users` / `rooms` / `messages` / `votes` / `message_likes` / `notifications` / `agents` / `knowledge_bases` / `knowledge_documents` / `user_opinions` / `counseling_sessions` / `counseling_messages` / `sentiment_records` / `tags` / `room_tags` / `user_relations` / `achievements` / `announcements` / `user_emotion_profiles` |

> 历史上曾有 4 个独立迁移文件，2026-04-24 重构时合并为单一 init，避免合作者首次部署时因迁移历史与数据库状态不一致而报错。

---

## 快速上手（首次拉代码）

```bash
# 1. 配置数据库连接（见 backend/.env 注释，Mac/Windows 配置不同）
# Mac：mysql://huangkaihao:密码@127.0.0.1:3306/graduate-design
# Win：mysql://root:密码@127.0.0.1:3307/graduate-design

# 2. 进入后端目录
cd backend

# 3. 应用迁移，建好所有表（不会删数据）
npx prisma migrate deploy

# 4. 生成 TypeScript 类型
npx prisma generate

# 5. 写入演示数据（案件、智能体、标签、演示账号）
npm run seed:demo
```

**演示账号：**

| 角色     | 邮箱               | 密码        |
| -------- | ------------------ | ----------- |
| 普通用户 | demo@debate.local  | demo123456  |
| 管理员   | admin@debate.local | admin123456 |

---

## 重要：只改 `schema.prisma` 不等于数据库已更新

若 **只编辑了 `schema.prisma` 却没有执行 `migrate dev`**，真实 MySQL 里会缺少对应表或字段。此时 Prisma 查询会抛错，后端接口表现为 **HTTP 500**。

**已踩坑**：`Notification` 等模型已在 `schema.prisma` 中定义，但早期迁移未建 `notifications` 表时，访问「未读通知数」等接口会一直 **500**，直到补上迁移并应用到数据库。

**正确做法**：每次改完 `schema.prisma` 后，本地执行 `migrate dev` 生成并应用迁移；其它环境执行 `migrate deploy`。

---

## 标准流程：改表 / 加字段

### 第一步：修改 `schema.prisma`

在对应的 `model` 里加字段或关系，例如给 `Message` 加 `parentId` 支持回复：

```prisma
model Message {
  // ... 原有字段 ...
  parentId  Int?      @db.UnsignedInt
  parent    Message?  @relation("MessageReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Message[] @relation("MessageReplies")

  @@index([parentId])
}
```

### 第二步：生成迁移文件并同步数据库

```bash
cd backend
npx prisma migrate dev --name 你的改动描述
# 例如：
npx prisma migrate dev --name add_message_parent_id
```

执行后会：

1. 在 `prisma/migrations/` 下生成一条新的迁移记录
2. 自动执行 SQL 同步到本地数据库
3. 自动重新生成 Prisma Client（TypeScript 类型）

### 第三步：确认 TypeScript 类型已更新

```bash
# 如果 migrate dev 没有自动触发，手动重新生成 client
npx prisma generate
```

---

## 特殊情况：迁移已漂移（Migration Drift）

当数据库状态和迁移历史不一致时（比如手动执行了 SQL，或数据库里已有部分表），`migrate dev` 会报 drift 错误。

**已踩坑（2026-04-24）**：重构时 `graduate-design` 库里已有旧表，旧迁移里有 `Duplicate column name` 错误，导致 `migrate deploy` 失败。解决方式：用 `migrate resolve --applied` 把已存在的迁移标记为已应用，跳过冲突，再执行 `migrate deploy` 只补新增部分。

```bash
# 把某条迁移标记为"已应用"（数据库里其实已有对应表，不需要再执行）
npx prisma migrate resolve --applied <迁移目录名>

# 然后继续应用剩余迁移
npx prisma migrate deploy
```

> ⚠️ 不到万不得已不要用 `migrate reset`，会清空所有数据。

---

## 特殊情况：误建了错误的数据库

**已踩坑（2026-04-24）**：`.env` 里数据库名写的是 `graduate_design`（下划线），实际库名是 `graduate-design`（连字符），Prisma 自动新建了一个空库。解决方式：修正 `.env` 里的数据库名，手动删掉误建的空库即可。

注意数据库名用**连字符**（`graduate-design`），不是下划线。

---

## 创建全新的表

以新增 `Tag` 为例：

### schema.prisma 中添加新 model

```prisma
model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique @db.VarChar(100)
  rooms RoomTag[]

  @@map("tags")
}
```

然后执行：

```bash
npx prisma migrate dev --name create_tags
```

---

## 其他常用命令

| 命令                         | 作用                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `npx prisma studio`          | 打开可视化数据库管理界面（浏览器）                            |
| `npx prisma migrate status`  | 查看当前迁移状态，确认是否有未应用的迁移                      |
| `npx prisma db pull`         | 从现有数据库反向生成 schema（适合接手已有数据库）             |
| `npx prisma db push`         | 直接推送 schema 到数据库，**不生成迁移记录**（适合原型开发）  |
| `npx prisma migrate deploy`  | 应用所有未执行的迁移（生产/协作环境用）                       |
| `npx prisma migrate reset`   | ⚠️ 重置数据库（删除所有数据）并重新执行所有迁移，仅开发环境用 |
| `npx prisma generate`        | 重新生成 TypeScript 类型，不改数据库                          |
| `npx ts-node prisma/seed.ts` | 执行种子数据脚本                                              |

---

## 常见问题

**`npx prisma generate` 报 EPERM（无法重命名 `query_engine-*.dll.node`）**

常见于 Windows：杀毒软件锁定、或其它终端/进程仍占用 Prisma 引擎。先关闭正在跑的后端和多余终端，再执行；仍失败可重启后再 `generate`。

**`migrate deploy` 报 `Duplicate column name`**

数据库里已有部分表，但迁移历史认为它们不存在。用 `migrate resolve --applied <迁移名>` 标记为已应用，跳过该迁移，再重新 `deploy`。详见上方「迁移已漂移」章节。

**`P1000: Authentication failed`**

数据库用户名或密码错误。Mac 上用户名是 `huangkaihao`，Windows 上是 `root`，注意区分，详见 `backend/.env` 注释。

---

## 关于 `as any` 的说明

本项目部分地方用了 `(this.prisma.message as any).findMany(...)` 这种写法，原因是：

- 在 Prisma Client 没有及时重新生成时，新增字段的 TypeScript 类型还不存在
- 正确做法是执行 `npx prisma generate` 后等 IDE 重新加载类型，就可以去掉 `as any`
- 后续有时间可以把这些 `as any` 清理掉，改为正确类型
