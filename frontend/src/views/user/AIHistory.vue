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

      <!-- 虚拍历史：按出镜方式分子类 -->
      <div v-if="activeTab === 'virtual-try-on'" class="vto-sub-tabs">
        <a-radio-group v-model:value="vtoRole" size="small" button-style="solid">
          <a-radio-button value="female">女生</a-radio-button>
          <a-radio-button value="male">男生</a-radio-button>
          <a-radio-button value="couple">双人</a-radio-button>
        </a-radio-group>
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
          <template v-for="slot in vtoAllSlots" :key="slot.role">
            <section class="history-section" v-if="slot.list.items.length">
              <div class="section-header">
                <h2>{{ slot.icon }} {{ slot.title }}</h2>
                <span class="count-badge">{{ slot.list.pagination.total }} 条</span>
              </div>
              <div class="card-grid">
                <div
                  v-for="item in slot.list.items"
                  :key="`vto-${slot.role}-${item.id}`"
                  class="history-card"
                >
                  <div class="card-type-tag vto">虚拍·{{ slot.shortLabel }}</div>
                  <a-button
                    type="text"
                    danger
                    size="small"
                    class="delete-btn"
                    @click.stop="handleDelete('virtual-try-on', item.id)"
                    :loading="deletingIds.has(`vto-${item.id}`)"
                  >
                    🗑️
                  </a-button>
                  <div
                    class="card-body"
                    @click="openVirtualTryOnDetail(item)"
                    :data-item-id="item.id"
                  >
                    <div class="card-main">
                      <div class="thumb" v-if="getImageUrl(item)">
                        <a-image
                          :src="getImageUrl(item)!"
                          alt="预览"
                          :preview="true"
                          class="thumb-image"
                          @error="(e: any) => handleImageError(e, item)"
                        />
                        <div class="no-image-placeholder" style="display: none">
                          <span class="placeholder-text">图片已过期</span>
                        </div>
                      </div>
                      <div v-else class="thumb no-image-placeholder">
                        <span class="placeholder-text">暂无图片</span>
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
                  :current="slot.list.pagination.page"
                  :page-size="slot.list.pagination.pageSize"
                  :total="slot.list.pagination.total"
                  @change="(page, pageSize) => handlePageChangeVto(slot.role, page, pageSize)"
                  :show-size-changer="true"
                  :page-size-options="['5', '10', '20']"
                />
              </div>
            </section>
          </template>

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
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  @click.stop="handleDelete('style-recommendation', item.id)"
                  :loading="deletingIds.has(`sr-${item.id}`)"
                >
                  🗑️
                </a-button>
                <div class="card-body" @click="openStyleRecommendationDetail(item)">
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
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  @click.stop="handleDelete('itinerary-planning', item.id)"
                  :loading="deletingIds.has(`ip-${item.id}`)"
                >
                  🗑️
                </a-button>
                <div class="card-body" @click="openItineraryPlanningDetail(item)">
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
          <section class="history-section" v-if="showSingleTypeSection">
            <div class="section-header">
              <h2>{{ currentTitle }}</h2>
              <span class="count-badge">{{ currentList.pagination.total }} 条</span>
            </div>

            <div
              v-if="activeTab === 'virtual-try-on' && !currentList.items.length"
              class="vto-tab-empty"
            >
              <p>当前「{{ vtoSubjectLabel }}」出镜方式下暂无虚拍记录</p>
              <small>完成虚拍并保存历史后，将显示在此处</small>
            </div>

            <div
              class="card-grid"
              v-if="activeTab === 'virtual-try-on' && currentList.items.length"
            >
              <div
                v-for="item in currentList.items"
                :key="`vto-single-${vtoRole}-${item.id}`"
                class="history-card"
              >
                <div class="card-type-tag vto">虚拍·{{ vtoSubjectLabel }}</div>
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  @click.stop="handleDelete('virtual-try-on', item.id)"
                  :loading="deletingIds.has(`vto-${item.id}`)"
                >
                  🗑️
                </a-button>
                <div
                  class="card-body"
                  @click="openVirtualTryOnDetail(item)"
                  :data-item-id="item.id"
                >
                  <div class="card-main">
                    <div class="thumb" v-if="getImageUrl(item)">
                      <a-image
                        :src="getImageUrl(item)!"
                        alt="预览"
                        :preview="true"
                        class="thumb-image"
                        @error="(e: any) => handleImageError(e, item)"
                      />
                      <div class="no-image-placeholder" style="display: none">
                        <span class="placeholder-text">图片已过期</span>
                      </div>
                    </div>
                    <div v-else class="thumb no-image-placeholder">
                      <span class="placeholder-text">暂无图片</span>
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
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  @click.stop="handleDelete('style-recommendation', item.id)"
                  :loading="deletingIds.has(`sr-single-${item.id}`)"
                >
                  🗑️
                </a-button>
                <div class="card-body" @click="openStyleRecommendationDetail(item)">
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
                <a-button
                  type="text"
                  danger
                  size="small"
                  class="delete-btn"
                  @click.stop="handleDelete('itinerary-planning', item.id)"
                  :loading="deletingIds.has(`ip-single-${item.id}`)"
                >
                  🗑️
                </a-button>
                <div class="card-body" @click="openItineraryPlanningDetail(item)">
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

            <div class="section-pagination" v-if="currentList.pagination.total > 0">
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
              <a-image
                v-if="selectedVirtualTryOn.imageUrl"
                :src="selectedVirtualTryOn.imageUrl"
                alt="原始照片"
                :preview="true"
                class="detail-image"
                @error="(e: any) => handleImageError(e, selectedVirtualTryOn)"
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
              <a-image
                v-if="getImageUrl(selectedVirtualTryOn)"
                :src="getImageUrl(selectedVirtualTryOn)!"
                alt="生成效果"
                :preview="true"
                class="detail-image"
                @error="(e: any) => handleImageError(e, selectedVirtualTryOn)"
              />
              <div v-else class="no-image">暂无生成效果</div>
              <div class="no-image-placeholder" style="display: none">
                <span class="placeholder-text">图片已过期</span>
              </div>
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
            <div v-if="selectedVirtualTryOn.preferences?.subjectRole" class="info-item">
              <span class="info-label">出镜方式：</span>
              <span class="info-value">{{
                VTO_SUBJECT_LABELS[
                  selectedVirtualTryOn.preferences.subjectRole as keyof typeof VTO_SUBJECT_LABELS
                ] || selectedVirtualTryOn.preferences.subjectRole
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

    <!-- 风格推荐详情模态框 -->
    <a-modal
      v-model:open="styleRecommendationModalVisible"
      title="风格推荐详情"
      :width="900"
      :footer="null"
      @cancel="closeStyleRecommendationDetail"
    >
      <div v-if="selectedStyleRecommendation" class="style-recommendation-detail">
        <!-- 基本信息 -->
        <div class="detail-info-section">
          <h3>📋 基本信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">个性化偏好：</span>
              <span class="info-value">{{ selectedStyleRecommendation.preferences }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预算范围：</span>
              <span class="info-value">
                {{
                  selectedStyleRecommendation.budget
                    ? `¥${selectedStyleRecommendation.budget}`
                    : '未填写'
                }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">生成时间：</span>
              <span class="info-value">{{
                formatTime(selectedStyleRecommendation.createdAt)
              }}</span>
            </div>
          </div>
        </div>

        <!-- 推荐风格列表 -->
        <div
          v-if="selectedStyleRecommendation.recommendedStyles"
          class="recommended-styles-section"
        >
          <h3>🎨 推荐风格</h3>
          <div class="styles-list">
            <div
              v-for="(style, index) in Array.isArray(selectedStyleRecommendation.recommendedStyles)
                ? selectedStyleRecommendation.recommendedStyles
                : []"
              :key="index"
              class="style-item-card"
            >
              <div class="style-item-header">
                <h4>{{ style.name || `风格 ${index + 1}` }}</h4>
                <div class="style-tags">
                  <span v-if="style.season" class="tag season">🌍 {{ style.season }}</span>
                  <span v-if="style.budget" class="tag budget">💰 {{ style.budget }}</span>
                </div>
              </div>
              <p v-if="style.description" class="style-description">{{ style.description }}</p>
              <div v-if="style.topSpots && Array.isArray(style.topSpots)" class="top-spots">
                <h5>推荐景点：</h5>
                <div class="spots-list">
                  <span
                    v-for="(spot, spotIndex) in style.topSpots"
                    :key="spotIndex"
                    class="spot-tag"
                  >
                    {{ spot }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 个性化建议 -->
        <div v-if="selectedStyleRecommendation.personalizedAdvice" class="advice-section">
          <h3>💡 个性化建议</h3>
          <p>{{ selectedStyleRecommendation.personalizedAdvice }}</p>
        </div>
      </div>
    </a-modal>

    <!-- 行程规划详情模态框 -->
    <a-modal
      v-model:open="itineraryPlanningModalVisible"
      title="行程规划详情"
      :width="1000"
      :footer="null"
      @cancel="closeItineraryPlanningDetail"
    >
      <div v-if="selectedItineraryPlanning" class="itinerary-planning-detail">
        <!-- 基本信息 -->
        <div class="detail-info-section">
          <h3>📋 基本信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">目的地：</span>
              <span class="info-value highlight">{{ selectedItineraryPlanning.destination }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">行程天数：</span>
              <span class="info-value">{{ selectedItineraryPlanning.duration }} 天</span>
            </div>
            <div class="info-item">
              <span class="info-label">拍摄风格：</span>
              <span class="info-value highlight">{{
                getStyleName(selectedItineraryPlanning.style)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">生成时间：</span>
              <span class="info-value">{{ formatTime(selectedItineraryPlanning.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 行程概览 -->
        <div v-if="selectedItineraryPlanning.overview" class="overview-section">
          <h3>🗺️ 行程概览</h3>
          <p>{{ selectedItineraryPlanning.overview }}</p>
        </div>

        <!-- 日程安排 -->
        <div v-if="selectedItineraryPlanning.dailySchedule" class="daily-schedule-section">
          <h3>📅 日程安排</h3>
          <div class="schedule-list">
            <div
              v-for="(day, index) in Array.isArray(selectedItineraryPlanning.dailySchedule)
                ? selectedItineraryPlanning.dailySchedule
                : []"
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

        <!-- 准备清单 -->
        <div v-if="selectedItineraryPlanning.packingList" class="packing-list-section">
          <h3>📦 准备清单</h3>
          <ul class="packing-list">
            <li
              v-for="(item, index) in Array.isArray(selectedItineraryPlanning.packingList)
                ? selectedItineraryPlanning.packingList
                : []"
              :key="index"
            >
              {{ item }}
            </li>
          </ul>
        </div>

        <!-- 当地建议 -->
        <div v-if="selectedItineraryPlanning.localTips" class="local-tips-section">
          <h3>💡 当地实用建议</h3>
          <p>{{ selectedItineraryPlanning.localTips }}</p>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { aiApi, AiHistoryType } from '@/api/ai';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import {
  VTO_DRESS_LABELS,
  VTO_HAIRSTYLE_LABELS,
  VTO_MAKEUP_LABELS,
} from '@/constants/virtual-tryon-preferences';
import {
  VTO_SUBJECT_LABELS,
  type VirtualTryOnSubjectRole,
} from '@/constants/virtual-tryon-subject';

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
    subjectRole?: string;
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
/** 虚拍「虚拍历史」标签下的子类：女生 / 男生 / 双人 */
const vtoRole = ref<VirtualTryOnSubjectRole>('female');
const virtualTryOnModalVisible = ref(false);
const selectedVirtualTryOn = ref<VirtualTryOnHistory | null>(null);
const styleRecommendationModalVisible = ref(false);
const selectedStyleRecommendation = ref<StyleRecommendationHistory | null>(null);
const itineraryPlanningModalVisible = ref(false);
const selectedItineraryPlanning = ref<ItineraryPlanningHistory | null>(null);
const deletingIds = ref<Set<string>>(new Set());

const virtualTryOn = reactive<ListWithPagination<VirtualTryOnHistory>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 5 },
});

const virtualTryOnFemale = reactive<ListWithPagination<VirtualTryOnHistory>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 5 },
});
const virtualTryOnMale = reactive<ListWithPagination<VirtualTryOnHistory>>({
  items: [],
  pagination: { total: 0, page: 1, pageSize: 5 },
});
const virtualTryOnCouple = reactive<ListWithPagination<VirtualTryOnHistory>>({
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
    virtualTryOnFemale.items.length > 0 ||
    virtualTryOnMale.items.length > 0 ||
    virtualTryOnCouple.items.length > 0 ||
    styleRecommendation.items.length > 0 ||
    itineraryPlanning.items.length > 0
  );
});

/** 「全部记录」里虚拍按女生/男生/双人分三段 */
const vtoAllSlots = computed(() => [
  {
    role: 'female' as VirtualTryOnSubjectRole,
    title: '女生虚拍',
    shortLabel: '女生',
    icon: '👰',
    list: virtualTryOnFemale,
  },
  {
    role: 'male' as VirtualTryOnSubjectRole,
    title: '男生虚拍',
    shortLabel: '男生',
    icon: '🤵',
    list: virtualTryOnMale,
  },
  {
    role: 'couple' as VirtualTryOnSubjectRole,
    title: '双人虚拍',
    shortLabel: '双人',
    icon: '💑',
    list: virtualTryOnCouple,
  },
]);

const vtoSubjectLabel = computed(() => VTO_SUBJECT_LABELS[vtoRole.value] || '');

const currentList = computed(() => {
  if (activeTab.value === 'virtual-try-on') return virtualTryOn;
  if (activeTab.value === 'style-recommendation') return styleRecommendation;
  if (activeTab.value === 'itinerary-planning') return itineraryPlanning;
  return virtualTryOn;
});

/** 单一类型标签页：虚拍始终显示区块（便于切换子类）；其余类型无数据则整块不展示 */
const showSingleTypeSection = computed(() => {
  if (activeTab.value === 'virtual-try-on') return true;
  return currentList.value.items.length > 0;
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
const styleMap: Record<string, string> = { ...TRAVEL_STYLE_LABELS };

// 妆容 / 发型 / 服装：新版虚拍偏好 + 旧版兼容
const makeupMap: Record<string, string> = {
  ...VTO_MAKEUP_LABELS,
  natural: '自然清透',
  romantic: '浪漫烟熏',
  elegant: '典雅气质',
  vintage: '复古优雅',
};

const hairstyleMap: Record<string, string> = {
  ...VTO_HAIRSTYLE_LABELS,
  updo: '盘发',
  loose: '飘逸长卷',
  'half-up': '半扎',
  sleek: '贴头皮',
};

const dressMap: Record<string, string> = {
  ...VTO_DRESS_LABELS,
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
  if (preferences.subjectRole) {
    const sub = preferences.subjectRole as keyof typeof VTO_SUBJECT_LABELS;
    parts.push(`出镜: ${VTO_SUBJECT_LABELS[sub] || preferences.subjectRole}`);
  }
  if (preferences.makeup) parts.push(`妆容: ${getMakeupName(preferences.makeup)}`);
  if (preferences.hairstyle) parts.push(`发型: ${getHairstyleName(preferences.hairstyle)}`);
  if (preferences.dress) parts.push(`服装: ${getDressName(preferences.dress)}`);
  return parts.length > 0 ? parts.join(' | ') : '无';
};

// 智能选择图片URL：优先显示生成后的图片，优先使用base64格式避免外部URL过期
const getImageUrl = (item: VirtualTryOnHistory): string | null => {
  if (!item) return null;

  // 调试：打印完整的数据结构
  console.log('[getImageUrl] 处理图片URL选择:', {
    id: item.id,
    hasModifiedImageUrl: !!item.modifiedImageUrl,
    modifiedImageUrlType: item.modifiedImageUrl
      ? item.modifiedImageUrl.startsWith('data:')
        ? 'base64'
        : item.modifiedImageUrl.startsWith('http')
          ? 'external'
          : 'other'
      : 'null',
    modifiedImageUrlPreview: item.modifiedImageUrl?.substring(0, 80),
    hasImageUrl: !!item.imageUrl,
    imageUrlType: item.imageUrl
      ? item.imageUrl.startsWith('data:')
        ? 'base64'
        : item.imageUrl.startsWith('http')
          ? 'external'
          : 'other'
      : 'null',
    imageUrlPreview: item.imageUrl?.substring(0, 80),
  });

  // 策略1: 优先使用base64格式的修改后图片（永久有效，不会过期）
  if (item.modifiedImageUrl && typeof item.modifiedImageUrl === 'string') {
    const modifiedUrl = item.modifiedImageUrl.trim();
    if (
      modifiedUrl &&
      modifiedUrl !== '' &&
      modifiedUrl !== 'null' &&
      modifiedUrl !== 'undefined'
    ) {
      // 优先使用base64格式的修改后图片（永久有效）
      if (modifiedUrl.startsWith('data:')) {
        console.log('[getImageUrl] ✅ 使用base64格式的生成图片');
        return modifiedUrl;
      }
    }
  }

  // 策略2: 如果修改后的图片是外部URL，检查是否有原始图片的base64版本
  // 如果有，优先使用原始图片的base64（避免外部URL过期问题）
  // 如果没有，才使用外部URL（即使可能过期，也比原始图片好）
  if (item.modifiedImageUrl && typeof item.modifiedImageUrl === 'string') {
    const modifiedUrl = item.modifiedImageUrl.trim();
    if (
      modifiedUrl &&
      modifiedUrl !== '' &&
      modifiedUrl !== 'null' &&
      modifiedUrl !== 'undefined' &&
      modifiedUrl.startsWith('http')
    ) {
      // 如果生成图片只有外部URL，且原始图片有base64版本，优先使用原始图片
      // 这样可以避免外部URL过期导致无法显示的问题
      if (item.imageUrl && typeof item.imageUrl === 'string') {
        const originalUrl = item.imageUrl.trim();
        if (
          originalUrl &&
          originalUrl !== '' &&
          originalUrl !== 'null' &&
          originalUrl !== 'undefined' &&
          originalUrl.startsWith('data:')
        ) {
          console.log(
            '[getImageUrl] ⚠️ 生成图片只有外部URL（可能过期），优先使用原始图片的base64版本'
          );
          return originalUrl;
        }
      }
      // 如果没有原始图片的base64版本，才使用外部URL
      console.log(
        '[getImageUrl] ⚠️ 使用外部URL的生成图片（可能过期，失败时将回退到原始图片）:',
        modifiedUrl.substring(0, 50)
      );
      return modifiedUrl;
    }
  }

  // 策略2: 如果没有修改后的图片，才使用原始图片（优先base64格式）
  if (item.imageUrl && typeof item.imageUrl === 'string') {
    const originalUrl = item.imageUrl.trim();
    if (
      originalUrl &&
      originalUrl !== '' &&
      originalUrl !== 'null' &&
      originalUrl !== 'undefined'
    ) {
      // 优先使用base64格式的原始图片（永久有效）
      if (originalUrl.startsWith('data:')) {
        console.log('[getImageUrl] ⚠️ 使用base64格式的原始图片（没有生成图片）');
        return originalUrl;
      }
      // 最后使用外部URL的原始图片（可能过期）
      if (originalUrl.startsWith('http')) {
        console.log('[getImageUrl] ⚠️ 使用外部URL的原始图片（没有生成图片）');
        return originalUrl;
      }
    }
  }

  console.warn('[getImageUrl] ❌ 没有找到有效的图片URL:', {
    id: item.id,
    hasModifiedImageUrl: !!item.modifiedImageUrl,
    modifiedImageUrl: item.modifiedImageUrl,
    hasImageUrl: !!item.imageUrl,
    imageUrl: item.imageUrl,
  });
  return null;
};

// 处理图片加载错误：外部URL失败时优先尝试base64格式的生成图片
const handleImageError = (event: any, item: VirtualTryOnHistory) => {
  // 获取实际的图片元素（a-image组件内部可能有嵌套）
  const img = (event.target as HTMLImageElement) || event.target?.querySelector?.('img');
  if (!img) {
    console.warn('[handleImageError] 无法找到图片元素');
    return;
  }

  const failedSrc = img.src || event.target?.src;
  if (!failedSrc) return;

  // 使用item作为重试计数器存储
  const retryKey = `__retryCount_${item.id}`;
  let retryCount = (item as any)[retryKey] || 0;
  (item as any)[retryKey] = retryCount + 1;

  // 防止无限重试
  if (retryCount >= 2) {
    console.error('[handleImageError] 重试次数过多，显示占位符');
    showImagePlaceholder(event.target, item);
    return;
  }

  console.warn('[handleImageError] 图片加载失败，尝试回退:', {
    id: item.id,
    retryCount,
    failedSrc: failedSrc.substring(0, 100),
    hasModifiedBase64: item.modifiedImageUrl?.startsWith('data:'),
    hasOriginalBase64: item.imageUrl?.startsWith('data:'),
    failedIsModified:
      failedSrc === item.modifiedImageUrl || failedSrc.includes(item.modifiedImageUrl || ''),
  });

  // 判断失败的是生成图片还是原始图片
  const isFailedModifiedImage =
    failedSrc === item.modifiedImageUrl ||
    (item.modifiedImageUrl && failedSrc.includes(item.modifiedImageUrl));
  const isFailedOriginalImage =
    failedSrc === item.imageUrl || (item.imageUrl && failedSrc.includes(item.imageUrl));

  // 策略1: 如果失败的是生成图片的外部URL，尝试使用base64格式的生成图片
  if (isFailedModifiedImage && failedSrc.startsWith('http')) {
    console.log('[handleImageError] 策略1: 生成图片的外部URL失败');
    // 优先尝试base64格式的修改后图片（生成图片）
    if (
      item.modifiedImageUrl &&
      item.modifiedImageUrl.startsWith('data:') &&
      item.modifiedImageUrl !== failedSrc
    ) {
      console.log('[handleImageError] ✅ 回退到base64格式的生成图片');
      if (img) img.src = item.modifiedImageUrl;
      // 更新a-image组件的src
      if (event.target && event.target.setAttribute) {
        event.target.setAttribute('src', item.modifiedImageUrl);
      }
      return;
    }
    // 如果没有base64格式的生成图片，尝试显示原始图片（至少能看到效果）
    console.log('[handleImageError] 检查原始图片:', {
      hasImageUrl: !!item.imageUrl,
      isBase64: item.imageUrl?.startsWith('data:'),
      isDifferent: item.imageUrl !== failedSrc,
    });
    if (item.imageUrl && item.imageUrl.startsWith('data:') && item.imageUrl !== failedSrc) {
      console.warn('[handleImageError] ⚠️ 生成图片的外部URL失败，且没有base64版本，回退到原始图片');
      // 直接更新图片源
      if (img) {
        img.src = item.imageUrl;
        img.onerror = null; // 清除错误处理器，避免循环
      }
      // 更新a-image组件的src（可能需要更新多个地方）
      if (event.target) {
        if (event.target.setAttribute) {
          event.target.setAttribute('src', item.imageUrl);
        }
        // 尝试更新a-image组件内部的img元素
        const innerImg = event.target.querySelector?.('img');
        if (innerImg) {
          innerImg.src = item.imageUrl;
          innerImg.onerror = null;
        }
      }
      return;
    }
    // 如果原始图片也不是base64，显示占位符
    console.warn('[handleImageError] ⚠️ 生成图片的外部URL失败，且没有可用的base64版本，显示占位符');
    showImagePlaceholder(event.target, item);
    return;
  }

  // 策略2: 如果失败的是外部URL（可能是原始图片的外部URL），优先尝试base64格式的生成图片
  if (failedSrc.startsWith('http') && !isFailedModifiedImage) {
    // 优先尝试base64格式的修改后图片（生成图片）
    if (
      item.modifiedImageUrl &&
      item.modifiedImageUrl.startsWith('data:') &&
      item.modifiedImageUrl !== failedSrc
    ) {
      console.log('[handleImageError] ✅ 回退到base64格式的生成图片');
      if (img) img.src = item.modifiedImageUrl;
      if (event.target && event.target.setAttribute) {
        event.target.setAttribute('src', item.modifiedImageUrl);
      }
      return;
    }
    // 如果失败的是原始图片URL，且没有生成图片，才回退到base64格式的原始图片
    if (isFailedOriginalImage) {
      if (item.imageUrl && item.imageUrl.startsWith('data:') && item.imageUrl !== failedSrc) {
        console.log('[handleImageError] ⚠️ 回退到base64格式的原始图片（生成图片不可用）');
        if (img) img.src = item.imageUrl;
        if (event.target && event.target.setAttribute) {
          event.target.setAttribute('src', item.imageUrl);
        }
        return;
      }
    }
  }

  // 如果都失败了，显示占位符
  console.error('[handleImageError] ❌ 所有图片URL都失败，显示占位符');
  showImagePlaceholder(event.target, item);
};

// 显示图片占位符
const showImagePlaceholder = (target: any, item: VirtualTryOnHistory) => {
  // 查找包含图片的容器（可能是thumb或image-wrapper）
  let container: HTMLElement | null = null;

  // 尝试多种方式找到容器
  if (target) {
    container =
      target.closest?.('.thumb') ||
      target.closest?.('.image-wrapper') ||
      target.parentElement?.closest?.('.thumb') ||
      target.parentElement?.closest?.('.image-wrapper') ||
      target.querySelector?.('.thumb') ||
      target.querySelector?.('.image-wrapper');
  }

  // 如果找不到，尝试通过item.id查找（列表页）
  if (!container) {
    const card = document.querySelector(`[data-item-id="${item.id}"]`);
    container = card?.querySelector('.thumb') as HTMLElement;
  }

  // 如果还是找不到，尝试查找详情页的image-wrapper
  if (!container) {
    container = document.querySelector('.image-wrapper') as HTMLElement;
  }

  if (!container) {
    console.warn('[showImagePlaceholder] 无法找到图片容器');
    return;
  }

  // 使用nextTick确保DOM更新后再操作
  setTimeout(() => {
    // 隐藏所有图片和a-image组件
    const images = container.querySelectorAll(
      'img, .ant-image, .ant-image-img, .thumb-image, .detail-image'
    );
    images.forEach((img: any) => {
      if (img) {
        if (img.style) {
          img.style.display = 'none';
        }
        if (img.parentElement && img.parentElement.classList.contains('ant-image')) {
          img.parentElement.style.display = 'none';
        }
      }
    });

    // 查找现有的占位符
    let placeholder = container.querySelector('.no-image-placeholder') as HTMLElement;

    // 如果不存在，创建占位符
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'no-image-placeholder';
      const text = document.createElement('span');
      text.className = 'placeholder-text';
      text.textContent = '图片已过期';
      placeholder.appendChild(text);
      container.appendChild(placeholder);
    }

    // 显示占位符
    placeholder.style.display = 'flex';
    placeholder.style.visibility = 'visible';
  }, 0);
};

const unwrapHistoryData = (response: any) => response?.data?.data || response?.data || response;

const fetchHistory = async (type: AiHistoryType, page?: number, pageSize?: number) => {
  loading.value = true;
  try {
    if (type === 'all') {
      const [resF, resM, resC, resSr, resIp] = await Promise.all([
        aiApi.getHistory({
          type: 'virtual-try-on',
          subjectRole: 'female',
          page: virtualTryOnFemale.pagination.page,
          pageSize: virtualTryOnFemale.pagination.pageSize,
        }),
        aiApi.getHistory({
          type: 'virtual-try-on',
          subjectRole: 'male',
          page: virtualTryOnMale.pagination.page,
          pageSize: virtualTryOnMale.pagination.pageSize,
        }),
        aiApi.getHistory({
          type: 'virtual-try-on',
          subjectRole: 'couple',
          page: virtualTryOnCouple.pagination.page,
          pageSize: virtualTryOnCouple.pagination.pageSize,
        }),
        aiApi.getHistory({
          type: 'style-recommendation',
          page: styleRecommendation.pagination.page,
          pageSize: styleRecommendation.pagination.pageSize,
        }),
        aiApi.getHistory({
          type: 'itinerary-planning',
          page: itineraryPlanning.pagination.page,
          pageSize: itineraryPlanning.pagination.pageSize,
        }),
      ]);

      const dataF = unwrapHistoryData(resF);
      const dataM = unwrapHistoryData(resM);
      const dataC = unwrapHistoryData(resC);
      const dataSr = unwrapHistoryData(resSr);
      const dataIp = unwrapHistoryData(resIp);

      virtualTryOnFemale.items = dataF.items || [];
      virtualTryOnFemale.pagination = dataF.pagination || virtualTryOnFemale.pagination;
      virtualTryOnMale.items = dataM.items || [];
      virtualTryOnMale.pagination = dataM.pagination || virtualTryOnMale.pagination;
      virtualTryOnCouple.items = dataC.items || [];
      virtualTryOnCouple.pagination = dataC.pagination || virtualTryOnCouple.pagination;

      styleRecommendation.items = dataSr.items || [];
      styleRecommendation.pagination = dataSr.pagination || styleRecommendation.pagination;
      itineraryPlanning.items = dataIp.items || [];
      itineraryPlanning.pagination = dataIp.pagination || itineraryPlanning.pagination;
    } else if (type === 'virtual-try-on') {
      const response: any = await aiApi.getHistory({
        type: 'virtual-try-on',
        subjectRole: vtoRole.value,
        page: page ?? virtualTryOn.pagination.page,
        pageSize: pageSize ?? virtualTryOn.pagination.pageSize,
      });
      const data = unwrapHistoryData(response);
      virtualTryOn.items = data.items || [];
      virtualTryOn.pagination = data.pagination || virtualTryOn.pagination;
      if (virtualTryOn.items.length > 0) {
        const firstItem = virtualTryOn.items[0];
        console.log('[AIHistory] 虚拍历史第一条记录:', {
          id: firstItem.id,
          hasModifiedImageUrl: !!firstItem.modifiedImageUrl,
          modifiedImageUrlType: firstItem.modifiedImageUrl?.substring(0, 50),
          hasImageUrl: !!firstItem.imageUrl,
          imageUrlType: firstItem.imageUrl?.substring(0, 50),
          selectedUrl: getImageUrl(firstItem),
        });
      }
    } else {
      const params: {
        type: AiHistoryType;
        page?: number;
        pageSize?: number;
      } = {
        type,
      };
      if (page) params.page = page;
      if (pageSize) params.pageSize = pageSize;

      const response: any = await aiApi.getHistory(params);
      const data = unwrapHistoryData(response);

      if (type === 'style-recommendation') {
        styleRecommendation.items = data.items || [];
        styleRecommendation.pagination = data.pagination || styleRecommendation.pagination;
      } else if (type === 'itinerary-planning') {
        itineraryPlanning.items = data.items || [];
        itineraryPlanning.pagination = data.pagination || itineraryPlanning.pagination;
      }
    }
  } catch (error: any) {
    message.error(error?.message || '获取历史记录失败');
  } finally {
    loading.value = false;
  }
};

/** 「全部记录」里某一类虚拍分页变化 */
const handlePageChangeVto = (role: VirtualTryOnSubjectRole, page: number, pageSize: number) => {
  if (role === 'female') {
    virtualTryOnFemale.pagination.page = page;
    virtualTryOnFemale.pagination.pageSize = pageSize;
  } else if (role === 'male') {
    virtualTryOnMale.pagination.page = page;
    virtualTryOnMale.pagination.pageSize = pageSize;
  } else {
    virtualTryOnCouple.pagination.page = page;
    virtualTryOnCouple.pagination.pageSize = pageSize;
  }
  fetchHistory('all');
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

// 打开风格推荐详情
const openStyleRecommendationDetail = (item: StyleRecommendationHistory) => {
  selectedStyleRecommendation.value = item;
  styleRecommendationModalVisible.value = true;
};

// 关闭风格推荐详情
const closeStyleRecommendationDetail = () => {
  styleRecommendationModalVisible.value = false;
  selectedStyleRecommendation.value = null;
};

// 打开行程规划详情
const openItineraryPlanningDetail = (item: ItineraryPlanningHistory) => {
  selectedItineraryPlanning.value = item;
  itineraryPlanningModalVisible.value = true;
};

// 关闭行程规划详情
const closeItineraryPlanningDetail = () => {
  itineraryPlanningModalVisible.value = false;
  selectedItineraryPlanning.value = null;
};

// 删除历史记录
const handleDelete = async (
  type: 'virtual-try-on' | 'style-recommendation' | 'itinerary-planning',
  id: number
) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条历史记录吗？删除后无法恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      // 根据类型和标签页生成唯一key
      const keyPrefix =
        activeTab.value === 'all'
          ? type === 'virtual-try-on'
            ? 'vto'
            : type === 'style-recommendation'
              ? 'sr'
              : 'ip'
          : type === 'virtual-try-on'
            ? 'vto'
            : type === 'style-recommendation'
              ? 'sr-single'
              : 'ip-single';
      const deleteKey = `${keyPrefix}-${id}`;

      deletingIds.value.add(deleteKey);

      try {
        await aiApi.deleteHistory(type, id);
        message.success('删除成功');

        // 刷新当前列表
        if (activeTab.value === 'all') {
          fetchHistory('all');
        } else {
          const list = currentList.value;
          fetchHistory(activeTab.value, list.pagination.page, list.pagination.pageSize);
        }
      } catch (error: any) {
        console.error('[AIHistory] 删除失败:', error);
        message.error(error?.message || '删除失败，请稍后重试');
      } finally {
        deletingIds.value.delete(deleteKey);
      }
    },
  });
};

/** 虚拍「虚拍历史」标签下切换女生/男生/双人时重新拉取 */
watch(vtoRole, () => {
  if (activeTab.value !== 'virtual-try-on') return;
  virtualTryOn.pagination.page = 1;
  fetchHistory('virtual-try-on', 1, virtualTryOn.pagination.pageSize);
});

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

.vto-sub-tabs {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.vto-tab-empty {
  padding: 24px 12px 32px;
  text-align: center;
  color: #888;

  p {
    margin: 0;
    font-size: 15px;
  }

  small {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    color: #aaa;
  }
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
  display: flex;
  align-items: center;
  justify-content: center;

  .thumb-image {
    width: 100%;
    height: 100%;
    cursor: pointer;
    display: block;

    :deep(.ant-image-img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }

    &:hover {
      opacity: 0.9;
    }
  }

  &.no-image-placeholder {
    display: flex !important;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    background: #f0f0f0;
    border: 1px dashed #d9d9d9;
    border-radius: 8px;

    .placeholder-text {
      font-size: 0.875rem;
      color: #999;
      text-align: center;
    }
  }

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
  cursor: pointer;

  :deep(.ant-image-img) {
    width: 100%;
    height: auto;
    max-height: 400px;
    object-fit: contain;
    display: block;
  }

  &:hover {
    opacity: 0.9;
  }
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

// 风格推荐详情模态框样式
.style-recommendation-detail {
  padding: 10px 0;
}

.recommended-styles-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }
}

.styles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.style-item-card {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #36cfc9;
  transition: all 0.3s;

  &:hover {
    background: #f0f0f0;
    transform: translateX(4px);
  }
}

.style-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;

  h4 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    flex: 1;
  }
}

.style-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  white-space: nowrap;

  &.season {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.budget {
    background: #fff7e6;
    color: #fa8c16;
  }
}

.style-description {
  color: #666;
  line-height: 1.6;
  margin: 8px 0;
}

.top-spots {
  margin-top: 12px;

  h5 {
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
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
  transition: all 0.2s;

  &:hover {
    border-color: #36cfc9;
    color: #36cfc9;
    background: #e6fffb;
  }
}

// 行程规划详情模态框样式
.itinerary-planning-detail {
  padding: 10px 0;
}

.overview-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }

  p {
    color: #666;
    line-height: 1.8;
  }
}

.daily-schedule-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }
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
  border-left: 4px solid #ffa940;
  transition: all 0.3s;

  &:hover {
    background: #f0f0f0;
    transform: translateX(4px);
  }
}

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
  }

  strong {
    color: #333;
    font-weight: 600;
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

.packing-list-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }
}

.packing-list {
  margin: 0;
  padding-left: 20px;
  color: #666;
  line-height: 1.8;

  li {
    margin-bottom: 8px;
  }
}

.local-tips-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }

  p {
    color: #666;
    line-height: 1.8;
  }
}
</style>
