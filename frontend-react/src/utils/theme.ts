import type { ThemeConfig } from 'antd'

/**
 * Ant Design 全局主题配置
 * 统一管理所有颜色、间距、圆角等样式
 */

export const lightTheme: ThemeConfig = {
  token: {
    // 主色系
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',

    // 字体
    fontSize: 14,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif`,

    // 间距（基础单位 8px）
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginLG: 24,
    marginXL: 32,

    // 圆角
    borderRadius: 8,

    // 阴影
    boxShadowSecondary: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',

    // 颜色
    colorTextBase: '#262626',
    colorTextSecondary: '#666666',
    colorBgBase: '#ffffff',
    colorBorder: '#e8e8e8',
    colorBgContainer: '#fafafa',
    colorBgLayout: '#ffffff',

    // 过渡时间
    motionUnit: 0.1,
  },

  components: {
    // Button 配置
    Button: {
      controlHeight: 40,
      borderRadius: 6,
      fontWeight: 500,
    },

    // Input 配置
    Input: {
      controlHeight: 40,
      borderRadius: 6,
      fontSize: 14,
    },

    // Card 配置
    Card: {
      borderRadius: 12,
      boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08)',
    },

    // Form 配置
    Form: {
      labelFontSize: 14,
      labelColor: '#262626',
    },

    // Tabs 配置
    Tabs: {
      controlHeight: 40,
      borderRadius: 6,
    },

    // Select 配置
    Select: {
      controlHeight: 40,
      borderRadius: 6,
    },

    // DatePicker 配置
    DatePicker: {
      controlHeight: 40,
      borderRadius: 6,
    },

    // Modal 配置
    Modal: {
      borderRadiusLG: 12,
    },

    // Tooltip 配置
    Tooltip: {
      borderRadius: 6,
    },
  },
}

export const darkTheme: ThemeConfig = {
  token: {
    // 主色系
    colorPrimary: '#177ddc',
    colorSuccess: '#58d9a6',
    colorWarning: '#ffa940',
    colorError: '#f5534b',
    colorInfo: '#177ddc',

    // 字体
    fontSize: 14,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif`,

    // 间距
    margin: 16,
    marginXS: 8,
    marginSM: 12,
    marginLG: 24,
    marginXL: 32,

    // 圆角
    borderRadius: 8,

    // 颜色
    colorTextBase: '#e8e8e8',
    colorTextSecondary: '#999999',
    colorBgBase: '#141414',
    colorBorder: '#434343',
    colorBgContainer: '#1f1f1f',
    colorBgLayout: '#000000',

    // 过渡时间
    motionUnit: 0.1,
  },

  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 6,
      fontWeight: 500,
    },

    Input: {
      controlHeight: 40,
      borderRadius: 6,
      fontSize: 14,
    },

    Card: {
      borderRadius: 12,
    },

    Form: {
      labelFontSize: 14,
    },

    Tabs: {
      controlHeight: 40,
      borderRadius: 6,
    },

    Select: {
      controlHeight: 40,
      borderRadius: 6,
    },

    DatePicker: {
      controlHeight: 40,
      borderRadius: 6,
    },

    Modal: {
      borderRadiusLG: 12,
    },

    Tooltip: {
      borderRadius: 6,
    },
  },
}
