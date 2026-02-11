<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';

const authStore = useAuthStore();

// 初始化认证
authStore.initializeAuth();

// 标签页
const activeTab = ref('login');

// 登录表单
const loginForm = ref({
  email: 'test@example.com',
  password: 'password123',
});

// 注册表单
const registerForm = ref({
  email: '',
  password: '',
  name: '',
});

// 处理登录
const handleLogin = async () => {
  try {
    await authStore.login(loginForm.value);
    message.success('登录成功！');
    activeTab.value = 'profile';
  } catch (error: any) {
    message.error(error?.message || '登录失败');
  }
};

// 处理注册
const handleRegister = async () => {
  if (!registerForm.value.email || !registerForm.value.password || !registerForm.value.name) {
    message.warning('请填写所有字段');
    return;
  }
  try {
    await authStore.register(registerForm.value);
    message.success('注册成功！');
    activeTab.value = 'profile';
  } catch (error: any) {
    message.error(error?.message || '注册失败');
  }
};

// 处理登出
const handleLogout = () => {
  authStore.logout();
  message.info('已登出');
  activeTab.value = 'login';
};

// 刷新 token
const handleRefreshToken = async () => {
  try {
    await authStore.refreshAccessToken();
    message.success('Token 已刷新！');
  } catch (error: any) {
    message.error(error?.message || '刷新失败');
  }
};

// API 测试列表
const apiColumns = [
  { title: '方法', dataIndex: 'method', key: 'method', width: 80 },
  { title: '端点', dataIndex: 'url', key: 'url' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '操作', key: 'action', width: 100 },
];

const apiEndpoints = [
  {
    method: 'POST',
    url: '/auth/login',
    description: '用户登录',
  },
  {
    method: 'POST',
    url: '/auth/register',
    description: '用户注册',
  },
  {
    method: 'GET',
    url: '/auth/profile',
    description: '获取用户信息 (需要认证)',
  },
  {
    method: 'POST',
    url: '/auth/refresh',
    description: '刷新 Token',
  },
  {
    method: 'GET',
    url: '/users',
    description: '获取所有用户',
  },
];

const testApi = (method: string, url: string) => {
  message.info(`测试 ${method} ${url}`);
};
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>🎓 毕业设计项目 - 鉴权测试</h1>
      <p>Passport + JWT 认证系统</p>
    </div>

    <div class="tabs-wrapper">
      <a-tabs v-model:active-key="activeTab" type="card">
        <!-- 登录标签 -->
        <a-tab-pane key="login" tab="📝 登录">
          <div class="form-container">
            <a-form layout="vertical" class="auth-form">
              <a-form-item label="邮箱" required>
                <a-input
                  v-model:value="loginForm.email"
                  placeholder="请输入邮箱地址"
                  type="email"
                  size="large"
                  prefix="@"
                />
              </a-form-item>
              <a-form-item label="密码" required>
                <a-input-password
                  v-model:value="loginForm.password"
                  placeholder="请输入密码"
                  size="large"
                />
              </a-form-item>
              <a-form-item>
                <a-button
                  type="primary"
                  block
                  size="large"
                  :loading="authStore.loading"
                  @click="handleLogin"
                >
                  立即登录
                </a-button>
              </a-form-item>
              <div class="tip">
                <a-alert
                  message="💡 测试账号"
                  description="邮箱: test@example.com / 密码: password123"
                  type="info"
                  show-icon
                  :closable="false"
                />
              </div>
            </a-form>
          </div>
        </a-tab-pane>

        <!-- 注册标签 -->
        <a-tab-pane key="register" tab="📋 注册">
          <div class="form-container">
            <a-form layout="vertical" class="auth-form">
              <a-form-item label="用户名" required>
                <a-input
                  v-model:value="registerForm.name"
                  placeholder="请输入用户名"
                  size="large"
                />
              </a-form-item>
              <a-form-item label="邮箱地址" required>
                <a-input
                  v-model:value="registerForm.email"
                  placeholder="请输入邮箱地址"
                  type="email"
                  size="large"
                  prefix="@"
                />
              </a-form-item>
              <a-form-item label="设置密码" required>
                <a-input-password
                  v-model:value="registerForm.password"
                  placeholder="请输入密码（至少6位）"
                  size="large"
                />
              </a-form-item>
              <a-form-item>
                <a-button
                  type="primary"
                  block
                  size="large"
                  :loading="authStore.loading"
                  @click="handleRegister"
                >
                  立即注册
                </a-button>
              </a-form-item>
            </a-form>
          </div>
        </a-tab-pane>

        <!-- 用户信息标签 -->
        <a-tab-pane key="profile" tab="👤 用户信息">
          <div class="profile-container">
            <div v-if="authStore.isAuthenticated" class="user-info">
              <a-alert message="✅ 已登录" type="success" show-icon class="alert" />

              <div class="info-section">
                <h3>用户信息</h3>
                <a-descriptions :column="1" bordered>
                  <a-descriptions-item label="ID">
                    {{ authStore.user?.id || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="邮箱">
                    {{ authStore.user?.email || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="名称">
                    {{ authStore.user?.name || '-' }}
                  </a-descriptions-item>
                </a-descriptions>
              </div>

              <div class="info-section">
                <h3>Token 信息</h3>
                <a-descriptions :column="1" bordered>
                  <a-descriptions-item label="Access Token">
                    <code class="token-code">{{ authStore.accessToken?.substring(0, 20) }}...</code>
                  </a-descriptions-item>
                  <a-descriptions-item label="Refresh Token">
                    <code class="token-code"
                      >{{ authStore.refreshToken?.substring(0, 20) }}...</code
                    >
                  </a-descriptions-item>
                </a-descriptions>
              </div>

              <div class="button-group">
                <a-button :loading="authStore.loading" @click="handleRefreshToken">
                  🔄 刷新 Token
                </a-button>
                <a-button type="danger" @click="handleLogout"> 🚪 登出 </a-button>
              </div>
            </div>
            <div v-else class="not-authenticated">
              <a-alert message="❌ 未登录" description="请先登录或注册" type="warning" show-icon />
            </div>
          </div>
        </a-tab-pane>

        <!-- API 测试标签 -->
        <a-tab-pane key="api" tab="🧪 API 测试">
          <div class="api-test-container">
            <h3>API 端点测试</h3>
            <a-table
              :columns="apiColumns"
              :data-source="apiEndpoints"
              :pagination="false"
              bordered
              size="small"
              class="api-table"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="testApi(record.method, record.url)">
                    测试
                  </a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<style scoped lang="less">
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;

  .header {
    text-align: center;
    color: white;
    margin-bottom: 40px;

    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 600;
    }

    p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
  }

  .tabs-wrapper {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .form-container {
    padding: 40px 30px;

    .auth-form {
      max-width: 600px;
      margin: 0 auto;

      :deep(.ant-form-item) {
        margin-bottom: 25px;
      }

      :deep(.ant-form-item-label) {
        margin-bottom: 10px;
        label {
          font-weight: 600;
          color: #333;
          font-size: 15px;
        }
      }

      :deep(.ant-input),
      :deep(.ant-input-password) {
        border-radius: 4px;
        border: 1px solid #d9d9d9;
        transition: all 0.3s;

        &:hover {
          border-color: #40a9ff;
        }

        &:focus {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }
      }
    }

    .tip {
      margin-top: 20px;
    }
  }

  .profile-container {
    padding: 40px 30px;

    .user-info {
      .alert {
        margin-bottom: 30px;
      }

      .info-section {
        margin-bottom: 35px;

        h3 {
          margin-bottom: 18px;
          font-size: 1.15rem;
          font-weight: 600;
          color: #1890ff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :deep(.ant-descriptions) {
          background: #fafafa;
          border-radius: 4px;
        }

        :deep(.ant-descriptions-item-content) {
          word-break: break-all;
        }
      }

      .token-code {
        background: #f5f5f5;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #d4380d;
        font-family: 'Monaco', 'Courier New', monospace;
        letter-spacing: 0.5px;
      }

      .button-group {
        display: flex;
        gap: 12px;
        margin-top: 35px;
        flex-wrap: wrap;

        .ant-btn {
          flex: 1;
          min-width: 150px;
          border-radius: 4px;
          height: 40px;
          font-size: 15px;
        }
      }
    }

    .not-authenticated {
      text-align: center;
      padding: 80px 20px;

      :deep(.ant-alert) {
        max-width: 400px;
        margin: 0 auto;
      }
    }
  }

  .api-test-container {
    padding: 40px 30px;

    h3 {
      margin-bottom: 25px;
      font-size: 1.15rem;
      font-weight: 600;
      color: #333;
    }

    :deep(.api-table) {
      margin-top: 20px;
      background: white;

      .ant-table {
        border-radius: 4px;
      }

      .ant-btn-link {
        font-size: 14px;
      }
    }
  }
}

:deep(.ant-tabs-tab) {
  font-size: 1rem;
  font-weight: 500;
}
</style>
