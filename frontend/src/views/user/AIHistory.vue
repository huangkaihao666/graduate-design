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
              <div v-for="item in virtualTryOn.items" :key="`vto-${item.id}`" class="history-card">
                <div class="card-type-tag vto">虚拍</div>
                <div class="card-body">
                  <div class="card-main">
                    <div class="thumb" v-if="item.modifiedImageUrl || item.imageUrl">
                      <img :src="item.modifiedImageUrl || item.imageUrl" alt="预览" />
                    </div>
                    <div class="meta">
                      <div class="meta-title">
                        风格：<span class="highlight">{{ item.style }}</span>
                      </div>
                      <div class="meta-row">
                        <span>妆容：{{ item.makeupAdvice || '—' }}</span>
                      </div>
                      <div class="meta-row">
                        <span>发型：{{ item.hairstyleAdvice || '—' }}</span>
                      </div>
                      <div class="meta-row">
                        <span>服装：{{ item.dressAdvice || '—' }}</span>
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
                      <span>风格：{{ item.style }}</span>
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
              >
                <div class="card-type-tag vto">虚拍</div>
                <div class="card-body">
                  <div class="card-main">
                    <div class="thumb" v-if="item.modifiedImageUrl || item.imageUrl">
                      <img :src="item.modifiedImageUrl || item.imageUrl" alt="预览" />
                    </div>
                    <div class="meta">
                      <div class="meta-title">
                        风格：<span class="highlight">{{ item.style }}</span>
                      </div>
                      <div class="meta-row">
                        <span>妆容：{{ item.makeupAdvice || '—' }}</span>
                      </div>
                      <div class="meta-row">
                        <span>发型：{{ item.hairstyleAdvice || '—' }}</span>
                      </div>
                      <div class="meta-row">
                        <span>服装：{{ item.dressAdvice || '—' }}</span>
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
                      <span>风格：{{ item.style }}</span>
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
  makeupAdvice?: string | null;
  hairstyleAdvice?: string | null;
  dressAdvice?: string | null;
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

  &.advice {
    max-height: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
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

@media (max-width: 768px) {
  .content-card {
    padding: 16px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
