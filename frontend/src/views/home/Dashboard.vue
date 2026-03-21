<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div class="header-content">
        <div class="user-welcome">
          <h1>早安，{{ authStore.user?.name || '旅拍达人' }} ✨</h1>
          <p>准备好开启您的浪漫旅拍之旅了吗？</p>
        </div>
        <a-button type="text" danger class="logout-btn" @click="handleLogout">
          <template #icon>
            <span class="icon">🚪</span>
          </template>
          退出登录
        </a-button>
      </div>
    </header>

    <main class="dashboard-content">
      <div class="cards-grid">
        <!-- AI 虚拟试拍 -->
        <div class="feature-card try-on" @click="navigateTo('/ai/virtual-try-on')">
          <div class="card-bg"></div>
          <div class="card-content">
            <div class="icon-wrapper">
              <span class="icon">🤖</span>
            </div>
            <h3>AI 虚拟试拍</h3>
            <p>上传生活照，一键生成高保真婚纱大片，提前遇见最美的自己。</p>
            <span class="arrow">→</span>
          </div>
        </div>

        <!-- 智能风格推荐 -->
        <div class="feature-card style" @click="navigateTo('/ai/style-recommendation')">
          <div class="card-bg"></div>
          <div class="card-content">
            <div class="icon-wrapper">
              <span class="icon">✨</span>
            </div>
            <h3>智能风格推荐</h3>
            <p>基于您的审美偏好，AI 自动推荐最匹配的拍摄风格与全球景点。</p>
            <span class="arrow">→</span>
          </div>
        </div>

        <!-- 智能行程规划 -->
        <div class="feature-card plan" @click="navigateTo('/plan/itinerary-planning')">
          <div class="card-bg"></div>
          <div class="card-content">
            <div class="icon-wrapper">
              <span class="icon">🗺️</span>
            </div>
            <h3>智能行程规划</h3>
            <p>一键生成最优拍摄路线与时间安排，让旅拍行程轻松无忧。</p>
            <span class="arrow">→</span>
          </div>
        </div>
      </div>

      <div class="recent-activity">
        <h2>📅 最近动态</h2>
        <div class="empty-state">
          <span class="empty-icon">🍃</span>
          <p>暂无最近的操作记录，快去体验功能吧~</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { message, Modal } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  Modal.confirm({
    title: '确认退出',
    content: '您确定要退出登录吗？',
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      authStore.logout();
      message.success('已安全退出');
      router.push('/');
    },
  });
};

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped lang="less">
.dashboard-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 40px;
}

.dashboard-header {
  background: white;
  padding: 20px 40px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .user-welcome {
      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #333;
        margin: 0;
      }
      p {
        color: #888;
        margin: 5px 0 0 0;
        font-size: 0.9rem;
      }
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 1rem;

      .icon {
        font-size: 1.2rem;
      }
    }
  }
}

.dashboard-content {
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
  animation: slideUp 0.6s ease-out;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.feature-card {
  position: relative;
  height: 280px;
  border-radius: 24px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  background: white;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

    .card-bg {
      transform: scale(1.1);
    }

    .arrow {
      transform: translateX(5px);
      opacity: 1;
    }
  }

  .card-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    transition: transform 0.6s ease;
    z-index: 0;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.7));
    }
  }

  &.try-on .card-bg {
    background-image: url('https://images.unsplash.com/photo-1581338834647-b0fb40704e21?q=80&w=1000&auto=format&fit=crop');
  }

  &.style .card-bg {
    background-image: url('https://images.unsplash.com/photo-1511285560982-1351cdeb9821?q=80&w=1000&auto=format&fit=crop');
  }

  &.plan .card-bg {
    background-image: url('https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1000&auto=format&fit=crop');
  }

  .card-content {
    position: relative;
    z-index: 1;
    height: 100%;
    padding: 30px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: white;

    .icon-wrapper {
      position: absolute;
      top: 30px;
      left: 30px;
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;

      .icon {
        font-size: 24px;
      }
    }

    h3 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 10px;
      color: white;
    }

    p {
      font-size: 1rem;
      opacity: 0.9;
      margin-bottom: 0;
      line-height: 1.5;
    }

    .arrow {
      position: absolute;
      bottom: 30px;
      right: 30px;
      font-size: 1.5rem;
      opacity: 0;
      transition: all 0.3s;
    }
  }
}

.recent-activity {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

  h2 {
    font-size: 1.2rem;
    margin-bottom: 20px;
    color: #333;
  }

  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: #999;

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 10px;
      opacity: 0.5;
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 15px 20px;

    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;

      .logout-btn {
        align-self: flex-end;
      }
    }
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
