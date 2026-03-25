import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, Spin, theme as antdTheme } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { router } from '@/router'
import { useUIStore } from '@/store'
import { lightTheme, darkTheme } from '@/utils/theme'
import 'antd/dist/reset.css'
import './App.less'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 1000 * 60 * 5,
    },
  },
})

// 全局自定义 Spin 指示器：双环旋转动画
const GlobalSpinIndicator = (
  <LoadingOutlined
    style={{ fontSize: 28, color: '#6366F1' }}
    spin
  />
)

// 设置全局默认 Spin 指示器
Spin.setDefaultIndicator(GlobalSpinIndicator)

function App() {
  const { themeMode } = useUIStore()
  const isDark = themeMode === 'dark'
  const theme = isDark ? darkTheme : lightTheme

  // 同步 data-theme 到 body，驱动 CSS 变量切换
  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode)
  }, [themeMode])

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          ...theme,
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        }}
        // ── 全局组件默认属性 ──────────────────────────────────
        button={{
          // 所有按钮默认 round 圆角
          autoInsertSpace: false,
        }}
        skeleton={{
          // 骨架屏样式配置
        }}
        spin={{
          // 统一 indicator
          indicator: GlobalSpinIndicator,
        }}
        input={{
          // 输入框默认允许清除
          allowClear: false,
          autoComplete: 'off',
        }}
        select={{
          // Select 默认支持搜索
          showSearch: false,
        }}
        table={{
          // 表格 rowKey 默认 id
          rowKey: 'id',
        }}
        pagination={{
          // 分页条目较多时显示条目选择
          showSizeChanger: true,
        }}
        empty={{
          // 空状态配置
        }}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App
