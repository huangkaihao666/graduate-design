<template>
  <div class="favorites-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>❤️ 我的收藏</h1>
      <p>收藏您感兴趣的套餐、景点和行程规划，方便随时查看</p>
    </div>

    <div class="content-card">
      <!-- 筛选与标签 -->
      <div class="filter-bar">
        <a-tabs v-model:active-key="activeTab" @change="handleTabChange">
          <a-tab-pane key="all" tab="全部收藏" />
          <a-tab-pane key="packages" tab="套餐收藏" />
          <a-tab-pane key="spots" tab="景点收藏" />
          <a-tab-pane key="itineraries" tab="行程收藏" />
        </a-tabs>

        <div class="right-tools">
          <a-button type="default" size="small" :loading="loading" @click="refresh">
            刷新
          </a-button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载收藏内容...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!hasAnyData" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>当前没有收藏内容</p>
        <small>浏览套餐、景点或行程规划时，点击收藏按钮即可添加到收藏夹</small>
      </div>

      <!-- 收藏列表 -->
      <div v-else class="favorites-content">
        <!-- 全部：三类分段展示 -->
        <template v-if="activeTab === 'all'">
          <!-- 套餐收藏 -->
          <section v-if="packages.items.length" class="favorites-section">
            <div class="section-header">
              <h2>💐 套餐收藏</h2>
              <span class="count-badge">{{ packages.pagination.total }} 个</span>
            </div>
            <div class="card-grid packages-grid">
              <div
                v-for="item in packages.items"
                :key="`pkg-${item.id}`"
                class="favorite-card package-card"
              >
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  :loading="removingIds.has(`pkg-${item.favoriteId || item.id}`)"
                  @click.stop="handleRemoveFavorite('packages', item.favoriteId || item.id)"
                >
                  🗑️
                </a-button>
                <div class="card-image" @click="openPackageDetail(item)">
                  <a-image
                    :src="item.coverImage"
                    :alt="item.name"
                    :preview="false"
                    class="cover-image"
                    :fallback="item.coverImage"
                  />
                  <div class="image-overlay">
                    <span class="location-tag">📍 {{ item.location }}</span>
                  </div>
                  <div v-if="item.isPopular" class="card-badge">🔥 热门</div>
                  <div v-if="item.isHot" class="card-badge hot">⭐ 推荐</div>
                </div>
                <div class="card-content">
                  <div class="card-header">
                    <h3 class="package-name">{{ item.name }}</h3>
                    <div class="price-section">
                      <span class="current-price">¥{{ item.price.toLocaleString() }}</span>
                      <span v-if="item.originalPrice" class="original-price">
                        ¥{{ item.originalPrice.toLocaleString() }}
                      </span>
                    </div>
                  </div>
                  <p class="package-desc">{{ item.description }}</p>
                  <div class="package-meta">
                    <span class="meta-item">
                      <span class="meta-icon">📅</span>
                      {{ item.duration }} 天
                    </span>
                    <span class="meta-item">
                      <span class="meta-icon">👥</span>
                      最多 {{ item.maxPeople }} 人
                    </span>
                    <span class="meta-item">
                      <span class="meta-icon">🎨</span>
                      {{ getStyleName(item.style) }}
                    </span>
                  </div>
                  <div class="card-footer">
                    <span class="favorite-time">收藏于 {{ formatTime(item.favoritedAt) }}</span>
                    <a-button type="primary" @click.stop="handleBook(item)"> 立即预约 </a-button>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="packages.pagination.page"
                :page-size="packages.pagination.pageSize"
                :total="packages.pagination.total"
                :show-size-changer="true"
                :page-size-options="['12', '24', '48']"
                @change="(page, pageSize) => handlePageChange('packages', page, pageSize)"
              />
            </div>
          </section>

          <!-- 景点收藏 -->
          <section class="favorites-section">
            <div class="section-header">
              <h2>📍 景点收藏</h2>
              <span v-if="spots.items.length" class="count-badge"
                >{{ spots.pagination.total }} 个</span
              >
            </div>
            <div v-if="spots.items.length === 0" class="empty-section">
              <span class="empty-icon">📭</span>
              <p>暂无收藏的景点哦~</p>
            </div>
            <div v-else class="card-grid spots-grid">
              <div
                v-for="item in spots.items"
                :key="`spot-${item.id}`"
                class="favorite-card spot-card"
                @click="openSpotDetail(item)"
              >
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  :loading="removingIds.has(`spot-${item.id}`)"
                  @click.stop="handleRemoveFavorite('spots', item.id)"
                >
                  🗑️
                </a-button>
                <div class="spot-image">
                  <a-image
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.name"
                    :preview="true"
                    class="spot-cover"
                    :fallback="item.image"
                  />
                  <div v-else class="spot-placeholder">
                    <span class="placeholder-icon">🏞️</span>
                  </div>
                  <div class="spot-overlay">
                    <span class="spot-location">{{ item.location }}</span>
                  </div>
                </div>
                <div class="spot-content">
                  <h3 class="spot-name">{{ item.name }}</h3>
                  <p v-if="item.description" class="spot-description">
                    {{ item.description }}
                  </p>
                  <div class="spot-meta">
                    <span v-if="item.recommendedStyle" class="meta-tag">
                      🎨 {{ item.recommendedStyle }}
                    </span>
                    <span v-if="item.bestSeason" class="meta-tag"> 🌍 {{ item.bestSeason }} </span>
                  </div>
                  <div class="spot-footer">
                    <span class="favorite-time">收藏于 {{ formatTime(item.favoritedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="spots.pagination.page"
                :page-size="spots.pagination.pageSize"
                :total="spots.pagination.total"
                :show-size-changer="true"
                :page-size-options="['12', '24', '48']"
                @change="(page, pageSize) => handlePageChange('spots', page, pageSize)"
              />
            </div>
          </section>

          <!-- 行程收藏 -->
          <section class="favorites-section">
            <div class="section-header">
              <h2>🗺️ 行程收藏</h2>
              <span v-if="itineraries.items.length" class="count-badge"
                >{{ itineraries.pagination.total }} 个</span
              >
            </div>
            <div v-if="itineraries.items.length === 0" class="empty-section">
              <span class="empty-icon">📭</span>
              <p>暂无收藏的行程哦~</p>
            </div>
            <div v-else class="card-grid itineraries-grid">
              <div
                v-for="item in itineraries.items"
                :key="`itinerary-${item.id}`"
                class="favorite-card itinerary-card"
                @click="openItineraryDetail(item)"
              >
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  :loading="removingIds.has(`itinerary-${item.id}`)"
                  @click.stop="handleRemoveFavorite('itineraries', item.id)"
                >
                  🗑️
                </a-button>
                <div class="itinerary-header">
                  <h3 class="itinerary-title">
                    <span class="destination-icon">📍</span>
                    {{ item.destination }}
                  </h3>
                  <div class="itinerary-meta">
                    <span class="meta-badge">
                      <span class="meta-icon">📅</span>
                      {{ item.duration }} 天
                    </span>
                    <span class="meta-badge">
                      <span class="meta-icon">🎨</span>
                      {{ getStyleName(item.style) }}
                    </span>
                  </div>
                </div>
                <div class="itinerary-content">
                  <p v-if="item.overview" class="itinerary-overview">
                    {{ item.overview }}
                  </p>
                  <div
                    v-if="item.dailySchedule && Array.isArray(item.dailySchedule)"
                    class="itinerary-schedule"
                  >
                    <div class="schedule-preview">
                      <span class="schedule-label">行程预览：</span>
                      <div class="schedule-days">
                        <span
                          v-for="(day, index) in item.dailySchedule.slice(0, 3)"
                          :key="index"
                          class="day-tag"
                        >
                          第{{ day.day || index + 1 }}天
                        </span>
                        <span v-if="item.dailySchedule.length > 3" class="more-days">
                          +{{ item.dailySchedule.length - 3 }}天
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="itinerary-footer">
                  <span class="favorite-time">收藏于 {{ formatTime(item.favoritedAt) }}</span>
                </div>
              </div>
            </div>
            <div class="section-pagination">
              <a-pagination
                size="small"
                :current="itineraries.pagination.page"
                :page-size="itineraries.pagination.pageSize"
                :total="itineraries.pagination.total"
                :show-size-changer="true"
                :page-size-options="['12', '24', '48']"
                @change="(page, pageSize) => handlePageChange('itineraries', page, pageSize)"
              />
            </div>
          </section>
        </template>

        <!-- 单一类型：复用对应 section -->
        <template v-else>
          <section class="favorites-section">
            <div class="section-header">
              <h2>{{ currentTitle }}</h2>
              <span v-if="currentList.items.length" class="count-badge"
                >{{ currentList.pagination.total }} 个</span
              >
            </div>

            <!-- 空状态提示 -->
            <div v-if="currentList.items.length === 0" class="empty-section">
              <span class="empty-icon">📭</span>
              <p v-if="activeTab === 'spots'">暂无收藏的景点哦~</p>
              <p v-else-if="activeTab === 'itineraries'">暂无收藏的行程哦~</p>
              <p v-else>暂无收藏内容</p>
            </div>

            <!-- 有数据时显示列表 -->
            <template v-else>
              <!-- 套餐列表 -->
              <div v-if="activeTab === 'packages'" class="card-grid packages-grid">
                <div
                  v-for="item in currentList.items"
                  :key="`pkg-single-${item.id}`"
                  class="favorite-card package-card"
                >
                  <a-button
                    type="text"
                    danger
                    size="small"
                    class="delete-btn"
                    :loading="removingIds.has(`pkg-single-${item.id}`)"
                    @click.stop="handleRemoveFavorite('packages', item.favoriteId || item.id)"
                  >
                    🗑️
                  </a-button>
                  <div class="card-image" @click="openPackageDetail(item)">
                    <a-image
                      :src="item.coverImage"
                      :alt="item.name"
                      :preview="false"
                      class="cover-image"
                      :fallback="item.coverImage"
                    />
                    <div class="image-overlay">
                      <span class="location-tag">📍 {{ item.location }}</span>
                    </div>
                    <div v-if="item.isPopular" class="card-badge">🔥 热门</div>
                    <div v-if="item.isHot" class="card-badge hot">⭐ 推荐</div>
                  </div>
                  <div class="card-content">
                    <div class="card-header">
                      <h3 class="package-name">{{ item.name }}</h3>
                      <div class="price-section">
                        <span class="current-price">¥{{ item.price.toLocaleString() }}</span>
                        <span v-if="item.originalPrice" class="original-price">
                          ¥{{ item.originalPrice.toLocaleString() }}
                        </span>
                      </div>
                    </div>
                    <p class="package-desc">{{ item.description }}</p>
                    <div class="package-meta">
                      <span class="meta-item">
                        <span class="meta-icon">📅</span>
                        {{ item.duration }} 天
                      </span>
                      <span class="meta-item">
                        <span class="meta-icon">👥</span>
                        最多 {{ item.maxPeople }} 人
                      </span>
                      <span class="meta-item">
                        <span class="meta-icon">🎨</span>
                        {{ getStyleName(item.style) }}
                      </span>
                    </div>
                    <div class="card-footer">
                      <span class="favorite-time">收藏于 {{ formatTime(item.favoritedAt) }}</span>
                      <a-button type="primary" @click.stop="handleBook(item)"> 立即预约 </a-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 景点列表 -->
              <div v-else-if="activeTab === 'spots'" class="card-grid spots-grid">
                <div
                  v-for="item in currentList.items"
                  :key="`spot-single-${item.id}`"
                  class="favorite-card spot-card"
                  @click="openSpotDetail(item)"
                >
                  <a-button
                    type="text"
                    danger
                    size="small"
                    class="delete-btn"
                    :loading="removingIds.has(`spot-single-${item.id}`)"
                    @click.stop="handleRemoveFavorite('spots', item.id)"
                  >
                    🗑️
                  </a-button>
                  <div class="spot-image">
                    <a-image
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.name"
                      :preview="true"
                      class="spot-cover"
                      :fallback="item.image"
                    />
                    <div v-else class="spot-placeholder">
                      <span class="placeholder-icon">🏞️</span>
                    </div>
                    <div class="spot-overlay">
                      <span class="spot-location">{{ item.location }}</span>
                    </div>
                  </div>
                  <div class="spot-content">
                    <h3 class="spot-name">{{ item.name }}</h3>
                    <p v-if="item.description" class="spot-description">
                      {{ item.description }}
                    </p>
                    <div class="spot-meta">
                      <span v-if="item.recommendedStyle" class="meta-tag">
                        🎨 {{ item.recommendedStyle }}
                      </span>
                      <span v-if="item.bestSeason" class="meta-tag">
                        🌍 {{ item.bestSeason }}
                      </span>
                    </div>
                    <div class="spot-footer">
                      <span class="favorite-time">收藏于 {{ formatTime(item.favoritedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 行程列表 -->
              <div v-else-if="activeTab === 'itineraries'" class="card-grid itineraries-grid">
                <div
                  v-for="item in currentList.items"
                  :key="`itinerary-single-${item.id}`"
                  class="favorite-card itinerary-card"
                  @click="openItineraryDetail(item)"
                >
                  <a-button
                    type="text"
                    danger
                    size="small"
                    class="delete-btn"
                    :loading="removingIds.has(`itinerary-single-${item.id}`)"
                    @click.stop="handleRemoveFavorite('itineraries', item.id)"
                  >
                    🗑️
                  </a-button>
                  <div class="itinerary-header">
                    <h3 class="itinerary-title">
                      <span class="destination-icon">📍</span>
                      {{ item.destination }}
                    </h3>
                    <div class="itinerary-meta">
                      <span class="meta-badge">
                        <span class="meta-icon">📅</span>
                        {{ item.duration }} 天
                      </span>
                      <span class="meta-badge">
                        <span class="meta-icon">🎨</span>
                        {{ getStyleName(item.style) }}
                      </span>
                    </div>
                  </div>
                  <div class="itinerary-content">
                    <p v-if="item.overview" class="itinerary-overview">
                      {{ item.overview }}
                    </p>
                    <div
                      v-if="item.dailySchedule && Array.isArray(item.dailySchedule)"
                      class="itinerary-schedule"
                    >
                      <div class="schedule-preview">
                        <span class="schedule-label">行程预览：</span>
                        <div class="schedule-days">
                          <span
                            v-for="(day, index) in item.dailySchedule.slice(0, 3)"
                            :key="index"
                            class="day-tag"
                          >
                            第{{ day.day || index + 1 }}天
                          </span>
                          <span v-if="item.dailySchedule.length > 3" class="more-days">
                            +{{ item.dailySchedule.length - 3 }}天
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="itinerary-footer">
                    <span class="favorite-time">收藏于 {{ formatTime(item.favoritedAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="section-pagination">
                <a-pagination
                  size="small"
                  :current="currentList.pagination.page"
                  :page-size="currentList.pagination.pageSize"
                  :total="currentList.pagination.total"
                  :show-size-changer="true"
                  :page-size-options="['12', '24', '48']"
                  @change="(page, pageSize) => handlePageChange(activeTab as any, page, pageSize)"
                />
              </div>
            </template>
          </section>
        </template>
      </div>
    </div>

    <!-- 套餐详情模态框 -->
    <a-modal
      v-model:open="packageDetailVisible"
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

    <!-- 景点详情模态框 -->
    <a-modal
      v-model:open="spotDetailVisible"
      title="景点详情"
      :width="800"
      :footer="null"
      @cancel="closeSpotDetail"
    >
      <div v-if="selectedSpot" class="spot-detail">
        <div class="spot-detail-image">
          <a-image
            v-if="selectedSpot.image"
            :src="selectedSpot.image"
            :alt="selectedSpot.name"
            :preview="true"
            class="detail-image"
          />
          <div v-else class="no-image">暂无图片</div>
        </div>
        <div class="spot-detail-content">
          <h2>{{ selectedSpot.name }}</h2>
          <div class="spot-detail-meta">
            <span v-if="selectedSpot.location" class="meta-item">
              📍 {{ selectedSpot.location }}
            </span>
            <span v-if="selectedSpot.recommendedStyle" class="meta-item">
              🎨 {{ selectedSpot.recommendedStyle }}
            </span>
            <span v-if="selectedSpot.bestSeason" class="meta-item">
              🌍 {{ selectedSpot.bestSeason }}
            </span>
          </div>
          <div v-if="selectedSpot.description" class="spot-description-section">
            <h3>景点介绍</h3>
            <p>{{ selectedSpot.description }}</p>
          </div>
          <div v-if="selectedSpot.reason" class="spot-reason-section">
            <h3>推荐理由</h3>
            <p>{{ selectedSpot.reason }}</p>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 行程详情模态框 -->
    <a-modal
      v-model:open="itineraryDetailVisible"
      title="行程详情"
      :width="1000"
      :footer="null"
      @cancel="closeItineraryDetail"
    >
      <div v-if="selectedItinerary" class="itinerary-detail">
        <div class="itinerary-detail-header">
          <h2>{{ selectedItinerary.destination }} - {{ selectedItinerary.duration }} 天行程</h2>
          <div class="itinerary-detail-meta">
            <span class="meta-badge">
              <span class="meta-icon">🎨</span>
              {{ getStyleName(selectedItinerary.style) }}
            </span>
          </div>
        </div>
        <div v-if="selectedItinerary.overview" class="itinerary-overview-section">
          <h3>行程概览</h3>
          <p>{{ selectedItinerary.overview }}</p>
        </div>
        <div
          v-if="selectedItinerary.dailySchedule && Array.isArray(selectedItinerary.dailySchedule)"
          class="itinerary-schedule-section"
        >
          <h3>日程安排</h3>
          <div class="schedule-list">
            <div
              v-for="(day, index) in selectedItinerary.dailySchedule"
              :key="index"
              class="day-schedule-card"
            >
              <div class="day-header">
                <h4>第 {{ day.day || index + 1 }} 天</h4>
                <span v-if="day.theme" class="day-theme">{{ day.theme }}</span>
              </div>
              <div v-if="day.schedule" class="day-content">
                <p><strong>日程安排：</strong>{{ day.schedule }}</p>
              </div>
              <div v-if="day.bestTime" class="day-content">
                <p><strong>最佳拍摄时间：</strong>{{ day.bestTime }}</p>
              </div>
              <div v-if="day.tips" class="day-content">
                <p><strong>拍摄技巧：</strong>{{ day.tips }}</p>
              </div>
              <div v-if="day.spots && Array.isArray(day.spots)" class="day-spots">
                <strong>主要景点：</strong>
                <div class="spots-list">
                  <span v-for="(spot, spotIndex) in day.spots" :key="spotIndex" class="spot-tag">
                    {{ spot }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import type { Package } from '@/api/packages';
import { favoritesApi } from '@/api/favorites';
import { packagesApi } from '@/api/packages';

const router = useRouter();
const authStore = useAuthStore();

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
};

type ListWithPagination<T> = {
  items: T[];
  pagination: Pagination;
};

type FavoritePackage = Package & {
  favoritedAt: string;
  favoriteId?: number; // 收藏记录的ID，用于删除操作
};

type FavoriteSpot = {
  id: number;
  name: string;
  location: string;
  description?: string;
  image?: string;
  recommendedStyle?: string;
  bestSeason?: string;
  reason?: string;
  favoritedAt: string;
};

type FavoriteItinerary = {
  id: number;
  destination: string;
  duration: number;
  style: string;
  overview?: string;
  dailySchedule?: any[];
  favoritedAt: string;
};

const loading = ref(false);
const activeTab = ref<'all' | 'packages' | 'spots' | 'itineraries'>('all');
const removingIds = ref<Set<string>>(new Set());

const packages = reactive<ListWithPagination<FavoritePackage>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 12 },
});

const spots = reactive<ListWithPagination<FavoriteSpot>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 12 },
});

const itineraries = reactive<ListWithPagination<FavoriteItinerary>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 12 },
});

// 详情模态框
const packageDetailVisible = ref(false);
const selectedPackage = ref<FavoritePackage | null>(null);
const spotDetailVisible = ref(false);
const selectedSpot = ref<FavoriteSpot | null>(null);
const itineraryDetailVisible = ref(false);
const selectedItinerary = ref<FavoriteItinerary | null>(null);

const hasAnyData = computed(() => {
  return packages.items.length > 0 || spots.items.length > 0 || itineraries.items.length > 0;
});

const currentList = computed(() => {
  if (activeTab.value === 'packages') return packages;
  if (activeTab.value === 'spots') return spots;
  if (activeTab.value === 'itineraries') return itineraries;
  return packages;
});

const currentTitle = computed(() => {
  if (activeTab.value === 'packages') return '💐 套餐收藏';
  if (activeTab.value === 'spots') return '📍 景点收藏';
  if (activeTab.value === 'itineraries') return '🗺️ 行程收藏';
  return '我的收藏';
});

// 风格映射
const styleMap: Record<string, string> = {
  romantic: '浪漫梦幻',
  artistic: '艺术文艺',
  bohemian: '波西米亚',
  minimalist: '极简现代',
  classical: '古典优雅',
  adventure: '冒险活力',
};

const getStyleName = (style: string): string => {
  return styleMap[style] || style;
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};

// 标签页切换
const handleTabChange = (key: string) => {
  activeTab.value = key as any;
  // TODO: 根据标签页加载对应数据
  refresh();
};

// 分页处理
const handlePageChange = (type: string, page: number, pageSize: number) => {
  if (type === 'packages') {
    packages.pagination.page = page;
    packages.pagination.pageSize = pageSize;
  } else if (type === 'spots') {
    spots.pagination.page = page;
    spots.pagination.pageSize = pageSize;
  } else if (type === 'itineraries') {
    itineraries.pagination.page = page;
    itineraries.pagination.pageSize = pageSize;
  }
  // TODO: 调用API加载数据
  refresh();
};

// 生成模拟套餐数据（用于根据ID查找套餐）
const generateMockPackageById = (id: number): Package | null => {
  const locations = ['三亚', '大理', '丽江', '厦门', '青岛', '巴厘岛', '普吉岛'];
  const styles = ['romantic', 'artistic', 'bohemian', 'minimalist', 'classical', 'adventure'];
  const imageUrls = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=600&h=400&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop&auto=format&q=80',
  ];

  const location = locations[id % locations.length];
  const style = styles[id % styles.length];
  const duration = [1, 2, 3, 5, 7][id % 5];
  const basePrice = [2999, 3999, 4999, 5999, 6999, 8999, 12999][id % 7];
  const hasDiscount = id % 2 === 0;

  return {
    id,
    spotId: id,
    name: `${location}${duration}日${getStyleName(style)}旅拍套餐`,
    description: `精选${location}最美景点，专业摄影师全程跟拍，${duration}天${duration > 1 ? '深度' : ''}体验，为您打造难忘的旅拍回忆。包含专业化妆、精美服装、后期精修等服务。`,
    price: hasDiscount ? Math.floor(basePrice * 0.8) : basePrice,
    originalPrice: hasDiscount ? basePrice : undefined,
    duration,
    location,
    style,
    coverImage: imageUrls[id % imageUrls.length],
    images: [],
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
    maxPeople: [2, 4, 6][id % 3],
    isPopular: id <= 3,
    isHot: id > 3 && id <= 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// 刷新
const refresh = async () => {
  if (!authStore.isAuthenticated) {
    return;
  }

  loading.value = true;
  try {
    if (activeTab.value === 'all' || activeTab.value === 'packages') {
      await fetchPackages();
    }
    // TODO: 实现景点和行程的收藏功能
  } catch (error: any) {
    console.error('刷新收藏列表失败:', error);
    message.error(error?.message || '刷新失败');
  } finally {
    loading.value = false;
  }
};

// 加载套餐收藏
const fetchPackages = async () => {
  try {
    const response: any = await favoritesApi.getFavorites({
      page: packages.pagination.page,
      pageSize: packages.pagination.pageSize,
    });

    console.log('[Favorites] API响应数据:', response);

    // httpClient 的响应拦截器已经返回了 response.data
    // 后端返回格式: { statusCode: 200, message: '...', data: { items: [...], pagination: {...} } }
    // httpClient 拦截器返回 response.data，所以这里收到的是: { statusCode: 200, message: '...', data: { items: [...], pagination: {...} } }
    // 需要访问 response.data 来获取实际的收藏数据
    const data = response?.data || response;

    console.log('[Favorites] 解析后的数据:', data);
    console.log('[Favorites] data.data:', data?.data);
    console.log('[Favorites] items:', data?.data?.items);
    console.log('[Favorites] pagination:', data?.data?.pagination);

    // 实际的数据在 data.data 中
    const favoritesData = data?.data || data;

    if (favoritesData && favoritesData.items && Array.isArray(favoritesData.items)) {
      console.log('[Favorites] 找到收藏记录数量:', favoritesData.items.length);

      // 将收藏记录转换为套餐数据
      const favoritePackages: FavoritePackage[] = [];

      for (const favorite of favoritesData.items) {
        console.log('[Favorites] 处理收藏记录:', favorite);
        try {
          const pkg = await packagesApi.getPackageDetail(favorite.packageId);
          favoritePackages.push({
            ...pkg,
            favoritedAt: favorite.createdAt,
            favoriteId: favorite.id,
          });
        } catch {
          const fallback = generateMockPackageById(favorite.packageId);
          if (fallback) {
            favoritePackages.push({
              ...fallback,
              favoritedAt: favorite.createdAt,
              favoriteId: favorite.id,
            });
          }
        }
      }

      console.log('[Favorites] 转换后的套餐数量:', favoritePackages.length);
      packages.items = favoritePackages;
      packages.pagination = {
        total: favoritesData.pagination?.total || 0,
        page: favoritesData.pagination?.page || 1,
        pageSize: favoritesData.pagination?.pageSize || 12,
      };
    } else {
      console.warn('[Favorites] 没有找到有效的收藏数据');
      // 如果没有数据，清空列表
      packages.items = [];
      packages.pagination.total = 0;
    }
  } catch (error: any) {
    console.error('获取套餐收藏失败:', error);
    const errorMessage = error?.message || error?.response?.data?.message || '获取收藏列表失败';
    message.error(errorMessage);
    // 发生错误时清空列表
    packages.items = [];
    packages.pagination.total = 0;
  }
};

// 删除收藏
const handleRemoveFavorite = async (type: string, id: number) => {
  if (!authStore.isAuthenticated) {
    message.warning('请先登录');
    router.push('/login');
    return;
  }

  const key = `${type}-${id}`;
  removingIds.value.add(key);

  try {
    if (type === 'packages') {
      // 通过收藏ID删除
      await favoritesApi.removeFavorite(id);
    } else {
      // TODO: 实现景点和行程的删除
      message.warning('该功能暂未实现');
      return;
    }

    message.success('已取消收藏');
    await refresh();
  } catch (error: any) {
    console.error('删除收藏失败:', error);
    message.error(error?.response?.data?.message || '取消收藏失败');
  } finally {
    removingIds.value.delete(key);
  }
};

// 打开套餐详情
const openPackageDetail = (pkg: FavoritePackage) => {
  selectedPackage.value = pkg;
  packageDetailVisible.value = true;
};

const closePackageDetail = () => {
  packageDetailVisible.value = false;
  selectedPackage.value = null;
};

// 打开景点详情
const openSpotDetail = (spot: FavoriteSpot) => {
  selectedSpot.value = spot;
  spotDetailVisible.value = true;
};

const closeSpotDetail = () => {
  spotDetailVisible.value = false;
  selectedSpot.value = null;
};

// 打开行程详情
const openItineraryDetail = (itinerary: FavoriteItinerary) => {
  selectedItinerary.value = itinerary;
  itineraryDetailVisible.value = true;
};

const closeItineraryDetail = () => {
  itineraryDetailVisible.value = false;
  selectedItinerary.value = null;
};

// 预约套餐
const handleBook = (pkg: FavoritePackage) => {
  if (!authStore.isAuthenticated) {
    message.warning('请先登录后再预约');
    router.push('/login');
    return;
  }
  router.push(`/booking/order?packageId=${pkg.id}`);
};

onMounted(() => {
  authStore.initializeAuth();
  if (authStore.isAuthenticated) {
    refresh();
  } else {
    message.warning('请先登录后查看收藏');
    router.push('/login');
  }
});
</script>

<style scoped lang="less">
.favorites-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0 0 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 22px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);

  h1 {
    font-size: 2.1rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  p {
    font-size: 1.05rem;
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

.favorites-content {
  margin-top: 8px;
}

.favorites-section {
  & + .favorites-section {
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
  gap: 20px;
  margin-bottom: 20px;
}

.packages-grid {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.spots-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.itineraries-grid {
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

.favorite-card {
  position: relative;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  transition: all 0.25s;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);

    .delete-btn {
      opacity: 1;
    }
  }

  .delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.3s;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    &:hover {
      background: rgba(255, 77, 79, 0.1);
      opacity: 1 !important;
    }
  }
}

// 套餐卡片样式
.package-card {
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

    .card-badge {
      position: absolute;
      top: 15px;
      left: 15px;
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
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .package-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 15px;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;

      .favorite-time {
        font-size: 0.8rem;
        color: #999;
        flex: 1;
      }
    }
  }
}

// 景点卡片样式
.spot-card {
  cursor: pointer;

  .spot-image {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: #f5f5f5;

    .spot-cover {
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

    .spot-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);

      .placeholder-icon {
        font-size: 3rem;
        opacity: 0.5;
      }
    }

    .spot-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
      padding: 12px;

      .spot-location {
        color: white;
        font-weight: 600;
        font-size: 0.85rem;
      }
    }

    &:hover .spot-cover {
      transform: scale(1.1);
    }
  }

  .spot-content {
    padding: 16px;

    .spot-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px 0;
    }

    .spot-description {
      color: #666;
      font-size: 0.85rem;
      line-height: 1.6;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .spot-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;

      .meta-tag {
        padding: 4px 10px;
        background: #f0f0f0;
        border-radius: 12px;
        font-size: 0.8rem;
        color: #666;
      }
    }

    .spot-footer {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;

      .favorite-time {
        font-size: 0.8rem;
        color: #999;
      }
    }
  }
}

// 行程卡片样式
.itinerary-card {
  cursor: pointer;

  .itinerary-header {
    padding: 20px 20px 12px;
    border-bottom: 1px solid #f0f0f0;

    .itinerary-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;

      .destination-icon {
        font-size: 1.1rem;
      }
    }

    .itinerary-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;

      .meta-badge {
        padding: 4px 12px;
        background: #fff0f6;
        border-radius: 12px;
        font-size: 0.85rem;
        color: #ff4d8a;
        display: flex;
        align-items: center;
        gap: 4px;

        .meta-icon {
          font-size: 0.9rem;
        }
      }
    }
  }

  .itinerary-content {
    padding: 16px 20px;

    .itinerary-overview {
      color: #666;
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .itinerary-schedule {
      .schedule-preview {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .schedule-label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 600;
        }

        .schedule-days {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;

          .day-tag {
            padding: 4px 10px;
            background: #e6f7ff;
            border-radius: 8px;
            font-size: 0.8rem;
            color: #1890ff;
          }

          .more-days {
            padding: 4px 10px;
            background: #f0f0f0;
            border-radius: 8px;
            font-size: 0.8rem;
            color: #999;
          }
        }
      }
    }
  }

  .itinerary-footer {
    padding: 12px 20px;
    border-top: 1px solid #f0f0f0;

    .favorite-time {
      font-size: 0.8rem;
      color: #999;
    }
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

.empty-section {
  padding: 40px 0;
  text-align: center;
  color: #999;
  border-radius: 8px;
  background: #fafafa;
  margin-top: 12px;

  .empty-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    color: #888;
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

// 详情模态框样式
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

.spot-detail {
  .spot-detail-image {
    margin-bottom: 20px;
    border-radius: 12px;
    overflow: hidden;

    .detail-image {
      width: 100%;
      max-height: 400px;
      object-fit: cover;

      :deep(.ant-image-img) {
        width: 100%;
        max-height: 400px;
        object-fit: cover;
      }
    }

    .no-image {
      padding: 60px 20px;
      text-align: center;
      color: #999;
      font-size: 0.9rem;
      background: #f5f5f5;
      border-radius: 12px;
    }
  }

  .spot-detail-content {
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 16px;
    }

    .spot-detail-meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 20px;

      .meta-item {
        padding: 6px 12px;
        background: #f0f0f0;
        border-radius: 12px;
        font-size: 0.85rem;
        color: #666;
      }
    }

    .spot-description-section,
    .spot-reason-section {
      margin-bottom: 20px;

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
      }

      p {
        color: #666;
        line-height: 1.8;
      }
    }
  }
}

.itinerary-detail {
  .itinerary-detail-header {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f0f0f0;

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
      margin: 0 0 12px 0;
    }

    .itinerary-detail-meta {
      display: flex;
      gap: 8px;

      .meta-badge {
        padding: 6px 12px;
        background: #fff0f6;
        border-radius: 12px;
        font-size: 0.9rem;
        color: #ff4d8a;
        display: flex;
        align-items: center;
        gap: 4px;

        .meta-icon {
          font-size: 1rem;
        }
      }
    }
  }

  .itinerary-overview-section {
    margin-bottom: 24px;

    h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }

    p {
      color: #666;
      line-height: 1.8;
    }
  }

  .itinerary-schedule-section {
    h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
    }

    .schedule-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .day-schedule-card {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #ff758c;

      .day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .day-theme {
          padding: 4px 12px;
          background: #fff7e6;
          color: #fa8c16;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 500;
        }
      }

      .day-content {
        margin-bottom: 8px;
        color: #666;
        line-height: 1.6;

        p {
          margin: 0;

          strong {
            color: #333;
            font-weight: 600;
          }
        }
      }

      .day-spots {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e0e0e0;

        strong {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
        }
      }

      .spots-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .spot-tag {
        padding: 4px 12px;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #666;
      }
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .content-card {
    padding: 16px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .packages-grid,
  .spots-grid,
  .itineraries-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
