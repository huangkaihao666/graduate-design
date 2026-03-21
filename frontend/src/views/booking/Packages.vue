<template>
  <div class="packages-container">
    <!-- 导航栏 -->
    <nav class="navbar" :class="{ scrolled: isScrolled }">
      <div class="nav-content">
        <div class="nav-left">
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
            v-model:value="searchInputKeyword"
            placeholder="搜索套餐名称、目的地..."
            size="large"
            class="search-input"
            allow-clear
            @press-enter="handleSearch"
            @clear="handleClearSearch"
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
            size="large"
            style="width: 220px"
            :options="styleSelectOptions"
            @change="handleFilterChange"
          />
        </div>

        <div class="filter-group">
          <span class="filter-label">地区类型：</span>
          <a-select
            v-model:value="filters.region"
            placeholder="全部地区"
            allow-clear
            size="large"
            style="width: 120px"
            @change="handleRegionChange"
          >
            <a-select-option value="domestic">国内</a-select-option>
            <a-select-option value="overseas">国外</a-select-option>
          </a-select>
        </div>

        <div class="filter-group">
          <span class="filter-label">目的地：</span>
          <a-select
            v-model:value="filters.location"
            placeholder="全部目的地"
            allow-clear
            size="large"
            style="width: 240px"
            :options="locationSelectOptions"
            @change="handleFilterChange"
          />
        </div>

        <div class="filter-group">
          <span class="filter-label">排序：</span>
          <a-select
            v-model:value="filters.sortBy"
            size="large"
            style="width: 150px"
            :options="sortOptions"
            @change="handleFilterChange"
          />
        </div>

        <div class="filter-group">
          <span class="filter-label">价格区间：</span>
          <a-input-number
            v-model:value="filters.minPrice"
            placeholder="最低价"
            :min="0"
            size="large"
            style="width: 120px"
            @change="handleFilterChange"
          />
          <span class="filter-separator">-</span>
          <a-input-number
            v-model:value="filters.maxPrice"
            placeholder="最高价"
            :min="0"
            size="large"
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
            size="large"
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
        <a-button
          v-if="isFilteringActive"
          type="primary"
          class="recommend-entry-btn"
          @click="openRecommendDrawer"
        >
          {{ isFilteringActive ? '查看推荐' : '猜你喜欢' }}
        </a-button>
      </div>
      <div class="hot-tags-row">
        <span class="hot-tags-label">热门标签：</span>
        <a-button
          v-for="tag in hotTags"
          :key="tag.value"
          size="middle"
          class="hot-tag-btn"
          :type="filters.hotTags.includes(tag.value) ? 'primary' : 'default'"
          @click="toggleHotTag(tag.value)"
        >
          <span v-text="tag.label"></span>
        </a-button>
      </div>
    </div>

    <!-- 个性化推荐（仅在未筛选时展示） -->
    <div v-if="!isFilteringActive && recommendedPackages.length > 0" class="recommend-section">
      <div class="section-header">
        <h2>你可能喜欢</h2>
        <p>基于你的浏览与生成偏好，为你智能推荐</p>
      </div>
      <div class="recommend-grid">
        <div
          v-for="pkg in recommendedPackages"
          :key="`recommend-${pkg.id}`"
          class="recommend-card"
          @click="openPackageDetail(pkg)"
        >
          <a-image :src="pkg.coverImage" :preview="false" class="recommend-cover" />
          <div class="recommend-info">
            <h4>{{ pkg.name }}</h4>
            <p>📍 {{ pkg.location }} · 🎨 {{ getStyleName(pkg.style) }} · {{ pkg.duration }} 天</p>
            <span class="recommend-price">¥{{ pkg.price.toLocaleString() }}</span>
            <a-button
              type="primary"
              block
              size="small"
              class="recommend-book-btn"
              @click.stop="handleBook(pkg)"
            >
              立即预约
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isFilteringActive && comboRecommendations.length > 0" class="recommend-section">
      <div class="section-header">
        <h2>推荐组合套餐</h2>
        <p>按主题自动搭配，帮你快速决策</p>
      </div>
      <div class="combo-grid">
        <div
          v-for="combo in comboRecommendations"
          :key="combo.title"
          class="combo-card"
          @click="openComboDetail(combo)"
        >
          <h4>{{ combo.title }}</h4>
          <p class="combo-desc">{{ combo.description }}</p>
          <div class="combo-items">
            <button
              v-for="item in combo.items"
              :key="`${combo.title}-${item.id}`"
              type="button"
              class="combo-item-chip"
              @click.stop="openPackageDetail(item)"
            >
              {{ item.location }} · {{ getStyleName(item.style) }} · ¥{{
                item.price.toLocaleString()
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 套餐列表 -->
    <div class="packages-section">
      <div class="section-header">
        <h2>精选套餐</h2>
        <p>共找到 <span v-text="pagination.total"></span> 个套餐</p>
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

    <a-drawer
      v-model:open="recommendDrawerVisible"
      title="猜你喜欢"
      placement="right"
      :width="560"
      class="recommend-drawer"
    >
      <p class="drawer-subtitle">
        {{
          isFilteringActive
            ? '你正在筛选中，推荐已收纳到侧边，避免遮挡目的地列表。'
            : '基于你的浏览与生成偏好，为你推荐更适合的套餐。'
        }}
      </p>

      <div v-if="recommendedPackages.length > 0" class="recommend-section drawer-mode">
        <div class="section-header">
          <h2>你可能喜欢</h2>
          <p>点击卡片可查看详情或直接预约</p>
        </div>
        <div class="recommend-grid">
          <div
            v-for="pkg in recommendedPackages"
            :key="`recommend-drawer-${pkg.id}`"
            class="recommend-card"
            @click="openPackageDetail(pkg)"
          >
            <a-image :src="pkg.coverImage" :preview="false" class="recommend-cover" />
            <div class="recommend-info">
              <h4>{{ pkg.name }}</h4>
              <p>
                📍 {{ pkg.location }} · 🎨 {{ getStyleName(pkg.style) }} · {{ pkg.duration }} 天
              </p>
              <span class="recommend-price">¥{{ pkg.price.toLocaleString() }}</span>
              <a-button
                type="primary"
                block
                size="small"
                class="recommend-book-btn"
                @click.stop="handleBook(pkg)"
              >
                立即预约
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="comboRecommendations.length > 0" class="recommend-section drawer-mode">
        <div class="section-header">
          <h2>推荐组合套餐</h2>
          <p>按主题自动搭配，帮你快速决策</p>
        </div>
        <div class="combo-grid">
          <div
            v-for="combo in comboRecommendations"
            :key="`drawer-${combo.title}`"
            class="combo-card"
            @click="openComboDetail(combo)"
          >
            <h4>{{ combo.title }}</h4>
            <p class="combo-desc">{{ combo.description }}</p>
            <div class="combo-items">
              <button
                v-for="item in combo.items"
                :key="`${combo.title}-${item.id}`"
                type="button"
                class="combo-item-chip"
                @click.stop="openPackageDetail(item)"
              >
                {{ item.location }} · {{ getStyleName(item.style) }} · ¥{{
                  item.price.toLocaleString()
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </a-drawer>

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
import { packagesApi, type Package, type PackageListResponse } from '@/api/packages';
import { styleTagsApi } from '@/api/styleTags';
import {
  HOT_TAGS_CONFIG,
  matchPackageByHotTag,
  type HotTagKey,
} from '@/constants/package-hot-tags';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

// 状态管理
const isScrolled = ref(false);
const loading = ref(false);
const searchInputKeyword = ref('');
const searchKeyword = ref('');
const packages = ref<Package[]>([]);
const allPackages = ref<Package[]>([]);
const detailModalVisible = ref(false);
const recommendDrawerVisible = ref(false);
const selectedPackage = ref<Package | null>(null);
const favoritePackageIds = ref<Set<number>>(new Set());
const favoriteLoading = ref<Set<number>>(new Set());
const behaviorProfile = ref<{ locations: string[]; styles: string[]; budgets: number[] }>({
  locations: [],
  styles: [],
  budgets: [],
});

const GUEST_FAVORITES_KEY = 'guest-favorite-package-ids';
const BROWSE_HISTORY_KEY = 'package-browse-history';
const VTO_STATE_KEY = 'virtual-try-on-state';
const STYLE_RECOMMENDATION_STATE_KEY = 'style-recommendation-state';
const ITINERARY_STATE_KEY = 'itinerary-planning-state';

const domesticLocations = [
  '三亚',
  '大理',
  '丽江',
  '厦门',
  '青岛',
  '北京',
  '上海',
  '杭州',
  '苏州',
  '南京',
  '成都',
  '重庆',
  '西安',
  '长沙',
  '张家界',
  '桂林',
  '昆明',
  '香格里拉',
  '拉萨',
  '香港',
  '澳门',
];

const overseasLocations = [
  '东京',
  '京都',
  '首尔',
  '新加坡',
  '巴厘岛',
  '普吉岛',
  '清迈',
  '马尔代夫',
  '巴黎',
  '罗马',
];

const locationRegionMap = new Map<string, 'domestic' | 'overseas'>();
domesticLocations.forEach((location) => locationRegionMap.set(location, 'domestic'));
overseasLocations.forEach((location) => locationRegionMap.set(location, 'overseas'));

const baseStyleMap: Record<string, string> = {
  romantic: '浪漫梦幻',
  artistic: '艺术文艺',
  bohemian: '波西米亚',
  minimalist: '极简现代',
  classical: '古典优雅',
  adventure: '冒险活力',
};

const loadedStyleMap = ref<Record<string, string>>({ ...baseStyleMap });

const loadStyleTags = async () => {
  try {
    const tags = await styleTagsApi.getPublic();
    const next = { ...baseStyleMap };
    tags.forEach((t) => {
      if (t.enabled) next[t.key] = t.name;
    });
    loadedStyleMap.value = next;
  } catch {
    /* 保持默认映射 */
  }
};

const locationOptions = ref<string[]>([...domesticLocations, ...overseasLocations]);
const locationSelectOptions = computed(() =>
  locationOptions.value.map((city) => ({
    label: city,
    value: city,
  }))
);
const styleSelectOptions = computed(() =>
  Object.entries(loadedStyleMap.value).map(([value, label]) => ({
    label,
    value,
  }))
);
const sortOptions = [
  { label: '推荐排序', value: 'recommended' },
  { label: '价格从低到高', value: 'priceAsc' },
  { label: '价格从高到低', value: 'priceDesc' },
  { label: '行程天数从短到长', value: 'durationAsc' },
  { label: '最新上架', value: 'newest' },
];
const hotTags = HOT_TAGS_CONFIG;

const filters = reactive({
  region: undefined as 'domestic' | 'overseas' | undefined,
  style: undefined as string | undefined,
  location: undefined as string | undefined,
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  duration: undefined as number | undefined,
  sortBy: 'recommended' as 'recommended' | 'priceAsc' | 'priceDesc' | 'durationAsc' | 'newest',
  hotTags: [] as HotTagKey[],
});

const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0,
});

const isFilteringActive = computed(() => {
  return (
    Boolean(searchKeyword.value.trim()) ||
    Boolean(filters.region) ||
    Boolean(filters.style) ||
    Boolean(filters.location) ||
    filters.hotTags.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.duration !== undefined ||
    filters.sortBy !== 'recommended'
  );
});

const recommendedPackages = computed(() => {
  if (allPackages.value.length === 0) {
    return [];
  }

  const locationSet = new Set(behaviorProfile.value.locations);
  const styleSet = new Set(behaviorProfile.value.styles);
  const avgBudget = behaviorProfile.value.budgets.length
    ? behaviorProfile.value.budgets.reduce((sum, n) => sum + n, 0) /
      behaviorProfile.value.budgets.length
    : undefined;

  const ranked = [...allPackages.value]
    .map((pkg) => {
      let score = 0;
      if (locationSet.has(pkg.location)) {
        score += 4;
      }
      if (styleSet.has(pkg.style)) {
        score += 4;
      }
      if (favoritePackageIds.value.has(pkg.id)) {
        score += 3;
      }
      if (pkg.isPopular) {
        score += 2;
      }
      if (pkg.isHot) {
        score += 1;
      }
      if (avgBudget) {
        const budgetGap = Math.abs(pkg.price - avgBudget);
        score += Math.max(0, 3 - budgetGap / 2000);
      }
      return { pkg, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.pkg);

  return ranked;
});

const comboRecommendations = computed(() => {
  const source =
    recommendedPackages.value.length > 0 ? recommendedPackages.value : allPackages.value;
  if (source.length < 2) {
    return [];
  }

  const byPriceAsc = [...source].sort((a, b) => a.price - b.price);
  const byDurationAsc = [...source].sort((a, b) => a.duration - b.duration);
  const byHot = [...source].sort(
    (a, b) => Number(Boolean(b.isPopular || b.isHot)) - Number(Boolean(a.isPopular || a.isHot))
  );

  return [
    {
      title: '周末轻量组合',
      description: '优先短行程与高性价比，适合快节奏出行',
      items: byDurationAsc.slice(0, 2),
    },
    {
      title: '品质进阶组合',
      description: '热门+高口碑搭配，适合一次拍到位',
      items: byHot.slice(0, 2),
    },
    {
      title: '预算友好组合',
      description: '价格更友好，兼顾风格与体验',
      items: byPriceAsc.slice(0, 2),
    },
  ].filter((combo) => combo.items.length > 0);
});

const getStyleName = (style: string) => {
  return loadedStyleMap.value[style] || style;
};

const safeReadJSON = (raw: string | null) => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const updateBehaviorProfile = () => {
  const locationSet = new Set<string>();
  const styleSet = new Set<string>();
  const budgets: number[] = [];

  const browseHistory = safeReadJSON(localStorage.getItem(BROWSE_HISTORY_KEY));
  if (Array.isArray(browseHistory)) {
    browseHistory.slice(0, 20).forEach((item) => {
      if (item?.location) {
        locationSet.add(String(item.location));
      }
      if (item?.style) {
        styleSet.add(String(item.style));
      }
      if (typeof item?.price === 'number') {
        budgets.push(item.price);
      }
    });
  }

  const vtoState = safeReadJSON(sessionStorage.getItem(VTO_STATE_KEY));
  if (vtoState?.selectedStyle) {
    styleSet.add(String(vtoState.selectedStyle));
  }

  const styleState = safeReadJSON(sessionStorage.getItem(STYLE_RECOMMENDATION_STATE_KEY));
  if (styleState?.formData?.destination) {
    locationSet.add(String(styleState.formData.destination));
  }
  if (styleState?.result?.recommendedStyles && Array.isArray(styleState.result.recommendedStyles)) {
    styleState.result.recommendedStyles.slice(0, 3).forEach((x: any) => {
      if (x?.style) {
        styleSet.add(String(x.style));
      }
      if (x?.budget) {
        const budgetNum = Number(String(x.budget).replace(/[^\d]/g, ''));
        if (!Number.isNaN(budgetNum) && budgetNum > 0) {
          budgets.push(budgetNum);
        }
      }
    });
  }

  const itineraryState = safeReadJSON(sessionStorage.getItem(ITINERARY_STATE_KEY));
  if (itineraryState?.destination) {
    locationSet.add(String(itineraryState.destination));
  }
  if (itineraryState?.style) {
    styleSet.add(String(itineraryState.style));
  }
  if (itineraryState?.budget) {
    const budgetNum = Number(String(itineraryState.budget).replace(/[^\d]/g, ''));
    if (!Number.isNaN(budgetNum) && budgetNum > 0) {
      budgets.push(budgetNum);
    }
  }

  behaviorProfile.value = {
    locations: [...locationSet],
    styles: [...styleSet],
    budgets,
  };
};

const saveBrowseBehavior = (pkg: Package) => {
  const raw = safeReadJSON(localStorage.getItem(BROWSE_HISTORY_KEY));
  const history = Array.isArray(raw) ? raw : [];
  const next = [
    {
      packageId: pkg.id,
      location: pkg.location,
      style: pkg.style,
      price: pkg.price,
      timestamp: Date.now(),
    },
    ...history.filter((item) => item?.packageId !== pkg.id),
  ].slice(0, 30);
  localStorage.setItem(BROWSE_HISTORY_KEY, JSON.stringify(next));
  updateBehaviorProfile();
};

const getGuestFavoriteIds = (): number[] => {
  const data = safeReadJSON(localStorage.getItem(GUEST_FAVORITES_KEY));
  return Array.isArray(data) ? data.filter((id) => typeof id === 'number') : [];
};

const setGuestFavoriteIds = (ids: number[]) => {
  localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(ids));
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
  searchKeyword.value = searchInputKeyword.value.trim();
  pagination.page = 1;
  fetchPackages();
};

const handleClearSearch = () => {
  searchInputKeyword.value = '';
  searchKeyword.value = '';
  resetFilters();
};

watch(searchInputKeyword, (value, oldValue) => {
  // 兼容某些场景下 clear 图标事件不触发：输入从非空变为空时自动恢复浏览态
  if (oldValue && !value && searchKeyword.value) {
    handleClearSearch();
  }
});

const handleFilterChange = () => {
  pagination.page = 1;
  fetchPackages();
};

const handleRegionChange = () => {
  if (filters.region === 'domestic') {
    locationOptions.value = [...domesticLocations];
  } else if (filters.region === 'overseas') {
    locationOptions.value = [...overseasLocations];
  } else {
    locationOptions.value = [...domesticLocations, ...overseasLocations];
  }

  if (filters.location && !locationOptions.value.includes(filters.location)) {
    filters.location = undefined;
  }

  handleFilterChange();
};

const toggleHotTag = (tagValue: HotTagKey) => {
  if (filters.hotTags.includes(tagValue)) {
    filters.hotTags = filters.hotTags.filter((tag) => tag !== tagValue);
  } else {
    filters.hotTags = [...filters.hotTags, tagValue];
  }
  handleFilterChange();
};

const resetFilters = () => {
  filters.region = undefined;
  filters.style = undefined;
  filters.location = undefined;
  filters.minPrice = undefined;
  filters.maxPrice = undefined;
  filters.duration = undefined;
  filters.sortBy = 'recommended';
  filters.hotTags = [];
  locationOptions.value = [...domesticLocations, ...overseasLocations];
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
    const response: PackageListResponse = await packagesApi.getPackages();
    const list = response.items ?? [];
    allPackages.value = list;
    let filtered = [...allPackages.value];

    // 应用筛选
    if (filters.region) {
      filtered = filtered.filter((p) => locationRegionMap.get(p.location) === filters.region);
    }
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
    if (filters.hotTags.length > 0) {
      const hotTagMap = new Map(hotTags.map((tag) => [tag.value, tag]));
      filtered = filtered.filter((p) =>
        filters.hotTags.every((tag) => {
          const tagConfig = hotTagMap.get(tag);
          if (!tagConfig) {
            return true;
          }
          return matchPackageByHotTag(p, tagConfig);
        })
      );
    }

    if (filters.sortBy === 'priceAsc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'priceDesc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'durationAsc') {
      filtered.sort((a, b) => a.duration - b.duration);
    } else if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => {
        const scoreA = (a.isPopular ? 2 : 0) + (a.isHot ? 1 : 0);
        const scoreB = (b.isPopular ? 2 : 0) + (b.isHot ? 1 : 0);
        return scoreB - scoreA;
      });
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

// 套餐详情
const openPackageDetail = (pkg: Package) => {
  selectedPackage.value = pkg;
  detailModalVisible.value = true;
  saveBrowseBehavior(pkg);
};

const openComboDetail = (combo: { items: Package[] }) => {
  const first = combo.items?.[0];
  if (!first) return;
  openPackageDetail(first);
};

const openRecommendDrawer = () => {
  recommendDrawerVisible.value = true;
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
  const guestFavorites = getGuestFavoriteIds();

  if (!authStore.isAuthenticated) {
    favoritePackageIds.value = new Set(guestFavorites);
    return;
  }

  try {
    const response: any = await favoritesApi.getFavoritePackageIds();
    const data = response?.data?.data || response?.data || response;
    const remoteIds = data?.packageIds && Array.isArray(data.packageIds) ? data.packageIds : [];

    if (guestFavorites.length > 0) {
      for (const packageId of guestFavorites) {
        if (!remoteIds.includes(packageId)) {
          try {
            await favoritesApi.addFavorite(packageId);
            remoteIds.push(packageId);
          } catch (_error) {
            // 忽略单条同步失败，避免阻断整体加载
          }
        }
      }
      setGuestFavoriteIds([]);
    }

    favoritePackageIds.value = new Set(remoteIds);
  } catch (error: any) {
    console.error('加载收藏状态失败:', error);
  }
};

// 切换收藏状态
const handleToggleFavorite = async (pkg: Package) => {
  const isFavorite = favoritePackageIds.value.has(pkg.id);

  if (!authStore.isAuthenticated) {
    const guestIds = getGuestFavoriteIds();
    const nextIds = isFavorite
      ? guestIds.filter((id) => id !== pkg.id)
      : [...new Set([...guestIds, pkg.id])];
    setGuestFavoriteIds(nextIds);
    favoritePackageIds.value = new Set(nextIds);
    message.success(isFavorite ? '已取消收藏（本地）' : '收藏成功（本地）');
    return;
  }

  favoriteLoading.value.add(pkg.id);

  try {
    if (isFavorite) {
      await favoritesApi.removeFavoriteByPackageId(pkg.id);
      favoritePackageIds.value.delete(pkg.id);
      message.success('已取消收藏');
    } else {
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

onMounted(async () => {
  await loadStyleTags();
  authStore.initializeAuth();
  window.addEventListener('scroll', handleScroll);
  updateBehaviorProfile();
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

        :deep(.ant-input-clear-icon) {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        &:hover :deep(.ant-input-clear-icon),
        &:focus-within :deep(.ant-input-clear-icon) {
          opacity: 1;
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

  :deep(.ant-select-selector) {
    min-height: 44px;
  }

  :deep(.ant-select-selection-item) {
    font-size: 1rem;
  }

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
        font-size: 1.05rem;
        color: #666;
        white-space: nowrap;
      }

      .filter-separator {
        color: #999;
        margin: 0 5px;
      }
    }

    .recommend-entry-btn {
      height: 42px;
      padding: 0 18px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ff85a1 0%, #ff6f91 100%);
      border: none;
      box-shadow: 0 6px 14px rgba(255, 111, 145, 0.25);

      &:hover {
        background: linear-gradient(135deg, #ff7393 0%, #ff5f84 100%);
      }
    }
  }

  .hot-tags-row {
    max-width: 1200px;
    margin: 16px auto 0;
    padding: 0 20px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .hot-tags-label {
      color: #666;
      font-weight: 500;
      font-size: 1.05rem;
      white-space: nowrap;
    }

    .hot-tag-btn {
      border-radius: 999px;
      padding: 0 22px;
      height: 42px;
      font-size: 1.02rem;
      line-height: 42px;
    }
  }
}

.recommend-drawer {
  :deep(.ant-drawer-header-title) {
    font-weight: 700;
    color: #333;
  }
}

.drawer-subtitle {
  margin: 0 0 14px;
  color: #666;
  font-size: 0.92rem;
}

.recommend-section {
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 0 20px;

  .section-header {
    text-align: center;
    margin-bottom: 24px;

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 1rem;
    }
  }

  .recommend-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
  }

  .recommend-card {
    background: #fff;
    border: 1px solid #ececec;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }

    .recommend-cover {
      width: 100%;
      height: 140px;
      display: block;

      :deep(.ant-image-img) {
        width: 100%;
        height: 140px;
        object-fit: cover;
      }
    }

    .recommend-info {
      padding: 10px 12px 12px;

      h4 {
        margin: 0 0 6px;
        font-size: 0.98rem;
        color: #222;
        line-height: 1.4;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 0.85rem;
      }

      .recommend-price {
        margin-top: 8px;
        display: inline-block;
        color: #ff4d4f;
        font-weight: 700;
      }

      .recommend-book-btn {
        margin-top: 10px;
      }
    }
  }

  .combo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .combo-card {
    background: linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%);
    border: 1px solid #dbe9ff;
    border-radius: 12px;
    padding: 14px;
    cursor: pointer;

    h4 {
      margin: 0 0 8px;
      color: #174ea6;
      font-size: 1rem;
    }

    .combo-desc {
      margin: 0 0 10px;
      color: #5f6368;
      font-size: 0.88rem;
    }

    .combo-items {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .combo-item-chip {
        cursor: pointer;
        border: 1px solid #91caff;
        background: #e6f4ff;
        color: #0958d9;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        line-height: 1.6;
        transition: all 0.2s ease;

        &:hover {
          background: #d0e8ff;
          border-color: #69b1ff;
        }
      }
    }
  }

  &.drawer-mode {
    padding: 0;
    margin-top: 8px;

    .section-header {
      text-align: left;
      margin-bottom: 14px;

      h2 {
        font-size: 1.35rem;
      }
    }

    .recommend-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .combo-grid {
      grid-template-columns: 1fr;
      gap: 12px;
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

    .hot-tags-row {
      align-items: flex-start;
    }
  }

  .packages-grid {
    grid-template-columns: 1fr !important;
  }

  .recommend-section {
    .recommend-grid,
    .combo-grid {
      grid-template-columns: 1fr;
    }
  }

  .footer-content {
    flex-direction: column;
    gap: 40px;
  }
}
</style>
