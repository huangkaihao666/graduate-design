---
name: frontend-design
description: 为本项目构建高质量前端页面和组件时使用。新增页面、重构样式、设计组件时激活，确保视觉风格与项目现有设计语言保持一致，同时保持高设计质量。
license: Complete terms in LICENSE.txt
---

# Frontend Design Skill — 毕设项目前端设计规范

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

---

## Design Thinking（动手前必读）

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

Then implement working code that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

---

## Frontend Aesthetics Guidelines

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions. Use Framer Motion for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth. Apply gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

NEVER use: overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (purple gradients on white), predictable layouts, cookie-cutter design.

---

## 项目上下文约束

> 以下是本项目的具体规范，在通用设计原则基础上叠加执行。

### 技术栈

- **框架**：React 18 + TypeScript
- **UI 库**：Ant Design 5.x
- **样式**：Less（模块化，每个页面对应 `.less` 文件）
- **状态管理**：Zustand
- **实时通信**：Socket.IO Client
- **路由**：React Router v6
- **页面目录**：`frontend-react/src/pages/`

### 整体风格定位

面向大学生群体，现代科技感 + 社区温度感：

- 不走纯白极简，有层次感和深度
- 不过度花哨，保持专业可信
- 辩论/决策场景：偏理性、有力量感
- 情绪辅导场景（AI 共情师）：偏温暖、安全感、柔和

### 色彩系统

- 主色：靛蓝系（`#4F46E5` 或 `#6366F1`）
- 辅色：柔和紫（`#8B5CF6`）
- 成功：`#10B981`｜警告：`#F59E0B`｜错误：`#EF4444`
- 背景：`#F8FAFC`（浅灰白）
- 卡片：`#FFFFFF` + `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`

### 字体

- 中文：`-apple-system, 'PingFang SC', 'Microsoft YaHei'`
- 英文/数字：`'DM Sans'` 或 `'Sora'`（Google Fonts）
- 标题：`font-weight: 700`，正文：`font-weight: 400`

### 间距与圆角

- 间距基准：4px 网格（`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px`）
- 卡片：`border-radius: 12px`｜按钮：`8px`｜标签：`6px`

### 动效规范

- 页面加载：`opacity 0→1` + `translateY(8px→0)`，`300ms ease`
- 卡片 hover：`translateY(-2px)` + 加深阴影，`200ms`
- 按钮点击：`scale(0.97)`，`100ms`

### 各场景设计要点

**辩论广场 / 案件卡片**

- 状态徽章：LIVE 红色脉冲动效，WAITING 灰色，CLOSED 绿色
- 卡片网格：`repeat(auto-fill, minmax(280px, 1fr))`

**辩论室**

- 三栏布局：左（案件信息）/ 中（辩论舞台）/ 右（弹幕聊天）
- 不同智能体消息用不同强调色边框区分
- 打字机效果：逐字追加，光标闪烁

**AI 共情师**

- 两栏布局：左侧会话列表 / 右侧聊天区（类 ChatGPT）
- 配色偏暖：米白、薰衣草紫、浅绿
- 整体氛围：安静、私密、有安全感

**情绪雷达**

- 核心视觉：Recharts 雷达图，六维情绪
- 情绪配色：焦虑=橙、平静=蓝、积极=绿

**成就中心**

- 徽章墙：已解锁高亮+发光效果，未解锁灰色半透明
- 等级进度条：渐变色，带动画填充

### 代码规范

文件结构：

```
pages/new-page/
├── NewPage.tsx
├── NewPage.less
└── index.ts
```

Ant Design 定制：使用 `ConfigProvider` 覆盖主题 token，不直接改 antd 样式。

### 禁止事项

- ❌ `style={{ }}` 内联样式（除动态值）
- ❌ 跳过 loading 状态和空状态设计
- ❌ 按钮没有 hover/active 状态
- ❌ 紫色渐变白底等 AI 生成感配色

### 参考现有页面

实现新页面前先读：

- `frontend-react/src/pages/home/Home.tsx` + `Home.less`
- `frontend-react/src/pages/debate-room/DebateRoom.tsx`
- `frontend-react/src/pages/profile/Profile.tsx`
