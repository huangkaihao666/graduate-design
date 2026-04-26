import type { ThemeConfig } from 'antd'

/**
 * 多智能体决策辩论平台 - 全局主题配置
 *
 * 主题色方案：
 *   - 主色：深紫蓝 #6366F1 (Indigo-500)，象征理性决策与智慧
 *   - 渐变辅助：#8B5CF6 (Violet-500)，象征多元视角
 *   - Agent A（直言者）：#F97316 - 橙色，锐利直接
 *   - Agent B（共情师）：#10B981 - 翠绿，温暖包容
 *   - Agent C（法律顾问）：#3B82F6 - 蓝色，理性严谨
 */

// CSS 变量注入，供 less 文件使用
export const cssVars = {
  '--color-primary': '#6366F1',
  '--color-primary-hover': '#4F46E5',
  '--color-primary-light': '#EEF2FF',
  '--color-secondary': '#8B5CF6',
  '--color-agent-a': '#F97316',
  '--color-agent-b': '#10B981',
  '--color-agent-c': '#3B82F6',
  '--gradient-primary': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  '--gradient-hero': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
  '--gradient-card': 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
}

export const lightTheme: ThemeConfig = {
  token: {
    // ── 主色系 ──────────────────────────────────────────
    colorPrimary: '#6366F1',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',

    // ── 字体 ────────────────────────────────────────────
    fontSize: 14,
    fontFamily: `'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont,
      'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif`,

    // ── 间距 ────────────────────────────────────────────
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginLG: 24,
    marginXL: 32,

    // ── 圆角 ────────────────────────────────────────────
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,

    // ── 阴影 ────────────────────────────────────────────
    boxShadow: '0 1px 3px rgba(99,102,241,0.08), 0 4px 16px rgba(99,102,241,0.06)',
    boxShadowSecondary: '0 6px 24px rgba(99,102,241,0.12), 0 1px 4px rgba(0,0,0,0.06)',

    // ── 颜色 ────────────────────────────────────────────
    colorTextBase: '#0f1e2e',
    colorTextSecondary: '#3a5068',
    colorTextTertiary: '#6b85a0',
    colorBgBase: '#e8f2f8',
    colorBgContainer: '#ddeaf4',   // Card、Input、Select 等组件背景
    colorBgLayout: '#c8daea',      // 页面背景
    colorBgElevated: '#eef5fb',    // 浮层（Dropdown、Modal）背景
    colorBorder: 'rgba(26,74,138,0.18)',
    colorBorderSecondary: 'rgba(26,74,138,0.1)',
    colorFill: '#d4e6f2',
    colorFillSecondary: '#c8daea',

    // ── 过渡 ────────────────────────────────────────────
    motionUnit: 0.08,
    motionDurationSlow: '0.4s',
    motionDurationMid: '0.25s',
    motionDurationFast: '0.15s',
  },

  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 8,
      fontWeight: 600,
      primaryShadow: '0 4px 12px rgba(99,102,241,0.35)',
    },
    Input: {
      controlHeight: 40,
      borderRadius: 8,
      fontSize: 14,
      activeBorderColor: '#6366F1',
      hoverBorderColor: '#818CF8',
      activeShadow: '0 0 0 3px rgba(99,102,241,0.12)',
    },
    Card: {
      borderRadiusLG: 12,
      colorBgContainer: '#ddeaf4',
      boxShadowTertiary: '0 1px 6px rgba(15,45,90,0.08)',
    },
    Form: {
      labelFontSize: 13,
      labelColor: '#3a5068',
    },
    Tabs: {
      controlHeight: 40,
      inkBarColor: '#1a4a8a',
      itemActiveColor: '#1a4a8a',
      itemSelectedColor: '#1a4a8a',
      itemHoverColor: '#2563eb',
    },
    Select: {
      controlHeight: 40,
      borderRadius: 8,
      colorBgContainer: '#ddeaf4',
      optionSelectedBg: 'rgba(26,74,138,0.12)',
      optionSelectedColor: '#1a4a8a',
    },
    DatePicker: {
      controlHeight: 40,
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Tooltip: {
      borderRadius: 8,
      colorBgSpotlight: '#1E1B4B',
    },
    Menu: {
      colorBgContainer: '#b8ccde',
      itemSelectedBg: 'rgba(26,74,138,0.12)',
      itemSelectedColor: '#1a4a8a',
      itemHoverBg: 'rgba(26,74,138,0.07)',
      itemHoverColor: '#1a4a8a',
      subMenuItemBg: '#b8ccde',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Badge: {
      colorBgContainer: '#6366F1',
    },
    Progress: {
      defaultColor: '#6366F1',
      remainingColor: '#EEF2FF',
      lineBorderRadius: 999,
    },
    Statistic: {
      contentFontSize: 28,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#c8daea',
      headerColor: '#3a5068',
      rowHoverBg: 'rgba(26,74,138,0.06)',
      colorBgContainer: '#ddeaf4',
    },
    Layout: {
      headerBg: '#b8ccde',
      siderBg: '#b8ccde',
      bodyBg: '#c8daea',
    },
    Skeleton: {
      blockRadius: 8,
      titleHeight: 20,
      paragraphLiHeight: 16,
      paragraphMarginTop: 12,
      gradientFromColor: '#c8daea',
      gradientToColor: '#b8ccde',
    },
    Spin: {
      colorPrimary: '#6366F1',
    },
    Alert: {
      borderRadius: 10,
    },
    Notification: {
      borderRadiusLG: 14,
    },
    Message: {
      borderRadiusLG: 10,
    },
    Empty: {
      colorTextDisabled: '#94A3B8',
    },
    Popover: {
      borderRadiusOuter: 12,
    },
    Dropdown: {
      borderRadius: 10,
      paddingBlock: 4,
    },
    Collapse: {
      borderRadius: 10,
      headerBg: '#FAFBFF',
    },
    Upload: {
      borderRadius: 10,
    },
    Radio: {
      buttonSolidCheckedBg: '#6366F1',
      buttonSolidCheckedColor: '#fff',
    },
    Switch: {
      colorPrimary: '#6366F1',
      colorPrimaryHover: '#818CF8',
    },
  },
}

export const darkTheme: ThemeConfig = {
  token: {
    // ── 主色系 ──────────────────────────────────────────
    colorPrimary: '#818CF8',
    colorSuccess: '#34D399',
    colorWarning: '#FBBF24',
    colorError: '#F87171',
    colorInfo: '#60A5FA',

    // ── 字体 ────────────────────────────────────────────
    fontSize: 14,
    fontFamily: `'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont,
      'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif`,

    // ── 间距 ────────────────────────────────────────────
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginLG: 24,
    marginXL: 32,

    // ── 圆角 ────────────────────────────────────────────
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,

    // ── 阴影 ────────────────────────────────────────────
    boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)',
    boxShadowSecondary: '0 6px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)',

    // ── 颜色 ────────────────────────────────────────────
    colorTextBase: '#E2E8F0',
    colorTextSecondary: '#94A3B8',
    colorTextTertiary: '#64748B',
    colorBgBase: '#0F0E1A',
    colorBgContainer: '#1A1826',
    colorBgLayout: '#0F0E1A',
    colorBgElevated: '#1E1B2E',
    colorBorder: '#2D2B45',
    colorBorderSecondary: '#1E1B2E',
    colorFill: 'rgba(129,140,248,0.06)',
    colorFillSecondary: 'rgba(129,140,248,0.04)',

    // ── 过渡 ────────────────────────────────────────────
    motionUnit: 0.08,
    motionDurationSlow: '0.4s',
    motionDurationMid: '0.25s',
    motionDurationFast: '0.15s',
  },

  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 8,
      fontWeight: 600,
      primaryShadow: '0 4px 12px rgba(129,140,248,0.4)',
    },
    Input: {
      controlHeight: 40,
      borderRadius: 8,
      fontSize: 14,
      colorBgContainer: '#1A1826',
      activeBorderColor: '#818CF8',
      hoverBorderColor: '#6366F1',
      activeShadow: '0 0 0 3px rgba(129,140,248,0.15)',
    },
    Card: {
      borderRadiusLG: 14,
      colorBgContainer: '#1A1826',
    },
    Form: {
      labelFontSize: 14,
      labelColor: '#CBD5E1',
    },
    Tabs: {
      controlHeight: 40,
      inkBarColor: '#818CF8',
      itemActiveColor: '#818CF8',
      itemSelectedColor: '#818CF8',
      itemHoverColor: '#A5B4FC',
    },
    Select: {
      controlHeight: 40,
      borderRadius: 8,
      colorBgContainer: '#1A1826',
      optionSelectedBg: 'rgba(129,140,248,0.15)',
      optionSelectedColor: '#818CF8',
    },
    DatePicker: {
      controlHeight: 40,
      borderRadius: 8,
      colorBgContainer: '#1A1826',
    },
    Modal: {
      borderRadiusLG: 16,
      contentBg: '#1A1826',
      headerBg: '#1A1826',
    },
    Tooltip: {
      borderRadius: 8,
      colorBgSpotlight: '#2D2B45',
    },
    Menu: {
      colorBgContainer: '#1A1826',
      itemSelectedBg: 'rgba(129,140,248,0.15)',
      itemSelectedColor: '#818CF8',
      itemHoverBg: 'rgba(129,140,248,0.08)',
      itemHoverColor: '#A5B4FC',
      subMenuItemBg: '#1A1826',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Progress: {
      defaultColor: '#818CF8',
      remainingColor: 'rgba(129,140,248,0.12)',
      lineBorderRadius: 999,
    },
    Statistic: {
      contentFontSize: 28,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#1E1B2E',
      headerColor: '#CBD5E1',
      rowHoverBg: 'rgba(129,140,248,0.08)',
      colorBgContainer: '#1A1826',
    },
    Layout: {
      headerBg: '#1A1826',
      siderBg: '#1A1826',
      bodyBg: '#0F0E1A',
    },
    Skeleton: {
      blockRadius: 8,
      titleHeight: 20,
      paragraphLiHeight: 16,
      paragraphMarginTop: 12,
      gradientFromColor: '#1E1B2E',
      gradientToColor: '#2D2B45',
    },
    Spin: {
      colorPrimary: '#818CF8',
    },
    Alert: {
      borderRadius: 10,
    },
    Notification: {
      borderRadiusLG: 14,
    },
    Message: {
      borderRadiusLG: 10,
    },
    Collapse: {
      borderRadius: 10,
      headerBg: '#1E1B2E',
    },
    Upload: {
      borderRadius: 10,
    },
    Switch: {
      colorPrimary: '#818CF8',
      colorPrimaryHover: '#6366F1',
    },
  },
}
