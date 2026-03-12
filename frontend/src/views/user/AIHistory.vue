<template>
  <div class="ai-history-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🕒 AI 生成历史</h1>
      <p>查看您使用 AI 功能生成的虚拍效果、风格推荐与行程规划记录</p>
    </div>

    <div class="content-card">
      <!-- 筛选与标签 -->
      <div class="filter-bar">
        <a-tabs v-model:active-key="activeTab" @change="handleTabChange">
          <a-tab-pane key="all" tab="全部记录" />
          <a-tab-pane key="virtual-try-on" tab="虚拍历史" />
          <a-tab-pane key="style-recommendation" tab="风格推荐历史" />
          <a-tab-pane key="itinerary-planning" tab="行程规划历史" />
        </a-tabs>

        <div class="right-tools">
          <a-button type="default" size="small" @click="refresh" :loading="loading">
            刷新
          </a-button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载历史记录...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!hasAnyData" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>当前没有 AI 生成历史</p>
        <small>去体验 AI 虚拍、风格推荐或行程规划后，这里会自动出现记录</small>
      </div>

      <!-- 历史列表 -->
      <div v-else class="history-content">
        <!-- 全部：三类分段展示 -->
        <template v-if="activeTab === 'all'">
          <section class="history-section" v-if="virtualTryOn.items.length">
            <div class="section-header">
              <h2>🤖 虚拍历史</h2>
              <span class="count-badge">{{ virtualTryOn.pagination.total }} 条</span>
            </div>
            <div class="card-grid">
              <div
                v-for="item in virtualTryOn.items"
                :key="`vto-${item.id}`"
                class="history-card"
                @click="openVirtualTryOnDetail(item)"
              >
                <div class="card-type-tag vto">虚拍</div>
                <div class="card-body">
                  <div class="card-main">
                    <div class="thumb" v-if="item.modifiedImageUrl || item.imageUrl">
                      <img :src="item.modifiedImageUrl || item.imageUrl" alt="预览" />
                    </div>
                    <div class="meta">
                      <div class="meta-title">
                        风格：<span class="highlight">{{ getStyleName(item.style) }}</span>
                      </div>
                      <div class="meta-row" v-if="item.preferences">
                        <span class="preferences-label">个性化偏好：</span>
                        <span class="preferences-value">{{
                          formatPreferences(item.preferences)
                        }}</span>
                      </div>
                      <div class="meta-row" v-else>
                        <span class="preferences-label">个性化偏好：</span>
                        <span class="preferences-value">无</span>
                      </div>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="time">
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <span class="status success">成功</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="virtualTryOn.pagination.page"
                :page-size="virtualTryOn.pagination.pageSize"
                :total="virtualTryOn.pagination.total"
                @change="(page, pageSize) => handlePageChange('virtual-try-on', page, pageSize)"
                :show-size-changer="true"
                :page-size-options="['5', '10', '20']"
              />
            </div>
          </section>

          <section class="history-section" v-if="styleRecommendation.items.length">
            <div class="section-header">
              <h2>🎨 风格推荐历史</h2>
              <span class="count-badge">{{ styleRecommendation.pagination.total }} 条</span>
            </div>
            <div class="card-grid">
              <div
                v-for="item in styleRecommendation.items"
                :key="`sr-${item.id}`"
                class="history-card"
              >
                <div class="card-type-tag sr">风格推荐</div>
                <div class="card-body">
                  <div class="meta">
                    <div class="meta-title">
                      偏好：<span class="highlight single-line">{{ item.preferences }}</span>
                    </div>
                    <div class="meta-row">
                      <span>预算：{{ item.budget ? `¥${item.budget}` : '未填写' }}</span>
                    </div>
                    <div class="meta-row">
                      <span>
                        推荐风格数：
                        {{
                          Array.isArray(item.recommendedStyles) ? item.recommendedStyles.length : 0
                        }}
                      </span>
                    </div>
                    <div class="meta-row advice">
                      <span>
                        个性化建议：
                        {{ item.personalizedAdvice || '—' }}
                      </span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="time">
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <span class="status success">成功</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="styleRecommendation.pagination.page"
                :page-size="styleRecommendation.pagination.pageSize"
                :total="styleRecommendation.pagination.total"
                @change="
                  (page, pageSize) => handlePageChange('style-recommendation', page, pageSize)
                "
                :show-size-changer="true"
                :page-size-options="['5', '10', '20']"
              />
            </div>
          </section>

          <section class="history-section" v-if="itineraryPlanning.items.length">
            <div class="section-header">
              <h2>📍 行程规划历史</h2>
              <span class="count-badge">{{ itineraryPlanning.pagination.total }} 条</span>
            </div>
            <div class="card-grid">
              <div
                v-for="item in itineraryPlanning.items"
                :key="`ip-${item.id}`"
                class="history-card"
              >
                <div class="card-type-tag ip">行程规划</div>
                <div class="card-body">
                  <div class="meta">
                    <div class="meta-title">
                      目的地：
                      <span class="highlight">{{ item.destination }}</span>
                    </div>
                    <div class="meta-row">
                      <span>天数：{{ item.duration }} 天</span>
                    </div>
                    <div class="meta-row">
                      <span>风格：{{ getStyleName(item.style) }}</span>
                    </div>
                    <div class="meta-row advice">
                      <span>概览：{{ item.overview || '—' }}</span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="time">
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <span class="status success">成功</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="itineraryPlanning.pagination.page"
                :page-size="itineraryPlanning.pagination.pageSize"
                :total="itineraryPlanning.pagination.total"
                @change="(page, pageSize) => handlePageChange('itinerary-planning', page, pageSize)"
                :show-size-changer="true"
                :page-size-options="['5', '10', '20']"
              />
            </div>
          </section>
        </template>

        <!-- 单一类型：复用对应 section -->
        <template v-else>
          <section class="history-section" v-if="currentList.items.length">
            <div class="section-header">
              <h2>{{ currentTitle }}</h2>
              <span class="count-badge">{{ currentList.pagination.total }} 条</span>
            </div>

            <div class="card-grid" v-if="activeTab === 'virtual-try-on'">
              <div
                v-for="item in currentList.items"
                :key="`vto-single-${item.id}`"
                class="history-card"
                @click="openVirtualTryOnDetail(item)"
              >
                <div class="card-type-tag vto">虚拍</div>
                <div class="card-body">
                  <div class="card-main">
                    <div class="thumb" v-if="item.modifiedImageUrl || item.imageUrl">
                      <img :src="item.modifiedImageUrl || item.imageUrl" alt="预览" />
                    </div>
                    <div class="meta">
                      <div class="meta-title">
                        风格：<span class="highlight">{{ getStyleName(item.style) }}</span>
                      </div>
                      <div class="meta-row" v-if="item.preferences">
                        <span class="preferences-label">个性化偏好：</span>
                        <span class="preferences-value">{{
                          formatPreferences(item.preferences)
                        }}</span>
                      </div>
                      <div class="meta-row" v-else>
                        <span class="preferences-label">个性化偏好：</span>
                        <span class="preferences-value">无</span>
                      </div>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="time">
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <span class="status success">成功</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-grid" v-else-if="activeTab === 'style-recommendation'">
              <div
                v-for="item in currentList.items"
                :key="`sr-single-${item.id}`"
                class="history-card"
              >
                <div class="card-type-tag sr">风格推荐</div>
                <div class="card-body">
                  <div class="meta">
                    <div class="meta-title">
                      偏好：<span class="highlight single-line">{{ item.preferences }}</span>
                    </div>
                    <div class="meta-row">
                      <span>预算：{{ item.budget ? `¥${item.budget}` : '未填写' }}</span>
                    </div>
                    <div class="meta-row">
                      <span>
                        推荐风格数：
                        {{
                          Array.isArray(item.recommendedStyles) ? item.recommendedStyles.length : 0
                        }}
                      </span>
                    </div>
                    <div class="meta-row advice">
                      <span>
                        个性化建议：
                        {{ item.personalizedAdvice || '—' }}
                      </span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="time">
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <span class="status success">成功</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-grid" v-else-if="activeTab === 'itinerary-planning'">
              <div
                v-for="item in currentList.items"
                :key="`ip-single-${item.id}`"
                class="history-card"
              >
                <div class="card-type-tag ip">行程规划</div>
                <div class="card-body">
                  <div class="meta">
                    <div class="meta-title">
                      目的地：
                      <span class="highlight">{{ item.destination }}</span>
                    </div>
                    <div class="meta-row">
                      <span>天数：{{ item.duration }} 天</span>
                    </div>
                    <div class="meta-row">
                      <span>风格：{{ getStyleName(item.style) }}</span>
                    </div>
                    <div class="meta-row advice">
                      <span>概览：{{ item.overview || '—' }}</span>
                    </div>
                  </div>
                  <div class="card-footer">
                    <span class="time">
                      {{ formatTime(item.createdAt) }}
                    </span>
                    <span class="status success">成功</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="currentList.pagination.page"
                :page-size="currentList.pagination.pageSize"
                :total="currentList.pagination.total"
                @change="(page, pageSize) => handlePageChange(activeTab as any, page, pageSize)"
                :show-size-changer="true"
                :page-size-options="['5', '10', '20']"
              />
            </div>
          </section>
        </template>
      </div>
    </div>

    <!-- 虚拍详情模态框 -->
    <a-modal
      v-model:open="virtualTryOnModalVisible"
      title="虚拍详情"
      :width="900"
      :footer="null"
      @cancel="closeVirtualTryOnDetail"
    >
      <div v-if="selectedVirtualTryOn" class="virtual-try-on-detail">
        <!-- 图片对比 -->
        <div class="image-comparison-section">
          <div class="comparison-item">
            <div class="image-label">📸 原始照片</div>
            <div class="image-wrapper">
              <img
                v-if="selectedVirtualTryOn.imageUrl"
                :src="selectedVirtualTryOn.imageUrl"
                alt="原始照片"
                class="detail-image"
              />
              <div v-else class="no-image">暂无原始照片</div>
            </div>
          </div>
          <div class="arrow-icon">→</div>
          <div class="comparison-item">
            <div class="image-label">
              ✨ {{ getStyleName(selectedVirtualTryOn.style) }} 风格效果
            </div>
            <div class="image-wrapper">
              <img
                v-if="selectedVirtualTryOn.modifiedImageUrl"
                :src="selectedVirtualTryOn.modifiedImageUrl"
                alt="生成效果"
                class="detail-image"
              />
              <div v-else class="no-image">暂无生成效果</div>
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="detail-info-section">
          <h3>📋 详细信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">风格：</span>
              <span class="info-value highlight">{{
                getStyleName(selectedVirtualTryOn.style)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">生成时间：</span>
              <span class="info-value">{{ formatTime(selectedVirtualTryOn.createdAt) }}</span>
            </div>
          </div>

          <!-- 建议详情 -->
          <div class="advice-section">
            <h4 v-if="selectedVirtualTryOn.preferences?.makeup">💄 选择的妆容</h4>
            <p v-if="selectedVirtualTryOn.preferences?.makeup">
              {{ getMakeupName(selectedVirtualTryOn.preferences.makeup) }}
            </p>

            <h4 v-if="selectedVirtualTryOn.preferences?.hairstyle">💇 选择的发型</h4>
            <p v-if="selectedVirtualTryOn.preferences?.hairstyle">
              {{ getHairstyleName(selectedVirtualTryOn.preferences.hairstyle) }}
            </p>

            <h4 v-if="selectedVirtualTryOn.preferences?.dress">👗 选择的服装</h4>
            <p v-if="selectedVirtualTryOn.preferences?.dress">
              {{ getDressName(selectedVirtualTryOn.preferences.dress) }}
            </p>

            <h4 v-if="selectedVirtualTryOn.makeupAdvice">💄 妆容建议</h4>
            <p v-if="selectedVirtualTryOn.makeupAdvice">{{ selectedVirtualTryOn.makeupAdvice }}</p>

            <h4 v-if="selectedVirtualTryOn.hairstyleAdvice">💇 发型建议</h4>
            <p v-if="selectedVirtualTryOn.hairstyleAdvice">
              {{ selectedVirtualTryOn.hairstyleAdvice }}
            </p>

            <h4 v-if="selectedVirtualTryOn.dressAdvice">👗 服装建议</h4>
            <p v-if="selectedVirtualTryOn.dressAdvice">{{ selectedVirtualTryOn.dressAdvice }}</p>

            <h4 v-if="selectedVirtualTryOn.virtualAdvice">✨ 虚拍建议</h4>
            <p v-if="selectedVirtualTryOn.virtualAdvice">
              {{ selectedVirtualTryOn.virtualAdvice }}
            </p>

            <h4 v-if="selectedVirtualTryOn.shootingTips">📸 拍摄技巧</h4>
            <ul
              v-if="
                selectedVirtualTryOn.shootingTips &&
                Array.isArray(selectedVirtualTryOn.shootingTips)
              "
            >
              <li v-for="(tip, index) in selectedVirtualTryOn.shootingTips" :key="index">
                {{ tip }}
              </li>
            </ul>
            <p v-else-if="selectedVirtualTryOn.shootingTips">
              {{ selectedVirtualTryOn.shootingTips }}
            </p>

            <h4 v-if="selectedVirtualTryOn.previewDescription">🎬 预览效果描述</h4>
            <p v-if="selectedVirtualTryOn.previewDescription">
              {{ selectedVirtualTryOn.previewDescription }}
            </p>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, AiHistoryType } from '@/api/ai';

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
};

type ListWithPagination<T> = {
  items: T[];
  pagination: Pagination;
};

type VirtualTryOnHistory = {
  id: number;
  imageUrl: string;
  modifiedImageUrl?: string | null;
  style: string;
  preferences?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
  } | null;
  makeupAdvice?: string | null;
  hairstyleAdvice?: string | null;
  dressAdvice?: string | null;
  virtualAdvice?: string | null;
  shootingTips?: string[] | any;
  previewDescription?: string | null;
  createdAt: string;
};

type StyleRecommendationHistory = {
  id: number;
  preferences: string;
  budget?: number | null;
  recommendedStyles?: any;
  personalizedAdvice?: string | null;
  createdAt: string;
};

type ItineraryPlanningHistory = {
  id: number;
  destination: string;
  duration: number;
  style: string;
  overview?: string | null;
  createdAt: string;
};

const loading = ref(false);
const activeTab = ref<AiHistoryType>('all');
const virtualTryOnModalVisible = ref(false);
const selectedVirtualTryOn = ref<VirtualTryOnHistory | null>(null);

const virtualTryOn = reactive<ListWithPagination<VirtualTryOnHistory>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 5 },
});

const styleRecommendation = reactive<ListWithPagination<StyleRecommendationHistory>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 5 },
});

const itineraryPlanning = reactive<ListWithPagination<ItineraryPlanningHistory>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 5 },
});

const hasAnyData = computed(() => {
  return (
    virtualTryOn.items.length > 0 ||
    styleRecommendation.items.length > 0 ||
    itineraryPlanning.items.length > 0
  );
});

const currentList = computed(() => {
  if (activeTab.value === 'virtual-try-on') return virtualTryOn;
  if (activeTab.value === 'style-recommendation') return styleRecommendation;
  if (activeTab.value === 'itinerary-planning') return itineraryPlanning;
  return virtualTryOn;
});

const currentTitle = computed(() => {
  if (activeTab.value === 'virtual-try-on') return '🤖 虚拍历史';
  if (activeTab.value === 'style-recommendation') return '🎨 风格推荐历史';
  if (activeTab.value === 'itinerary-planning') return '📍 行程规划历史';
  return 'AI 历史';
});

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};

// 风格映射：英文转中文
const styleMap: Record<string, string> = {
  romantic: '浪漫梦幻',
  artistic: '艺术文艺',
  bohemian: '波西米亚',
  minimalist: '极简现代',
  classical: '古典优雅',
  adventure: '冒险活力',
};

// 妆容映射：英文转中文
const makeupMap: Record<string, string> = {
  natural: '自然清透',
  romantic: '浪漫烟熏',
  elegant: '典雅气质',
  vintage: '复古优雅',
};

// 发型映射：英文转中文
const hairstyleMap: Record<string, string> = {
  updo: '盘发',
  loose: '飘逸长卷',
  'half-up': '半扎',
  sleek: '贴头皮',
};

// 服装映射：英文转中文
const dressMap: Record<string, string> = {
  romantic: '浪漫蓬裙',
  minimalist: '简约修身',
  vintage: '复古婚纱',
  modern: '现代设计',
};

const getStyleName = (style: string): string => {
  return styleMap[style] || style;
};

const getMakeupName = (makeup: string): string => {
  return makeupMap[makeup] || makeup;
};

const getHairstyleName = (hairstyle: string): string => {
  return hairstyleMap[hairstyle] || hairstyle;
};

const getDressName = (dress: string): string => {
  return dressMap[dress] || dress;
};

// 格式化个性化偏好显示
const formatPreferences = (preferences: any): string => {
  if (!preferences) return '无';
  const parts: string[] = [];
  if (preferences.makeup) parts.push(`妆容: ${getMakeupName(preferences.makeup)}`);
  if (preferences.hairstyle) parts.push(`发型: ${getHairstyleName(preferences.hairstyle)}`);
  if (preferences.dress) parts.push(`服装: ${getDressName(preferences.dress)}`);
  return parts.length > 0 ? parts.join(' | ') : '无';
};

const fetchHistory = async (type: AiHistoryType, page?: number, pageSize?: number) => {
  loading.value = true;
  try {
    const params: { type?: AiHistoryType; page?: number; pageSize?: number } = {};
    if (type !== 'all') {
      params.type = type;
    } else {
      params.type = 'all';
    }
    if (page) params.page = page;
    if (pageSize) params.pageSize = pageSize;

    const response: any = await aiApi.getHistory(params);
    // 兼容后端多层 data 包裹：{ statusCode, message, data: { statusCode, message, data: {...实际数据} } }
    const data = response?.data?.data || response?.data || response;

    console.log('[AIHistory] 历史接口返回原始数据:', response);
    console.log('[AIHistory] 解析后的数据对象:', data);

    if (type === 'all') {
      if (data.virtualTryOn) {
        virtualTryOn.items = data.virtualTryOn.items || [];
        virtualTryOn.pagination = data.virtualTryOn.pagination || virtualTryOn.pagination;
      }
      if (data.styleRecommendation) {
        styleRecommendation.items = data.styleRecommendation.items || [];
        styleRecommendation.pagination =
          data.styleRecommendation.pagination || styleRecommendation.pagination;
      }
      if (data.itineraryPlanning) {
        itineraryPlanning.items = data.itineraryPlanning.items || [];
        itineraryPlanning.pagination =
          data.itineraryPlanning.pagination || itineraryPlanning.pagination;
      }
    } else if (type === 'virtual-try-on') {
      virtualTryOn.items = data.items || [];
      virtualTryOn.pagination = data.pagination || virtualTryOn.pagination;
    } else if (type === 'style-recommendation') {
      styleRecommendation.items = data.items || [];
      styleRecommendation.pagination = data.pagination || styleRecommendation.pagination;
    } else if (type === 'itinerary-planning') {
      itineraryPlanning.items = data.items || [];
      itineraryPlanning.pagination = data.pagination || itineraryPlanning.pagination;
    }
  } catch (error: any) {
    message.error(error?.message || '获取历史记录失败');
  } finally {
    loading.value = false;
  }
};

const handleTabChange = (key: string) => {
  activeTab.value = key as AiHistoryType;
  if (key === 'all') {
    fetchHistory('all');
  } else {
    const target = key as AiHistoryType;
    const list =
      target === 'virtual-try-on'
        ? virtualTryOn
        : target === 'style-recommendation'
          ? styleRecommendation
          : itineraryPlanning;
    fetchHistory(target, list.pagination.page, list.pagination.pageSize);
  }
};

const handlePageChange = (type: AiHistoryType, page: number, pageSize: number) => {
  if (type === 'virtual-try-on') {
    virtualTryOn.pagination.page = page;
    virtualTryOn.pagination.pageSize = pageSize;
  } else if (type === 'style-recommendation') {
    styleRecommendation.pagination.page = page;
    styleRecommendation.pagination.pageSize = pageSize;
  } else if (type === 'itinerary-planning') {
    itineraryPlanning.pagination.page = page;
    itineraryPlanning.pagination.pageSize = pageSize;
  }
  fetchHistory(type, page, pageSize);
};

const refresh = () => {
  if (activeTab.value === 'all') {
    fetchHistory('all');
  } else {
    const list = currentList.value;
    fetchHistory(activeTab.value, list.pagination.page, list.pagination.pageSize);
  }
};

// 打开虚拍详情
const openVirtualTryOnDetail = (item: VirtualTryOnHistory) => {
  selectedVirtualTryOn.value = item;
  virtualTryOnModalVisible.value = true;
};

// 关闭虚拍详情
const closeVirtualTryOnDetail = () => {
  virtualTryOnModalVisible.value = false;
  selectedVirtualTryOn.value = null;
};

onMounted(() => {
  fetchHistory('all');
});
</script>

<style scoped lang="less">
.ai-history-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);

  h1 {
    font-size: 2.3rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  p {
    font-size: 1rem;
    opacity: 0.9;
  }
}

.content-card {
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  padding: 20px 24px 24px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  :deep(.ant-tabs-nav) {
    margin: 0;
  }
}

.right-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #666;
  gap: 16px;

  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid #f0f0f0;
    border-top-color: #ff758c;
    animation: spin 1s linear infinite;
  }

  p {
    margin: 0;
  }
}

.empty-state {
  padding: 60px 0 50px;
  text-align: center;
  color: #888;

  .empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 12px;
  }

  p {
    font-size: 1rem;
    margin-bottom: 4px;
  }

  small {
    font-size: 0.9rem;
    color: #aaa;
  }
}

.history-content {
  margin-top: 8px;
}

.history-section {
  & + .history-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
  }

  .count-badge {
    font-size: 0.8rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: #fff0f6;
    color: #ff4d8a;
  }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.history-card {
  position: relative;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  transition: all 0.25s;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}

.card-type-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  color: #fff;
  z-index: 1;

  &.vto {
    background: linear-gradient(135deg, #ff758c, #ff7eb3);
  }

  &.sr {
    background: linear-gradient(135deg, #36cfc9, #40a9ff);
  }

  &.ip {
    background: linear-gradient(135deg, #ffa940, #fadb14);
  }
}

.card-body {
  padding: 14px 14px 10px;
}

.card-main {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.thumb {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.highlight {
  color: #ff4d8a;
}

.single-line {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  &.advice {
    max-height: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.preferences-label {
  font-weight: 600;
  color: #666;
}

.preferences-value {
  color: #333;
  flex: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 0.8rem;
  color: #999;

  .time {
    white-space: nowrap;
  }
}

.status {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid #b7eb8f;
  color: #52c41a;
  background: #f6ffed;
  font-size: 0.75rem;

  &.success {
    border-color: #b7eb8f;
    color: #52c41a;
    background: #f6ffed;
  }
}

.section-pagination {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;

  :deep(.ant-pagination) {
    font-size: 12px;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 虚拍详情模态框样式
.virtual-try-on-detail {
  padding: 10px 0;
}

.image-comparison-section {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: start;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-label {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.image-wrapper {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  border: 2px solid #e0e0e0;
}

.detail-image {
  width: 100%;
  height: auto;
  display: block;
  max-height: 400px;
  object-fit: contain;
}

.no-image {
  padding: 60px 20px;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
}

.arrow-icon {
  font-size: 2rem;
  color: #ff758c;
  font-weight: bold;
  display: flex;
  align-items: center;
  margin-top: 40px;
}

.detail-info-section {
  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }

  h4 {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 16px;
    margin-bottom: 8px;
    color: #666;
  }

  p {
    color: #666;
    line-height: 1.6;
    margin-bottom: 12px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    color: #666;
    line-height: 1.8;

    li {
      margin-bottom: 6px;
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 600;
  color: #666;
}

.info-value {
  color: #333;
}

.advice-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .content-card {
    padding: 16px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .image-comparison-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .arrow-icon {
    transform: rotate(90deg);
    margin: 0;
    justify-content: center;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
