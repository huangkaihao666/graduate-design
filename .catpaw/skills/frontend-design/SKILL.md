---
name: frontend-design
description: 为本项目构建高质量前端页面和组件时使用。新增页面、重构样式、设计组件时激活，确保视觉风格与项目现有设计语言保持一致。
license: Complete terms in LICENSE.txt
---

# Frontend Design Skill — 毕设项目前端设计规范

## 项目技术栈

- **框架**：React 18 + TypeScript
- **UI 库**：Ant Design 5.x
- **样式**：Less（模块化，每个页面对应 `.less` 文件）
- **状态管理**：Zustand
- **实时通信**：Socket.IO Client
- **路由**：React Router v6
- **页面目录**：`frontend-react/src/pages/`
- **组件目录**：`frontend-react/src/components/`（如有）

---

## 设计方向

**整体风格**：现代科技感 + 社区温度感，面向大学生群体。

- 不走纯白极简，有层次感和深度
- 不过度花哨，保持专业可信
- 辩论/决策场景：偏理性、有力量感
- 情绪辅导场景（AI 共情师）：偏温暖、安全感、柔和

---

## 设计规范

### 色彩

参考项目现有页面的主色调，保持一致：

- 主色：靛蓝系（`#4F46E5` 或 `#6366F1`）
- 辅色：柔和紫（`#8B5CF6`）
- 成功色：`#10B981`
- 警告色：`#F59E0B`
- 错误色：`#EF4444`
- 背景：`#F8FAFC`（浅灰白）或深色模式 `#0F172A`
- 卡片背景：`#FFFFFF`，带 `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`

### 字体

- 中文：系统默认中文字体栈（`-apple-system, 'PingFang SC', 'Microsoft YaHei'`）
- 英文/数字：`'Inter'` 或 `'DM Sans'`（通过 Google Fonts 引入）
- 标题：`font-weight: 700`，正文：`font-weight: 400`

### 间距

遵循 4px 基准网格：`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px`

### 圆角

- 卡片：`border-radius: 12px`
- 按钮：`border-radius: 8px`
- 标签/Tag：`border-radius: 6px`
- 输入框：`border-radius: 8px`

### 动效

- 页面加载：`opacity 0 → 1`，`transform: translateY(8px) → 0`，`duration: 300ms`
- 卡片 hover：`transform: translateY(-2px)`，`box-shadow` 加深，`duration: 200ms`
- 按钮点击：`transform: scale(0.97)`，`duration: 100ms`
- 优先 CSS transition，复杂场景使用 Framer Motion

---

## 各场景设计要点

### 辩论广场 / 案件卡片

- 卡片展示封面图、标题、状态徽章、智能体头像、数据（浏览/点赞）
- 状态徽章：LIVE 用红色脉冲动效（`@keyframes pulse`），WAITING 用灰色，CLOSED 用绿色
- 卡片网格：`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`

### 辩论室

- 三栏布局：左（案件信息）/ 中（辩论舞台）/ 右（弹幕聊天）
- 智能体消息气泡：带头像，不同智能体用不同强调色边框
- 打字机效果：逐字追加，光标闪烁
- 投票条：渐变进度条，实时动画更新

### AI 共情师（聆心）

- 两栏布局：左侧会话列表 / 右侧聊天区
- 配色偏暖：使用柔和的米白、薰衣草紫、浅绿
- 消息气泡：用户右侧蓝色，辅导师左侧浅灰，带轻微阴影
- 整体氛围：安静、私密、有安全感

### 情绪雷达

- 核心视觉：ECharts 或 Recharts 雷达图，六维情绪
- 历史趋势：折线图，近30天
- 配色：情绪类型用不同颜色（焦虑=橙、平静=蓝、积极=绿）

### 成就中心

- 徽章墙：网格排列，已解锁高亮+发光效果，未解锁灰色半透明
- 等级进度条：渐变色，带动画填充
- 排行榜：紧凑列表，Top3 特殊样式

---

## 代码规范

### 文件结构

```
pages/new-page/
├── NewPage.tsx      # 主组件
├── NewPage.less     # 样式（模块化）
└── index.ts         # 导出
```

### Less 变量（与项目保持一致）

```less
@primary-color: #4f46e5;
@border-radius-base: 8px;
@card-radius: 12px;
@transition-base: all 0.2s ease;
```

### 组件模板

```tsx
import React from "react";
import "./NewPage.less";

const NewPage: React.FC = () => {
  return <div className="new-page">{/* 内容 */}</div>;
};

export default NewPage;
```

### Ant Design 定制

- 使用 `ConfigProvider` 全局覆盖主题 token，不直接修改 antd 样式
- 优先使用 Ant Design 组件，需要定制时用 `className` + Less 覆盖

---

## 禁止事项

- ❌ 不使用 `style={{ }}` 内联样式（除动态值外）
- ❌ 不使用 `Arial`、`Roboto`、`system-ui` 等通用字体
- ❌ 不用紫色渐变白底这类 AI 生成感强的配色
- ❌ 不在没有 hover/active 状态的情况下提交按钮组件
- ❌ 不跳过 loading 状态和空状态的设计

---

## 参考现有页面

实现新页面前，先阅读以下文件了解现有风格：

- `frontend-react/src/pages/home/Home.tsx` + `Home.less`（广场页）
- `frontend-react/src/pages/debate-room/DebateRoom.tsx`（辩论室，最复杂）
- `frontend-react/src/pages/profile/Profile.tsx`（个人中心）
