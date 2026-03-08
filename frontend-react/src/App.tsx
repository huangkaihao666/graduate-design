import { RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
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

function App() {
  const { themeMode } = useUIStore()
  const theme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App