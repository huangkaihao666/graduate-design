# 毕设项目重构实施指南

> 本文档是重构工作的主入口，按阶段拆解实施步骤。
> 背景、功能设计、技术方案详见 → [`毕设项目重构方案.md`](./毕设项目重构方案.md)
> 完整功能列表详见 → [`项目功能介绍.md`](./项目功能介绍.md)
> 各模块实现细节详见 → [`模块实现方案.md`](./模块实现方案.md)

---

## 当前状态（重构前）

**已有后端模块**：`auth` / `users` / `rooms` / `agents` / `notifications` / `admin` / `health`

**已有前端页面**：`home` / `create-case` / `debate-room` / `room-report` / `my-cases` / `agents` / `profile` / `me` / `admin` / `admin-login` / `settings`

**已有数据库表（7张）**：`User` / `Room` / `Message` / `Vote` / `MessageLike` / `Notification` / `Agent`

---

## 阶段总览

| 阶段        | 内容                                         | 预计工作量 |
| ----------- | -------------------------------------------- | ---------- |
| **Phase 0** | 数据库全量迁移                               | 1 天       |
| **Phase 1** | 基础功能扩展                                 | 4-5 天     |
| **Phase 2** | 核心新模块                                   | 8-10 天    |
| **Phase 3** | 社区与成长体系                               | 4-5 天     |
| **Phase 4** | 管理端扩展                                   | 2-3 天     |
| **Phase 5** | 本地 RAG 服务（FastAPI + ChromaDB + Ollama） | 3-4 天     |

---

## Phase 0：数据库全量迁移（必须最先做）

> 所有后续模块都依赖这一步，一次迁移到位，避免反复改 schema。

**涉及文件**：`backend/prisma/schema.prisma`

**需要做的事**：

1. 扩展现有表字段（详见[模块实现方案 - 模块0 步骤1](./docs/模块实现方案.md)）：
   - `User`：新增 `exp`、`level`、`achievements`
   - `Room`：新增 `sentimentType`、`likeCount`、`favoriteCount`
   - `Message`：新增 `sentiment`
   - `Agent`：新增 `creatorId`、`isSystem`、`isPublic`、`prompt`、`status`、`knowledgeBaseId`

2. 新增 11 张表（详见[模块实现方案 - 模块0 步骤2](./docs/模块实现方案.md)）：
   `KnowledgeBase` / `KnowledgeDocument` / `UserOpinion` /
   `CounselingSession` / `CounselingMessage` / `SentimentRecord` /
   `Tag` / `RoomTag` / `UserRelation` / `Achievement` /
   `Announcement` / `UserEmotionProfile`

3. 执行迁移：
   ```bash
   cd backend
   npx prisma migrate dev --name rebuild_phase0
   npx prisma generate
   ```

---

## Phase 1：基础功能扩展

> 在现有页面和模块上叠加新功能，不新建页面。

### 1-A 话题标签

- **后端**：新建 `src/modules/tags/`，接口详见[模块实现方案 - 模块1](./docs/模块实现方案.md)
- **前端**：
  - `create-case/CreateCase.tsx`：发布时选标签
  - `home/Home.tsx`：广场筛选栏加标签横向滚动
  - 案件卡片：展示标签 Chip

### 1-B 案件点赞与收藏

- **后端**：`rooms` 模块新增点赞/收藏接口，详见[模块实现方案 - 模块2](./docs/模块实现方案.md)
- **前端**：
  - 案件卡片底部加点赞按钮
  - 案件详情页加收藏按钮
  - `my-cases`：新增"我的收藏"Tab

### 1-C 辩论室用户观点参与

> 核心改造，详见[模块实现方案 - 模块3](./docs/模块实现方案.md)

- **后端**：改造 `debate.service.ts`，Round1 后开启 60 秒征集窗口，弹幕自动标记并异步送 RAG 微服务评估
- **前端**：`debate-room/DebateRoom.tsx` 监听新 WebSocket 事件，聊天区顶部显示轻提示条，无弹窗

### 1-D 情感分析

- **后端**：新建 `src/modules/sentiment/`，接口详见[模块实现方案 - 模块4](./docs/模块实现方案.md)
- **前端**：
  - 新建 `pages/sentiment/`（情绪雷达页）
  - 案件发布时异步调用情感分析，结果写入 `Room.sentimentType`
  - 案件卡片右上角展示情绪类型小标签

---

## Phase 2：核心新模块

### 2-A AI 共情师

> 详见[模块实现方案 - 模块5](./docs/模块实现方案.md)

- **Coze**：新建共情辅导师 Bot，挂载心理学知识库（CBT / 非暴力沟通 / 焦虑干预）
- **后端**：新建 `src/modules/counseling/`
  - 多会话管理、SSE 流式输出
  - System Prompt 动态拼接（情绪档案 + 历史 RAG 检索 + 案件上下文）
  - 会话结束后异步生成 summary + 更新情绪档案 + 向量化存 ChromaDB
- **前端**：新建 `pages/counseling/`
  - 两栏布局（左侧会话列表 / 右侧聊天区，类 ChatGPT）
  - 初次用户展示欢迎卡片 + 快速话题按钮
  - 结案报告页底部新增"💬 需要进一步倾诉？"入口

### 2-B 创建智能体

> 详见[模块实现方案 - 模块6](./docs/模块实现方案.md)

- **后端**：新建 `src/modules/custom-agents/`，对接 Coze 知识库管理 API
- **前端**：新建 `pages/create-agent/`
  - 填写名称、人设、System Prompt、擅长领域
  - 上传私有知识库文档（PDF/TXT）
  - 设为私有或申请公开（需管理员审核）
- **改造**：`agents/` 页面新增"用户创建"Tab；`create-case/` 智能体选择支持自建智能体

---

## Phase 3：社区与成长体系

### 3-A 关注动态

> 详见[模块实现方案 - 模块7](./docs/模块实现方案.md)

- **后端**：`users` 模块新增关注/取关/动态流接口
- **前端**：新建 `pages/feed/`，个人主页展示粉丝/关注数

### 3-B 成就中心

> 详见[模块实现方案 - 模块8](./docs/模块实现方案.md)

- **后端**：新建 `src/modules/achievements/`，各模块埋点触发成就检查
- **前端**：新建 `pages/achievements/`（等级进度条 + 徽章墙 + 排行榜）

### 3-C 消息通知独立页

- **后端**：现有 `notifications` 模块扩展通知类型枚举
- **前端**：新建 `pages/notifications/`

---

## Phase 4：管理端扩展

> 详见[模块实现方案 - 模块9](./docs/模块实现方案.md)

在现有 `admin/` 页面新增三个子页面：

| 子页面                   | 功能                           |
| ------------------------ | ------------------------------ |
| `AgentsAudit.tsx`        | 审核用户申请公开的自建智能体   |
| `TagsAdmin.tsx`          | 话题标签增删改，查看各标签热度 |
| `AnnouncementsAdmin.tsx` | 发布系统公告，推送给所有用户   |

数据统计页新增：话题热度饼图 / 平台情绪分布 / 辅导使用频次趋势。

---

## Phase 5：本地 RAG 服务（FastAPI + ChromaDB + Ollama）

> 详见[模块实现方案 - 模块3 RAG部分](./docs/模块实现方案.md)

这是四层 RAG 架构中的第三、四层，可以在 Phase 1-C 和 Phase 2-A 完成后再接入。

**新建目录**：`opinion-service/`（monorepo 根目录下）

```
opinion-service/
├── main.py              # FastAPI 入口
├── embedder.py          # Ollama 向量嵌入
├── relevance_checker.py # 弹幕相关性检测
├── stance_detector.py   # 立场识别
├── deduplicator.py      # 语义去重
├── chroma_store.py      # ChromaDB 读写
├── requirements.txt
└── knowledge/           # 预构建知识库
    ├── irrelevant.txt   # 灌水示例
    └── relevant.txt     # 有效观点示例
```

**依赖安装**：

```bash
pip install fastapi uvicorn chromadb ollama sentence-transformers
ollama pull nomic-embed-text   # 嵌入模型
```

**NestJS 接入**：在 `src/modules/opinion-filter/` 封装对 FastAPI 的 HTTP 调用。

---

## 前端开发约定

每次新建或修改前端页面，先执行：

```
/frontend-design
```

加载设计规范（`.claude/commands/frontend-design.md`），确保风格统一。

新页面统一放在 `frontend-react/src/pages/` 下，结构：

```
pages/new-page/
├── NewPage.tsx
├── NewPage.less
└── index.ts
```

---

## 快速启动（现有）

```bash
# 安装依赖
pnpm install

# 同时启动前后端
pnpm dev

# 单独启动
pnpm frontend:dev   # http://localhost:5173
pnpm backend:dev    # http://localhost:3000/api/v1

# 数据库
cd backend
npx prisma studio   # 可视化管理
npx prisma migrate dev --name <migration_name>
```

---

## 进度追踪

| 模块                                | 状态        | 备注                                       |
| ----------------------------------- | ----------- | ------------------------------------------ |
| Phase 0：数据库迁移                 | ✅ 已完成   |                                            |
| Phase 1-A：话题标签                 | ✅ 已完成   |                                            |
| Phase 1-B：点赞收藏                 | ✅ 已完成   |                                            |
| Phase 1-C：辩论室用户观点           | ✅ 已完成   |                                            |
| Phase 2-A：AI 共情师                | 🔶 部分完成 | 核心对话功能已上线，本地 RAG 记忆层待实现  |
| Phase 1-D：情感分析（情绪洞察中心） | ⬜ 待开始   | 调整后整合案件 + 共情师 + 手动测评三路数据 |
| Phase 2-B：创建智能体               | ⬜ 待开始   |                                            |
| Phase 3-A：关注动态                 | ⬜ 待开始   |                                            |
| Phase 3-B：成就中心                 | ⬜ 待开始   |                                            |
| Phase 3-C：通知独立页               | ⬜ 待开始   |                                            |
| Phase 4：管理端扩展                 | ⬜ 待开始   |                                            |
| Phase 5：本地 RAG 服务              | ⬜ 待开始   |                                            |

---

### Phase 2-A：AI 共情师 — 完成情况说明

#### ✅ 已完成

**后端**

- `src/modules/counseling/` 模块完整实现
- 会话 CRUD 接口（创建/列表/删除/关闭）
- SSE 流式消息接口（`POST /counseling/sessions/:id/messages`）
- 深度思考模型适配：区分 `reasoning_content`（思考阶段）和 `content`（正式回答），前端分别显示跳动动画和打字机效果
- 携带案件上下文：从结案报告跳转时自动注入案件标题 + 内容到 prompt
- 历史消息管理：每次对话携带最近 20 条历史，保持上下文连贯
- 会话标题自动生成（取第一条用户消息前 20 字）
- Coze Bot 接入：bot_id `7632299425355792393`

**前端**

- 两栏布局（左侧会话列表 / 右侧聊天区），类 ChatGPT 风格
- 欢迎卡片 + 6 个快速话题按钮（降低开口门槛）
- Markdown 渲染（加粗/列表/链接，过滤图片）
- 思考中跳动动画 → 正式回答打字机效果
- 从结案报告页携带 `roomId` 跳转，显示关联案件提示条
- 菜单栏新增「AI 共情师」入口（绿色心形图标）

#### ❌ 尚未实现（待后续完成）

##### 1. 冷启动：共情师主动开口

**问题**：新会话创建后页面空白，用户不知道说什么。

**方案**：`POST /counseling/sessions` 创建会话时，后端立即生成第一条 ASSISTANT 消息存入数据库：

- 有历史记录时：读取 `UserEmotionProfile`，生成关心语句，如"上次你聊到考研压力，最近怎么样了？"
- 第一次使用时：固定欢迎语"你好，今天有什么想聊的吗？无论什么都可以说说。"
- 携带案件上下文时：结合案件内容开场，如"我看到你刚经历了一场关于XXX的辩论，现在感觉怎么样？"

前端加载消息列表时直接看到共情师已开口，用户无需先说话。**此功能不依赖 Phase 5，可独立实现。**

---

##### 2. 本地 RAG 记忆层（第四层 RAG，依赖 Phase 5）

**背景**：用户聊了多次后会有大量历史摘要，不能全部塞进 prompt（token 爆炸且大部分不相关）。RAG 的作用是"精准翻日记"——每次发消息时，用这条消息作为 query，从 ChromaDB 检索最相关的 3-5 条历史摘要注入 prompt，其余历史不出现。

**触发时机**：**每次用户发消息时都检索一次**（不只是新会话开始），因为一次对话中话题会漂移，用最新的用户输入做 query 能保证注入的历史始终和当前说的这句话最相关。

**具体待实现的功能**：

| 功能                       | 说明                                                                                                                            | 实现位置                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 会话结束后生成摘要         | 调 Coze 将本次对话浓缩为一句话情绪小结（如"用户因考研焦虑，倾向被倾听"），写入 `CounselingSession.summary`                      | `counseling.service.ts` 的 `closeSession` 后异步触发   |
| 摘要向量化存储             | 将摘要文本向量化，存入用户专属 ChromaDB 集合 `user_{userId}_memories`                                                           | Phase 5 FastAPI 服务提供接口                           |
| 每条消息触发 RAG 检索      | `sendMessage` 时，以用户当前消息为 query，调 ChromaDB 检索最相关 3-5 条历史摘要，拼入 prompt，实现"上次你提到..."式的跨会话记忆 | `counseling.service.ts` 的 `buildSystemExtra` 方法扩展 |
| 降级过渡方案（Phase 5 前） | summary 数量少时（< 10 条），直接读最近 5 条 summary 拼入 prompt，无需向量检索；summary 积累多后切换为 RAG 检索，前端无感知     | `counseling.service.ts`                                |
| 情绪档案动态更新           | 会话结束后分析本次会话，更新 `UserEmotionProfile`（主导情绪/核心话题/应对偏好），供冷启动开场和 Phase 1-D 情绪洞察使用          | `counseling.service.ts` 异步任务                       |
| 自动归档超时会话           | 超 30 分钟无消息自动关闭并触发摘要生成 + 向量化                                                                                 | NestJS `@Cron` 定时任务                                |

**当前降级方案**：每次对话携带最近 20 条历史消息（单会话内上下文连贯），无跨会话记忆。Phase 5 完成后在 `sendMessage` 里补加 RAG 检索逻辑，无需改动前端。

---

### Phase 1-D 调整说明

原方案：独立情感测评工具（单次分析）

**调整后**：情绪洞察中心，聚合三路数据源：

| 数据源         | 字段                                   | 反映什么       | 何时有数据                     |
| -------------- | -------------------------------------- | -------------- | ------------------------------ |
| 用户发布的案件 | `Room.sentimentType`                   | 遇到了什么困境 | Phase 1-D 做完                 |
| 手动情感测评   | `SentimentRecord`                      | 当下的情绪状态 | Phase 1-D 做完                 |
| AI 共情师会话  | `CounselingSession.summary` + 情绪标签 | 深层情绪模式   | Phase 2-A RAG 层完成后自动接入 |

页面预留共情师数据位置，RAG 层完成后无需改页面，趋势图自动变丰富。
