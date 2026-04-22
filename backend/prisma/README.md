# Prisma 数据库操作指南

本项目使用 **Prisma ORM + MySQL**，所有数据库结构定义在 `schema.prisma`，下面记录常用操作。

根目录另有 **`prisma.config.ts`**：供 Prisma CLI 7 风格配置（`schema` 路径、`migrations` 路径、`datasource.url`）。执行 `migrate` / `generate` 时会读取；若提示未加载环境变量，请确保在 **`backend` 目录**下执行命令，且已配置 `backend/.env` 中的 `DATABASE_URL`。

---

## 目录结构

```
prisma/
├── schema.prisma        # 数据模型定义（核心文件）
├── seed.ts              # 初始化种子数据
├── migrations/          # 自动生成的迁移 SQL 历史
│   ├── 20260309105820_init/                                    # 首版：users / rooms / messages / votes / agents
│   ├── 20260309110240_update_user/                             # users：username → name
│   └── 20260414162946_add_notifications_message_likes_message_threading/  # 通知、评论点赞、消息楼中楼等
└── README.md            # 本文件
```

### 各迁移大致内容（便于对照）

| 迁移目录                                                           | 主要内容                                                                                                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260309105820_init`                                              | 基础表与外键                                                                                                                                                            |
| `20260309110240_update_user`                                       | `users` 字段调整（`name`）                                                                                                                                              |
| `20260414162946_add_notifications_message_likes_message_threading` | 创建 **`notifications`**、**`message_likes`**；`messages` 增加 `parentId` / `reasoning` / `roundNumber` 及自引用外键；`rooms.image` / `users.avatar` 与 LongText 对齐等 |

---

## 重要：只改 `schema.prisma` 不等于数据库已更新

若 **只编辑了 `schema.prisma` 却没有执行 `migrate dev`（或生产环境未执行 `migrate deploy`）**，真实 MySQL 里会缺少对应表或字段。此时 Prisma 查询会抛错，后端若未单独捕获这类异常，接口会表现为 **HTTP 500**。

**典型情况（已踩坑）**：`Notification` 等模型已在 `schema.prisma` 中定义，但早期迁移未建 `notifications` 表时，访问「未读通知数」等接口会一直 **500**，直到补上迁移并应用到数据库。

**正确做法**：每次改完 `schema.prisma` 后，在本地执行 `migrate dev` 生成并应用迁移；其它环境执行 `migrate deploy`。

---

## 标准流程：改表/加字段

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

# 生成迁移 SQL 并自动应用到数据库（推荐，有迁移历史记录）
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

之后在代码里就能用 `this.prisma.message.create({ data: { parentId: 1 } })` 等新字段了。

---

## 特殊情况：迁移已漂移（Migration Drift）

当数据库状态和迁移历史不一致时（比如手动执行了 SQL），`migrate dev` 会报 drift 错误。

**解决方案：**

```bash
# 方法 1：标记当前数据库状态为"基准"，跳过冲突
npx prisma migrate dev --create-only   # 只生成 SQL，不执行
# 然后手动确认 SQL 后执行：
npx prisma migrate deploy

# 方法 2（本项目实际用过）：直接用 mysql 命令执行 ALTER TABLE，再只 generate client
mysql -u 用户名 -p数据库密码 数据库名 -e "ALTER TABLE messages ADD COLUMN parentId INT UNSIGNED NULL, ADD INDEX idx_parentId (parentId);"
npx prisma generate
```

> ⚠️ 方法 2 不会产生迁移记录，不推荐长期使用，只适合开发调试阶段快速绕过问题。

---

## 创建全新的表

下面以 `MessageLike` 为例（**项目中该表已由迁移 `20260414162946_add_notifications_message_likes_message_threading` 创建**；此处仅作「新增 model 时怎么写」的模板）。

### schema.prisma 中添加新 model

```prisma
model MessageLike {
  id        Int  @id @default(autoincrement()) @db.UnsignedInt
  userId    Int  @db.UnsignedInt
  messageId Int  @db.UnsignedInt

  @@unique([userId, messageId])   // 防止重复点赞
  @@map("message_likes")          // 指定数据库表名
  @@index([messageId])
}
```

然后执行：

```bash
npx prisma migrate dev --name create_message_likes
```

---

## 其他常用命令

| 命令                         | 作用                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `npx prisma studio`          | 打开可视化数据库管理界面（浏览器）                            |
| `npx prisma db pull`         | 从现有数据库反向生成 schema（适合接手已有数据库）             |
| `npx prisma db push`         | 直接推送 schema 到数据库，**不生成迁移记录**（适合原型开发）  |
| `npx prisma migrate deploy`  | 在生产环境执行未执行的迁移                                    |
| `npx prisma migrate reset`   | ⚠️ 重置数据库（删除所有数据）并重新执行所有迁移，仅开发环境用 |
| `npx prisma generate`        | 重新生成 TypeScript 类型，不改数据库                          |
| `npx ts-node prisma/seed.ts` | 执行种子数据脚本                                              |

---

## 常见问题

- **`npx prisma generate` 报 EPERM（无法重命名 `query_engine-*.dll.node`）**  
  常见于 Windows：杀毒软件锁定、或其它终端/进程仍占用 Prisma 引擎。可先关闭正在跑的后端、IDE 外多余终端，再执行；仍失败可重启后再 `generate`。

---

## 关于 `as any` 的说明

本项目部分地方用了 `(this.prisma.message as any).findMany(...)` 这种写法，原因是：

- 在 Prisma Client 没有及时重新生成时，新增字段（如 `parentId`、`replies`）的 TypeScript 类型还不存在
- 正确做法是执行 `npx prisma generate` 后等 IDE 重新加载类型，就可以去掉 `as any`
- 后续有时间可以把这些 `as any` 清理掉，改为正确类型
