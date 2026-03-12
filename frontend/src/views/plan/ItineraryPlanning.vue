<template>
  <div class="itinerary-planning-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🗺️ 智能行程规划</h1>
      <p>一键生成最优拍摄路线与时间安排，让旅拍行程轻松无忧</p>
    </div>

    <div class="content-grid">
      <!-- 左侧：规划配置 -->
      <div class="left-panel">
        <a-form layout="vertical" class="planning-form">
          <!-- 目的地 -->
          <a-form-item label="目的地" required>
            <a-select
              v-model:value="formData.destination"
              placeholder="选择或输入目的地"
              allow-clear
              show-search
              filter-option
            >
              <a-select-option value="巴厘岛">🏖️ 巴厘岛</a-select-option>
              <a-select-option value="马尔代夫">🏝️ 马尔代夫</a-select-option>
              <a-select-option value="三亚">⛱️ 三亚</a-select-option>
              <a-select-option value="丽江">🏔️ 丽江</a-select-option>
              <a-select-option value="大理">🌄 大理</a-select-option>
              <a-select-option value="新疆">🐫 新疆</a-select-option>
              <a-select-option value="西藏">🏔️ 西藏</a-select-option>
              <a-select-option value="婺源">🌾 婺源</a-select-option>
              <a-select-option value="千岛湖">💧 千岛湖</a-select-option>
              <a-select-option value="西溪湿地">🦆 西溪湿地</a-select-option>
            </a-select>
          </a-form-item>

          <!-- 天数 -->
          <a-form-item label="旅程天数" required>
            <a-slider
              v-model:value="formData.duration"
              :min="2"
              :max="14"
              :tip-formatter="(value: number) => `${value} 天`"
            />
            <div class="duration-display">计划 {{ formData.duration }} 天的旅程</div>
          </a-form-item>

          <!-- 拍摄风格 -->
          <a-form-item label="拍摄风格" required>
            <a-select v-model:value="formData.style" placeholder="选择拍摄风格" allow-clear>
              <a-select-option value="romantic">✨ 浪漫梦幻</a-select-option>
              <a-select-option value="artistic">🎨 艺术文艺</a-select-option>
              <a-select-option value="bohemian">🌻 波西米亚</a-select-option>
              <a-select-option value="minimalist">⬜ 极简现代</a-select-option>
              <a-select-option value="classical">👑 古典优雅</a-select-option>
              <a-select-option value="adventure">⛰️ 冒险活力</a-select-option>
            </a-select>
          </a-form-item>

          <!-- 兴趣爱好 -->
          <a-form-item label="兴趣爱好（可多选）">
            <a-checkbox-group v-model:value="formData.interests">
              <a-checkbox value="nature">自然风景</a-checkbox>
              <a-checkbox value="culture">文化古迹</a-checkbox>
              <a-checkbox value="city">城市建筑</a-checkbox>
              <a-checkbox value="local">当地美食</a-checkbox>
              <a-checkbox value="adventure">冒险活动</a-checkbox>
            </a-checkbox-group>
          </a-form-item>

          <!-- 行动按钮 -->
          <a-form-item>
            <a-button
              type="primary"
              size="large"
              block
              :loading="loading"
              @click="handlePlanItinerary"
              class="submit-btn"
            >
              {{ loading ? '正在生成行程...' : '🎬 生成详细行程' }}
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 右侧：行程展示 -->
      <div class="right-panel">
        <div v-if="!result" class="empty-state">
          <span class="empty-icon">🗺️</span>
          <p>完成左侧配置后，点击按钮生成最优行程</p>
        </div>

        <div v-else class="itinerary-detail">
          <!-- 行程概览 -->
          <div class="overview-card">
            <h2>{{ result.destination }} - {{ result.duration }} 天行程</h2>
            <p>{{ result.overview }}</p>
          </div>

          <!-- 日程详情 -->
          <div class="daily-schedules">
            <div
              v-for="day in result.dailySchedule"
              :key="day.day"
              class="day-card"
              :class="{ active: selectedDay === day.day }"
              @click="selectedDay = day.day"
            >
              <div class="day-number">第 {{ day.day }} 天</div>
              <div class="day-theme">{{ day.theme }}</div>
              <div class="day-spots">
                <span v-for="(spot, index) in day.spots" :key="index" class="spot-tag">
                  {{ spot }}
                </span>
              </div>
            </div>
          </div>

          <!-- 选中日期的详情 -->
          <div v-if="selectedDay" class="day-detail">
            <div class="detail-header">
              <h3>第 {{ selectedDay }} 天 - {{ getSelectedDayData()?.theme }}</h3>
            </div>

            <div class="detail-content">
              <div class="detail-item">
                <h4>📅 日程安排</h4>
                <p>{{ getSelectedDayData()?.schedule }}</p>
              </div>

              <div class="detail-item">
                <h4>⏰ 最佳拍摄时间</h4>
                <p>{{ getSelectedDayData()?.bestTime }}</p>
              </div>

              <div class="detail-item">
                <h4>📸 拍摄技巧</h4>
                <p>{{ getSelectedDayData()?.tips }}</p>
              </div>

              <div class="detail-item">
                <h4>📍 主要景点</h4>
                <div class="spots-list">
                  <div
                    v-for="(spot, index) in getSelectedDayData()?.spots"
                    :key="index"
                    class="spot-item"
                  >
                    <span class="spot-icon">{{ index + 1 }}</span>
                    <span class="spot-name">{{ spot }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 准备清单 -->
          <div class="packing-list">
            <h3>📦 准备清单</h3>
            <ul>
              <li v-for="(item, index) in result.packingList" :key="index">
                <a-checkbox />
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- 本地建议 -->
          <div class="local-tips">
            <h3>💡 当地实用建议</h3>
            <p>{{ result.localTips }}</p>
          </div>

          <!-- 操作按钮 -->
          <div class="itinerary-actions">
            <a-button type="primary" @click="handleSaveItinerary"> 💾 保存行程 </a-button>
            <a-button @click="handleDownloadItinerary"> ⬇️ 下载详情 </a-button>
            <a-button @click="handlePrintItinerary"> 🖨️ 打印行程 </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, ItineraryPlanningRequest } from '@/api/ai';
import { useAuthStore } from '@/store/auth';

const formData = reactive({
  destination: '',
  duration: 5,
  style: '',
  interests: [],
});

const loading = ref<boolean>(false);
const result = ref<any>(null);
const selectedDay = ref<number | null>(null);
const authStore = useAuthStore();

// 生成行程
const handlePlanItinerary = async () => {
  if (!formData.destination || !formData.style) {
    message.warning('请选择目的地和拍摄风格');
    return;
  }

  loading.value = true;
  try {
    const request: ItineraryPlanningRequest = {
      destination: formData.destination,
      duration: formData.duration,
      style: formData.style,
      interests: formData.interests.length > 0 ? formData.interests : undefined,
    };

    const response = await aiApi.planItinerary(request);
    // 处理嵌套的响应结构，取最内层的 data
    result.value = response.data?.data || response.data;
    selectedDay.value = 1;
    message.success('行程规划生成成功！');

    // 如果用户已登录，自动保存到历史记录
    if (authStore.isAuthenticated && result.value) {
      try {
        await aiApi.saveHistory({
          type: 'itinerary-planning',
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

// 获取选中日期的数据
const getSelectedDayData = () => {
  if (!result.value || !selectedDay.value) return null;
  return result.value.dailySchedule.find((day: any) => day.day === selectedDay.value);
};

// 保存行程
const handleSaveItinerary = async () => {
  try {
    await aiApi.saveHistory({
      type: 'itinerary-planning',
      input: formData,
      output: result.value,
    });
    message.success('已保存到历史记录');
  } catch (error: any) {
    message.error(error.message || '保存失败');
  }
};

// 下载行程
const handleDownloadItinerary = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `行程规划-${new Date().getTime()}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
  message.success('已下载行程文件');
};

// 打印行程
const handlePrintItinerary = () => {
  window.print();
  message.success('已打开打印窗口');
};
</script>

<style scoped lang="less">
.itinerary-planning-container {
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
  gap: 20px;
}

.planning-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 600;
    color: #333;

    &::after {
      content: ' ';
    }
  }
}

.duration-display {
  text-align: center;
  font-size: 0.9rem;
  color: #999;
  margin-top: 8px;
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

.right-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow-y: auto;
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

.itinerary-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-card {
  padding: 20px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;

  h2 {
    margin: 0 0 10px 0;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    line-height: 1.6;
  }
}

.daily-schedules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.day-card {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;

  &:hover {
    border-color: #ff758c;
    background: #fff5f7;
  }

  &.active {
    border-color: #ff758c;
    background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
    color: white;

    .day-theme {
      color: white;
    }

    .day-spots .spot-tag {
      background: rgba(255, 255, 255, 0.3);
      color: white;
    }
  }

  .day-number {
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .day-theme {
    font-size: 0.85rem;
    color: #ff758c;
    margin-bottom: 6px;
  }

  .day-spots {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;

    .spot-tag {
      font-size: 0.7rem;
      background: #f0f0f0;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
    }
  }
}

.day-detail {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-header {
  margin-bottom: 12px;

  h3 {
    margin: 0;
    color: #333;
  }
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  h4 {
    margin: 0 0 6px 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.5;
  }
}

.spots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;

  .spot-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #ff758c;
    color: white;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .spot-name {
    color: #666;
  }
}

.packing-list,
.local-tips {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;

  h3 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 1rem;
  }

  ul {
    margin: 0;
    padding-left: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: #666;

      :deep(.ant-checkbox) {
        margin-right: 4px;
      }
    }
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.6;
  }
}

.itinerary-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;

  button {
    flex: 1;
    min-width: 120px;
  }
}

@media print {
  .left-panel {
    display: none;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .itinerary-actions {
    display: none;
  }
}
</style>
