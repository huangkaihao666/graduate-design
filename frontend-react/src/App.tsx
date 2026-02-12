import { RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { router } from '@/router'
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
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App