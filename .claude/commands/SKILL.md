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

> 以下规则优先级高于上方通用规范，适用于 `/Users/huangkaihao/Desktop/graduate-design/frontend-react/` 下所有页面重构。

### 强制：浅色主题（有色温，非纯白）

**必须使用浅色调**，原因：截图需打印到纸质版论文，深色背景打印后文字不清晰、墨水消耗大。

**重要**：「浅色」不等于「白色」。背景必须有明确的色彩感（蓝灰调），卡片比背景浅一档但也带色温，禁止纯白 `#ffffff` 作为大面积背景或卡片底色。用户反馈「太白」时，应换用更深的有色背景，而非微调白色深度。

- 页面背景：石板蓝灰，参考 `#b8c8d8`（有明确色温，不发白）
- 卡片/面板：比背景浅一档的蓝调，参考 `#e8f0f8`，禁止纯白
- 输入框：`#dce8f4`，比卡片再深半档
- 文字：深墨色（`#0f1e2e`）保证打印对比度
- 装饰光效（orb/gradient）：透明度 ≤ 0.2，打印时几乎不可见
- 禁止使用实景背景图（`url(...)`），改用 CSS 几何纹理（点阵）

### 主色调规范（已确立，后续页面保持统一）

```css
/* 页面背景：石板蓝灰，有色温 */
--bg-page: #b8c8d8;
/* 卡片/面板：带蓝调的浅色 */
--surface: #e8f0f8;
/* 输入框底色 */
--surface-input: #dce8f4;
/* 主文字 */
--ink: #0f1e2e;
/* 次级文字 */
--ink-muted: #3a4f63;
/* 辅助/占位文字 */
--ink-light: #6b85a0;
/* 主色：靛蓝 */
--primary: #1d5bbf;
--primary-dark: #154fa8;
--primary-light: #2e72d2;
/* 强调色：青蓝 */
--accent: #0891b2;
/* 描边 */
--border: rgba(29, 91, 191, 0.2);
--border-soft: rgba(15, 30, 46, 0.12);
```

### 色阶层次（从深到浅，每层约差 #10～#18）

```
页面背景  #b8c8d8  ← 最深，有色彩感
侧边栏    #c8d6e4
卡片/面板 #e8f0f8
输入框    #dce8f4
工具栏    #d4e0ec
标签/Tag  #cdd8e8
```

### 背景装饰规范

- 使用 `radial-gradient` 点阵纹（透明度 ≤ 0.45）替代实景图
- 可用极淡的几何 orb（`filter: blur(100px)`，透明度 ≤ 0.1）
- 禁止扫描光束（`scanLine` 动画）等高对比度动态效果

### 卡片 / 面板规范

- 白底（`#ffffff`）+ 细描边（`1px solid rgba(0,0,0,0.08)`）
- 顶部装饰线：`3px` 蓝色渐变（`var(--auth-primary) → var(--auth-accent)`）
- 阴影：`0 8px 32px rgba(37,99,235,0.12), 0 2px 8px rgba(0,0,0,0.06)`
- 圆角：`16px ~ 20px`

### 按钮规范

- 主按钮：蓝色渐变（`#2563eb → #0ea5e9`），白色文字，`box-shadow` 带蓝色光晕
- hover：上移 2px + 加深阴影，禁止颜色突变
- 高度：`44px`，圆角 `8px`，字重 700

### 动画规范

- 入场：`slideInLeft` / `slideInRight` / `fadeInUp`，时长 `0.7s`，easing `cubic-bezier(0.22,1,0.36,1)`
- 悬浮：卡片 hover 位移不超过 `6px`，时长 `0.3s`
- 禁止高频闪烁、扫描线等打印干扰动效

### 字体规范

- 正文 / UI：`-apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif`
- 禁止引入外部字体（避免网络依赖影响截图稳定性）
