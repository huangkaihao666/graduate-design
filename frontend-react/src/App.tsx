import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
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
  const theme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={theme}
        // ── 全局组件默认属性 ──────────────────────────────────
        button={{
          // 所有按钮默认 round 圆角
          autoInsertSpace: false,
        }}
        skeleton={{
          // 骨架屏默认开启动画
          active: true,
          round: true,
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
          size: 'middle',
        }}
        pagination={{
          // 分页条目较多时显示条目选择
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        empty={{
          description: '暂无数据',
        }}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App
