<template>
  <div class="style-recommendation-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>✨ 智能风格推荐</h1>
      <p>根据您的审美偏好，AI 为您推荐最匹配的拍摄风格与全球景点</p>
    </div>

    <div class="content-grid">
      <!-- 左侧：配置表单 -->
      <div class="left-panel">
        <a-form layout="vertical" class="recommendation-form">
          <!-- 审美描述 -->
          <a-form-item label="您的审美偏好" required>
            <a-textarea
              v-model:value="formData.preferences"
              placeholder="请描述您喜欢的风格、氛围、颜色等，例如：我喜欢清新唯美的感觉，偏好绿色和蓝色系，想要有艺术感..."
              :rows="4"
              show-count
              :maxlength="500"
              @change="saveStateToStorage"
            />
          </a-form-item>

          <!-- 预算 -->
          <a-form-item label="预算范围（可选）">
            <a-select
              v-model:value="formData.budget"
              placeholder="选择您的预算范围"
              allow-clear
              @change="saveStateToStorage"
            >
              <a-select-option :value="10000">¥0-10000</a-select-option>
              <a-select-option :value="20000">¥10000-20000</a-select-option>
              <a-select-option :value="50000">¥20000-50000</a-select-option>
              <a-select-option :value="100000">¥50000-100000</a-select-option>
              <a-select-option :value="100001">¥100000+</a-select-option>
            </a-select>
          </a-form-item>

          <!-- 适合场景 -->
          <a-form-item label="适合场景（可多选）">
            <a-checkbox-group v-model:value="formData.occasions" @change="saveStateToStorage">
              <a-checkbox value="wedding">婚礼</a-checkbox>
              <a-checkbox value="engagement">订婚</a-checkbox>
              <a-checkbox value="anniversary">周年纪念</a-checkbox>
              <a-checkbox value="honeymoon">蜜月</a-checkbox>
              <a-checkbox value="pre-wedding">婚前写真</a-checkbox>
            </a-checkbox-group>
          </a-form-item>

          <!-- 行动按钮 -->
          <a-form-item>
            <a-button
              type="primary"
              size="large"
              block
              :loading="loading"
              @click="handleRecommend"
              class="submit-btn"
            >
              {{ loading ? '正在生成推荐...' : '🎨 生成个性化推荐' }}
            </a-button>
          </a-form-item>
        </a-form>

        <!-- 推荐卡片展示 -->
        <div v-if="result" class="recommendation-cards">
          <div
            v-for="(style, index) in result.recommendedStyles"
            :key="index"
            class="recommendation-card"
            :class="{ active: selectedRecommendation === index }"
            @click="
              () => {
                selectedRecommendation = index;
                saveStateToStorage();
              }
            "
          >
            <div class="card-header">
              <h3>{{ style.name }}</h3>
              <span class="budget-tag">{{ style.budget }}</span>
            </div>
            <p class="card-desc">{{ style.description }}</p>
            <div class="card-meta">
              <span class="season-tag">🌍 {{ style.season }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：详细推荐 -->
      <div class="right-panel">
        <div v-if="!result" class="empty-state">
          <span class="empty-icon">🎨</span>
          <p>填写左侧信息后，点击按钮获取个性化推荐</p>
        </div>

        <div v-else class="recommendation-detail">
          <!-- 选中的推荐详情 -->
          <div v-if="selectedRecommendation !== null" class="detail-card">
            <div class="detail-header">
              <h2>{{ result.recommendedStyles[selectedRecommendation].name }}</h2>
              <div class="detail-meta">
                <span class="meta-item"
                  >🌍 推荐季节：{{ result.recommendedStyles[selectedRecommendation].season }}</span
                >
                <span class="meta-item"
                  >💰 预算参考：{{ result.recommendedStyles[selectedRecommendation].budget }}</span
                >
              </div>
            </div>

            <div class="detail-section">
              <h3>风格特点</h3>
              <p>{{ result.recommendedStyles[selectedRecommendation].description }}</p>
            </div>

            <div class="detail-section">
              <h3>推荐景点</h3>
              <div class="spots-grid">
                <div
                  v-for="(spot, index) in result.recommendedStyles[selectedRecommendation].topSpots"
                  :key="index"
                  class="spot-card"
                >
                  <div class="spot-number">{{ index + 1 }}</div>
                  <div class="spot-name">{{ spot }}</div>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h3>个性化建议</h3>
              <p>{{ result.personalizedAdvice }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="detail-actions">
              <a-button type="primary" @click="handleSaveRecommendation"> 💾 保存推荐 </a-button>
              <a-button @click="handleDownloadRecommendation"> ⬇️ 下载详情 </a-button>
              <a-button @click="handleReset"> 🔄 重新生成 </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, StyleRecommendationRequest } from '@/api/ai';
import { useAuthStore } from '@/store/auth';

const formData = reactive({
  preferences: '',
  budget: undefined,
  occasions: [],
});

const loading = ref<boolean>(false);
const result = ref<any>(null);
const selectedRecommendation = ref<number | null>(null);
const authStore = useAuthStore();

// 状态持久化的 key
const STORAGE_KEY = 'style-recommendation-state';

// 保存状态到 sessionStorage
const saveStateToStorage = () => {
  try {
    const state = {
      preferences: formData.preferences,
      budget: formData.budget,
      occasions: [...formData.occasions],
      result: result.value,
      selectedRecommendation: selectedRecommendation.value,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('保存状态失败:', error);
  }
};

// 从 sessionStorage 恢复状态
const restoreStateFromStorage = () => {
  try {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      formData.preferences = state.preferences || '';
      formData.budget = state.budget;
      formData.occasions = state.occasions || [];
      result.value = state.result || null;
      selectedRecommendation.value = state.selectedRecommendation ?? null;
      console.log('已恢复风格推荐页面状态');
    }
  } catch (error) {
    console.error('恢复状态失败:', error);
  }
};

// 清空状态和存储
const clearStateAndStorage = () => {
  formData.preferences = '';
  formData.budget = undefined;
  formData.occasions = [];
  result.value = null;
  selectedRecommendation.value = null;
  sessionStorage.removeItem(STORAGE_KEY);
  message.info('已清空，可以重新开始生成');
};

// 生成推荐
const handleRecommend = async () => {
  if (!formData.preferences.trim()) {
    message.warning('请输入您的审美偏好');
    return;
  }

  loading.value = true;
  try {
    const request: StyleRecommendationRequest = {
      preferences: formData.preferences,
      budget: formData.budget,
      occasions: formData.occasions.length > 0 ? formData.occasions : undefined,
    };

    const response = await aiApi.recommendStyle(request);
    // 处理嵌套的响应结构，取最内层的 data
    result.value = response.data?.data || response.data;
    selectedRecommendation.value = 0;
    message.success('推荐生成成功！');

    // 保存状态到 sessionStorage
    saveStateToStorage();

    // 如果用户已登录，自动保存到历史记录
    if (authStore.isAuthenticated && result.value) {
      try {
        await aiApi.saveHistory({
          type: 'style-recommendation',
          input: { ...formData },
          output: result.value,
        });
        // 静默保存，不显示额外提示
      } catch (saveError: any) {
        // 保存失败不影响主流程，只记录日志
        console.warn('自动保存历史记录失败:', saveError);
      }
    }
  } catch (error: any) {
    message.error(error.message || '生成失败，请重试');
  } finally {
    loading.value = false;
  }
};

// 保存推荐
const handleSaveRecommendation = async () => {
  try {
    await aiApi.saveHistory({
      type: 'style-recommendation',
      input: formData,
      output: result.value,
    });
    message.success('已保存到历史记录');
  } catch (error: any) {
    message.error(error.message || '保存失败');
  }
};

// 下载推荐
const handleDownloadRecommendation = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `风格推荐-${new Date().getTime()}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
  message.success('已下载推荐文件');
};

// 重新生成（清空）
const handleReset = () => {
  clearStateAndStorage();
};

onMounted(() => {
  restoreStateFromStorage();
});
</script>

<style scoped lang="less">
.style-recommendation-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 10px;
  }

  p {
    font-size: 1.1rem;
    opacity: 0.9;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.left-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.recommendation-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 600;
    color: #333;

    &::after {
      content: ' ';
    }
  }
}

.submit-btn {
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
  border: none;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 117, 140, 0.4);
  }
}

.recommendation-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-card {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;

  &:hover {
    border-color: #ff758c;
    background: #fff5f7;
    transform: translateX(5px);
  }

  &.active {
    border-color: #ff758c;
    background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
    color: white;

    .card-desc {
      color: rgba(255, 255, 255, 0.9);
    }

    .card-meta .season-tag {
      background: rgba(255, 255, 255, 0.3);
      color: white;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .budget-tag {
      font-size: 0.8rem;
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }
  }

  .card-desc {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .card-meta {
    display: flex;
    gap: 8px;

    .season-tag {
      font-size: 0.8rem;
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }
  }
}

.right-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #999;

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    font-size: 1rem;
  }
}

.recommendation-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-header {
  padding: 20px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;

  h2 {
    margin: 0 0 12px 0;
    font-size: 1.5rem;
  }

  .detail-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .meta-item {
      font-size: 0.95rem;
      opacity: 0.95;
    }
  }
}

.detail-section {
  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: #333;
  }

  p {
    color: #666;
    line-height: 1.6;
    margin: 0;
  }
}

.spots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.spot-card {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    background: #ff758c;
    color: white;
    transform: translateY(-4px);
  }

  .spot-number {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 8px;
    color: #ff758c;
  }

  .spot-name {
    font-size: 0.85rem;
    font-weight: 600;
  }

  &:hover .spot-number {
    color: white;
  }
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;

  button {
    flex: 1;
  }
}
</style>
