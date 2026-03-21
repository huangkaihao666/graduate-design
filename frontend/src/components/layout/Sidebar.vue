<template>
  <aside class="app-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-content">
      <!-- 菜单切换按钮 -->
      <button class="toggle-btn" @click="isCollapsed = !isCollapsed">
        <span v-if="!isCollapsed">≡</span>
        <span v-else>›</span>
      </button>

      <!-- 菜单项 -->
      <nav class="sidebar-nav">
        <!-- AI 功能 -->
        <div v-if="authStore.isAuthenticated && !isAdmin" class="nav-group">
          <div class="group-title" :class="{ collapsed: isCollapsed }">🤖 AI 功能</div>
          <router-link to="/ai/virtual-try-on" class="nav-link" active-class="active">
            <span class="icon">✨</span>
            <span v-if="!isCollapsed" class="label">虚拍试衣</span>
          </router-link>
          <router-link to="/ai/style-recommendation" class="nav-link" active-class="active">
            <span class="icon">🎨</span>
            <span v-if="!isCollapsed" class="label">风格推荐</span>
          </router-link>
          <router-link to="/ai/itinerary-planning" class="nav-link" active-class="active">
            <span class="icon">🗺️</span>
            <span v-if="!isCollapsed" class="label">行程规划</span>
          </router-link>
        </div>

        <!-- 预约模块 -->
        <div v-if="!isAdmin" class="nav-group">
          <div class="group-title" :class="{ collapsed: isCollapsed }">💍 预约服务</div>
          <router-link to="/booking/packages" class="nav-link" active-class="active">
            <span class="icon">💐</span>
            <span v-if="!isCollapsed" class="label">套餐浏览</span>
          </router-link>
          <router-link to="/booking/photographers" class="nav-link" active-class="active">
            <span class="icon">📷</span>
            <span v-if="!isCollapsed" class="label">本店摄影师</span>
          </router-link>
          <router-link
            v-if="authStore.isAuthenticated"
            to="/booking/order"
            class="nav-link"
            active-class="active"
          >
            <span class="icon">📝</span>
            <span v-if="!isCollapsed" class="label">在线下单</span>
          </router-link>
        </div>

        <!-- 用户中心 -->
        <div v-if="authStore.isAuthenticated && !isAdmin" class="nav-group">
          <div class="group-title" :class="{ collapsed: isCollapsed }">👤 个人中心</div>
          <router-link to="/user/profile" class="nav-link" active-class="active">
            <span class="icon">👤</span>
            <span v-if="!isCollapsed" class="label">个人资料</span>
          </router-link>
          <router-link to="/user/orders" class="nav-link" active-class="active">
            <span class="icon">📦</span>
            <span v-if="!isCollapsed" class="label">订单管理</span>
          </router-link>
          <router-link to="/user/favorites" class="nav-link" active-class="active">
            <span class="icon">❤️</span>
            <span v-if="!isCollapsed" class="label">我的收藏</span>
          </router-link>
          <router-link to="/user/ai-history" class="nav-link" active-class="active">
            <span class="icon">⏱️</span>
            <span v-if="!isCollapsed" class="label">生成历史</span>
          </router-link>
        </div>

        <!-- 管理员区域 -->
        <div v-if="authStore.isAuthenticated && isAdmin" class="nav-group">
          <div class="group-title admin-title" :class="{ collapsed: isCollapsed }">ADMIN PANEL</div>
          <router-link to="/admin/dashboard" class="nav-link admin-link" active-class="active">
            <span class="icon"><DashboardOutlined /></span>
            <span v-if="!isCollapsed" class="label">数据看板</span>
          </router-link>
          <router-link to="/admin/content/spots" class="nav-link admin-link" active-class="active">
            <span class="icon"><EnvironmentOutlined /></span>
            <span v-if="!isCollapsed" class="label">景点管理</span>
          </router-link>
          <router-link
            to="/admin/content/packages"
            class="nav-link admin-link"
            active-class="active"
          >
            <span class="icon"><AppstoreOutlined /></span>
            <span v-if="!isCollapsed" class="label">套餐管理</span>
          </router-link>
          <router-link to="/admin/content/styles" class="nav-link admin-link" active-class="active">
            <span class="icon"><TagsOutlined /></span>
            <span v-if="!isCollapsed" class="label">风格标签</span>
          </router-link>
          <router-link
            to="/admin/content/photographers"
            class="nav-link admin-link"
            active-class="active"
          >
            <span class="icon"><CameraOutlined /></span>
            <span v-if="!isCollapsed" class="label">摄影师</span>
          </router-link>
          <router-link to="/admin/orders" class="nav-link admin-link" active-class="active">
            <span class="icon"><FileTextOutlined /></span>
            <span v-if="!isCollapsed" class="label">订单管理</span>
          </router-link>
          <router-link to="/admin/users" class="nav-link admin-link" active-class="active">
            <span class="icon"><TeamOutlined /></span>
            <span v-if="!isCollapsed" class="label">用户管理</span>
          </router-link>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  TagsOutlined,
  CameraOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';

const authStore = useAuthStore();
const isCollapsed = ref(false);

// 检查是否是管理员（后续可以从 store 获取）
const isAdmin = computed(() => {
  return authStore.user?.role === 'admin';
});
</script>

<style scoped lang="less">
.app-sidebar {
  width: 240px;
  background: #fafafa;
  border-right: 1px solid #f0f0f0;
  height: calc(100vh - 64px);
  overflow-y: auto;
  position: fixed;
  left: 0;
  top: 64px;
  transition: width 0.3s;

  &.collapsed {
    width: 80px;
  }

  .sidebar-content {
    padding: 16px 0;
    position: relative;
  }

  .toggle-btn {
    position: absolute;
    right: -30px;
    top: 16px;
    width: 30px;
    height: 30px;
    background: white;
    border: 1px solid #d9d9d9;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.3s;

    &:hover {
      border-color: #ff758c;
      color: #ff758c;
    }
  }

  .sidebar-nav {
    .nav-group {
      margin-bottom: 8px;

      .group-title {
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: padding 0.3s;

        &.collapsed {
          padding: 8px 8px;
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      }

      .admin-title {
        color: #4b5563;
        font-weight: 700;
        letter-spacing: 0.8px;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        color: #666;
        text-decoration: none;
        font-size: 14px;
        transition: all 0.3s;
        border-left: 3px solid transparent;

        .icon {
          font-size: 14px;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid #d9d9d9;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          flex-shrink: 0;
        }

        .label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        &:hover {
          color: #ff758c;
          background: rgba(255, 117, 140, 0.05);
        }

        &.active {
          color: #ff758c;
          background: rgba(255, 117, 140, 0.08);
          border-left-color: #ff758c;
          font-weight: 500;
        }
      }

      .admin-link {
        .icon {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #374151;
        }

        &.active .icon {
          background: #ffe7ee;
          border-color: #ffadc2;
          color: #d6336c;
        }
      }
    }
  }

  @media (max-width: 1200px) {
    width: 80px;
    left: 0;

    .toggle-btn {
      display: flex;
    }

    .sidebar-nav .nav-group .nav-link .label {
      display: none;
    }

    .sidebar-nav .nav-group .group-title {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      padding: 8px;
    }
  }
}
</style>
