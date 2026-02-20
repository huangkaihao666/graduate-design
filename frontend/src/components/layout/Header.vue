<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-area">
        <router-link to="/" class="logo">
          <span class="icon">📸</span>
          <span class="text">旅拍·智享</span>
        </router-link>
      </div>

      <nav class="main-nav">
        <router-link v-if="authStore.isAuthenticated" to="/dashboard" class="nav-item">
          控制台
        </router-link>
        <router-link to="/booking/packages" class="nav-item"> 套餐浏览 </router-link>
        <a href="#" class="nav-item">帮助中心</a>
      </nav>

      <div class="header-actions">
        <template v-if="!authStore.isAuthenticated">
          <router-link to="/login" class="btn-text">登录</router-link>
          <router-link to="/login" class="btn-primary">注册</router-link>
        </template>
        <template v-else>
          <div class="user-menu">
            <a-dropdown>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile">
                    <router-link to="/user/profile">个人资料</router-link>
                  </a-menu-item>
                  <a-menu-item key="orders">
                    <router-link to="/user/orders">订单管理</router-link>
                  </a-menu-item>
                  <a-menu-item key="favorites">
                    <router-link to="/user/favorites">我的收藏</router-link>
                  </a-menu-item>
                  <a-menu-item key="ai-history">
                    <router-link to="/user/ai-history">AI 历史</router-link>
                  </a-menu-item>
                  <a-divider style="margin: 4px 0" />
                  <a-menu-item key="logout">
                    <span @click="handleLogout">退出登录</span>
                  </a-menu-item>
                </a-menu>
              </template>
              <div class="user-info">
                <a-avatar :size="32" icon="👤" />
                <span class="username">{{ authStore.user?.name || '用户' }}</span>
              </div>
            </a-dropdown>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  authStore.logout();
  message.success('已退出登录');
  router.push('/');
};
</script>

<style scoped lang="less">
.app-header {
  background: white;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-area {
    flex-shrink: 0;

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.2rem;
      font-weight: 700;
      color: #333;
      text-decoration: none;
      transition: all 0.3s;

      &:hover {
        color: #ff758c;
      }

      .icon {
        font-size: 1.5rem;
      }

      .text {
        background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
  }

  .main-nav {
    flex: 1;
    display: flex;
    justify-content: center;
    gap: 30px;
    margin: 0 20px;

    .nav-item {
      color: #666;
      text-decoration: none;
      font-size: 14px;
      transition: color 0.3s;

      &:hover,
      &.router-link-active {
        color: #ff758c;
      }
    }
  }

  .header-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 15px;

    .btn-text {
      color: #666;
      text-decoration: none;
      font-size: 14px;
      transition: color 0.3s;

      &:hover {
        color: #ff758c;
      }
    }

    .btn-primary {
      display: inline-block;
      padding: 8px 20px;
      background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
      color: white;
      border-radius: 20px;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 117, 140, 0.3);
      }
    }

    .user-menu {
      .user-info {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: background 0.3s;

        &:hover {
          background: #f5f5f5;
        }

        .username {
          font-size: 14px;
          color: #333;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .app-header {
    .header-content {
      padding: 0 16px;
    }

    .main-nav {
      display: none;
    }

    .logo-area .logo {
      font-size: 1rem;

      .text {
        display: none;
      }
    }
  }
}
</style>
