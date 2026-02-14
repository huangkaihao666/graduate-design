<template>
  <div class="auth-container">
    <div class="auth-bg"></div>
    <div class="auth-content">
      <div class="auth-card">
        <div class="auth-left">
          <div class="brand">
            <div class="logo">
              <span class="icon">📸</span>
            </div>
            <h1>旅拍 · 智享</h1>
            <p class="slogan">AI 驱动的现代化婚纱旅拍平台</p>
          </div>
          <div class="features">
            <div class="feature-item">
              <span class="feature-icon">🤖</span>
              <span>AI 虚拟试拍</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✨</span>
              <span>智能风格推荐</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🗺️</span>
              <span>智能行程规划</span>
            </div>
          </div>
        </div>

        <div class="auth-right">
          <div class="form-header">
            <h2>{{ isLogin ? '欢迎登录' : '创建账号' }}</h2>
            <p>{{ isLogin ? '登录以管理您的旅拍计划' : '开启您的浪漫旅拍之旅' }}</p>
          </div>

          <a-form layout="vertical" class="auth-form">
            <a-form-item v-if="!isLogin" name="name">
              <a-input v-model:value="formState.name" placeholder="用户名" size="large">
                <template #prefix>
                  <UserOutlined class="input-icon" />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item name="email">
              <a-input v-model:value="formState.email" placeholder="邮箱地址" size="large">
                <template #prefix>
                  <MailOutlined class="input-icon" />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item name="password">
              <a-input-password v-model:value="formState.password" placeholder="密码" size="large">
                <template #prefix>
                  <LockOutlined class="input-icon" />
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item v-if="!isLogin" name="confirmPassword">
              <a-input-password
                v-model:value="formState.confirmPassword"
                placeholder="确认密码"
                size="large"
              >
                <template #prefix>
                  <SafetyOutlined class="input-icon" />
                </template>
              </a-input-password>
            </a-form-item>

            <div class="form-actions">
              <a-button
                type="primary"
                block
                size="large"
                :loading="loading"
                class="submit-btn"
                @click="handleSubmit"
              >
                {{ isLogin ? '登 录' : '注 册' }}
              </a-button>
            </div>

            <div class="form-footer">
              <span>{{ isLogin ? '还没有账号？' : '已有账号？' }}</span>
              <a @click.prevent="toggleMode">{{ isLogin ? '立即注册' : '立即登录' }}</a>
            </div>
          </a-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { UserOutlined, LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const loading = computed(() => authStore.loading);

const formState = reactive({
  email: '',
  password: '',
  name: '',
  confirmPassword: '',
});

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  formState.email = '';
  formState.password = '';
  formState.name = '';
  formState.confirmPassword = '';
};

const handleSubmit = async () => {
  if (!formState.email || !formState.password) {
    message.warning('请填写完整信息');
    return;
  }

  if (!isLogin.value) {
    if (!formState.name) {
      message.warning('请输入用户名');
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      message.warning('两次输入的密码不一致');
      return;
    }
  }

  try {
    if (isLogin.value) {
      await authStore.login({
        email: formState.email,
        password: formState.password,
      });
      message.success('欢迎回来！');
      router.push('/dashboard');
    } else {
      await authStore.register({
        email: formState.email,
        password: formState.password,
        name: formState.name,
      });
      message.success('注册成功，请登录');
      isLogin.value = true;
    }
  } catch (error: any) {
    message.error(error.message || (isLogin.value ? '登录失败' : '注册失败'));
  }
};
</script>

<style scoped lang="less">
.auth-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5;
}

.auth-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  filter: brightness(0.8);
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(3px);
  }
}

.auth-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1000px;
  padding: 20px;
  animation: slideUp 0.6s ease-out;
}

.auth-card {
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  min-height: 600px;
}

.auth-left {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
    animation: rotate 20s linear infinite;
  }

  .brand {
    position: relative;
    z-index: 1;
    margin-bottom: 60px;

    .logo {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;

      .icon {
        font-size: 32px;
      }
    }

    h1 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 12px;
      color: white;
      letter-spacing: 1px;
    }

    .slogan {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 300;
    }
  }

  .features {
    position: relative;
    z-index: 1;

    .feature-item {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      font-size: 16px;
      background: rgba(255, 255, 255, 0.1);
      padding: 12px 20px;
      border-radius: 12px;
      backdrop-filter: blur(5px);
      transition: transform 0.3s;

      &:hover {
        transform: translateX(10px);
        background: rgba(255, 255, 255, 0.2);
      }

      .feature-icon {
        margin-right: 15px;
        font-size: 20px;
      }
    }
  }
}

.auth-right {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: white;

  .form-header {
    margin-bottom: 40px;
    text-align: center;

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    p {
      color: #888;
      font-size: 14px;
    }
  }

  .auth-form {
    .input-icon {
      color: #bfbfbf;
    }

    .submit-btn {
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border: none;
      box-shadow: 0 4px 15px rgba(118, 75, 162, 0.3);
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(118, 75, 162, 0.4);
      }
    }
  }

  .form-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 14px;
    color: #666;

    a {
      color: #764ba2;
      font-weight: 600;
      margin-left: 5px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式适配
@media (max-width: 768px) {
  .auth-card {
    flex-direction: column;
    min-height: auto;
    max-width: 400px;
  }

  .auth-left {
    display: none;
  }

  .auth-right {
    padding: 40px 30px;
  }
}
</style>
