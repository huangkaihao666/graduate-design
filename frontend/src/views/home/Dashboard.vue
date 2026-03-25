<template>
  <div class="dashboard-home">
    <div
      ref="heroWrapRef"
      class="hero-wrap"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div
        class="hero-track"
        :class="{ dragging: isDragging }"
        :style="{
          transform: `translateX(calc(${-currentTrackIndex * 100}% + ${dragOffsetPx}px))`,
          transition: isDragging || !transitionEnabled ? 'none' : 'transform 0.35s ease',
        }"
        @transitionend="handleTrackTransitionEnd"
      >
        <section
          v-for="(slide, idx) in loopSlides"
          :key="`${slide.image}-${idx}`"
          class="hero-slide"
          :style="{ backgroundImage: `url(${slide.image})` }"
        ></section>
      </div>

      <div class="indicators">
        <button
          v-for="(_, idx) in slides"
          :key="idx"
          type="button"
          class="dot"
          :class="{ active: idx === activeIndex }"
          @click="goToSlide(idx)"
        ></button>
      </div>
    </div>

    <div class="page-body">
      <section class="module">
        <div class="module-title">
          <h2>核心功能</h2>
          <span class="line"></span>
        </div>
        <div class="feature-grid">
          <article v-for="item in featureModules" :key="item.title" class="card feature-card">
            <div class="icon">{{ item.icon }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </article>
        </div>
      </section>

      <section class="module">
        <div class="module-title">
          <h2>热门旅拍目的地</h2>
          <span class="line"></span>
        </div>
        <div class="scroll-row">
          <article
            v-for="item in destinations"
            :key="item.name"
            class="destination-card card"
            :style="{ backgroundImage: `url(${item.image})` }"
          >
            <div class="overlay">
              <h3>{{ item.name }}</h3>
              <span class="tag">{{ item.tag }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="module">
        <div class="module-title">
          <h2>套餐价格</h2>
          <span class="line"></span>
        </div>
        <div class="package-grid">
          <article v-for="pkg in packages" :key="pkg.level" class="card package-card">
            <h3 class="level">{{ pkg.level }}</h3>
            <p class="price">{{ pkg.price }}</p>
            <ul>
              <li v-for="(benefit, idx) in pkg.benefits" :key="idx">
                <span>{{ benefit.label }}</span>
                <strong>{{ benefit.highlight }}</strong>
              </li>
            </ul>
            <a-button block class="consult-btn" @click="goHelpCenter">一键咨询</a-button>
          </article>
        </div>
      </section>

      <section class="module">
        <div class="module-title">
          <h2>客片展示</h2>
          <span class="line"></span>
        </div>
        <div class="gallery-grid">
          <article
            v-for="item in gallery"
            :key="item.image"
            class="gallery-card card"
            :style="{ backgroundImage: `url(${item.image})` }"
          >
            <div class="mask">
              <span class="style-tag">{{ item.style }}</span>
              <a-button class="same-btn" @click="goPackages">我要拍同款</a-button>
            </div>
          </article>
        </div>
      </section>

      <section class="module">
        <div class="module-title">
          <h2>摄影师团队</h2>
          <span class="line"></span>
        </div>
        <div class="scroll-row photographers">
          <article v-for="item in photographers" :key="item.name" class="card photographer-card">
            <img :src="item.avatar" :alt="item.name" />
            <h3>{{ item.name }}</h3>
            <p>{{ item.style }}</p>
          </article>
        </div>
      </section>

      <section class="module">
        <div class="module-title">
          <h2>用户评价</h2>
          <span class="line"></span>
        </div>
        <div class="review-grid">
          <article v-for="item in reviews" :key="item.user" class="card review-card">
            <div class="stars">★★★★★</div>
            <p class="content">{{ item.content }}</p>
            <p class="user">{{ item.user }}</p>
          </article>
        </div>
      </section>

      <section class="module">
        <div class="module-title">
          <h2>立即预约</h2>
          <span class="line"></span>
        </div>
        <div class="cta-banner">
          <div class="left">
            <h3>开启你的专属旅拍记忆</h3>
            <p>AI 定制，只为独一无二的你</p>
          </div>
          <div class="right">
            <a-button class="btn-light" @click="goHelpCenter">免费预约咨询</a-button>
            <a-button class="btn-outline" @click="goPackages">查看更多客片</a-button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import hero1 from '@/assets/images/hero/hero1.jpg';
import hero2 from '@/assets/images/hero/hero2.jpg';
import hero3 from '@/assets/images/hero/hero3.jpg';
import hero4 from '@/assets/images/hero/hero4.jpg';
import hero5 from '@/assets/images/hero/hero5.jpg';
import hero6 from '@/assets/images/hero/hero6.jpg';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();
let timer: number | null = null;
const heroWrapRef = ref<HTMLElement | null>(null);
const swipeStartX = ref<number | null>(null);
const dragOffsetPx = ref(0);
const isDragging = ref(false);
const currentTrackIndex = ref(1);
const transitionEnabled = ref(true);

const slides = [
  {
    image: hero1,
  },
  {
    image: hero2,
  },
  {
    image: hero3,
  },
  {
    image: hero4,
  },
  {
    image: hero5,
  },
  {
    image: hero6,
  },
];

const loopSlides = computed(() => {
  if (slides.length <= 1) return slides;
  return [slides[slides.length - 1], ...slides, slides[0]];
});

const getLogicalIndex = (trackIndex: number) => {
  if (slides.length === 0) return 0;
  if (trackIndex === 0) return slides.length - 1;
  if (trackIndex === slides.length + 1) return 0;
  return trackIndex - 1;
};

const activeIndex = computed(() => getLogicalIndex(currentTrackIndex.value));

const featureModules = [
  {
    icon: '🎯',
    title: 'AI 智能风格推荐',
    desc: '根据用户偏好自动匹配旅拍风格与场景',
  },
  {
    icon: '👰',
    title: '虚拟试衣预览',
    desc: '上传照片在线试穿婚纱，预览上身效果',
  },
  {
    icon: '🗺️',
    title: 'AI 行程规划',
    desc: '输入目的地 / 预算 / 天数，一键生成拍摄路线',
  },
  {
    icon: '💬',
    title: '智能客服助手',
    desc: '7×24 小时 AI 解答拍摄 / 套餐 / 档期问题',
  },
];

const destinations = [
  {
    name: '三亚',
    tag: '热门',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '大理',
    tag: '性价比',
    image:
      'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '青岛',
    tag: '热门',
    image:
      'https://images.unsplash.com/photo-1505765050516-f72dcac9c60c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '巴黎',
    tag: '经典',
    image:
      'https://images.unsplash.com/photo-1549144511-f099e773c147?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '济州岛',
    tag: '海岛',
    image:
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1200&auto=format&fit=crop',
  },
];

const packages = [
  {
    level: '基础',
    price: '¥3999',
    benefits: [
      { label: '精修张数：', highlight: '50 张（AI 智能修图）' },
      { label: '拍摄时长：', highlight: '半天' },
      { label: '短片剪辑：', highlight: 'AI 快剪 30 秒' },
    ],
  },
  {
    level: '经典',
    price: '¥6999',
    benefits: [
      { label: '精修张数：', highlight: '80 张（AI 精修增强）' },
      { label: '拍摄时长：', highlight: '1 天' },
      { label: '短片剪辑：', highlight: 'AI 短片 60 秒' },
    ],
  },
  {
    level: '高端',
    price: '¥9999',
    benefits: [
      { label: '精修张数：', highlight: '120 张（AI 高级润色）' },
      { label: '拍摄时长：', highlight: '2 天' },
      { label: '短片剪辑：', highlight: 'AI 电影感短片' },
    ],
  },
];

const gallery = [
  {
    style: '清新',
    image:
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=900&auto=format&fit=crop',
  },
  {
    style: '复古',
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=900&auto=format&fit=crop',
  },
  {
    style: '中式',
    image:
      'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=900&auto=format&fit=crop',
  },
  {
    style: '电影感',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=900&auto=format&fit=crop',
  },
  {
    style: '森系',
    image:
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=900&auto=format&fit=crop',
  },
  {
    style: '法式',
    image:
      'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=900&auto=format&fit=crop',
  },
];

const photographers = [
  {
    name: '林川',
    style: '电影感叙事',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: '周沫',
    style: '清新自然',
    avatar: 'https://randomuser.me/api/portraits/women/43.jpg',
  },
  {
    name: '许安',
    style: '复古质感',
    avatar: 'https://randomuser.me/api/portraits/men/65.jpg',
  },
  {
    name: '温岚',
    style: '中式国风',
    avatar: 'https://randomuser.me/api/portraits/women/24.jpg',
  },
  {
    name: '叶景',
    style: '海岛轻旅拍',
    avatar: 'https://randomuser.me/api/portraits/men/71.jpg',
  },
];

const reviews = [
  {
    user: '用户 · 小雨',
    content: 'AI 选片效率超高，省了我们很多沟通时间，整体效果非常满意。',
  },
  {
    user: '用户 · 阿诚',
    content: 'AI 行程规划很实用，路线和时间都很合理，拍摄当天特别顺。',
  },
  {
    user: '用户 · 木木',
    content: '智能客服回复很快，档期和套餐问题基本都能第一时间解答。',
  },
];

const goHelpCenter = () => router.push('/help-center');
const goPackages = () => router.push('/booking/packages');

const goToSlide = (idx: number) => {
  transitionEnabled.value = true;
  currentTrackIndex.value = idx + 1;
  restartAutoPlay();
};

const nextSlide = () => {
  if (slides.length <= 1) return;
  // 兜底：避免后台页定时器导致索引跑飞
  if (currentTrackIndex.value < 0 || currentTrackIndex.value > slides.length + 1) {
    currentTrackIndex.value = 1;
  }
  transitionEnabled.value = true;
  currentTrackIndex.value += 1;
};

const prevSlide = () => {
  if (slides.length <= 1) return;
  // 兜底：避免后台页定时器导致索引跑飞
  if (currentTrackIndex.value < 0 || currentTrackIndex.value > slides.length + 1) {
    currentTrackIndex.value = slides.length;
  }
  transitionEnabled.value = true;
  currentTrackIndex.value -= 1;
};

const restartAutoPlay = () => {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
  if (document.hidden) return;
  timer = window.setInterval(() => {
    if (document.hidden || isDragging.value) return;
    nextSlide();
  }, 4500);
};

const handleSwipe = (deltaX: number) => {
  const width = heroWrapRef.value?.clientWidth || window.innerWidth || 1;
  const threshold = Math.max(40, width * 0.12);
  if (Math.abs(deltaX) < threshold) return;
  if (deltaX < 0) {
    nextSlide();
  } else {
    prevSlide();
  }
  restartAutoPlay();
};

const applyEdgeDamping = (deltaX: number) => {
  const logical = activeIndex.value;
  const isFirst = logical === 0;
  const isLast = logical === slides.length - 1;
  const draggingToOutLeft = isFirst && deltaX > 0;
  const draggingToOutRight = isLast && deltaX < 0;

  if (draggingToOutLeft || draggingToOutRight) {
    // 边缘阻尼：越往外拖，位移增幅越小，减少“硬撞墙”感
    return deltaX * 0.35;
  }
  return deltaX;
};

const onTouchStart = (e: TouchEvent) => {
  swipeStartX.value = e.touches[0]?.clientX ?? null;
  dragOffsetPx.value = 0;
  isDragging.value = true;
};

const onTouchMove = (e: TouchEvent) => {
  if (swipeStartX.value === null) return;
  const moveX = e.touches[0]?.clientX ?? swipeStartX.value;
  const deltaX = moveX - swipeStartX.value;
  dragOffsetPx.value = applyEdgeDamping(deltaX);
};

const onTouchEnd = (e: TouchEvent) => {
  if (swipeStartX.value === null) return;
  const endX = e.changedTouches[0]?.clientX ?? swipeStartX.value;
  handleSwipe(endX - swipeStartX.value);
  swipeStartX.value = null;
  dragOffsetPx.value = 0;
  isDragging.value = false;
};

const onMouseDown = (e: MouseEvent) => {
  swipeStartX.value = e.clientX;
  dragOffsetPx.value = 0;
  isDragging.value = true;
};

const onMouseMove = (e: MouseEvent) => {
  if (swipeStartX.value === null) return;
  const deltaX = e.clientX - swipeStartX.value;
  dragOffsetPx.value = applyEdgeDamping(deltaX);
};

const onMouseUp = (e: MouseEvent) => {
  if (swipeStartX.value === null) return;
  handleSwipe(e.clientX - swipeStartX.value);
  swipeStartX.value = null;
  dragOffsetPx.value = 0;
  isDragging.value = false;
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const silentReposition = async (targetIndex: number) => {
  // 关闭过渡后再重定位，确保用户只看到“正常方向”的滑动动画
  transitionEnabled.value = false;
  currentTrackIndex.value = targetIndex;
  // 连续等待两帧，避免浏览器把重定位与下一次过渡合并造成可见跳闪
  await nextFrame();
  await nextFrame();
  transitionEnabled.value = true;
};

const handleTrackTransitionEnd = async () => {
  if (slides.length <= 1) return;

  if (currentTrackIndex.value === 0) {
    await silentReposition(slides.length);
    return;
  }

  if (currentTrackIndex.value === slides.length + 1) {
    await silentReposition(1);
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    return;
  }

  // 从后台返回时做一次索引矫正，避免显示空白
  if (currentTrackIndex.value < 0 || currentTrackIndex.value > slides.length + 1) {
    transitionEnabled.value = false;
    currentTrackIndex.value = 1;
    dragOffsetPx.value = 0;
    isDragging.value = false;
    window.requestAnimationFrame(() => {
      transitionEnabled.value = true;
    });
  }

  restartAutoPlay();
};

onMounted(() => {
  // 兜底：worker 账号不应进入用户控制台
  authStore.initializeAuth();
  if (authStore.user?.role === 'worker') {
    router.replace('/worker/dashboard');
    return;
  }
  restartAutoPlay();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style scoped lang="less">
.dashboard-home {
  position: relative;
  width: 100%;
  min-height: 100vh;
  /* 淡粉更明显：避免快速过渡到纯白导致“看起来还是白色” */
  background: linear-gradient(180deg, #fff5f7 0%, #fff5f7 42%, #ffffff 100%);
  margin-top: 0;
}

.hero-wrap {
  position: relative;
  user-select: none;
  overflow: hidden;
  touch-action: pan-y;
}

.hero-track {
  display: flex;
  width: 100%;
  transition: transform 0.35s ease;

  &.dragging {
    transition: none;
  }
}

.hero-slide {
  position: relative;
  width: 100%;
  min-width: 100%;
  height: calc(90vh - 40px);
  min-height: 620px;
  max-height: 860px;
  background-size: cover;
  background-position: center;
}

.indicators {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  gap: 10px;

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 0;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.55);
    transition: all 0.2s;

    &.active {
      width: 28px;
      border-radius: 999px;
      background: #fff;
    }
  }
}

.page-body {
  width: min(1200px, 100% - 32px);
  margin: 4px auto 80px;
  display: flex;
  flex-direction: column;
  gap: 60px;
}

.module-title {
  text-align: center;
  margin-bottom: 26px;

  h2 {
    font-size: 28px;
    color: #333;
    margin: 0;
  }

  .line {
    display: inline-block;
    width: 80px;
    height: 4px;
    background: #ff6b8b;
    border-radius: 999px;
    margin-top: 14px;
  }
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.feature-card {
  text-align: center;
  padding: 28px 18px;

  .icon {
    font-size: 40px;
    line-height: 1;
    margin-bottom: 14px;
  }

  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin: 0 0 10px;
  }

  p {
    font-size: 14px;
    color: #666;
    line-height: 1.7;
    margin: 0;
  }
}

.scroll-row {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.destination-card {
  flex: 0 0 300px;
  height: 200px;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;

  .overlay {
    position: absolute;
    inset: auto 0 0 0;
    padding: 16px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.68));
    color: #fff;

    h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }

    .tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      background: #ff6b8b;
      color: #fff;
      font-size: 12px;
    }
  }
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 30px;
}

.package-card {
  padding: 24px 20px;

  .level {
    font-size: 20px;
    color: #ff6b8b;
    margin: 0 0 8px;
  }

  .price {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 14px;
    color: #333;
  }

  ul {
    padding: 0;
    list-style: none;
    margin: 0 0 18px;

    li {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      line-height: 1.6;

      strong {
        color: #ff6b8b;
        font-weight: 700;
      }
    }
  }
}

.consult-btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #ff6b8b;
  color: #fff;
  font-weight: 600;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.gallery-card {
  height: 300px;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;

  .mask {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.45);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover .mask {
    opacity: 1;
  }
}

.style-tag {
  color: #fff;
  font-size: 16px;
}

.same-btn {
  border: none;
  border-radius: 6px;
  background: #ff6b8b;
  color: #fff;
  padding: 6px 14px;
}

.photographers .photographer-card {
  flex: 0 0 220px;
  text-align: center;
  padding: 20px 16px;

  img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid #ff6b8b;
    object-fit: cover;
    margin-bottom: 12px;
  }

  h3 {
    font-size: 18px;
    margin: 0 0 6px;
    color: #333;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.review-card {
  padding: 20px;

  .stars {
    color: #f7bf36;
    font-size: 18px;
    margin-bottom: 10px;
  }

  .content {
    margin: 0 0 12px;
    font-size: 14px;
    color: #666;
    line-height: 1.7;
  }

  .user {
    margin: 0;
    font-size: 14px;
    color: #333;
    font-weight: 700;
  }
}

.cta-banner {
  background: #ff6b8b;
  border-radius: 12px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px;

  h3 {
    margin: 0 0 8px;
    font-size: 24px;
  }

  p {
    margin: 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.88);
  }

  .right {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.btn-light,
.btn-outline {
  padding: 12px 24px;
  border-radius: 4px;
  height: auto;
}

.btn-light {
  border: none;
  color: #ff6b8b;
  background: #fff;
  font-weight: 600;
}

.btn-outline {
  border: 1px solid #fff;
  color: #fff;
  background: transparent;
}

@media (max-width: 768px) {
  .dashboard-home {
    height: calc(100vh - 96px);
    min-height: 480px;
    margin-top: -14px;
  }

  .hero-slide {
    height: 68vh;
    min-height: 500px;
    max-height: 700px;
  }

  .page-body {
    width: calc(100% - 24px);
    gap: 44px;
  }

  .feature-grid,
  .package-grid,
  .review-grid {
    grid-template-columns: 1fr;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }

  .cta-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
