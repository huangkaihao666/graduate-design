<template>
  <div class="worker-shell">
    <!-- 左侧固定侧边栏 -->
    <aside class="side">
      <div class="brand">
        <div class="logo">W</div>
        <div class="brand-text">
          <div class="t1">工作人员工作台</div>
          <div class="t2">婚纱旅拍 · 温柔粉系</div>
        </div>
      </div>

      <nav class="menu">
        <router-link
          v-for="{ to, icon, label } in sideItems"
          :key="to"
          :to="to"
          class="menu-item"
          :class="{ active: isActive(to) }"
        >
          <span class="icon">{{ icon }}</span>
          <span class="label">{{ label }}</span>
        </router-link>
      </nav>
    </aside>

    <div class="main">
      <!-- 顶部导航栏 -->
      <header class="top">
        <nav class="top-nav">
          <router-link
            v-for="t in topTabs"
            :key="t.to"
            :to="t.to"
            class="top-item"
            :class="{ active: isActive(t.to) }"
          >
            {{ t.label }}
          </router-link>
        </nav>

        <div class="user">
          <a-dropdown placement="bottomRight">
            <template #overlay>
              <a-menu>
                <a-menu-item key="worker-dashboard">
                  <router-link to="/worker/dashboard">工作人员工作台</router-link>
                </a-menu-item>
                <a-menu-item key="worker-orders">
                  <router-link to="/worker/orders">订单列表</router-link>
                </a-menu-item>
                <a-menu-item key="worker-schedule">
                  <router-link to="/worker/schedule">档期管理</router-link>
                </a-menu-item>
                <a-menu-item key="worker-portfolio">
                  <router-link to="/worker/portfolio">作品管理</router-link>
                </a-menu-item>
                <a-menu-item key="worker-messages">
                  <router-link to="/worker/messages">消息中心</router-link>
                </a-menu-item>
                <a-menu-item key="worker-profile">
                  <router-link to="/worker/profile">个人中心</router-link>
                </a-menu-item>

                <a-divider style="margin: 4px 0" />
                <a-menu-item key="logout">
                  <span @click="handleLogout">退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>

            <button class="user-trigger" type="button">
              <a-avatar :size="32" :src="authStore.user?.avatar" icon="👤" />
              <span class="name">{{ authStore.user?.name || '工作人员' }}</span>
              <span class="chev">▾</span>
            </button>
          </a-dropdown>
        </div>
      </header>

      <section class="content">
        <router-view />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth';
import { computed } from 'vue';
import { message } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const sideItems = computed(() => [
  { label: '工作台', to: '/worker/dashboard', icon: '🧁' },
  { label: '订单列表', to: '/worker/orders', icon: '🧾' },
  { label: '档期日历', to: '/worker/schedule', icon: '🗓️' },
  { label: '作品相册', to: '/worker/portfolio', icon: '🖼️' },
  { label: '消息中心', to: '/worker/messages', icon: '💬' },
  { label: '个人中心', to: '/worker/profile', icon: '👤' },
]);

const topTabs = computed(() => [
  { label: '工作人员工作台', to: '/worker/dashboard' },
  { label: '我的订单', to: '/worker/orders' },
  { label: '档期管理', to: '/worker/schedule' },
  { label: '作品管理', to: '/worker/portfolio' },
  { label: '消息中心', to: '/worker/messages' },
  { label: '个人中心', to: '/worker/profile' },
]);

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/');
};

const handleLogout = () => {
  authStore.logout();
  message.success('已退出登录');
  router.push('/login');
};
</script>

<style scoped lang="less">
/* stylelint-disable */
.worker-shell {
  --pink: #ff6b8b;
  --pink-2: #ff7fa0;
  --pink-soft: rgba(255, 107, 139, 0.12);
  --card: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border: rgba(17, 24, 39, 0.08);
  --r: 12px;

  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 45%);
  display: grid;
  grid-template-columns: 264px 1fr;
}

.side {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 18px 14px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  border-right: 1px solid var(--border);
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 10px 14px;
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, var(--pink) 0%, #ff9bb4 100%);
  box-shadow: 0 10px 22px rgba(255, 107, 139, 0.22);
}

.brand-text {
  min-width: 0;
  .t1 {
    font-weight: 800;
    color: var(--text);
    letter-spacing: 0.2px;
  }
  .t2 {
    margin-top: 2px;
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.menu {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 6px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: var(--r);
  color: #4b5563;
  text-decoration: none;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  .icon {
    width: 26px;
    height: 26px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 107, 139, 0.18);
    background: rgba(255, 107, 139, 0.06);
  }

  &:hover {
    background: rgba(255, 107, 139, 0.06);
    color: var(--pink);
  }

  &.active {
    background: linear-gradient(
      135deg,
      rgba(255, 107, 139, 0.18) 0%,
      rgba(255, 155, 180, 0.14) 100%
    );
    border-color: rgba(255, 107, 139, 0.28);
    color: #d6336c;
    .icon {
      background: rgba(255, 107, 139, 0.18);
      border-color: rgba(255, 107, 139, 0.35);
    }
  }
}

.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.top {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

.top-nav {
  display: flex;
  gap: 18px;
  overflow: auto;
  padding-bottom: 2px;
}

.top-item {
  position: relative;
  text-decoration: none;
  color: #4b5563;
  font-weight: 600;
  padding: 10px 2px;
  white-space: nowrap;

  &:hover {
    color: var(--pink);
  }

  &.active {
    color: var(--pink);
  }

  &.active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2px;
    height: 3px;
    border-radius: 999px;
    background: var(--pink);
    box-shadow: 0 6px 14px rgba(255, 107, 139, 0.28);
  }
}

.user .pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--pink);
  box-shadow: 0 0 0 4px rgba(255, 107, 139, 0.16);
}

.name {
  font-weight: 700;
  color: #374151;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
  cursor: pointer;
  user-select: none;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: rgba(255, 107, 139, 0.09);
    border-color: rgba(255, 107, 139, 0.26);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.22);
  }
}

.chev {
  font-size: 12px;
  color: #6b7280;
  margin-left: -2px;
}

.content {
  padding: 18px 22px 28px;
  max-width: 1400px;
  width: 100%;
}

@media (max-width: 960px) {
  .worker-shell {
    grid-template-columns: 1fr;
  }
  .side {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
</style>
