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
            <!-- 智能输入辅助：快捷模板 + 关键词推荐 -->
            <div class="input-assist">
              <div class="assist-row">
                <span class="assist-label">快捷模板：</span>
                <div class="assist-chips">
                  <button
                    v-for="tpl in preferenceTemplates"
                    :key="tpl.key"
                    type="button"
                    class="assist-chip"
                    @click="applyTemplate(tpl.text)"
                  >
                    {{ tpl.label }}
                  </button>
                </div>
              </div>
              <div class="assist-row">
                <span class="assist-label">可选关键词：</span>
                <div class="assist-chips">
                  <button
                    v-for="kw in keywordSuggestions"
                    :key="kw"
                    type="button"
                    class="assist-chip keyword"
                    @click="appendKeyword(kw)"
                  >
                    {{ kw }}
                  </button>
                </div>
              </div>
            </div>
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
              class="submit-btn"
              @click="handleRecommend"
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
        <div v-if="!result && !loading" class="empty-state">
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
                  @click="openSpotDetail(spot, index)"
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

    <!-- 景点详情模态框 -->
    <a-modal
      v-model:open="spotDetailModalVisible"
      title="景点详情"
      :width="700"
      :footer="null"
      @cancel="closeSpotDetail"
    >
      <div v-if="selectedSpot" class="spot-detail">
        <div class="spot-detail-header">
          <h2>{{ selectedSpot.name }}</h2>
          <span class="spot-rank">推荐排名：第 {{ selectedSpot.index + 1 }} 名</span>
        </div>

        <div class="spot-detail-content">
          <div class="detail-item">
            <h3>📍 景点介绍</h3>
            <p>{{ selectedSpot.description || getSpotDescription(selectedSpot.name) }}</p>
          </div>

          <div class="detail-item">
            <h3>🎨 推荐理由</h3>
            <p>
              {{
                selectedSpot.reason ||
                `该景点完美契合"${result.recommendedStyles[selectedRecommendation]?.name}"风格，是拍摄${result.recommendedStyles[selectedRecommendation]?.style || '浪漫'}风格照片的理想选择。`
              }}
            </p>
          </div>

          <div class="detail-item">
            <h3>📸 拍摄建议</h3>
            <ul>
              <li v-for="(tip, tipIndex) in getSpotShootingTips(selectedSpot.name)" :key="tipIndex">
                {{ tip }}
              </li>
            </ul>
          </div>

          <div class="detail-item">
            <h3>⏰ 最佳拍摄时间</h3>
            <p>{{ getBestShootingTime(selectedSpot.name) }}</p>
          </div>

          <div class="detail-item">
            <h3>💡 实用信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">推荐季节：</span>
                <span class="info-value">{{
                  result.recommendedStyles[selectedRecommendation]?.season || '四季皆宜'
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">拍摄风格：</span>
                <span class="info-value">{{
                  result.recommendedStyles[selectedRecommendation]?.name || '—'
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <AiGeneratingWaitModal :open="loading" feature-hint="个性化推荐生成中" />
  </div>
</template>

<script setup lang="ts">
import AiGeneratingWaitModal from '@/components/ai/AiGeneratingWaitModal.vue';
import { runAiFlight, useAiFlightPending } from '@/utils/ai-generation-flight';
import { ref, reactive, onMounted, watch } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, StyleRecommendationRequest } from '@/api/ai';
import { useAuthStore } from '@/store/auth';

const formData = reactive({
  preferences: '',
  budget: undefined,
  occasions: [],
});

// 智能输入辅助：预设模板与关键词
const preferenceTemplates = [
  {
    key: 'romantic_sea',
    label: '浪漫海边',
    text: '我喜欢清新唯美、略带梦幻感的海边风格，希望有金色夕阳、柔和海风和自然互动的画面，整体色调偏米白和暖金色，氛围轻松浪漫。',
  },
  {
    key: 'art_city',
    label: '文艺城市',
    text: '我偏好有设计感和故事感的城市街拍风格，希望场景有老建筑、咖啡馆、小巷等，整体色调偏低饱和，画面有一点电影质感和文艺气息。',
  },
  {
    key: 'vintage',
    label: '复古典雅',
    text: '我喜欢复古、略带仪式感的风格，希望有古典建筑、拱门、长廊等元素，服装可以偏礼服或旗袍，整体氛围优雅、有质感。',
  },
  {
    key: 'minimal',
    label: '极简高级',
    text: '我偏好极简、干净的画面，希望背景简单、留白多，强调线条和光影，整体色调偏黑白灰或莫兰迪色，氛围冷静高级。',
  },
];

const keywordSuggestions = [
  '清新自然',
  '电影感',
  '法式浪漫',
  'ins 风',
  '复古胶片',
  '高级灰',
  '森系',
  '港风',
  '通透质感',
  '氛围感灯光',
];

const loading = useAiFlightPending('style-recommendation');
const result = ref<any>(null);
const selectedRecommendation = ref<number | null>(null);
const authStore = useAuthStore();
const spotDetailModalVisible = ref(false);
const selectedSpot = ref<{
  name: string;
  index: number;
  description?: string;
  reason?: string;
} | null>(null);

// 应用快捷模板
const applyTemplate = (text: string) => {
  formData.preferences = text;
  saveStateToStorage();
};

// 追加关键词（避免重复，自动加分隔符）
const appendKeyword = (keyword: string) => {
  if (!keyword) return;
  if (formData.preferences.includes(keyword)) {
    message.info('该关键词已在描述中');
    return;
  }
  const prefix = formData.preferences.trim() ? '；' : '';
  formData.preferences = `${formData.preferences.trim()}${prefix}${keyword}`;
  saveStateToStorage();
};

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

  await runAiFlight('style-recommendation', async () => {
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
    }
  });
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

// 打开景点详情
const openSpotDetail = (spotName: string, index: number) => {
  selectedSpot.value = {
    name: spotName,
    index,
  };
  spotDetailModalVisible.value = true;
};

// 关闭景点详情
const closeSpotDetail = () => {
  spotDetailModalVisible.value = false;
  selectedSpot.value = null;
};

// 获取景点描述（根据景点名称生成）
const getSpotDescription = (spotName: string): string => {
  const descriptions: Record<string, string> = {
    巴厘岛:
      '巴厘岛是印度尼西亚著名的旅游胜地，拥有美丽的海滩、古老的寺庙和丰富的文化。这里风景如画，是拍摄浪漫婚纱照的理想之地。',
    马尔代夫:
      '马尔代夫以其清澈的海水、白色沙滩和豪华度假村而闻名。这里是蜜月旅行的天堂，也是拍摄唯美婚纱照的绝佳选择。',
    三亚: '三亚拥有中国最美的海滩和热带风光，椰林婆娑，海天一色。这里气候宜人，是拍摄浪漫海边婚纱照的热门目的地。',
    大理: '大理古城依山傍水，苍山洱海相映成趣。这里有着浓厚的民族文化和自然风光，是拍摄文艺风格婚纱照的理想之地。',
    丽江: '丽江古城保存完好的纳西族建筑和独特的文化氛围，加上玉龙雪山的壮丽景色，是拍摄古典优雅风格婚纱照的绝佳选择。',
  };
  return (
    descriptions[spotName] ||
    `${spotName}是一个风景优美、文化底蕴深厚的旅游胜地，拥有独特的自然风光和人文景观，非常适合拍摄婚纱照。`
  );
};

// 获取景点拍摄建议
const getSpotShootingTips = (spotName: string): string[] => {
  const tips: Record<string, string[]> = {
    巴厘岛: [
      '利用日出和日落时分的柔和光线拍摄',
      '选择海边、稻田或寺庙等特色场景',
      '穿着轻盈的婚纱，展现自然随性的风格',
      '捕捉海浪、椰林等自然元素',
    ],
    马尔代夫: [
      '充分利用海天一色的背景',
      '选择水屋、沙滩等特色场景',
      '利用清澈的海水拍摄水下或倒影效果',
      '捕捉夕阳西下的浪漫时刻',
    ],
    三亚: [
      '选择椰林、海滩、礁石等多样化场景',
      '利用早晨和傍晚的黄金光线',
      '穿着飘逸的婚纱，展现海边浪漫',
      '捕捉海浪、海风等动态元素',
    ],
    大理: [
      '选择洱海边、古城内、苍山下等场景',
      '利用白族建筑和民族元素',
      '穿着简约优雅的婚纱，展现文艺气质',
      '捕捉古城韵味和自然风光',
    ],
    丽江: [
      '选择古城街道、玉龙雪山、束河古镇等场景',
      '利用纳西族建筑和民族文化元素',
      '穿着古典优雅的婚纱，展现文化底蕴',
      '捕捉古城韵味和雪山壮丽',
    ],
  };
  return (
    tips[spotName] || [
      '选择最佳光线时段进行拍摄',
      '充分利用当地特色景观和建筑',
      '穿着与场景风格匹配的婚纱',
      '捕捉自然和人文的完美结合',
    ]
  );
};

// 获取最佳拍摄时间
const getBestShootingTime = (spotName: string): string => {
  const times: Record<string, string> = {
    巴厘岛: '早晨 6:00-9:00 和傍晚 17:00-19:00（避开正午强光）',
    马尔代夫: '早晨 6:00-8:00 和傍晚 17:00-19:00（最佳光线时段）',
    三亚: '早晨 6:00-9:00 和傍晚 17:00-19:00（避免中午强光）',
    大理: '早晨 7:00-9:00 和傍晚 17:00-19:00（光线柔和）',
    丽江: '早晨 7:00-9:00 和傍晚 17:00-19:00（光线最佳）',
  };
  return times[spotName] || '早晨 7:00-9:00 和傍晚 17:00-19:00（黄金光线时段）';
};

watch(loading, (now, prev) => {
  if (prev && !now) {
    restoreStateFromStorage();
  }
});

onMounted(() => {
  restoreStateFromStorage();
});
</script>

<style scoped lang="less">
.style-recommendation-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
  padding: 0 80px 40px;

  @media (max-width: 768px) {
    padding: 0 36px 32px;
  }
}

.page-header {
  text-align: center;
  padding-top: 28px;
  margin-bottom: 28px;
  color: #334155;
  text-shadow: none;

  h1 {
    font-size: 2.1rem;
    font-weight: 700;
    margin-bottom: 10px;
  }

  p {
    font-size: 1.05rem;
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

// 输入辅助样式
.input-assist {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .assist-row {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    flex-wrap: wrap;
  }

  .assist-label {
    font-size: 12px;
    color: #999;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .assist-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .assist-chip {
    border: none;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 12px;
    cursor: pointer;
    background: #f5f5f5;
    color: #666;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      background: #ffebef;
      color: #ff4d8a;
      transform: translateY(-1px);
    }

    &.keyword {
      background: #fafafa;
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

// 景点详情模态框样式
.spot-detail {
  padding: 0;
}

.spot-detail-header {
  margin-bottom: 30px;
  padding: 24px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: pulse 3s ease-in-out infinite;
  }

  h2 {
    margin: 0 0 12px 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
  }

  .spot-rank {
    display: inline-block;
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10px);
    color: white;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.3);
    position: relative;
    z-index: 1;
  }
}

.spot-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-item {
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border-left: 4px solid #ff758c;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(255, 117, 140, 0.15);
  }

  h3 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  p {
    color: #555;
    line-height: 1.8;
    margin: 0;
    font-size: 0.95rem;
  }

  ul {
    margin: 0;
    padding-left: 0;
    list-style: none;
    color: #555;
    line-height: 1.8;

    li {
      margin-bottom: 10px;
      padding-left: 24px;
      position: relative;
      font-size: 0.95rem;

      &::before {
        content: '✨';
        position: absolute;
        left: 0;
        top: 0;
      }
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  .info-item {
    padding: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e8e8e8;
    transition: all 0.3s;

    &:hover {
      border-color: #ff758c;
      box-shadow: 0 2px 8px rgba(255, 117, 140, 0.1);
      transform: translateY(-2px);
    }

    .info-label {
      font-weight: 600;
      color: #999;
      font-size: 0.85rem;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      color: #333;
      font-size: 1rem;
      font-weight: 500;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
