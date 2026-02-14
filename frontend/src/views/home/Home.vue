<template>
  <div class="home-container">
    <!-- 导航栏 -->
    <nav class="navbar" :class="{ scrolled: isScrolled }">
      <div class="nav-content">
        <div class="logo">
          <span class="icon">📸</span>
          <span class="text">旅拍 · 智享</span>
        </div>
        <div class="nav-actions">
          <template v-if="!authStore.isAuthenticated">
            <a-button type="text" class="nav-btn" @click="goToLogin">登录</a-button>
            <a-button type="primary" class="nav-btn primary" @click="goToLogin">注册</a-button>
          </template>
          <template v-else>
            <a-button type="primary" class="nav-btn primary" @click="goToDashboard">
              进入控制台
            </a-button>
          </template>
        </div>
      </div>
    </nav>

    <!-- Hero 区域 -->
    <div class="hero-section">
      <div class="hero-bg" :style="heroBgStyle"></div>
      <div class="rose-petals">
        <div v-for="n in 30" :key="n" class="petal" :style="getPetalStyle()"></div>
      </div>
      <div class="hero-content" :style="heroContentStyle">
        <h1 class="title">记录每一个<span class="highlight">心动瞬间</span></h1>
        <p class="subtitle">AI 驱动的现代化婚纱旅拍预约与规划平台</p>
        <p class="description">
          告别繁琐的备婚流程，让 AI
          为您定制专属的浪漫旅程。从虚拟试拍到行程规划，我们为您提供一站式智能服务。
        </p>

        <div class="action-buttons">
          <a-button type="primary" size="large" class="primary-btn" @click="handleStart">
            {{ authStore.isAuthenticated ? '进入控制台' : '立即开启旅程' }}
          </a-button>
          <a-button size="large" class="secondary-btn" @click="scrollToFeatures">
            了解更多
          </a-button>
        </div>
      </div>

      <div class="scroll-indicator" @click="scrollToFeatures">
        <span class="arrow">↓</span>
      </div>
    </div>

    <!-- 功能介绍区域 -->
    <div class="features-section" id="features">
      <div class="section-header">
        <h2>核心功能</h2>
        <p>科技赋能，让旅拍更简单</p>
      </div>

      <div class="feature-showcase">
        <!-- 功能 1 -->
        <div
          class="showcase-item glass-card"
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
          <div class="showcase-content">
            <div class="icon-box gradient-text">🤖</div>
            <h3>AI 虚拟试拍</h3>
            <p>
              无需奔波试衣，上传生活照即可生成高保真婚纱预览图。支持多种风格切换，提前遇见最美的自己。
            </p>
            <ul class="feature-list">
              <li>✨ 高保真图像生成</li>
              <li>👗 海量婚纱款式</li>
              <li>🎨 多种风格一键切换</li>
            </ul>
          </div>
          <div class="showcase-image try-on"></div>
        </div>

        <!-- 功能 2 -->
        <div
          class="showcase-item reverse glass-card"
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
          <div class="showcase-content">
            <div class="icon-box gradient-text">✨</div>
            <h3>智能风格推荐</h3>
            <p>不知道拍什么风格？AI 根据您的审美偏好，自动推荐最匹配的拍摄风格与全球热门景点。</p>
            <ul class="feature-list">
              <li>🎯 个性化风格分析</li>
              <li>🌍 全球景点匹配</li>
              <li>📸 专业姿势指导</li>
            </ul>
          </div>
          <div class="showcase-image style"></div>
        </div>

        <!-- 功能 3 -->
        <div
          class="showcase-item glass-card"
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
          <div class="showcase-content">
            <div class="icon-box gradient-text">🗺️</div>
            <h3>智能行程规划</h3>
            <p>
              告别繁琐攻略，一键生成最优拍摄路线与时间安排。结合地理位置与光线分析，让旅拍行程轻松无忧。
            </p>
            <ul class="feature-list">
              <li>📍 最优路线规划</li>
              <li>☀️ 最佳拍摄时间建议</li>
              <li>🚗 交通住宿推荐</li>
            </ul>
          </div>
          <div class="showcase-image plan"></div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>旅拍 · 智享</h3>
          <p>让爱与科技同行</p>
        </div>
        <div class="footer-links">
          <div class="link-group">
            <h4>关于我们</h4>
            <a href="#">项目介绍</a>
            <a href="#">团队成员</a>
          </div>
          <div class="link-group">
            <h4>联系方式</h4>
            <a href="#">官方邮箱</a>
            <a href="#">在线客服</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 旅拍智享. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth';

const router = useRouter();
const authStore = useAuthStore();
const isScrolled = ref(false);

// 初始化认证
authStore.initializeAuth();

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50;
};

// Hero Parallax Effect
const heroBgStyle = reactive({ transform: 'scale(1.1)' });
const heroContentStyle = reactive({ transform: 'translate(0, 0)' });

// Card 3D Tilt Effect
const handleCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const getPetalStyle = () => {
  // Distribute petals in a 3D cloud
  const r = 400 + Math.random() * 400; // Radius
  const theta = Math.random() * Math.PI * 2; // Angle
  const phi = Math.acos(2 * Math.random() - 1); // Angle for sphere distribution

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  return {
    transform: `translate3d(${x}px, ${y}px, ${z}px) rotate(${Math.random() * 360}deg)`,
    opacity: Math.random() * 0.6 + 0.2,
    animationDelay: `${Math.random() * 5}s`,
  };
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const goToLogin = () => {
  router.push('/login');
};

const goToDashboard = () => {
  router.push('/dashboard');
};

const handleStart = () => {
  if (authStore.isAuthenticated) {
    router.push('/dashboard');
  } else {
    router.push('/login');
  }
};

const scrollToFeatures = () => {
  const element = document.getElementById('features');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>

<style scoped lang="less">
.home-container {
  min-height: 100vh;
  background-color: #fff;
  width: 100%;
  overflow-x: hidden;
}

// 导航栏
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  padding: 20px 0;
  transition: all 0.3s ease;

  &.scrolled {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
    padding: 15px 0;

    .logo .text {
      color: #333;
    }
  }

  .nav-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.5rem;
    font-weight: 700;

    .text {
      color: white;
      transition: color 0.3s;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .scrolled & .text {
      text-shadow: none;
    }
  }

  .nav-actions {
    display: flex;
    gap: 15px;

    .nav-btn {
      font-size: 1rem;

      &.primary {
        background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
        border: none;
        box-shadow: 0 4px 10px rgba(255, 117, 140, 0.3);

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(255, 117, 140, 0.4);
        }
      }
    }
  }
}

// Hero 区域
.hero-section {
  height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  overflow: hidden;
  perspective: 1000px; // 增加透视

  .hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop');
    background-size: cover;
    background-position: center;
    z-index: 0;
    transition: transform 0.1s ease-out; // 平滑过渡

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
    }
  }

  // 玫瑰花瓣动画
  .rose-petals {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 1;
    transition: transform 0.1s ease-out;
    animation: rotateContainer 60s linear infinite;
  }

  .petal {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background: rgba(255, 183, 197, 0.8);
    border-radius: 150% 0 150% 0;
    box-shadow: 0 0 10px rgba(255, 183, 197, 0.5);

    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      background: inherit;
      border-radius: inherit;
      transform: rotate(90deg);
    }
  }

  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 800px;
    padding: 0 20px;
    animation: fadeInUp 1s ease-out;
    transition: transform 0.1s ease-out; // 平滑过渡

    .title {
      font-size: 4.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      line-height: 1.2;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);

      .highlight {
        background: linear-gradient(120deg, #ff758c 0%, #ff7eb3 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .subtitle {
      font-size: 1.8rem;
      margin-bottom: 20px;
      font-weight: 300;
    }

    .description {
      font-size: 1.1rem;
      margin-bottom: 40px;
      opacity: 0.9;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }

    .action-buttons {
      display: flex;
      gap: 20px;
      justify-content: center;

      .primary-btn {
        height: 56px;
        padding: 0 40px;
        font-size: 18px;
        border-radius: 28px;
        background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
        border: none;
        box-shadow: 0 4px 15px rgba(255, 117, 140, 0.4);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 117, 140, 0.5);
        }
      }

      .secondary-btn {
        height: 56px;
        padding: 0 40px;
        font-size: 18px;
        border-radius: 28px;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(5px);

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: white;
        }
      }
    }
  }

  .scroll-indicator {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    cursor: pointer;
    animation: bounce 2s infinite;

    .arrow {
      font-size: 2rem;
      color: white;
      opacity: 0.8;
    }
  }
}

// 功能介绍区域
.features-section {
  padding: 100px 20px;
  background: linear-gradient(180deg, #fff 0%, #fff0f5 100%); // 渐变背景

  .section-header {
    text-align: center;
    margin-bottom: 80px;

    h2 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    p {
      font-size: 1.2rem;
      color: #666;
    }
  }

  .feature-showcase {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 100px;

    .showcase-item {
      display: flex;
      align-items: center;
      gap: 60px;
      transition: all 0.1s ease-out; // 快速响应鼠标移动

      &.reverse {
        flex-direction: row-reverse;
      }

      // 毛玻璃卡片效果
      &.glass-card {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border-radius: 30px;
        padding: 40px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.8);
        transform-style: preserve-3d; // 开启3D空间
      }

      .showcase-content {
        flex: 1;

        .icon-box {
          font-size: 3rem;
          margin-bottom: 20px;
        }

        h3 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 20px;
          color: #333;
        }

        p {
          font-size: 1.1rem;
          color: #666;
          line-height: 1.8;
          margin-bottom: 30px;
        }

        .feature-list {
          list-style: none;
          padding: 0;

          li {
            font-size: 1.1rem;
            color: #555;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
        }
      }

      .showcase-image {
        flex: 1;
        height: 400px;
        border-radius: 20px;
        background-size: cover;
        background-position: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s;

        &:hover {
          transform: scale(1.02);
        }

        &.try-on {
          background-image: url('https://images.unsplash.com/photo-1581338834647-b0fb40704e21?q=80&w=1000&auto=format&fit=crop');
        }

        &.style {
          background-image: url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop');
        }

        &.plan {
          background-image: url('https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1000&auto=format&fit=crop');
        }
      }
    }
  }
}

// 页脚
.footer {
  background: #333;
  color: white;
  padding: 60px 20px 20px;

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;

    .footer-brand {
      h3 {
        font-size: 1.5rem;
        color: white;
        margin-bottom: 10px;
      }
      p {
        color: #999;
      }
    }

    .footer-links {
      display: flex;
      gap: 60px;

      .link-group {
        h4 {
          color: white;
          margin-bottom: 20px;
          font-size: 1.1rem;
        }

        a {
          display: block;
          color: #999;
          margin-bottom: 10px;
          transition: color 0.3s;

          &:hover {
            color: white;
          }
        }
      }
    }
  }

  .footer-bottom {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    color: #666;
  }
}

// 动画
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  40% {
    transform: translateX(-50%) translateY(-10px);
  }
  60% {
    transform: translateX(-50%) translateY(-5px);
  }
}

@keyframes rotateContainer {
  from {
    transform: translate(-50%, -50%) rotateX(0) rotateY(0) rotateZ(0);
  }
  to {
    transform: translate(-50%, -50%) rotateX(0) rotateY(360deg) rotateZ(0);
  }
}

// 响应式
@media (max-width: 768px) {
  .hero-section {
    .title {
      font-size: 2.5rem;
    }
    .subtitle {
      font-size: 1.2rem;
    }
  }

  .features-section {
    .showcase-item {
      flex-direction: column;
      gap: 40px;

      &.reverse {
        flex-direction: column;
      }

      .showcase-image {
        width: 100%;
        height: 250px;
      }
    }
  }

  .footer-content {
    flex-direction: column;
    gap: 40px;

    .footer-links {
      flex-direction: column;
      gap: 30px;
    }
  }
}
</style>
