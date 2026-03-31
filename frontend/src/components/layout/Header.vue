<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-area">
        <router-link to="/" class="logo">
          <span class="icon">📸</span>
          <span class="text">旅拍·智享</span>
        </router-link>
      </div>

      <nav v-if="!authStore.isAdmin" class="main-nav">
        <template v-if="authStore.isAuthenticated">
          <router-link to="/dashboard" class="nav-item">首页</router-link>
          <router-link to="/ai/virtual-try-on" class="nav-item">虚拍试衣</router-link>
          <router-link to="/ai/makeup-try-on" class="nav-item">一键试妆</router-link>
          <router-link to="/ai/style-recommendation" class="nav-item">风格推荐</router-link>
          <router-link to="/ai/itinerary-planning" class="nav-item">行程规划</router-link>
          <router-link to="/booking/packages" class="nav-item">套餐浏览</router-link>
          <router-link to="/booking/photographers" class="nav-item">本店服务团队</router-link>
          <router-link v-if="!authStore.isWorker" to="/user/custom-requests" class="nav-item"
            >个性预约</router-link
          >
        </template>
        <template v-else>
          <router-link to="/booking/packages" class="nav-item">套餐浏览</router-link>
        </template>
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

                  <!-- 普通用户 -->
                  <template v-if="!authStore.isAdmin">
                    <a-menu-item key="help-center">
                      <router-link to="/help-center">客服助手</router-link>
                    </a-menu-item>
                    <a-menu-item v-if="!authStore.isWorker" key="chat">
                      <router-link to="/user/chat">消息中心</router-link>
                    </a-menu-item>
                    <a-menu-item key="orders">
                      <router-link to="/user/orders">我的订单</router-link>
                    </a-menu-item>
                    <a-menu-item key="favorites">
                      <router-link to="/user/favorites">我的收藏</router-link>
                    </a-menu-item>
                    <a-menu-item key="ai-history">
                      <router-link to="/user/ai-history">AI 历史</router-link>
                    </a-menu-item>
                  </template>

                  <!-- 系统管理员 -->
                  <template v-else>
                    <a-menu-item key="admin-spots">
                      <router-link to="/admin/content/spots">景点管理</router-link>
                    </a-menu-item>
                    <a-menu-item key="admin-packages">
                      <router-link to="/admin/content/packages">套餐管理</router-link>
                    </a-menu-item>
                    <a-menu-item key="admin-orders">
                      <router-link to="/admin/orders">订单管理</router-link>
                    </a-menu-item>
                    <a-menu-item key="admin-users">
                      <router-link to="/admin/users">用户管理</router-link>
                    </a-menu-item>
                  </template>

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
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';

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
    height: 72px;
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
      font-size: 1.35rem;
      font-weight: 800;
      color: #333;
      text-decoration: none;
      transition: all 0.3s;
      letter-spacing: 0.2px;

      &:hover {
        color: #ff758c;
      }

      .icon {
        font-size: 1.65rem;
      }

      .text {
        background: linear-gradient(90deg, #ff5f84 0%, #ff7eb3 55%, #ffb3d1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: 0 2px 10px rgba(255, 117, 140, 0.18);
      }
    }
  }

  .main-nav {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    gap: 12px;
    margin: 0 20px;
    overflow-x: auto;
    scrollbar-width: thin;

    .nav-item {
      color: #4b5563;
      text-decoration: none;
      font-size: 16px;
      white-space: nowrap;
      padding: 10px 14px;
      border-radius: 999px;
      line-height: 1;
      transition:
        color 0.25s ease,
        background 0.25s ease,
        box-shadow 0.25s ease,
        transform 0.25s ease;

      &:hover {
        color: #ff4d8a;
        background: rgba(255, 117, 140, 0.1);
        transform: translateY(-1px);
      }

      &.router-link-active {
        color: #fff;
        background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
        box-shadow: 0 6px 14px rgba(255, 117, 140, 0.28);
      }

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(255, 117, 140, 0.25);
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
