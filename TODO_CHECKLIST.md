# 📋 毕设项目 TODO 清单

> 项目名称：UGC"生活决策与道德法庭"多智能体众包辩论平台  
> 开发模式：**模块化前后端一体开发** - 每个功能模块前后端同时完成  
> 开发顺序：认证模块 → 首页模块 → 创建案件模块 → 辩论室模块（核心） → 其他功能 → 优化测试 → 部署

---

## 📊 进度统计

- **功能模块数**: 10 个（认证、首页、创建案件、辩论室、结果页、Agent图鉴、个人主页、管理后台、社交互动、基础设施）
- **总任务数**: 约 100+ 项（每模块均包含前后端任务）
- **UI 风格要求**: 现代简约 + Ant Design 5.x + 深色模式支持 + 响应式全覆盖

---

## 🎨 UI 风格指导（全局统一）

**设计系统**：

- **主配色**: `#1890ff` (蓝) 主色 | `#52c41a` (绿) 正向 | `#faad14` (橙) 警告 | `#ff4d4f` (红) 危险
- **字体系统**: 使用 Ant Design 默认字体，标题用 `font-weight: 600` 或 `700`，正文 `14px/400`, 小字 `12px/400`
- **间距规范**: 8px 基础单位 → xs(4px) sm(8px) md(16px) lg(24px) xl(32px)
- **圆角规范**: 卡片/容器 `8px` | 按钮 `4px` | 头像 `50%` (圆形) | 输入框 `4px`
- **阴影规范**: Ant Design 标准阴影 `0 3px 6px -4px rgba(0,0,0,0.12)` | 悬浮 `0 6px 12px -6px rgba(0,0,0,0.15)`
- **动画规范**: 过渡时间 `300ms` | 缓动函数 `cubic-bezier(0.4, 0, 0.2, 1)` (标准缓动)
- **响应断点**: xs(320px) sm(576px) md(768px) lg(992px) xl(1200px) xxl(1600px)
- **深色模式**: 所有页面必须支持亮色/深色切换，使用 Ant Design `theme` 配置

---

## 🏗️ 技术基础设施设置 (0 项 - 前置准备)

这些任务在正式开始前完成一次：

- [ ] **0.1** 安装所有前端依赖包 - socket.io-client、axios、zustand、echarts、react-markdown、react-quill
- [ ] **0.2** 配置 Ant Design 5.x 主题系统 - 全局样式变量、深色模式配置、自定义主题
- [ ] **0.3** 初始化 Zustand store 结构 - auth、user、case、room store 文件夹结构
- [ ] **0.4** 设置 ESLint + Prettier 代码规范 - 保证全项目代码风格一致
- [ ] **0.5** 初始化后端基础 - NestJS 模块结构、Swagger 配置、全局拦截器/过滤器

**完成标志**: 项目编译无错误，可正常启动前后端

---

## 🔐 第一模块：认证系统（用户登录/注册）

前后端完整实现登录/注册功能。**难度: ⭐ 简单**

### 前端任务

- [ ] **1.1-FE** 构建响应式登录/注册页面
  - 统一的表单设计（登录/注册切换）
  - 使用 Ant Design Form + Input 组件
  - 验证：邮箱格式、密码强度（至少8位、包含大小写数字）
  - 错误提示样式统一（红色警告）
  - 响应式适配（手机竖屏 320px、平板、桌面）

- [ ] **1.2-FE** 配置 JWT 认证流程
  - useAuth Hook - 管理登录状态、Token 存储、自动刷新
  - localStorage 持久化 Token（key: `auth_token` 和 `user_info`）
  - ProtectedRoute 组件 - 未登录自动重定向到登录页
  - 请求拦截器 - 自动添加 `Authorization: Bearer <token>` 头

- [ ] **1.3-FE** 实现路由守卫
  - 登录成功后自动跳转到首页
  - 访问受保护页面时检查 Token 有效性
  - Token 过期自动刷新或重定向到登录

### 后端任务

- [ ] **1.1-BE** 更新 Prisma Schema 和数据库
  - User 模型：id、email、username、password (bcrypt)、role、avatar、bio、isActive、createdAt、updatedAt
  - 创建初始迁移文件并生成数据库表

- [ ] **1.2-BE** 实现 Passport + JWT 认证
  - 安装 @nestjs/passport、@nestjs/jwt、passport-local、passport-jwt、bcryptjs
  - 创建 `auth.module.ts` 和 `auth.service.ts`
  - LocalStrategy - 验证邮箱/密码
  - JwtStrategy - 验证 Token
  - 创建 JWT Guard 和 Auth Decorator

- [ ] **1.3-BE** 实现认证 API 端点
  - `POST /api/v1/auth/register` - 注册新用户（验证邮箱唯一性、密码加密）
  - `POST /api/v1/auth/login` - 登录返回 JWT Token（有效期 7 天）
  - `POST /api/v1/auth/logout` - 登出（可选，主要由前端删除 Token）
  - `GET /api/v1/auth/me` - 获取当前用户信息（需要 JWT Guard）

- [ ] **1.4-BE** 实现用户管理 API
  - `GET /api/v1/users/:id` - 获取用户详情
  - `PUT /api/v1/users/:id` - 更新个人资料（昵称、简介、头像 URL）
  - `PUT /api/v1/users/:id/password` - 修改密码（需要验证旧密码）
  - 添加验证装饰器 - 验证数据有效性

### 验收标准

- [x] 用户可以用邮箱注册新账号
- [x] 用户可以用邮箱和密码登录
- [x] 登录成功后获得 JWT Token
- [x] Token 在请求头中自动携带
- [x] Token 过期时自动刷新或重定向
- [x] 个人资料可以查看和修改

---

## 🏠 第二模块：首页与案件列表

前后端完整实现案件列表展示。**难度: ⭐⭐ 中等**

### 前端任务

- [ ] **2.1-FE** 构建首页导航和布局
  - 顶部导航栏：Logo、Tab 切换(Live/Archived)、搜索栏、用户菜单(头像下拉)
  - 侧栏（可选）：快捷导航（创建案件、我的案件、个人主页、管理后台）
  - 导航栏固定在顶部、响应式隐藏侧栏（md 断点以下）

- [ ] **2.2-FE** 设计案件卡片组件
  - 卡片布局：头图 + 标题 + 描述预览 + Agent 头像展示 + 进度条 + 统计信息
  - 进度条：左侧支持数 vs 右侧支持数（双色对比）
  - 统计信息：围观人数、评论数、发起时间
  - 悬浮效果：卡片 hover 时微微抬起（阴影增强）

- [ ] **2.3-FE** 实现案件列表和分页
  - 列表布局：网格 2-3 列（响应式）
  - 无限滚动加载（或分页按钮）
  - 状态过滤：Live (进行中) | Archived (已结束) | All
  - 排序选项：最新发布 | 热度排序 | 我的案件
  - 骨架屏加载动画（Ant Design Skeleton）
  - 空状态提示：暂无案件、加载失败提示

- [ ] **2.4-FE** 集成 API 获取数据
  - 使用 React Query 的 `useQuery` Hook（TanStack Query）
  - 分页参数：page、pageSize (默认 10)
  - 实时轮询：每 5 秒自动刷新一次（可选）
  - 缓存策略：5 分钟缓存，手动刷新清空缓存
  - 搜索功能：搜索框防抖（500ms）后调用搜索 API

### 后端任务

- [ ] **2.1-BE** 更新 Prisma Schema
  - Room 模型：id、title、content、status (WAITING/LIVE/CLOSED)、ownerId、agents (JSON)、viewCount、createdAt、updatedAt
  - Agent 模型：id、name、description、avatar、personality、winRate、participateCount
  - Message 模型：id、roomId、senderType (AI/HUMAN)、senderId、content、createdAt
  - Vote 模型：id、userId、roomId、agentId、createdAt | unique (userId, roomId)

- [ ] **2.2-BE** 创建 Room Service 和 API
  - `POST /api/v1/rooms` - 创建案件（需要 JWT）
  - `GET /api/v1/rooms` - 查询案件列表（支持分页、过滤、搜索、排序）
  - `GET /api/v1/rooms/:id` - 获取案件详情
  - `PUT /api/v1/rooms/:id` - 更新案件（仅 owner 可操作）
  - 添加 DTO 验证

- [ ] **2.3-BE** 初始化 Agent 数据
  - 创建系统预设的 3 个 Agent：
    - Bot A: "毒舌现实主义者"（personality: 犀利直接）
    - Bot B: "温柔共情者"（personality: 温暖理解）
    - Bot C: "理智律师"（personality: 客观公正）
  - 提供 `GET /api/v1/agents` API 返回全部 Agent 列表

- [ ] **2.4-BE** 实现搜索和过滤
  - 全文搜索：通过 title 和 content 关键词搜索
  - 状态过滤：WAITING | LIVE | CLOSED
  - 按 createdAt 排序（最新/最旧）
  - 按 viewCount 或 votes 排序（热度）

### 验收标准

- [x] 首页可以显示案件列表
- [x] 支持 Live/Archived 两个标签页切换
- [x] 支持搜索和排序
- [x] 分页加载正常
- [x] 骨架屏加载动画显示

---

## ✍️ 第三模块：创建案件页面

前后端完整实现创建案件功能。**难度: ⭐⭐ 中等**

### 前端任务

- [ ] **3.1-FE** 构建创建案件表单
  - 标题输入框：最多 100 字，实时字数统计，placeholder: "请输入你的困境标题..."
  - 富文本编辑器：使用 react-quill，支持加粗、斜体、列表、链接、图片等
  - 图片上传：支持拖拽上传、选择文件，显示预览，限制 5MB
  - 表单验证：标题必填、内容必填且最少 50 字
  - 提交按钮：禁用防重复提交

- [ ] **3.2-FE** 实现 Agent 选择器组件
  - 展示系统 3 个预设 Agent
  - 支持多选（必须选择 3 个）
  - Agent 卡片设计：头像 + 名字 + 简介 + 性格特点
  - 选中状态显示：边框高亮 + 对号图标
  - 提示文案：未选满 3 个时显示"请选择 3 个 AI 组队"

- [ ] **3.3-FE** 实现表单提交和页面跳转
  - 验证所有必填项
  - 显示上传进度条
  - 成功提示：绿色通知 "案件创建成功！"
  - 自动跳转到辩论室（3 秒后或点击"进入辩论室"按钮）
  - 错误处理：显示错误信息、允许重试

### 后端任务

- [ ] **3.1-BE** 实现创建 Room API
  - `POST /api/v1/rooms` 接口详细实现
  - 验证 title、content、agents 字段
  - 存储 Room 记录，初始状态为 WAITING
  - 返回创建的 Room ID 和信息

- [ ] **3.2-BE** 图片上传服务（可选）
  - 支持上传到本地或云存储（如 OSS）
  - 限制文件大小 5MB
  - 返回图片 URL

- [ ] **3.3-BE** 权限检查
  - 仅已登录用户可创建案件
  - 验证 JWT Token

### 验收标准

- [x] 用户可以填写表单创建案件
- [x] Agent 选择器正常工作
- [x] 创建成功后自动跳转到辩论室

---

## 🎤 第四模块：辩论室（核心页面，最高分）⭐⭐⭐⭐⭐

前后端完整实现沉浸式辩论室。**难度: ⭐⭐⭐⭐⭐ 极难 - 这是整个项目的核心**

### ✅ 辩论流程方案（采用方案一：交替 + 交叉反驳 + 裁决）

> 目标：让 **A（毒舌现实主义者）** 与 **B（温柔共情者）** 形成“你来我往”的强对抗感，**C（理智律师）** 负责“裁判式总结 + 可执行建议”，并保持前端流式打字机体验像“现场直播”。

**核心原则**：

- **严格交替**：每轮同一时刻只让 1 个 Agent 输出，避免并发导致观感混乱（观众不知道看谁）。
- **强制引用反驳**：Round 2 必须逐条引用对方要点并反击，避免“各说各话”。
- **控制字数**：每次发言有上限（否则后续反驳只能摘要，削弱对抗感）。
- **律师定案**：Round 3 不“和稀泥”，要给结论倾向、风险点与行动清单。

**Round 1：立场陈述（严格交替）**：

- **顺序**：A → B
- **目的**：先定调，留出可反驳点
- **建议输出长度**：每人 200–350 字
- **Prompt 要点**：
  - A：强硬结论 + 现实代价/收益 + 1 个“刺痛点”追问
  - B：共情回应 + 关系/心理视角 + 1 个温柔追问

**Round 2：交叉反驳（强对抗，严格交替）**：

- **顺序**：B 反驳 A → A 反驳 B（或反过来，关键是交替）
- **输入上下文**：
  - B 仅看 A 的 Round 1 完整观点
  - A 仅看 B 的 Round 1 完整观点
- **建议输出长度**：每人 220–420 字
- **反驳结构（固定模板）**：
  - 你说的 X 不成立，因为…
  - 你忽略了 Y 的风险/代价…
  - 给出更强的替代建议（更可执行）
- **硬性要求**：至少反驳对方 2 个“具体观点”（不允许泛泛而谈）

**Round 3：律师裁决（定案）**：

- **顺序**：C（只发一次）
- **输入上下文**：A+ B 前两轮要点（必要时先做“要点摘要”再喂给 C，避免上下文过长）
- **建议输出结构（固定）**：
  - 结论倾向（更支持 A / B / 折中，但需明确）
  - 法律/劳动合规风险点（证据留存、加班边界、沟通策略）
  - 行动清单（3–7 条，可执行）
  - 底线与谈判话术（给一句可复制的话）
  - “何时辞职”的触发条件（尽量量化）

### 前端任务

- [ ] **4.1-FE** 构建三栏布局和响应式适配
  - 桌面版 (lg+)：左栏(25%) + 中栏(50%) + 右栏(25%)
  - 平板版 (md-lg)：自动调整栏宽或隐藏右栏
  - 手机版 (xs-sm)：底部 Tab 切换三个栏
  - 使用 CSS Grid 或 Flexbox 实现

- [ ] **4.2-FE** 构建左侧栏
  - 案件标题、描述（只读）
  - 参与 AI 列表：3 个 Agent 头像 + 名字 + 实时支持率
  - Owner 编辑区（仅 owner 可见）：补充案情、编辑按钮
  - 辩论轮次指示器：第几轮、当前进度
  - 折叠/展开按钮

- [ ] **4.3-FE** 构建中栏 AI 辩论舞台
  - 消息列表：Agent 头像 + 名字 + 消息内容 + 时间戳
  - 正在输入状态：显示"毒舌现实主义者 正在输入..."（带动画）
  - 虚拟化长列表：使用 react-window 处理大量消息
  - 自动滚动到最新消息

- [ ] **4.4-FE** 实现打字机效果
  - 接收流式 chunk 数据
  - 动态拼接字符串
  - 逐字显示动画（每 20-50ms 显示一个字）
  - 流畅滚动：消息完成时自动滚到底部

- [ ] **4.5-FE** 构建右侧栏人类弹幕区
  - 实时聊天列表：用户头像 + 昵称 + 消息 + 时间
  - 发送输入框：支持回车发送
  - 在线用户数统计
  - 消息虚拟化（长列表优化）

- [ ] **4.6-FE** 构建底部悬浮条
  - 支持率进度条：左边（毒舌）vs 右边（共情）的对比
  - 两色柱状图：蓝色 vs 绿色
  - 实时投票按钮：两个大按钮（赞成/反对）
  - 围观人数统计："1000+ 人在围观"
  - 禁用重复投票：投票后按钮置灰

- [ ] **4.7-FE** 实现 WebSocket 连接
  - joinRoom 时连接到对应房间
  - 监听 `messageStream` 事件接收 AI 消息
  - 监听 `voteUpdate` 事件实时更新投票数
  - 监听 `userJoin/userLeave` 事件更新在线人数
  - 自动重连机制

- [ ] **4.8-FE** 实现投票交互
  - 点击投票按钮时发送 vote 事件
  - 前端立即显示投票状态（按钮变色）
  - 禁止重复投票（检查本地状态）
  - 实时更新进度条（收到 voteUpdate 事件）

- [ ] **4.9-FE** 实现 owner 权限控制 UI
  - 仅 owner 可见：开启/暂停/结束辩论按钮
  - 补充案情表单（弹窗）：输入补充信息后更新左栏显示
  - 跳转轮次：选择第几轮（开发/测试使用）
  - 权限检查：非 owner 时隐藏这些按钮

- [ ] **4.10-FE** 实现人类弹幕发送
  - 输入框输入消息
  - 回车或点击发送按钮
  - 支持 Emoji 表情选择器（Ant Design Emoji）
  - 发送限流：3 秒内最多发送 1 条
  - 成功发送后清空输入框

### 后端任务

- [ ] **4.1-BE** 配置 WebSocket 网关
  - `@WebSocketGateway()` 装饰器配置
  - 支持跨域 CORS 配置
  - 连接身份验证（通过 JWT Token 获取 userId）

- [ ] **4.2-BE** 实现 WebSocket 房间管理
  - `@SubscribeMessage('joinRoom')` - 用户加入房间
    - 验证 JWT Token 获取 userId
    - 检查用户是否为 owner：是则标记为 `owner`，否则标记为 `viewer`
    - 用户加入房间，广播在线人数更新
  - `@SubscribeMessage('leaveRoom')` - 用户离开房间
    - 移除用户连接
    - 广播在线人数更新

- [ ] **4.3-BE** 实现 Coze API 集成层
  - 创建 `coze.service.ts` 模块
  - HTTP 客户端：使用 axios 发送请求到 Coze API
  - 认证：配置 API Key 头部
  - 错误处理：超时、限流、API 错误

- [ ] **4.4-BE** 实现流式输出广播
  - 接收 Coze SSE 流：使用 `responseType: 'stream'`
  - 监听 data chunk：每收到一个 chunk 立即解析
  - WebSocket 广播：`server.to(roomId).emit('messageStream', { agentId, chunk })`
  - 实时发送给所有客户端

- [ ] **4.5-BE** 实现辩论流程编排
  - NestJS Service 控制辩论流程：
    - **Round 1**：并发调用 Bot A 和 Bot B（获取初始观点）
    - **Round 2**：将 Bot A 的观点发给 Bot B、Bot B 的观点发给 Bot A（交叉反驳）
    - **Round 3**：将前两轮聊天记录发给 Bot C 做最终总结
  - 状态管理：当前轮次、辩论状态（WAITING/RUNNING/FINISHED）

- [ ] **4.6-BE** 实现上下文管理
  - Redis 或内存中维护对话历史（room_context）
  - 存储格式：`{ roundNumber, messages: [ { agent, content } ] }`
  - Round 切换时，将历史作为 Prompt 补充发给下一个 Bot
  - 示例 Prompt："用户困境：[xxx]。刚才毒舌说：[yyy]。请你反驳并给出建议。"

- [ ] **4.7-BE** 实现人类用户干预
  - 仅 owner 可操作：
    - `pauseDebate` - 暂停当前辩论（可继续）
    - `endDebate` - 立即结束辩论（不可继续）
    - `appendContext` - 补充案情信息
    - `jumpToRound` - 跳转到第几轮（测试用）

- [ ] **4.8-BE** 实现投票系统
  - `@SubscribeMessage('vote')` - 接收投票
  - 验证用户未重复投票（检查数据库 Vote 表）
  - 原子操作更新投票数：`Vote.create()` + 更新 Agent stats
  - 广播投票结果：`server.to(roomId).emit('voteUpdate', { agentId, voteCount })`

- [ ] **4.9-BE** 实现人类聊天消息
  - `@SubscribeMessage('sendMessage')` - 接收用户消息
  - 验证 JWT Token 和发送限流
  - 保存消息到 Message 表：senderType = "HUMAN"、senderId = userId
  - 广播消息给房间内所有用户

### 验收标准

- [x] 三栏布局响应式正常，桌面/平板/手机都能正常显示
- [x] WebSocket 连接成功，能收到 AI 消息流
- [x] 打字机效果流畅，逐字显示
- [x] 投票系统正常，进度条实时更新
- [x] 人类弹幕能发送和接收
- [x] Owner 权限控制正常工作
- [x] 支持整个辩论流程（三轮）

---

## 📊 第五模块：结案报告页

前后端完整实现结案报告。**难度: ⭐⭐ 中等**

### 方案（2026-03 更新）

目标：辩论结束（或手动结案）后，提供一个**结案报告页**，统一展示「案件信息 + 三轮辩论回顾 + 律师最终建议 + 投票统计/胜者 + 分享」。

#### 5.0 数据契约（推荐 DTO）

- `GET /api/v1/rooms/:id/report` 返回：
  - **room**：`{ id, title, description, createdAt, ownerId, status, agents: [{id,name,avatar}] }`
  - **debateMessages**：三轮 AI 历史记录（来自 `Message` 表）
    - 字段：`{ id, roundNumber, agentId(botId), content, reasoning?, createdAt }`
    - 排序：按 `createdAt` 升序；前端按 `roundNumber` 分组折叠显示
  - **finalAdvice**：Bot C（理智律师）在 Round 3 的消息
    - `raw`: `{ content, reasoning? }`（先保证可用）
    - `items`（可选增强）：把建议/风险/优先级做轻量解析后返回（不要强依赖 prompt 标签）
  - **voteStats**：
    - `totalVotes`
    - `countsByAgentId: Record<string, number>`
    - `percentByAgentId: Record<string, number>`
    - `ranking: [{ agentId, count, percent, rank }]`
    - `winner: { type: 'WIN'|'TIE'|'NO_VOTES', agentId?: string, topPercent?: number }`

#### 5.0 规则（胜负与弃权）

- **不投票**：视为弃权，不计入分母（分母 = `totalVotes`）
- **0 票**：`winner.type = 'NO_VOTES'`，前端展示“暂无投票结果”，并提示“以 Round 3 律师裁决为参考”
- **平票**：`winner.type = 'TIE'`，展示平票与 Top 排名
- **获胜**：票数最高者获胜（同票判平）

#### 5.0 存储策略（投票持久化）

- 推荐新增 `RoomVote` 表（`roomId,userId,agentId,createdAt`，`unique(roomId,userId)`）用于 report 聚合，避免 WebSocket 内存投票在重启后丢失。

### 前端任务

- [ ] **5.1-FE** 构建报告页基础布局
  - 案件信息卡片：标题、发起人、创建时间、参与 Agent 列表
  - 辩论回顾（可折叠）：显示完整的三轮聊天记录
  - 最终建议卡片：Bot C 的建议
  - 胜出方展示：最高支持率的 Agent
  - 分享按钮区域

- [ ] **5.2-FE** 实现最终建议卡片
  - 展示 AI 律师(Bot C)的多维行动指南
  - 分项显示：建议 1、建议 2、建议 3...
  - 风险提示：红色警告框
  - 优先级排序：用星号或数字表示

- [ ] **5.3-FE** 实现胜出方展示
  - 最终支持率排名：1st (蓝) | 2nd (绿) | 3rd (灰)
  - 赢家 Agent 突出显示：大头像 + 名字 + "胜者"标签
  - 赞数/分享数统计

- [ ] **5.4-FE** 实现分享功能
  - 分享到微博/微信/小红书等（可选，显示预览）
  - 复制分享链接
  - 下载报告为 PDF（可选）
  - 分享统计

- [ ] **5.5-FE** 报告入口与跳转
  - 辩论结束后提供“查看结案报告”按钮（跳转到 `/rooms/:id/report` 或 `/debate-room/:id/report`）
  - 案件详情页在 `status=CLOSED` 时展示“查看报告”
  - `NO_VOTES/TIE/WIN` 三种赢家展示文案完整覆盖

### 后端任务

- [ ] **5.1-BE** 实现结案 API
  - `POST /api/v1/rooms/:id/close` - 结束辩论（更新状态为 CLOSED）
  - `GET /api/v1/rooms/:id/report` - 获取完整报告（包含三轮记录、最终建议、投票统计）

- [ ] **5.2-BE** 计算最终建议
  - 从 Message 表获取 Bot C 在 Round 3 的消息作为建议
  - 格式化并返回

- [ ] **5.3-BE** 统计投票结果
  - 计算每个 Agent 的总投票数
  - 计算支持率百分比
  - 排序并返回

- [ ] **5.4-BE** 投票持久化（推荐）
  - 新增 `RoomVote` 表并实现 upsert（同房间同用户只能投一次，可覆盖更新）
  - `GET /report` 从 DB 聚合生成 `voteStats`（支持 `NO_VOTES/TIE/WIN`）

### 验收标准

- [x] 结案后能生成完整报告
- [x] 报告显示所有必要信息和统计数据

---

## 🤖 第六模块：AI Agent 图鉴页

前后端完整实现 Agent 展示。**难度: ⭐ 简单**

### 前端任务

- [ ] **6.1-FE** 设计 Agent 卡片
  - 头像、人设名字、简介、胜率百分比、参与案件数
  - 卡片大小统一，支持点击查看详情
  - 悬浮动画效果

- [ ] **6.2-FE** 实现 Agent 列表展示
  - 网格布局 3-4 列（响应式）
  - 支持排序：胜率排序、参与数排序、字母排序
  - 搜索功能：通过名字搜索

- [ ] **6.3-FE** 实现 Agent 详情弹窗
  - 完整人设描述
  - 历史高赞金句展示（引用卡）
  - 统计数据：总参与案件、胜率、粉丝数
  - 参与案件列表：最近 5 个

### 后端任务

- [ ] **6.1-BE** 完善 Agent 数据
  - 添加更详细的 Agent 属性：personality、signature (金句)、fans (粉丝数)
  - 初始化系统 Agent 数据

- [ ] **6.2-BE** 实现 Agent API
  - `GET /api/v1/agents` - 获取全部 Agent（支持排序）
  - `GET /api/v1/agents/:id` - 获取 Agent 详情（包含统计数据）
  - `GET /api/v1/agents/:id/cases` - 获取 Agent 参与的案件列表

### 验收标准

- [x] 能浏览所有 Agent 的详细信息和统计数据

---

## 👤 第七模块：个人主页

前后端完整实现用户资料页。**难度: ⭐⭐⭐ 较难**

### 前端任务

- [ ] **7.1-FE** 构建用户信息区
  - 头像上传/编辑（支持拖拽上传）
  - 昵称、个人简介编辑
  - 修改密码表单（旧密码 + 新密码 + 确认）
  - 登出按钮

- [ ] **7.2-FE** 实现发布案件列表
  - 我发布的案件：卡片/列表展示
  - 状态标签：进行中/已结束
  - 编辑/删除操作（弹窗确认）
  - 统计数据：总发布数、总围观数

- [ ] **7.3-FE** 实现投票历史列表
  - 我参与投票的案件：表格/卡片展示
  - 显示选择记录：我支持了哪个 Agent
  - 点赞数、分享数
  - 按时间排序

- [ ] **7.4-FE** 实现性格诊断雷达图
  - 使用 echarts 绘制雷达图
  - 根据投票历史计算多维度：理性度、共情度、现实度、风险度等
  - 显示维度的数值（0-100%）
  - 添加 tooltip 说明各维度含义

- [ ] **7.5-FE** 实现个人统计
  - 统计卡片：发布案件数、参与投票数、获赞数
  - 等级勋章：铜/银/金/钻石（根据活跃度）
  - 成就展示：完成的 Badge（如"初试牛刀"、"决策大师"等）

### 后端任务

- [ ] **7.1-BE** 实现用户信息更新 API
  - `PUT /api/v1/users/:id/profile` - 更新头像、昵称、简介
  - `PUT /api/v1/users/:id/password` - 修改密码

- [ ] **7.2-BE** 实现用户发布案件列表 API
  - `GET /api/v1/users/:id/rooms` - 获取用户发布的案件列表

- [ ] **7.3-BE** 实现用户投票历史 API
  - `GET /api/v1/users/:id/votes` - 获取用户投票历史

- [ ] **7.4-BE** 实现性格诊断算法
  - 分析用户投票倾向：支持毒舌 vs 共情 vs 理性 的比例
  - 返回多维度评分数据给前端绘图

- [ ] **7.5-BE** 实现个人统计 API
  - `GET /api/v1/users/:id/stats` - 返回统计数据和等级信息

### 验收标准

- [x] 用户资料页完整可用
- [x] 能修改头像、昵称、密码
- [x] 性格诊断雷达图显示正确

---

## 🎛️ 第八模块：管理后台（可选加分）

前后端完整实现管理功能。**难度: ⭐⭐ 中等**

### 前端任务

- [ ] **8.1-FE** 构建管理权限验证
  - 仅 Admin 角色可访问 `/admin` 路由
  - 非 Admin 自动重定向到首页
  - Admin 菜单项在导航栏展示

- [ ] **8.2-FE** 实现房间管理页
  - 房间列表表格：ID、标题、状态、发起人、人数、操作
  - 状态切换下拉菜单：WAITING → LIVE → CLOSED
  - 删除/锁定按钮（删除前弹窗确认）
  - 搜索和过滤功能

- [ ] **8.3-FE** 实现消息审核页
  - 违规言论列表表格
  - 显示用户、消息内容、举报原因、处理状态
  - 处理操作：删除消息、封禁用户（弹窗确认）

- [ ] **8.4-FE** 实现用户管理页
  - 用户列表表格：ID、邮箱、昵称、角色、状态、操作
  - 禁用/启用账户按钮
  - 角色分配下拉：USER/ADMIN/MODERATOR
  - 搜索和过滤

- [ ] **8.5-FE** 实现数据统计面板
  - 统计卡片：总案件数、总用户数、今日新用户、活跃用户
  - 图表：案件发布趋势（折线图）、用户来源分布（饼图）
  - 热门话题排行（表格）

### 后端任务

- [ ] **8.1-BE** 实现 Admin 认证与授权
  - 添加 Role 字段到 User 模型
  - 创建 AdminGuard - 检查 user.role === 'ADMIN'
  - 为 admin 路由添加 Guard

- [ ] **8.2-BE** 实现房间管理 API
  - `GET /api/v1/admin/rooms` - 房间列表（支持分页、过滤）
  - `PUT /api/v1/admin/rooms/:id/status` - 更新房间状态
  - `DELETE /api/v1/admin/rooms/:id` - 删除房间

- [ ] **8.3-BE** 实现消息审核 API
  - `GET /api/v1/admin/messages/violations` - 获取违规消息列表
  - `DELETE /api/v1/admin/messages/:id` - 删除消息
  - `POST /api/v1/admin/users/:id/ban` - 封禁用户

- [ ] **8.4-BE** 实现用户管理 API
  - `GET /api/v1/admin/users` - 用户列表（支持过滤、搜索）
  - `PUT /api/v1/admin/users/:id/role` - 更新用户角色
  - `PUT /api/v1/admin/users/:id/status` - 禁用/启用用户

- [ ] **8.5-BE** 实现数据统计 API
  - `GET /api/v1/admin/stats/overview` - 统计概览
  - `GET /api/v1/admin/stats/trends` - 发布趋势数据
  - `GET /api/v1/admin/stats/hotTopics` - 热门话题

### 验收标准

- [x] Admin 可以访问管理后台
- [x] 管理功能基本可用

---

## 📐 第九模块：基础设施和优化

前后端一起完成性能优化、测试、部署。**难度: ⭐⭐ 中等**

### 前端任务

- [ ] **9.1-FE** 性能优化
  - 代码分割：按路由分割（Home、Create、Debate 等）
  - 懒加载：使用 React.lazy 和 Suspense
  - 虚拟化长列表：消息列表、投票历史（react-window）
  - 缓存策略：React Query 缓存时间优化

- [ ] **9.2-FE** 单元测试（可选）
  - 关键 Hook 测试：useAuth、useSocket
  - 组件快照测试：CaseCard、MessageItem
  - 工具函数测试

- [ ] **9.3-FE** 生产构建
  - Vite build 配置优化
  - 环境变量分离（.env.development / .env.production）
  - 静态资源优化（图片压缩、字体加载）

### 后端任务

- [ ] **9.1-BE** 数据库优化
  - 为常用查询添加索引：Room.ownerId、Message.roomId、Vote.userId
  - 查询优化：使用 SELECT 指定字段而非 SELECT \*
  - 分页查询参数检查

- [ ] **9.2-BE** API 缓存
  - 为 GET 端点添加 Redis 缓存（可选）
  - 缓存时间：Agent 列表 1 小时、Room 列表 5 分钟

- [ ] **9.3-BE** WebSocket 稳定性
  - 连接重试机制：前端自动重连
  - 心跳检测：定期 ping/pong
  - 断线重连：重新 join 房间

- [ ] **9.4-BE** 集成测试
  - API 端点测试：登录、创建案件、投票等
  - WebSocket 事件测试

- [ ] **9.5-BE** 生产构建
  - 环境变量配置（数据库、API Key 等）
  - 数据库迁移脚本
  - 启动脚本优化

### 验收标准

- [x] 项目编译无错误
- [x] 性能指标达标（首屏 < 3s）
- [x] 测试覆盖率达到基本要求

---

## 💬 第十模块：社交互动（评论与点赞）

前后端完整实现评论和点赞功能，增强用户社交属性。**难度: ⭐⭐ 中等**

### 前端任务

- [ ] **10.1-FE** 构建案件评论区组件
  - 评论列表：用户头像 + 昵称 + 发布时间 + 评论内容
  - 支持一级评论和二级回复（@用户名）
  - 发布评论输入框：支持换行（Shift+Enter）、字数限制（500 字）
  - 空状态提示：「暂无评论，来说第一句话吧」
  - 骨架屏加载动画

- [ ] **10.2-FE** 实现评论交互功能
  - 点赞评论：心形图标，动画反馈（点击放大 + 颜色变化）
  - 回复评论：点击「回复」展开二级输入框，内容自动带上 `@用户名`
  - 删除评论：仅评论发布者和管理员可操作，删除前弹窗确认
  - 举报评论：下拉选择举报原因，提交后提示「已举报，我们将尽快处理」

- [ ] **10.3-FE** 实现案件点赞功能
  - 案件卡片和详情页均展示点赞按钮（`❤️ 点赞数`）
  - 已点赞状态：图标填充红色，再次点击取消
  - 点赞数实时更新（乐观更新：点击即时响应，失败后回滚）
  - 登录校验：未登录点赞时弹出登录提示

- [ ] **10.4-FE** 评论展示位置规划
  - 案件详情页（`/case/:id`）底部展示评论区
  - 结案报告页（`/rooms/:id/report`）底部展示评论区
  - 辩论室进行中时仅展示点赞，辩论结束后开放评论

- [ ] **10.5-FE** 个人主页评论历史
  - 「我的评论」Tab：展示用户发布的所有评论
  - 显示评论对应的案件标题（点击跳转）
  - 可删除历史评论

### 后端任务

- [ ] **10.1-BE** 更新 Prisma Schema
  - 新增 `Comment` 模型：`id`、`content`、`authorId`、`roomId`、`parentId`（自关联，支持二级回复）、`likeCount`、`isDeleted`（软删除）、`createdAt`、`updatedAt`
  - 新增 `CommentLike` 模型：`id`、`userId`、`commentId`、`createdAt`，唯一约束 `(userId, commentId)`
  - `Room` 模型新增 `likeCount` 字段（案件点赞数）
  - 新增 `RoomLike` 模型：`id`、`userId`、`roomId`、`createdAt`，唯一约束 `(userId, roomId)`
  - 创建对应迁移文件

- [ ] **10.2-BE** 实现评论 CRUD API
  - `POST /api/v1/rooms/:id/comments` - 发布评论（需要 JWT）
    - body: `{ content, parentId? }`
    - 内容不能为空，长度限制 500 字
  - `GET /api/v1/rooms/:id/comments` - 获取评论列表
    - 支持分页：`?page=1&pageSize=20`
    - 返回一级评论，每条评论携带前 3 条回复
    - 返回字段：评论内容、作者信息、点赞数、是否已点赞、回复列表
  - `GET /api/v1/rooms/:id/comments/:commentId/replies` - 获取某条评论的全部回复（分页）
  - `DELETE /api/v1/comments/:id` - 删除评论（软删除，仅本人或 Admin）

- [ ] **10.3-BE** 实现评论点赞 API
  - `POST /api/v1/comments/:id/like` - 点赞评论（幂等，重复点赞不报错）
  - `DELETE /api/v1/comments/:id/like` - 取消点赞
  - 使用 Prisma 原子操作更新 `Comment.likeCount`

- [ ] **10.4-BE** 实现案件点赞 API
  - `POST /api/v1/rooms/:id/like` - 点赞案件（幂等）
  - `DELETE /api/v1/rooms/:id/like` - 取消点赞
  - 使用 Prisma 原子操作更新 `Room.likeCount`
  - 案件列表和详情接口返回 `likeCount` 及当前用户 `isLiked` 状态

- [ ] **10.5-BE** 评论举报 API（可选）
  - `POST /api/v1/comments/:id/report` - 举报评论
    - body: `{ reason: 'SPAM' | 'ABUSE' | 'MISLEADING' | 'OTHER', description? }`
  - 管理后台新增「举报管理」入口（列表查看、处理状态更新）

### 验收标准

- [ ] 用户可以在案件详情页发布和查看评论
- [ ] 支持回复他人评论（二级结构）
- [ ] 评论和案件均可点赞/取消点赞
- [ ] 点赞数实时反映正确
- [ ] 自己的评论可以删除
- [ ] 个人主页展示评论历史

---

## 📦 第十一模块：部署与文档

最后的打包和准备。**难度: ⭐⭐ 中等**

### 前端任务

- [ ] **11.1-FE** 前端生产构建
  - 优化 build 输出
  - 生成 dist 文件夹

### 后端任务

- [ ] **11.1-BE** 后端生产构建
  - 构建后端应用
  - 数据库迁移脚本准备

### 共同任务

- [ ] **11.2** Docker 容器化
  - 后端 Dockerfile（Node.js + NestJS）
  - 前端 Dockerfile（Node.js + Vite build + Nginx）
  - docker-compose.yml：orchestrate 后端、前端、MySQL

- [ ] **11.3** 文档准备
  - 项目架构文档：系统设计、数据流、技术选型
  - API 文档：Swagger 自动生成
  - 技术亮点总结：流式输出、多轮辩论、WebSocket 实时通信等
  - 演示脚本：功能演示步骤、测试数据准备
  - 部署手册：环境配置、启动命令

### 验收标准

- [x] 项目可以正常部署运行
- [x] 文档完整齐全

---

## 📈 快速参考

### 开发顺序（推荐）

1. **第 0 模块** - 基础设施设置（前置）
2. **第 1 模块** - 认证系统
3. **第 2 模块** - 首页列表
4. **第 3 模块** - 创建案件
5. **第 4 模块** - 辩论室（核心，最耗时）
6. **第 5 模块** - 结案报告
7. **第 6 模块** - Agent 图鉴
8. **第 7 模块** - 个人主页
9. **第 8 模块** - 管理后台（可选）
10. **第 9 模块** - 优化
11. **第 10 模块** - 社交互动（评论与点赞）
12. **第 11 模块** - 部署

### 关键难点

| 难点             | 模块    | 解决方案                               |
| ---------------- | ------- | -------------------------------------- |
| 流式输出处理     | 4-FE/BE | chunk 分解 + WebSocket 广播 + 逐字显示 |
| 多轮辩论编排     | 4-BE    | NestJS 控制流程，Round 间维护上下文    |
| 并发投票一致性   | 4-BE    | Prisma 原子操作 `{ increment: 1 }`     |
| WebSocket 稳定性 | 4-FE/BE | 自动重连 + 心跳检测 + 断线恢复         |
| 性格诊断算法     | 7-BE    | 统计投票倾向，生成多维度评分           |
| 评论二级回复     | 10-BE   | `Comment` 自关联 `parentId`，递归查询  |
| 点赞幂等性       | 10-BE   | Prisma upsert + 唯一约束防重复点赞     |

### 技术栈

- **前端**: React 19 + Vite + Ant Design 5.x + Zustand + Socket.io-client + TanStack Query + Echarts
- **后端**: NestJS 11 + TypeScript + Prisma + MySQL + Socket.io + Passport + JWT
- **工具**: Coze API、Docker、ESLint + Prettier

### UI 风格要求（全局统一）

- 配色：蓝 #1890ff | 绿 #52c41a | 橙 #faad14 | 红 #ff4d4f
- 字体：14px 正文、12px 小字、600/700 标题
- 间距：8px 基础单位
- 圆角：卡片 8px、按钮 4px、头像 50%
- 阴影：Ant Design 标准
- 动画：300ms 缓动
- 响应式：6 个断点全覆盖
- 深色模式：所有页面必须支持

---

## 使用方法

1. 打开此文件后，按照模块顺序开发
2. 每完成一项任务，在对应的 `[ ]` 中标记 `[x]`
3. 完成整个模块后，在模块名称旁添加 ✓ 标记
4. 定期更新此文件，保持同步

---

**更新时间**: 2026-03-23  
**开发模式**: 前后端一体化模块开发  
**项目状态**: 规划完成，准备开始 ✓
