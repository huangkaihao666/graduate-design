<template>
  <div class="packages-container">
    <!-- 导航栏 -->
    <nav class="navbar" :class="{ scrolled: isScrolled }">
      <div class="nav-content">
        <div class="nav-left">
          <a-button type="text" class="back-btn" @click="goBack">
            <template #icon>
              <span class="back-icon">←</span>
            </template>
            返回
          </a-button>
          <div class="logo" @click="goToHome">
            <span class="icon">📸</span>
            <span class="text">旅拍 · 智享</span>
          </div>
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
      <div class="hero-bg"></div>
      <div class="hero-content">
        <h1 class="title">发现您的<span class="highlight">完美旅拍套餐</span></h1>
        <p class="subtitle">精选全球热门目的地，专业团队为您打造难忘回忆</p>

        <!-- 搜索框 -->
        <div class="search-box">
          <a-input
            v-model:value="searchKeyword"
            placeholder="搜索套餐名称、目的地..."
            size="large"
            class="search-input"
            @press-enter="handleSearch"
          >
            <template #prefix>
              <span class="search-icon">🔍</span>
            </template>
          </a-input>
          <a-button type="primary" size="large" class="search-btn" @click="handleSearch">
            搜索
          </a-button>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filters-section">
      <div class="filters-content">
        <div class="filter-group">
          <span class="filter-label">拍摄风格：</span>
          <a-select
            v-model:value="filters.style"
            placeholder="全部风格"
            allow-clear
            style="width: 150px"
            @change="handleFilterChange"
          >
            <a-select-option value="romantic">浪漫梦幻</a-select-option>
            <a-select-option value="artistic">艺术文艺</a-select-option>
            <a-select-option value="bohemian">波西米亚</a-select-option>
            <a-select-option value="minimalist">极简现代</a-select-option>
            <a-select-option value="classical">古典优雅</a-select-option>
            <a-select-option value="adventure">冒险活力</a-select-option>
          </a-select>
        </div>

        <div class="filter-group">
          <span class="filter-label">目的地：</span>
          <a-select
            v-model:value="filters.location"
            placeholder="全部目的地"
            allow-clear
            style="width: 150px"
            @change="handleFilterChange"
          >
            <a-select-option value="三亚">三亚</a-select-option>
            <a-select-option value="大理">大理</a-select-option>
            <a-select-option value="丽江">丽江</a-select-option>
            <a-select-option value="厦门">厦门</a-select-option>
            <a-select-option value="青岛">青岛</a-select-option>
            <a-select-option value="巴厘岛">巴厘岛</a-select-option>
            <a-select-option value="普吉岛">普吉岛</a-select-option>
          </a-select>
        </div>

        <div class="filter-group">
          <span class="filter-label">价格区间：</span>
          <a-input-number
            v-model:value="filters.minPrice"
            placeholder="最低价"
            :min="0"
            style="width: 120px"
            @change="handleFilterChange"
          />
          <span class="filter-separator">-</span>
          <a-input-number
            v-model:value="filters.maxPrice"
            placeholder="最高价"
            :min="0"
            style="width: 120px"
            @change="handleFilterChange"
          />
        </div>

        <div class="filter-group">
          <span class="filter-label">行程天数：</span>
          <a-select
            v-model:value="filters.duration"
            placeholder="全部天数"
            allow-clear
            style="width: 120px"
            @change="handleFilterChange"
          >
            <a-select-option :value="1">1天</a-select-option>
            <a-select-option :value="2">2天</a-select-option>
            <a-select-option :value="3">3天</a-select-option>
            <a-select-option :value="5">5天</a-select-option>
            <a-select-option :value="7">7天</a-select-option>
          </a-select>
        </div>

        <a-button @click="resetFilters">重置</a-button>
      </div>
    </div>

    <!-- 套餐列表 -->
    <div class="packages-section">
      <div class="section-header">
        <h2>精选套餐</h2>
        <p>共找到 {{ pagination.total }} 个套餐</p>
      </div>

      <div v-if="loading" class="loading-state">
        <a-spin size="large" />
        <p>加载中...</p>
      </div>

      <div v-else-if="packages.length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <p>暂无套餐，请调整筛选条件</p>
      </div>

      <div v-else class="packages-grid">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="package-card"
          @click="openPackageDetail(pkg)"
        >
          <div v-if="pkg.isPopular" class="card-badge">🔥 热门</div>
          <div v-if="pkg.isHot" class="card-badge hot">⭐ 推荐</div>
          <a-button
            v-if="authStore.isAuthenticated"
            type="text"
            :class="['favorite-btn', { active: favoritePackageIds.has(pkg.id) }]"
            :loading="favoriteLoading.has(pkg.id)"
            @click.stop="handleToggleFavorite(pkg)"
          >
            {{ favoritePackageIds.has(pkg.id) ? '❤️' : '🤍' }}
          </a-button>
          <div class="card-image">
            <a-image
              :src="pkg.coverImage"
              :alt="pkg.name"
              :preview="false"
              class="cover-image"
              :fallback="pkg.coverImage"
            />
            <div class="image-overlay">
              <span class="location-tag">📍 {{ pkg.location }}</span>
            </div>
          </div>
          <div class="card-content">
            <div class="card-header">
              <h3 class="package-name">{{ pkg.name }}</h3>
              <div class="price-section">
                <span class="current-price">¥{{ pkg.price.toLocaleString() }}</span>
                <span v-if="pkg.originalPrice" class="original-price">
                  ¥{{ pkg.originalPrice.toLocaleString() }}
                </span>
              </div>
            </div>
            <p class="package-desc">{{ pkg.description }}</p>
            <div class="package-meta">
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                {{ pkg.duration }} 天
              </span>
              <span class="meta-item">
                <span class="meta-icon">👥</span>
                最多 {{ pkg.maxPeople }} 人
              </span>
              <span class="meta-item">
                <span class="meta-icon">🎨</span>
                {{ getStyleName(pkg.style) }}
              </span>
            </div>
            <div class="card-footer">
              <a-button type="primary" block @click.stop="handleBook(pkg)"> 立即预约 </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="packages.length > 0" class="pagination-wrapper">
        <a-pagination
          v-model:current="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :page-size-options="['12', '24', '48']"
          @change="handlePageChange"
          @show-size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 套餐详情模态框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="套餐详情"
      :width="1000"
      :footer="null"
      @cancel="closePackageDetail"
    >
      <div v-if="selectedPackage" class="package-detail">
        <div class="detail-images">
          <a-image
            :src="selectedPackage.coverImage"
            :alt="selectedPackage.name"
            :preview="true"
            class="main-image"
          />
          <div
            v-if="selectedPackage.images && selectedPackage.images.length > 0"
            class="thumbnails"
          >
            <a-image
              v-for="(img, index) in selectedPackage.images"
              :key="index"
              :src="img"
              :preview="true"
              class="thumbnail"
            />
          </div>
        </div>

        <div class="detail-content">
          <div class="detail-header">
            <h2>{{ selectedPackage.name }}</h2>
            <div class="detail-price">
              <span class="current-price">¥{{ selectedPackage.price.toLocaleString() }}</span>
              <span v-if="selectedPackage.originalPrice" class="original-price">
                ¥{{ selectedPackage.originalPrice.toLocaleString() }}
              </span>
            </div>
          </div>

          <div class="detail-meta">
            <div class="meta-row">
              <span class="meta-label">📍 目的地：</span>
              <span class="meta-value">{{ selectedPackage.location }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">📅 行程天数：</span>
              <span class="meta-value">{{ selectedPackage.duration }} 天</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">🎨 拍摄风格：</span>
              <span class="meta-value">{{ getStyleName(selectedPackage.style) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">👥 适合人数：</span>
              <span class="meta-value">最多 {{ selectedPackage.maxPeople }} 人</span>
            </div>
          </div>

          <div class="detail-description">
            <h3>套餐介绍</h3>
            <p>{{ selectedPackage.description }}</p>
          </div>

          <div class="detail-features">
            <h3>套餐亮点</h3>
            <ul>
              <li v-for="(feature, index) in selectedPackage.features" :key="index">
                {{ feature }}
              </li>
            </ul>
          </div>

          <div class="detail-includes">
            <h3>费用包含</h3>
            <ul>
              <li v-for="(item, index) in selectedPackage.includes" :key="index">✅ {{ item }}</li>
            </ul>
          </div>

          <div
            v-if="selectedPackage.excludes && selectedPackage.excludes.length > 0"
            class="detail-excludes"
          >
            <h3>费用不含</h3>
            <ul>
              <li v-for="(item, index) in selectedPackage.excludes" :key="index">❌ {{ item }}</li>
            </ul>
          </div>

          <div class="detail-actions">
            <a-button type="primary" size="large" @click="handleBook(selectedPackage)">
              立即预约
            </a-button>
          </div>
        </div>
      </div>
    </a-modal>

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
import { favoritesApi } from '@/api/favorites';
import { type Package } from '@/api/packages';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

// 状态管理
const isScrolled = ref(false);
const loading = ref(false);
const searchKeyword = ref('');
const packages = ref<Package[]>([]);
const detailModalVisible = ref(false);
const selectedPackage = ref<Package | null>(null);
const favoritePackageIds = ref<Set<number>>(new Set());
const favoriteLoading = ref<Set<number>>(new Set());

const filters = reactive({
  style: undefined as string | undefined,
  location: undefined as string | undefined,
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  duration: undefined as number | undefined,
});

const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0,
});

// 风格名称映射
const styleMap: Record<string, string> = {
  romantic: '浪漫梦幻',
  artistic: '艺术文艺',
  bohemian: '波西米亚',
  minimalist: '极简现代',
  classical: '古典优雅',
  adventure: '冒险活力',
};

const getStyleName = (style: string) => {
  return styleMap[style] || style;
};

// 返回上一页
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
};

// 滚动监听
const handleScroll = () => {
  isScrolled.value = window.scrollY > 50;
};

// 导航函数
const goToHome = () => {
  router.push('/');
};

const goToLogin = () => {
  router.push('/login');
};

const goToDashboard = () => {
  router.push('/dashboard');
};

// 搜索和筛选
const handleSearch = () => {
  pagination.page = 1;
  fetchPackages();
};

const handleFilterChange = () => {
  pagination.page = 1;
  fetchPackages();
};

const resetFilters = () => {
  filters.style = undefined;
  filters.location = undefined;
  filters.minPrice = undefined;
  filters.maxPrice = undefined;
  filters.duration = undefined;
  pagination.page = 1;
  fetchPackages();
};

// 分页处理
const handlePageChange = (page: number, pageSize: number) => {
  pagination.page = page;
  pagination.pageSize = pageSize;
  fetchPackages();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handlePageSizeChange = (_current: number, size: number) => {
  pagination.page = 1;
  pagination.pageSize = size;
  fetchPackages();
};

// 获取套餐列表
const fetchPackages = async () => {
  loading.value = true;
  try {
    // TODO: 对接真实 API
    // const response = await packagesApi.getPackages({
    //   page: pagination.page,
    //   pageSize: pagination.pageSize,
    //   style: filters.style,
    //   location: filters.location,
    //   minPrice: filters.minPrice,
    //   maxPrice: filters.maxPrice,
    //   duration: filters.duration,
    //   keyword: searchKeyword.value || undefined,
    // });
    // packages.value = response.data.items;
    // pagination.total = response.data.pagination.total;

    // 模拟数据
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const mockPackages = generateMockPackages();
    let filtered = mockPackages;

    // 应用筛选
    if (filters.style) {
      filtered = filtered.filter((p) => p.style === filters.style);
    }
    if (filters.location) {
      filtered = filtered.filter((p) => p.location === filters.location);
    }
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
    }
    if (filters.duration) {
      filtered = filtered.filter((p) => p.duration === filters.duration);
    }
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.location.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword)
      );
    }

    pagination.total = filtered.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    packages.value = filtered.slice(start, end);
  } catch (error: any) {
    console.error('获取套餐列表失败:', error);
    message.error('获取套餐列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 生成模拟数据
const generateMockPackages = (): Package[] => {
  const locations = ['三亚', '大理', '丽江', '厦门', '青岛', '巴厘岛', '普吉岛'];
  const styles = ['romantic', 'artistic', 'bohemian', 'minimalist', 'classical', 'adventure'];
  const mockPackages: Package[] = [];

  // 预设的图片URL数组（如果无法访问，可以替换为本地图片路径，如：'/images/package-1.jpg'）
  const imageUrls = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format&q=80',
  ];

  const detailImageUrls = [
    [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
    ],
  ];

  for (let i = 1; i <= 30; i++) {
    const location = locations[Math.floor(Math.random() * locations.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const duration = [1, 2, 3, 5, 7][Math.floor(Math.random() * 5)];
    const basePrice = [2999, 3999, 4999, 5999, 6999, 8999, 12999][Math.floor(Math.random() * 7)];
    const hasDiscount = Math.random() > 0.5;
    const imageIndex = (i - 1) % imageUrls.length;
    const detailImageIndex = (i - 1) % detailImageUrls.length;

    mockPackages.push({
      id: i,
      name: `${location}${duration}日${getStyleName(style)}旅拍套餐`,
      description: `精选${location}最美景点，专业摄影师全程跟拍，${duration}天${duration > 1 ? '深度' : ''}体验，为您打造难忘的旅拍回忆。包含专业化妆、精美服装、后期精修等服务。`,
      price: hasDiscount ? Math.floor(basePrice * 0.8) : basePrice,
      originalPrice: hasDiscount ? basePrice : undefined,
      duration,
      location,
      style,
      // 使用预设的图片URL（如果无法访问，可以替换为本地图片路径，如：'/images/package-1.jpg'）
      coverImage: imageUrls[imageIndex],
      images: detailImageUrls[detailImageIndex],
      features: [
        '专业摄影师全程跟拍',
        '精美婚纱礼服提供',
        '专业化妆造型服务',
        '精修照片30张以上',
        '视频花絮制作',
      ],
      includes: [
        '专业摄影师服务',
        '化妆造型服务',
        '精美婚纱礼服',
        '景点门票',
        '精修照片30张',
        '视频花絮',
      ],
      excludes: ['往返交通', '住宿费用', '餐饮费用'],
      maxPeople: [2, 4, 6][Math.floor(Math.random() * 3)],
      isPopular: i <= 3,
      isHot: i > 3 && i <= 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return mockPackages;
};

// 套餐详情
const openPackageDetail = (pkg: Package) => {
  selectedPackage.value = pkg;
  detailModalVisible.value = true;
};

const closePackageDetail = () => {
  detailModalVisible.value = false;
  selectedPackage.value = null;
};

// 预约
const handleBook = (pkg: Package) => {
  if (!authStore.isAuthenticated) {
    message.warning('请先登录后再预约');
    router.push('/login');
    return;
  }
  router.push(`/booking/order?packageId=${pkg.id}`);
};

// 加载收藏状态
const loadFavoriteStatus = async () => {
  if (!authStore.isAuthenticated) {
    return;
  }
  try {
    const response: any = await favoritesApi.getFavoritePackageIds();
    const data = response?.data?.data || response?.data || response;
    if (data?.packageIds && Array.isArray(data.packageIds)) {
      favoritePackageIds.value = new Set(data.packageIds);
    }
  } catch (error: any) {
    console.error('加载收藏状态失败:', error);
  }
};

// 切换收藏状态
const handleToggleFavorite = async (pkg: Package) => {
  if (!authStore.isAuthenticated) {
    message.warning('请先登录后再收藏');
    router.push('/login');
    return;
  }

  const isFavorite = favoritePackageIds.value.has(pkg.id);
  favoriteLoading.value.add(pkg.id);

  try {
    if (isFavorite) {
      // 取消收藏
      await favoritesApi.removeFavoriteByPackageId(pkg.id);
      favoritePackageIds.value.delete(pkg.id);
      message.success('已取消收藏');
    } else {
      // 添加收藏
      await favoritesApi.addFavorite(pkg.id);
      favoritePackageIds.value.add(pkg.id);
      message.success('收藏成功');
    }
  } catch (error: any) {
    console.error('收藏操作失败:', error);
    message.error(error?.response?.data?.message || '操作失败，请稍后重试');
  } finally {
    favoriteLoading.value.delete(pkg.id);
  }
};

onMounted(() => {
  authStore.initializeAuth();
  window.addEventListener('scroll', handleScroll);
  fetchPackages();
  loadFavoriteStatus();
});
</script>

<style scoped lang="less">
.packages-container {
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

  .nav-left {
    display: flex;
    align-items: center;
    gap: 20px;

    .back-btn {
      color: white;
      font-size: 1rem;
      padding: 8px 16px;
      height: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s;
      border-radius: 20px;
      background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
      border: none;
      box-shadow: 0 2px 8px rgba(255, 117, 140, 0.3);

      &:hover {
        background: linear-gradient(90deg, #ff7eb3 0%, #ff758c 100%);
        transform: translateX(-3px);
        box-shadow: 0 4px 12px rgba(255, 117, 140, 0.4);
      }

      .back-icon {
        font-size: 1.2rem;
        font-weight: 600;
      }
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.5rem;
      font-weight: 700;
      cursor: pointer;

      .text {
        color: white;
        transition: color 0.3s;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    }
  }

  &.scrolled {
    .nav-left {
      .back-btn {
        color: white;
        background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
        border: none;
        box-shadow: 0 2px 8px rgba(255, 117, 140, 0.3);

        &:hover {
          background: linear-gradient(90deg, #ff7eb3 0%, #ff758c 100%);
          box-shadow: 0 4px 12px rgba(255, 117, 140, 0.4);
        }
      }

      .logo .text {
        color: #333;
        text-shadow: none;
      }
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
  height: 400px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  overflow: hidden;
  margin-top: 70px;

  .hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
    z-index: 0;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop')
        center/cover;
      opacity: 0.3;
    }
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 800px;
    padding: 0 20px;

    .title {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.2;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);

      .highlight {
        background: linear-gradient(120deg, #fff 0%, #ffe0e6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .subtitle {
      font-size: 1.2rem;
      margin-bottom: 30px;
      opacity: 0.95;
    }

    .search-box {
      display: flex;
      gap: 10px;
      max-width: 600px;
      margin: 0 auto;

      .search-input {
        flex: 1;
        border-radius: 30px;
        height: 50px;

        :deep(.ant-input) {
          border-radius: 30px;
          padding-left: 45px;
        }
      }

      .search-icon {
        font-size: 1.2rem;
      }

      .search-btn {
        height: 50px;
        padding: 0 30px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}

// 筛选栏
.filters-section {
  background: #f8f9fa;
  padding: 20px 0;
  border-bottom: 1px solid #e0e0e0;

  .filters-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;

    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;

      .filter-label {
        font-weight: 500;
        color: #666;
        white-space: nowrap;
      }

      .filter-separator {
        color: #999;
        margin: 0 5px;
      }
    }
  }
}

// 套餐列表区域
.packages-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 20px;

  .section-header {
    text-align: center;
    margin-bottom: 40px;

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    p {
      color: #666;
      font-size: 1rem;
    }
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: #999;

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    p {
      font-size: 1.1rem;
    }
  }

  .packages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 30px;
    margin-bottom: 40px;
  }
}

// 套餐卡片
.package-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .card-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(255, 117, 140, 0.4);

    &.hot {
      background: linear-gradient(90deg, #ffa940 0%, #ffc53d 100%);
    }
  }

  .favorite-btn {
    position: absolute;
    top: 15px;
    left: 15px;
    z-index: 3;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 1);
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    &.active {
      background: rgba(255, 77, 79, 0.1);
      animation: heartBeat 0.5s ease-in-out;
    }
  }

  @keyframes heartBeat {
    0%,
    100% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.2);
    }
    50% {
      transform: scale(1);
    }
    75% {
      transform: scale(1.1);
    }
  }

  .card-image {
    position: relative;
    width: 100%;
    height: 220px;
    overflow: hidden;

    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;

      :deep(.ant-image-img) {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .image-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
      padding: 15px;

      .location-tag {
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
      }
    }

    &:hover .cover-image {
      transform: scale(1.1);
    }
  }

  .card-content {
    padding: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;

      .package-name {
        font-size: 1.2rem;
        font-weight: 600;
        color: #333;
        margin: 0;
        flex: 1;
        line-height: 1.4;
      }

      .price-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;

        .current-price {
          font-size: 1.3rem;
          font-weight: 700;
          color: #ff758c;
        }

        .original-price {
          font-size: 0.9rem;
          color: #999;
          text-decoration: line-through;
        }
      }
    }

    .package-desc {
      color: #666;
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 15px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .package-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #f0f0f0;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #666;
        font-size: 0.85rem;

        .meta-icon {
          font-size: 1rem;
        }
      }
    }

    .card-footer {
      margin-top: 15px;
    }
  }
}

// 分页
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

// 套餐详情模态框
.package-detail {
  .detail-images {
    margin-bottom: 30px;

    .main-image {
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 15px;

      :deep(.ant-image-img) {
        width: 100%;
        max-height: 400px;
        object-fit: cover;
      }
    }

    .thumbnails {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;

      .thumbnail {
        width: 120px;
        height: 120px;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;

        :deep(.ant-image-img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }
  }

  .detail-content {
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;

      h2 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #333;
        margin: 0;
        flex: 1;
      }

      .detail-price {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 5px;

        .current-price {
          font-size: 1.8rem;
          font-weight: 700;
          color: #ff758c;
        }

        .original-price {
          font-size: 1rem;
          color: #999;
          text-decoration: line-through;
        }
      }
    }

    .detail-meta {
      margin-bottom: 30px;

      .meta-row {
        display: flex;
        margin-bottom: 12px;
        font-size: 1rem;

        .meta-label {
          font-weight: 600;
          color: #666;
          width: 120px;
        }

        .meta-value {
          color: #333;
        }
      }
    }

    .detail-description,
    .detail-features,
    .detail-includes,
    .detail-excludes {
      margin-bottom: 25px;

      h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: #333;
        margin-bottom: 15px;
      }

      p {
        color: #666;
        line-height: 1.8;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: 8px 0;
          color: #666;
          line-height: 1.6;
        }
      }
    }

    .detail-actions {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
      text-align: center;
    }
  }
}

// 页脚
.footer {
  background: #333;
  color: white;
  padding: 60px 20px 20px;
  margin-top: 80px;

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

// 响应式
@media (max-width: 768px) {
  .hero-section {
    .hero-content {
      .title {
        font-size: 2rem;
      }

      .search-box {
        flex-direction: column;
      }
    }
  }

  .filters-section {
    .filters-content {
      flex-direction: column;
      align-items: stretch;

      .filter-group {
        flex-direction: column;
        align-items: stretch;
      }
    }
  }

  .packages-grid {
    grid-template-columns: 1fr !important;
  }

  .footer-content {
    flex-direction: column;
    gap: 40px;
  }
}
</style>
