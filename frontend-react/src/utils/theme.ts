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
    colorTextBase: '#1E1B4B',
    colorTextSecondary: '#64748B',
    colorTextTertiary: '#94A3B8',
    colorBgBase: '#FFFFFF',
    colorBgContainer: '#FAFAFA',
    colorBgLayout: '#F1F5F9',
    colorBgElevated: '#FFFFFF',
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    colorFill: '#F8FAFF',
    colorFillSecondary: '#F1F5F9',

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
      borderRadiusLG: 14,
      boxShadowTertiary: '0 1px 3px rgba(99,102,241,0.08), 0 4px 16px rgba(99,102,241,0.06)',
    },
    Form: {
      labelFontSize: 14,
      labelColor: '#374151',
    },
    Tabs: {
      controlHeight: 40,
      inkBarColor: '#6366F1',
      itemActiveColor: '#6366F1',
      itemSelectedColor: '#6366F1',
      itemHoverColor: '#818CF8',
    },
    Select: {
      controlHeight: 40,
      borderRadius: 8,
      optionSelectedBg: '#EEF2FF',
      optionSelectedColor: '#6366F1',
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
      itemSelectedBg: '#EEF2FF',
      itemSelectedColor: '#6366F1',
      itemHoverBg: '#F5F3FF',
      itemHoverColor: '#6366F1',
      subMenuItemBg: '#FAFAFA',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Badge: {
      colorBgContainer: '#6366F1',
    },
    Progress: {
      defaultColor: '#6366F1',
    },
    Statistic: {
      contentFontSize: 28,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#F8FAFF',
      headerColor: '#374151',
      rowHoverBg: '#F5F3FF',
    },
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#F1F5F9',
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
  },
}
