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
      <div class="hero-viewport">
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

      <section class="hero-feature-overlay">
        <div class="module-title">
          <h2>核心功能</h2>
          <span class="line"></span>
        </div>
        <div class="feature-grid">
          <article
            v-for="item in featureModules"
            :key="item.title"
            class="card feature-card"
            @click="goFeature(item.route)"
          >
            <div class="icon">{{ item.icon }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </article>
        </div>
      </section>
    </div>

    <div class="page-body">
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
            @click="goDestination(item.name)"
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
            v-for="(item, idx) in gallery"
            :key="item.image"
            class="gallery-card card"
            :style="{ backgroundImage: `url(${item.image})` }"
            @click="goPackages"
          >
            <div class="mask">
              <span class="style-tag">{{ hoverStyleLabels[idx % hoverStyleLabels.length] }}</span>
              <a-button class="same-btn" @click.stop="goPackages">我要拍同款</a-button>
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
          <h2>妆造师团队</h2>
          <span class="line"></span>
        </div>
        <div class="scroll-row makeup-artists">
          <article v-for="item in makeupArtists" :key="item.name" class="card photographer-card">
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
import { photographersApi, type PhotographerPublic } from '@/api/photographers';
import { useAuthStore } from '@/store/auth';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

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
    route: '/ai/style-recommendation',
  },
  {
    icon: '👰',
    title: '虚拟试衣预览',
    desc: '上传照片在线试穿婚纱，预览上身效果',
    route: '/ai/virtual-try-on',
  },
  {
    icon: '🗺️',
    title: 'AI 行程规划',
    desc: '输入目的地 / 预算 / 天数，一键生成拍摄路线',
    route: '/ai/itinerary-planning',
  },
  {
    icon: '💄',
    title: '一键试妆',
    desc: '上传照片快速体验妆容效果，提前预览更安心',
    route: '/ai/makeup-try-on',
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
      'https://images.unsplash.com/photo-1470219556762-1771e7f9427d?q=80&w=1200&auto=format&fit=crop',
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

type GalleryItem = {
  style: string;
  image: string;
};

const GALLERY_CACHE_KEY = 'dashboard-gallery-cache-v1';
const hoverStyleLabels = ['新中式', '古镇纪实', '雪山自由', '森系草坪', '海岛清新', '韩式简约'];

const fallbackGallery: GalleryItem[] = [
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

const readGalleryCache = (): GalleryItem[] => {
  try {
    const raw = sessionStorage.getItem(GALLERY_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as GalleryItem[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => !!x && !!x.image);
  } catch {
    return [];
  }
};

const writeGalleryCache = (cards: GalleryItem[]) => {
  try {
    sessionStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(cards));
  } catch {
    /* ignore */
  }
};

const dynamicGallery = ref<GalleryItem[]>(readGalleryCache());
const gallery = computed<GalleryItem[]>(() =>
  dynamicGallery.value.length > 0 ? dynamicGallery.value : fallbackGallery
);

const normalizeStyleLabel = (style: string) => {
  const raw = String(style || '').trim();
  if (!raw) return '旅拍风格';

  const candidates = [
    '韩式简约',
    '新中式',
    '中式国风',
    '电影感',
    '法式复古',
    '森系清新',
    '韩系清新',
    '清新自然',
    '复古质感',
    '海岛轻旅拍',
    '纪实',
    '法式',
    '森系',
    '复古',
    '清新',
    '韩式',
    '中式',
  ];
  const hit = candidates.find((x) => raw.includes(x));
  if (hit) return hit;

  const first = raw.split(/[、,，/|·\s]+/).find(Boolean) || raw;
  return first.length > 8 ? `${first.slice(0, 8)}...` : first;
};

const fallbackPhotographers = [
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

const dynamicPhotographers = ref<Array<{ name: string; style: string; avatar: string }>>([]);
const photographers = computed(() =>
  dynamicPhotographers.value.length > 0 ? dynamicPhotographers.value : fallbackPhotographers
);

const fallbackMakeupArtists = [
  {
    name: '苏禾',
    style: '清透氧气妆主理人',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    name: '江语',
    style: '中式妆造设计师',
    avatar: 'https://randomuser.me/api/portraits/women/58.jpg',
  },
  {
    name: '安然',
    style: '韩系新娘妆造师',
    avatar: 'https://randomuser.me/api/portraits/women/36.jpg',
  },
];

const dynamicMakeupArtists = ref<Array<{ name: string; style: string; avatar: string }>>([]);
const makeupArtists = computed(() =>
  dynamicMakeupArtists.value.length > 0 ? dynamicMakeupArtists.value : fallbackMakeupArtists
);

const loadHomepagePhotographers = async () => {
  try {
    const [list, makeupList] = await Promise.all([
      photographersApi.getPublic(),
      photographersApi.getPublicMakeupArtists(),
    ]);
    const cards: GalleryItem[] = [];
    const workers: Array<{ name: string; style: string; avatar: string }> = [];
    const makeupWorkers: Array<{ name: string; style: string; avatar: string }> = [];

    list.forEach((p: PhotographerPublic) => {
      const urlsFromItems = Array.isArray(p.portfolioItems)
        ? p.portfolioItems.map((x) => String(x?.url || '').trim()).filter(Boolean)
        : [];
      const urlsFromImages = Array.isArray(p.portfolioImages)
        ? p.portfolioImages.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
      const uniqueUrls = [...new Set([...urlsFromItems, ...urlsFromImages])];
      const firstImage = uniqueUrls[0];
      if (firstImage) {
        cards.push({
          image: firstImage,
          style: normalizeStyleLabel(p.shootingStyle),
        });
      }

      workers.push({
        name: String(p.name || '摄影师'),
        style: String(p.title || '').trim() || normalizeStyleLabel(p.shootingStyle),
        avatar: String(p.avatar || firstImage || ''),
      });
    });

    makeupList.forEach((p) => {
      const urlsFromItems = Array.isArray(p.portfolioItems)
        ? p.portfolioItems.map((x) => String(x?.url || '').trim()).filter(Boolean)
        : [];
      const urlsFromImages = Array.isArray(p.portfolioImages)
        ? p.portfolioImages.map((x) => String(x || '').trim()).filter(Boolean)
        : [];
      const uniqueUrls = [...new Set([...urlsFromItems, ...urlsFromImages])];
      const firstImage = uniqueUrls[0];
      makeupWorkers.push({
        name: String(p.name || '妆造师'),
        style: String(p.title || '').trim() || normalizeStyleLabel(p.shootingStyle),
        avatar: String(p.avatar || firstImage || ''),
      });
    });

    if (cards.length > 0) {
      dynamicGallery.value = cards;
      writeGalleryCache(cards);
    }
    dynamicPhotographers.value = workers.filter((x) => !!x.avatar);
    dynamicMakeupArtists.value = makeupWorkers.filter((x) => !!x.avatar);
  } catch {
    // 保底：接口失败时继续使用本地静态数据
  }
};

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
const goFeature = (path: string) => router.push(path);
const goDestination = (location: string) =>
  router.push({ path: '/booking/packages', query: { location } });

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

onMounted(async () => {
  // 兜底：worker 账号不应进入用户控制台
  authStore.initializeAuth();
  if (authStore.user?.role === 'worker') {
    router.replace('/worker/dashboard');
    return;
  }
  await loadHomepagePhotographers();
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
  background: #fff5f7;
  margin-top: 0;
}

.hero-wrap {
  position: relative;
  user-select: none;
  overflow: visible;
  touch-action: pan-y;
}

.hero-viewport {
  overflow: hidden;
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
  height: calc(78vh - 40px);
  min-height: 540px;
  max-height: 760px;
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

.hero-feature-overlay {
  position: absolute;
  left: 50%;
  bottom: -98px;
  transform: translateX(-50%);
  width: min(1200px, calc(100% - 32px));
  z-index: 6;
  background: transparent;

  .module-title {
    margin-bottom: 20px;

    h2 {
      color: #fff;
      text-shadow: 0 3px 12px rgba(0, 0, 0, 0.35);
    }
  }
}

.page-body {
  width: 100%;
  max-width: 1200px;
  margin: 140px auto 80px;
  padding: 0 16px;
  box-sizing: border-box;
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
  background: #fff;
  backdrop-filter: none;

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
  cursor: pointer;
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
  cursor: pointer;
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
  display: inline-block;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.same-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  border-radius: 10px;
  background: #ff6b8b !important;
  color: #fff !important;
  font-weight: 700;
  height: 40px;
  min-width: 120px;
  padding: 0 8px;
  line-height: 1;
  text-align: center;

  &:hover,
  &:focus,
  &:active {
    background: #f2557f !important;
    border-color: #f2557f !important;
    color: #fff !important;
  }
}

.photographers .photographer-card,
.makeup-artists .photographer-card {
  flex: 0 0 220px;
  text-align: center;
  padding: 20px 16px;

  img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: none;
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

  &:hover,
  &:focus,
  &:active,
  &:focus-visible {
    color: #e84f79 !important;
    background: #fff7fa !important;
    border-color: transparent !important;
    box-shadow: none !important;
    outline: none !important;
  }
}

.btn-outline {
  border: 1px solid #fff;
  color: #fff;
  background: transparent;

  &:hover,
  &:focus,
  &:active,
  &:focus-visible {
    color: #fff !important;
    background: rgba(255, 255, 255, 0.2) !important;
    border-color: #fff !important;
    box-shadow: none !important;
    outline: none !important;
  }
}

@media (max-width: 768px) {
  .dashboard-home {
    height: calc(100vh - 96px);
    min-height: 480px;
    margin-top: -14px;
  }

  .hero-slide {
    height: 60vh;
    min-height: 420px;
    max-height: 620px;
  }

  .hero-feature-overlay {
    width: calc(100% - 24px);
    bottom: 18px;

    .module-title {
      margin-bottom: 14px;

      h2 {
        font-size: 24px;
      }

      .line {
        margin-top: 10px;
      }
    }
  }

  .page-body {
    max-width: 100%;
    padding: 0 12px;
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
