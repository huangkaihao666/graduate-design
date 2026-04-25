---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

---

## 本项目专属设计规范（毕设项目约束）

> 适用于 `/Users/huangkaihao/Desktop/graduate-design/frontend-react/` 下所有页面重构。
> **这些规范是底线约束，不是死规则。** 当遵守规范会导致视觉效果变差时，可以突破，但要记录原因。

---

### 主题策略：浅色为主，深色 Hero 允许例外

**原则**：截图需打印到纸质版论文，大面积深色背景会消耗墨水且文字不清晰。但局部深色区域（如 Hero Banner）可以使用深色渐变，只要：

- 文字是白色，打印对比度足够
- 深色区域面积有限（不超过页面 1/3）
- 深色区域内文字字号足够大（≥ 13px）

**已验证的例外**：首页 Hero Banner 使用深蓝渐变（`#0f2d5a → #1a4a8a → #0891b2`）+ 白色文字，视觉效果好，打印也清晰。

---

### 色彩系统（当前已确立）

#### 页面/布局层（浅色）

```css
--bg-page: #c8daea; /* 页面背景，蓝灰调 */
--bg-sidebar: #b8ccde; /* 侧边栏 */
--bg-toolbar: #d4e3f0; /* 工具栏/筛选栏 */
--surface: #ffffff; /* 卡片主体 */
--surface-footer: #f0f6fc; /* 卡片 footer */
```

#### 文字层

```css
--ink: #0f1e2e; /* 主文字，深墨 */
--ink-muted: #3a5068; /* 次级文字 */
--ink-light: #6b85a0; /* 辅助/占位 */
```

#### 主色

```css
--primary: #1a4a8a; /* 深蓝，按钮/选中态 */
--primary-light: #2563eb; /* 中蓝，hover */
--accent: #0891b2; /* 青蓝，渐变终点 */
--highlight: #7dd3fc; /* 亮青，Hero 内高亮文字/数字 */
```

#### Hero Banner（深色例外区）

```css
/* 背景渐变 */
background: linear-gradient(
  135deg,
  #0f2d5a 0%,
  #1a4a8a 45%,
  #1565a0 75%,
  #0891b2 100%
);
/* 文字 */
--hero-text: #ffffff;
--hero-text-muted: rgba(255, 255, 255, 0.65);
--hero-highlight: #7dd3fc; /* 标题高亮行、统计数字 */
/* 装饰 */
--hero-glass: rgba(255, 255, 255, 0.12); /* 毛玻璃卡片背景 */
```

---

### Hero Banner 设计规范（首页已验证）

**布局**：严格两列，`justify-content: space-between`

- 左列（`flex: 1`）：badge → 标题（flex-col）→ 描述 → 按钮组 → 统计行
- 右列（固定宽 `200px`）：3 张 Agent 毛玻璃卡片竖排

**尺寸**：`padding: 36px 48px`，不设 `min-height`，让内容自然撑高，避免空洞

**文字层次**（从上到下，字号递减）：

1. Badge：`11px`，半透明白底，`align-self: flex-start` 左对齐
2. 主标题：`30px / 900`，白色，两行用 flex-col + gap 分隔
3. 高亮行：同字号，`color: #7dd3fc`
4. 描述：`13px`，`rgba(255,255,255,0.65)`，`max-width: 420px`
5. 按钮组：主按钮白底深色字，次按钮毛玻璃
6. 统计行：`border-top` 分隔，数字 `18px #7dd3fc`，标签 `11px` 半透明

**填充空白**：内容不足时加统计数据行（AI专家数、RAG层数、实时特性等），禁止靠增大 padding 撑高度。

---

### 卡片规范

- **主体**：`background: #ffffff`，`border-radius: 14px`，`border: 1px solid rgba(255,255,255,0.7)`
- **封面区**：有图片时显示真实图片（`object-fit: cover`），**禁止用遮罩层覆盖图片**；无图片时用深色渐变占位（5种颜色轮换）
- **占位渐变**（无图片时）：深色系，如 `linear-gradient(135deg, #0f2d5a, #1a4a8a, #0891b2)`，配合点阵纹理
- **footer**：`background: #f0f6fc`，比主体深半档
- **hover**：上移 `6px`，加深阴影，顶部显现 `3px` 蓝色渐变线

### 工具栏 / 筛选栏规范

- 背景 `#d4e3f0`，有轻微阴影，圆角 `12px`
- 状态 Tab 默认：`rgba(255,255,255,0.45)` 半透明白底，深蓝文字
- 状态 Tab active：`#1a4a8a` 实色深蓝底，白色文字（不用边框激活，用填充色）
- 话题标签 active：同上，实色填充

### 侧边栏规范

- 背景 `#b8ccde`（比页面背景深一档），白色内容区形成层次
- 选中菜单项：`rgba(29,91,191,0.12)` 底色 + 左侧 `3px` 蓝色渐变竖线
- Logo icon：蓝色渐变方块（`#2563eb → #0ea5e9`），不用 emoji 直接裸放

### 按钮规范

- **主按钮（深色背景上）**：白底 `#ffffff` + 深色文字 `#0f2d5a`，`box-shadow: 0 4px 16px rgba(0,0,0,0.25)`
- **主按钮（浅色背景上）**：深蓝渐变 `#1a4a8a → #0891b2`，白色文字
- **次按钮（深色背景上）**：毛玻璃 `rgba(255,255,255,0.12)` + 白色描边 + 白色文字
- hover：上移 `2px` + 加深阴影，禁止颜色突变
- 高度：`42~44px`，圆角 `8px`，字重 `700`

### 背景装饰规范

- 浅色区域：`radial-gradient` 点阵纹，透明度 `0.35~0.5`
- 深色区域（Hero）：点阵纹透明度 `0.08`，orb 光晕透明度 `0.15~0.25`，`filter: blur(80px)`
- 禁止扫描光束动画、高频闪烁

### 动画规范

- 入场：`slideInLeft` / `slideInRight` / `fadeInUp`，时长 `0.7s`，`cubic-bezier(0.22,1,0.36,1)`
- 卡片 hover 位移 ≤ `6px`，时长 `0.26s`
- 禁止打印干扰动效

### 字体规范

- 全局：`-apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif`
- 禁止引入外部字体
