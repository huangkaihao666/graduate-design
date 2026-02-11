<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button, Card, Space, Divider, Alert, Spin, Tag, Input, Form, FormItem } from 'ant-design-vue'
import { api } from '../api'
import { useAppStore } from '../store/app'

const appStore = useAppStore()

// 状态
const loading = ref(false)
const responseData = ref<any>(null)
const requestLog = ref<string>('')
const testUrl = ref('http://localhost:3000/api/health')
const testMethod = ref<'get' | 'post' | 'put' | 'delete'>('get')
const testData = ref('{}')

// 添加日志
const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString()
  requestLog.value += `[${timestamp}] ${message}\n`
}

// 测试 GET 请求
const testGetRequest = async () => {
  loading.value = true
  requestLog.value = ''
  try {
    addLog('发起 GET 请求到 /api/health...')
    const response = await api.http.get('/health')
    responseData.value = response
    addLog('✅ 请求成功')
    console.log('GET Response:', response)
  } catch (error) {
    addLog(`❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`)
    console.error('GET Error:', error)
  } finally {
    loading.value = false
  }
}

// 测试 POST 请求
const testPostRequest = async () => {
  loading.value = true
  requestLog.value = ''
  try {
    addLog('发起 POST 请求到 /auth/login...')
    addLog('发送数据: { username: "test", password: "123456" }')
    const response = await api.user.login({
      username: 'test',
      password: '123456',
    })
    responseData.value = response
    addLog('✅ 请求成功')
    console.log('POST Response:', response)
  } catch (error) {
    addLog(`❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`)
    console.error('POST Error:', error)
  } finally {
    loading.value = false
  }
}

// 测试自定义请求
const testCustomRequest = async () => {
  loading.value = true
  requestLog.value = ''
  try {
    addLog(`发起 ${testMethod.value.toUpperCase()} 请求到 ${testUrl.value}...`)
    let response
    try {
      const data = testData.value ? JSON.parse(testData.value) : undefined
      if (testMethod.value === 'get') {
        response = await api.http.get(testUrl.value, { showNotification: false })
      } else if (testMethod.value === 'post') {
        response = await api.http.post(testUrl.value, data, { showNotification: false })
      } else if (testMethod.value === 'put') {
        response = await api.http.put(testUrl.value, data, { showNotification: false })
      } else if (testMethod.value === 'delete') {
        response = await api.http.delete(testUrl.value, { showNotification: false })
      }
    } catch (err) {
      addLog(`⚠️ 请求返回错误，但继续处理响应...`)
    }
    responseData.value = response
    addLog('✅ 请求完成')
  } catch (error) {
    addLog(`❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

// 设置认证令牌
const setToken = () => {
  const token = 'test-token-' + Date.now()
  api.http.setToken(token)
  addLog(`✅ 认证令牌已设置: ${token}`)
  appStore.showNotification('认证令牌已设置', 'success')
}

// 清除认证令牌
const clearToken = () => {
  api.http.clearToken()
  addLog('✅ 认证令牌已清除')
  appStore.showNotification('认证令牌已清除', 'success')
}

// 格式化 JSON
const formatJson = (obj: any) => {
  if (!obj) return ''
  return JSON.stringify(obj, null, 2)
}

onMounted(() => {
  addLog('API 演示页面已加载')
  addLog('环境配置:')
  addLog(`API Base URL: ${import.meta.env.VITE_API_BASE_URL}`)
  addLog(`Debug Mode: ${import.meta.env.VITE_DEBUG}`)
})
</script>

<template>
  <div class="api-demo">
    <header class="header">
      <h1>🔗 HTTP 请求演示</h1>
      <p>Axios + 拦截器测试页面</p>
    </header>

    <main class="main">
      <!-- 快速测试 -->
      <Card title="🚀 快速测试" style="max-width: 1000px; margin: 0 auto; margin-bottom: 2rem">
        <Alert
          type="info"
          message="快速测试 HTTP 请求功能"
          description="点击下方按钮测试不同的 HTTP 方法和拦截器功能"
          show-icon
          style="margin-bottom: 1.5rem"
        />

        <Space direction="vertical" style="width: 100%" :size="1">
          <div>
            <h3>基础请求测试</h3>
            <Space style="margin-bottom: 1rem">
              <Button type="primary" @click="testGetRequest" :loading="loading">
                测试 GET 请求
              </Button>
              <Button type="primary" @click="testPostRequest" :loading="loading">
                测试 POST 请求（模拟登录）
              </Button>
            </Space>
          </div>

          <Divider />

          <div>
            <h3>自定义请求</h3>
            <Form style="margin-bottom: 1rem">
              <FormItem label="请求方法">
                <select
                  v-model="testMethod"
                  style="padding: 5px 11px; border: 1px solid #d9d9d9; border-radius: 2px"
                >
                  <option value="get">GET</option>
                  <option value="post">POST</option>
                  <option value="put">PUT</option>
                  <option value="delete">DELETE</option>
                </select>
              </FormItem>
              <FormItem label="请求 URL">
                <Input v-model:value="testUrl" placeholder="输入完整 URL 或相对路径" />
              </FormItem>
              <FormItem v-if="testMethod !== 'get'" label="请求数据 (JSON)">
                <textarea
                  v-model="testData"
                  style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #d9d9d9;
                    border-radius: 2px;
                    font-family: monospace;
                    font-size: 12px;
                  "
                  rows="3"
                  placeholder="输入 JSON 格式数据"
                />
              </FormItem>
              <FormItem>
                <Button type="primary" @click="testCustomRequest" :loading="loading">
                  发送请求
                </Button>
              </FormItem>
            </Form>
          </div>

          <Divider />

          <div>
            <h3>认证令牌管理</h3>
            <Space style="margin-bottom: 1rem">
              <Button @click="setToken">设置认证令牌</Button>
              <Button @click="clearToken" danger>清除认证令牌</Button>
            </Space>
          </div>
        </Space>
      </Card>

      <!-- 请求日志 -->
      <Card title="📋 请求日志" style="max-width: 1000px; margin: 0 auto; margin-bottom: 2rem">
        <div
          style="
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 4px;
            font-family: 'Courier New';
            font-size: 12px;
            height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-all;
          "
        >
          {{ requestLog || '（暂无日志）' }}
        </div>
      </Card>

      <!-- 响应数据 -->
      <Card title="📤 响应数据" style="max-width: 1000px; margin: 0 auto; margin-bottom: 2rem">
        <Spin :spinning="loading">
          <div
            v-if="responseData"
            style="
              background: #f5f5f5;
              padding: 1rem;
              border-radius: 4px;
              font-family: 'Courier New';
              font-size: 12px;
              max-height: 400px;
              overflow-y: auto;
              white-space: pre-wrap;
              word-break: break-all;
            "
          >
            {{ formatJson(responseData) }}
          </div>
          <div v-else style="color: #999; text-align: center; padding: 2rem">
            （暂无响应数据，请先发送请求）
          </div>
        </Spin>
      </Card>

      <!-- API 功能说明 -->
      <Card title="ℹ️ API 功能说明" style="max-width: 1000px; margin: 0 auto">
        <Space direction="vertical" style="width: 100%">
          <div class="feature-item">
            <Tag color="blue">请求拦截器</Tag>
            <span>自动添加认证令牌、请求 ID、时间戳等</span>
          </div>
          <div class="feature-item">
            <Tag color="blue">响应拦截器</Tag>
            <span>统一处理 API 响应、业务错误、网络错误</span>
          </div>
          <div class="feature-item">
            <Tag color="green">错误处理</Tag>
            <span>自动捕获并显示错误提示，支持自定义错误消息</span>
          </div>
          <div class="feature-item">
            <Tag color="green">认证管理</Tag>
            <span>支持令牌的设置、清除和自动刷新</span>
          </div>
          <div class="feature-item">
            <Tag color="orange">通知系统</Tag>
            <span>支持请求成功/失败通知，可自定义通知行为</span>
          </div>
          <div class="feature-item">
            <Tag color="orange">环境配置</Tag>
            <span>支持开发/生产环境不同的 API 地址配置</span>
          </div>
          <div class="feature-item">
            <Tag color="purple">日志记录</Tag>
            <span>完整的请求/响应日志，便于调试</span>
          </div>
          <div class="feature-item">
            <Tag color="purple">通用 API</Tag>
            <span>提供分页、文件上传/下载等常用接口</span>
          </div>
        </Space>
      </Card>
    </main>
  </div>
</template>

<style scoped>
.api-demo {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 2rem;
}

.header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem 0;
  text-align: center;
  color: white;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.header p {
  font-size: 1rem;
  opacity: 0.9;
}

.main {
  display: flex;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}
</style>
