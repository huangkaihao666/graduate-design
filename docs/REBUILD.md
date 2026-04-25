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

| 模块                                | 状态        | 备注                                                                            |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| Phase 0：数据库迁移                 | ✅ 已完成   |                                                                                 |
| Phase 1-A：话题标签                 | ✅ 已完成   |                                                                                 |
| Phase 1-B：点赞收藏                 | ✅ 已完成   |                                                                                 |
| Phase 1-C：辩论室用户观点           | ✅ 已完成   |                                                                                 |
| Phase 2-A：AI 共情师                | 🔶 部分完成 | 核心对话功能已上线，本地 RAG 记忆层待实现                                       |
| Phase 1-D：情感分析（情绪洞察中心） | ⬜ 待开始   | 调整后整合案件 + 共情师 + 手动测评三路数据                                      |
| Phase 2-B：创建智能体               | 🔶 部分完成 | 核心功能已上线，管理端审核页待实现（当前智能体永久卡在 PENDING 无法在图鉴展示） |
| Phase 3-A：关注动态                 | ✅ 已完成   | 关注/取关/粉丝列表/动态流；案件详情关注按钮；Me 页粉丝关注数；/feed 页面        |
| Phase 3-B：成就中心                 | ✅ 已完成   | achievements 模块 + 12 枚成就种子 + 各 service 埋点 + /achievements 页面        |
| Phase 3-C：通知独立页               | ⬜ 待开始   |                                                                                 |
| Phase 4：管理端扩展                 | ⬜ 待开始   |                                                                                 |
| Phase 5：本地 RAG 服务              | ⬜ 待开始   |                                                                                 |

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

---

### Phase 2-B：创建智能体 — 完成情况说明

#### ✅ 已完成

**后端**

- `src/modules/custom-agents/` 模块完整实现
- 工作空间查询（自动解析 `COZE_SPACE_ID`，优先取个人空间）
- 智能体 CRUD：创建/编辑/删除，同步操作 Coze Bot（创建→发布→更新→重新发布）
- 手动重新发布到 Coze API 渠道（`POST /custom-agents/:id/coze-publish`）
- 申请公开接口（`POST /custom-agents/:id/publish`，状态置为 `PENDING`）
- 知识库管理：创建知识库（同步 Coze Dataset）、上传文档（Base64 写入 Coze）、删除文档、从 Coze 同步文档列表
- 绑定/解绑知识库到智能体（同步更新 Coze Bot 并重新发布）
- 公开智能体列表接口（`GET /custom-agents/public`，供 AI 图鉴"用户创建"Tab 使用）
- 文件名中文乱码修复（multer latin1 → utf8 转码）

**前端**

- 新建 `pages/create-agent/` 页面
  - 基本信息填写（名称、人设、System Prompt、擅长领域）
  - 知识库管理面板：创建知识库、上传 PDF/TXT/DOC/DOCX 文档、删除文档
  - 绑定/解绑知识库到智能体
  - 设为私有或申请公开
- `pages/agents/` 新增"用户创建"Tab，展示公开且审核通过的自建智能体，支持搜索
- 侧边栏新增「创建智能体」入口
- 菜单高亮 bug 修复（`/create-agent` 被 `/create` 提前匹配）
- 文件上传 Content-Type bug 修复（axios 全局 JSON header 覆盖 FormData multipart）

#### ❌ 尚未实现（待后续完成）

##### 1. 管理端审核页（阻塞图鉴展示）

**问题**：用户申请公开后智能体状态为 `PENDING`，AI 图鉴只展示 `APPROVED` 状态的智能体，因管理端审核页未实现，所有用户自建智能体永远无法出现在图鉴中。

**方案**：在 Phase 4 管理端扩展中实现 `AgentsAudit.tsx`，提供审核通过/拒绝操作，调用后端接口将状态从 `PENDING` 改为 `APPROVED` 或 `REJECTED`。

**临时绕过方案**（开发调试用）：可将 `createAgent` 中 `isPublic=true` 时的初始状态直接设为 `APPROVED`，跳过审核流程，等管理端完成后改回。

##### 2. 发起辩论时选择自建智能体

**问题**：`create-case/CreateCase.tsx` 的智能体选择目前只展示系统内置智能体，用户自建智能体无法被选入辩论。

**方案**：`CreateCase` 页面的智能体选择器同时拉取 `GET /custom-agents/mine`，将用户自建智能体（已发布状态）合并到可选列表中展示。

---

```js
创建智能体：
curl --location --request POST 'https://api.coze.cn/v1/bot/create' \
--header 'Authorization: Bearer $AccessToken' \
--header 'Content-Type: application/json' \
--data-raw '{
    "space_id": "736142423532160****",
    "name": "每日学一菜",
    "description": "每天教你一道菜的做法，暑假之后你将成为中餐大厨～",
    "icon_file_id": "73694959811****",
    "prompt_info": {
        "prompt": "你是一位经验丰富的中餐大厨，能够熟练传授各类中餐的烹饪技巧，每日为大学生厨师小白教学一道经典中餐的制作方法。"
    },
    "plugin_id_list": {
        "id_list": [
            {
                "plugin_id": "731198934927553****",
                "api_id": "735057536617362****"
            }
        ]
    },
    "onboarding_info": {
        "prologue": "欢迎你，学徒，今天想学一道什么样的菜？",
        "suggested_questions": [
            "川菜，我想吃辣的",
            "广东菜，来点鲜的",
            "随机教我一道菜"
        ]
    },
    "workflow_id_list": {
        "ids": [
            {
                "id": "746049108611037****"
            }
        ]
    },
    "model_info_config": {
        "model_id": "1706077826"
    }
}'
返回示例：
{
  "code": 0,
  "msg": "",
  "data": {
    "bot_id": "73428668*****"
  },
  "detail": {
    "logid": "20241210152726467C48D89D6DB2****"
  }
}
```

```js
更新智能体：
curl --location --request POST 'https://api.coze.cn/v1/bot/update' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: application/json' \
{
    "bot_id": "73428668*****",
    "name": "每日学一菜",
    "description": "每天教你一道菜的做法，暑假之后你将成为中餐大厨～",
    "icon_file_id": "73694959811****",
    "prompt_info": {
        "prompt": "你是一位经验丰富的中餐大厨，能够熟练传授各类中餐的烹饪技巧，每日为大学生厨师小白教学一道经典中餐的制作方法。"
    },
    "plugin_id_list": {
        "id_list": [
            {
                "plugin_id": "731198934927553****",
                "api_id": "735057536617362****"
            }
        ]
    },
    "onboarding_info": {
        "prologue": "欢迎你，学徒，今天想学一道什么样的菜？",
        "suggested_questions": [
            "川菜，我想吃辣的",
            "广东菜，来点鲜的",
            "随机教我一道菜"
        ]
    },
    "knowledge": {
        "dataset_ids": [
            "738509371792341****"
        ],
        "auto_call": true,
        "search_strategy": 1
    },
    "model_info_config": {
        "model_id": "1706077826"
    },
    "workflow_id_list": {
        "ids": [
            {
                "id": "746049108611037****"
            }
        ]
    }
}
返回示例：
{
  "code": 0,
  "msg": "",
  "detail": {
    "logid": "20241210152726467C48D89D6DB2****"
  }
}
```

```js
发布智能体：
curl --location --request POST 'https://api.coze.cn/v1/bot/publish' \
--header 'Authorization: Bearer pat_x*******' \
--header 'Content-Type: application/json' \
--data-raw '{
    "bot_id": "73428668*****",
    "connector_ids": [
        "1024"
    ]
}'
返回示例：
{
  "code": 0,
  "msg": "",
  "data": {
    "bot_id": "743961547827****",
    "version": "1732190531***"
  }
}
```

```js
查看智能体列表：
curl --location --request GET 'https://api.coze.cn/v1/bots?workspace_id=5123945629***&publish_status=&connector_id=1024&page_num=1&page_size=20' \
--header 'Authorization : Bearer pat_Osa******' \
--header 'Content-Type : application/json' \
返回示例：
{
  "data": {
    "items": [
      {
        "id": "7493066380997****",
        "name": "语音伴侣",
        "icon_url": "https://example.com/agent1***.png",
        "folder_id": "75231612553354***",
        "updated_at": 1718289297,
        "description": "语音伴侣",
        "is_published": false,
        "published_at": 1718289297,
        "owner_user_id": "23423423****"
      }
    ],
    "total": 1
  },
  "code": 0,
  "msg": "",
  "detail": {
    "logid": "20241210152726467C48D89D6DB2****"
  }
}
```

```js
创建工作空间：
curl --location --request POST 'https://api.coze.cn/v1/workspaces' \
--header 'Authorization : Bearer pat_O******' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "文档组的工作空间",
    "description": "文档组内部使用的工作空间。",
    "icon_file_id": "73694959811****",
    "coze_account_id": "749088814445***",
}'
返回示例：
{
  "data": {
    "id": "753232939603****"
  },
  "code": 0,
  "msg": "",
  "detail": {
    "logid": "20241210152726467C48D89D6DB2****"
  }
}
```

```js
查看工作空间：
GET 'https://api.coze.cn/v1/workspaces?&page_num=1&page_size=20' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: application/json' \
返回示例：
{
    "data": {
        "workspaces": [
            {
                "id": "74876004423701****",
                "name": "test",
                "icon_url": "https://***/obj/ocean-cloud-tos/FileBizType.BIZ_BOT_SPACE/team.png",
                "role_type": "member",
                "enterprise_id": "volcano_2105850***",
                "workspace_type": "team"
            }
            {
                "id": "74879061161065***",
                "name": "个人空间",
                "icon_url": "https://***/obj/ocean-cloud-tos/FileBizType.BIZ_BOT_SPACE/team.png",
                "role_type": "owner",
                "enterprise_id": "",
                "workspace_type": "personal"
            }
        ],
        "total_count": 2
    },
    "code": 0,
    "msg": "",
    "detail": {
        "logid": "1234567890abcdef****"
    }
}
```

```js
创建知识库：
curl --location --request POST 'https://api.coze.cn/v1/datasets' \
--header 'Authorization: Bearer pat_xitq9LWlowpX3qGCih1lwpAdzvXN****' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "产品文档",
    "description": "产品文档",
    "space_id": "731121948439879****",
    "format_type": 2,
    "file_id": "744667846938145****"
}'
返回示例：
{
  "code": 0,
  "data": {
    "dataset_id": "744668935865830****"
  },
  "msg": "",
  "detail": {
    "logid": "20241210160547B25AEC1917B0***"
  }
}
```

```js
查看知识库：
curl --location --request GET 'https://api.coze.cn/v1/datasets?space_id=731121948439879****&name=知识库&format_type=&page_num=1&page_size=5' \
--header 'Authorization : Bearer pat_O******' \
--header 'Content-Type: application/json'
返回示例：
{
  "code": 0,
  "data": {
    "total_count": 1,
    "dataset_list": [
      {
        "hit_count": 0,
        "doc_count": 0,
        "status": 1,
        "icon_url": "https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_DATASET_ICON/217526895615****.jpg?lk3s=5ec9c6e9&x-expires=1733821937&x-signature=U6X%2BhLXnRk8%2FHr1xP7wiMJ3IE****",
        "creator_name": "xxx",
        "avatar_url": "https://p6-passport.byteacctimg.com/img/user-avatar/assets/e7b19241fb224cea967****.png~300x300.image",
        "can_edit": true,
        "space_id": "731121948439879****",
        "failed_file_list": [],
        "processing_file_id_list": [],
        "description": "openapi",
        "chunk_strategy": {},
        "create_time": 1733817948,
        "slice_count": 0,
        "name": "openapi_img3",
        "format_type": 2,
        "project_id": "",
        "all_file_size": "0",
        "update_time": 1733817948,
        "creator_id": "217526895615****",
        "file_list": [],
        "processing_file_list": [],
        "icon_uri": "FileBizType.BIZ_DATASET_ICON/217526895615****.jpg",
        "dataset_id": "744668935865830****",
        "bot_used_count": 0
      }
    ]
  },
  "msg": "",
  "detail": {
    "logid": "20241210161217C90C9ABB86428***"
  }
}
```

```js
创建知识库文件：
curl --location --request POST 'https://api.coze.cn/open_api/knowledge/document/create' \
--data-raw '{
    "dataset_id": "736356924530694****",
    "document_bases": [
        {
            "name": "Coze.pdf",
            "source_info": {
                "file_base64": "5rWL6K+V5LiA5LiL5ZOm",
                "file_type": "pdf"
            }
        }
    ],
    "chunk_strategy": {
        "separator": "\n\n",
        "max_tokens": 800,
        "remove_extra_spaces": false,
        "remove_urls_emails": false,
        "chunk_type": 1
    }
}'
返回示例：
{
    "document_infos": [
        {
            "name": "Coze.pdf",
            "size": 14164,
            "type": "pdf",
            "status": 1,
            "tos_uri": "FileBizType.BIZ_BOT_DATASET/847077809337655_1727579972975689529_0ytrdq****.docx",
            "hit_count": 0,
            "char_count": 4,
            "create_time": 1719907964,
            "document_id": "738694205603010****",
            "format_type": 2,
            "slice_count": 1,
            "source_type": null,
            "update_time": 1719907969,
            "update_type": null,
            "chunk_strategy": {
                "chunk_type": 1,
                "max_tokens": 800,
                "remove_extra_spaces": false,
                "remove_urls_emails": false,
                "separator": "\n\n"
            },
            "update_interval": 0
        }
    ],
    "code": 0,
    "msg": "",
    "detail": {
        "logid": "20250106172024B5F607030EFFA***"
    }
}
```

```js
查看知识库文件列表：
curl --location --request POST 'https://api.coze.cn/open_api/knowledge/document/list' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: application/json' \
--header 'Agw-Js-Conv: str' \
--data-raw '{
    "dataset_id": "736356924530694****",
    "page": 0,
    "size": 10
}'
返回示例：
{
  "code": 0,
  "document_infos": [
    {
      "char_count": 4,
      "chunk_strategy": {
        "chunk_type": 0,
        "max_tokens": 0,
        "remove_extra_spaces": false,
        "remove_urls_emails": false,
        "separator": ""
      },
      "create_time": 1719476392,
      "document_id": "738508308097900****",
      "format_type": 0,
      "hit_count": 0,
      "name": "小猫的阳光午睡.pdf.pdf",
      "size": 30142,
      "slice_count": 1,
      "source_type": 0,
      "status": 1,
      "type": "pdf",
      "update_interval": 0,
      "update_time": 1719476430,
      "update_type": 0
    }
  ],
  "msg": "",
  "total": 1
}
```
