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
            <a-auto-complete
              v-model:value="formData.destination"
              :options="filteredDestinationOptions"
              placeholder="选择或输入目的地"
              allow-clear
              :filter-option="false"
              style="width: 100%"
              @search="handleDestinationSearch"
              @select="handleDestinationSelect"
            >
              <template #option="{ label }">
                <div class="destination-option">
                  <span>{{ label }}</span>
                </div>
              </template>
            </a-auto-complete>
            <div
              v-if="formData.destination && !isPresetDestination(formData.destination)"
              class="custom-destination-tip"
            >
              ✏️ 您输入的是自定义目的地：{{ formData.destination }}
            </div>
          </a-form-item>

          <!-- 天数 -->
          <a-form-item label="旅程天数" required>
            <a-slider
              v-model:value="formData.duration"
              :min="1"
              :max="14"
              :tip-formatter="(value: number) => `${value} 天`"
              @change="saveStateToStorage"
            />
            <div class="duration-display">计划 {{ formData.duration }} 天的旅程</div>
          </a-form-item>

          <!-- 拍摄风格 -->
          <a-form-item label="拍摄风格" required>
            <a-select
              v-model:value="formData.style"
              placeholder="选择拍摄风格"
              allow-clear
              :loading="stylesLoading"
              @change="saveStateToStorage"
            >
              <a-select-option
                v-for="opt in styleSelectOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <!-- 兴趣爱好 -->
          <a-form-item label="兴趣爱好（可多选）">
            <a-checkbox-group v-model:value="formData.interests" @change="saveStateToStorage">
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
              class="submit-btn"
              @click="handlePlanItinerary"
            >
              {{ loading ? '正在生成行程...' : '🎬 生成详细行程' }}
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 右侧：行程展示（生成中勿渲染 result，否则 result 为空会报错，弹窗也无法正常打开） -->
      <div class="right-panel">
        <div v-if="loading" class="right-panel-generating-placeholder" aria-hidden="true" />

        <div v-else-if="!result" class="empty-state">
          <span class="empty-icon">🗺️</span>
          <p>完成左侧配置后，点击按钮生成最优行程</p>
        </div>

        <div v-else class="itinerary-detail">
          <!-- 行程标题：地点 + 天数 -->
          <div class="overview-card">
            <h2>{{ result.destination }} - {{ result.duration }} 天行程</h2>
          </div>

          <!-- 日程详情：3 天及以上时固定三列，保证一排三张 -->
          <div
            class="daily-schedules"
            :class="{ 'daily-schedules--three-col': dayScheduleCount >= 3 }"
          >
            <div
              v-for="day in result.dailySchedule"
              :key="day.day"
              class="day-card"
              :class="{ active: selectedDay === day.day }"
              @click="
                () => {
                  selectedDay = day.day;
                  saveStateToStorage();
                }
              "
            >
              <div class="day-number">第 {{ day.day }} 天</div>
              <div class="day-theme">{{ day.theme }}</div>
            </div>
          </div>

          <!-- 选中日期的详情 -->
          <div v-if="selectedDay" class="day-detail">
            <div class="detail-header">
              <h3>第 {{ selectedDay }} 天 - {{ selectedDayData?.theme }}</h3>
            </div>

            <div class="detail-content">
              <div class="detail-item">
                <h4>📅 日程安排</h4>
                <template v-if="scheduleSegments.length > 0">
                  <p v-for="seg in scheduleSegments" :key="seg.label" class="schedule-segment">
                    <span class="schedule-segment-label">{{ seg.label }}：</span>
                    <span>{{ seg.content }}</span>
                  </p>
                </template>
                <p v-else>{{ selectedDayData?.schedule }}</p>
              </div>

              <div class="detail-item">
                <h4>📍 主要景点</h4>
                <div class="spots-list">
                  <div
                    v-for="(spot, index) in selectedDayData?.spots || []"
                    :key="index"
                    class="spot-item"
                  >
                    <span class="spot-icon">{{ index + 1 }}</span>
                    <span class="spot-name">{{ spot }}</span>
                  </div>
                </div>
              </div>

              <!-- 底部：拍摄时间/技巧 + 准备清单 + 拍摄实用建议（同一区域） -->
              <div
                v-if="hasShootingTimeOrTips || hasPackingList || hasLocalTips"
                class="day-detail-bottom-card"
              >
                <div v-if="hasShootingTimeOrTips" class="itinerary-extras-block">
                  <div class="itinerary-extras-bar">
                    <span class="extras-label">📷 拍摄说明</span>
                    <a-button
                      type="default"
                      class="extras-toggle-btn"
                      @click="shootingTimeTipsOpen = !shootingTimeTipsOpen"
                    >
                      {{ shootingTimeTipsOpen ? '收起详情' : '查看详情' }}
                    </a-button>
                  </div>
                  <div v-show="shootingTimeTipsOpen" class="itinerary-extras-body">
                    <div v-if="shootingBestTimeText" class="shooting-subsection">
                      <h5>⏰ 最佳拍摄时间</h5>
                      <p>{{ shootingBestTimeText }}</p>
                    </div>
                    <div v-if="shootingTipsText" class="shooting-subsection">
                      <h5>📸 拍摄技巧</h5>
                      <p>{{ shootingTipsText }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="hasPackingList" class="itinerary-extras-block">
                  <div class="itinerary-extras-bar">
                    <span class="extras-label">📦 准备清单</span>
                    <a-button
                      type="default"
                      class="extras-toggle-btn"
                      @click="packingDetailOpen = !packingDetailOpen"
                    >
                      {{ packingDetailOpen ? '收起详情' : '查看详情' }}
                    </a-button>
                  </div>
                  <div v-show="packingDetailOpen" class="itinerary-extras-body">
                    <ul>
                      <li v-for="(item, index) in result.packingList" :key="index">
                        <a-checkbox />
                        {{ item }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-if="hasLocalTips" class="itinerary-extras-block">
                  <div class="itinerary-extras-bar">
                    <span class="extras-label">💡 拍摄实用建议</span>
                    <a-button
                      type="default"
                      class="extras-toggle-btn"
                      @click="localTipsDetailOpen = !localTipsDetailOpen"
                    >
                      {{ localTipsDetailOpen ? '收起详情' : '查看详情' }}
                    </a-button>
                  </div>
                  <div v-show="localTipsDetailOpen" class="itinerary-extras-body">
                    <template v-if="localTipsParagraphs.length > 0">
                      <p
                        v-for="(tip, idx) in localTipsParagraphs"
                        :key="`local-tip-${idx}`"
                        class="local-tip-paragraph"
                      >
                        {{ tip }}
                      </p>
                    </template>
                    <p v-else>{{ result.localTips }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="itinerary-actions">
            <a-button type="primary" @click="handleDownloadItinerary"> ⬇️ 下载详情 </a-button>
            <a-button @click="handlePrintItinerary"> 🖨️ 打印行程 </a-button>
            <a-button @click="handleReset"> 🔄 重新生成 </a-button>
          </div>
        </div>
      </div>
    </div>

    <AiGeneratingWaitModal :open="loading" feature-hint="行程规划生成中" />
  </div>
</template>

<script setup lang="ts">
import AiGeneratingWaitModal from '@/components/ai/AiGeneratingWaitModal.vue';
import { aiApi, ItineraryPlanningRequest } from '@/api/ai';
import { runAiFlight, useAiFlightPending } from '@/utils/ai-generation-flight';
import {
  TRAVEL_STYLE_CARD_DESCRIPTIONS,
  TRAVEL_STYLE_LABELS,
} from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

type ItineraryStyleRow = { id: string; name: string; description?: string; icon?: string };

const formData = reactive({
  destination: '',
  duration: 5,
  style: '',
  interests: [],
});

const loading = useAiFlightPending('itinerary-planning');
const stylesLoading = ref(false);
const availableStyles = ref<ItineraryStyleRow[]>([]);
const result = ref<any>(null);
const selectedDay = ref<number | null>(null);
/** 准备清单、当地建议各自是否展开正文 */
const packingDetailOpen = ref(false);
const localTipsDetailOpen = ref(false);

const hasPackingList = computed(() => {
  const r = result.value;
  return Boolean(r && Array.isArray(r.packingList) && r.packingList.length > 0);
});

const hasLocalTips = computed(() => {
  const r = result.value;
  return Boolean(r && typeof r.localTips === 'string' && r.localTips.trim().length > 0);
});

/** 词连接符：阻止「时:分」在冒号处被浏览器拆到两行 */
const WORD_JOINER = '\u2060';

/** 将 H:MM / HH:MM 中冒号与分钟粘在一起，避免 9: 与 00 分行显示 */
const glueClockTimes = (s: string) => s.replace(/(\d{1,2})[:：](\d{2})/g, `$1:${WORD_JOINER}$2`);

const localTipsParagraphs = computed(() => {
  const raw = result.value?.localTips;
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return [] as string[];

  // 兼容常见编号：1.  1、  （1） (1)
  const normalized = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const pattern =
    /((?:\d+[.\u3001]|[（(]\d+[）)]))\s*([\s\S]*?)(?=(?:\d+[.\u3001]|[（(]\d+[）)])|$)/g;
  const matches = [...normalized.matchAll(pattern)];
  if (!matches.length) return [];

  return matches
    .map((m) => `${String(m[1] || '').trim()} ${String(m[2] || '').trim()}`.trim())
    .map((line) =>
      glueClockTimes(
        line
          // 防止 9:\n00 或 9: 00 被浏览器断行为两行
          .replace(/(\d{1,2})[:：]\s+(\d{2})/g, '$1:$2')
          // 清理时间段连接符两侧多余空格，如 17:00 - 19:00
          .replace(/(\d{1,2}:\d{2})\s*[-~～]\s*(\d{1,2}:\d{2})/g, '$1-$2')
      )
    )
    .filter(Boolean);
});

const dayScheduleCount = computed(() =>
  Array.isArray(result.value?.dailySchedule) ? result.value.dailySchedule.length : 0
);

const selectedDayData = computed(() => {
  if (!result.value || !selectedDay.value) return null;
  const list = result.value.dailySchedule;
  if (!Array.isArray(list)) return null;
  return list.find((day: any) => day.day === selectedDay.value) ?? null;
});

const scheduleSegments = computed(() => {
  const raw = selectedDayData.value?.schedule;
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return [] as Array<{ label: '上午' | '下午' | '傍晚'; content: string }>;

  const normalized = text.replace(/\s+/g, ' ');
  const pattern = /(上午|下午|傍晚)[：:]\s*([\s\S]*?)(?=(上午|下午|傍晚)[：:]|$)/g;
  const matches = [...normalized.matchAll(pattern)];
  if (!matches.length) return [];

  return matches
    .map((m) => ({
      label: m[1] as '上午' | '下午' | '傍晚',
      content: String(m[2] || '').trim(),
    }))
    .filter((x) => x.content.length > 0);
});

const shootingBestTimeText = computed(() => {
  const t = selectedDayData.value?.bestTime;
  return typeof t === 'string' ? t.trim() : '';
});

const shootingTipsText = computed(() => {
  const t = selectedDayData.value?.tips;
  return typeof t === 'string' ? t.trim() : '';
});

const hasShootingTimeOrTips = computed(() =>
  Boolean(shootingBestTimeText.value || shootingTipsText.value)
);

/** 当日「拍摄说明」折叠区是否展开 */
const shootingTimeTipsOpen = ref(false);

watch(selectedDay, () => {
  shootingTimeTipsOpen.value = false;
});

const authStore = useAuthStore();
const searchKeyword = ref<string>('');

/** 与 VirtualTryOn 一致：来自 /ai/styles，展示名与图标与虚拍试衣同步 */
const styleSelectOptions = computed(() =>
  availableStyles.value.map((s) => ({
    value: s.id,
    label: `${s.icon ? `${s.icon} ` : ''}${s.name}`.trim(),
  }))
);

const defaultStylesFallback = (): ItineraryStyleRow[] => [
  {
    id: 'minimalist',
    name: TRAVEL_STYLE_LABELS.minimalist,
    description: TRAVEL_STYLE_CARD_DESCRIPTIONS.minimalist,
    icon: '⬜',
  },
  {
    id: 'classical',
    name: TRAVEL_STYLE_LABELS.classical,
    description: TRAVEL_STYLE_CARD_DESCRIPTIONS.classical,
    icon: '👑',
  },
  {
    id: 'bohemian',
    name: TRAVEL_STYLE_LABELS.bohemian,
    description: TRAVEL_STYLE_CARD_DESCRIPTIONS.bohemian,
    icon: '🌻',
  },
  {
    id: 'romantic',
    name: TRAVEL_STYLE_LABELS.romantic,
    description: TRAVEL_STYLE_CARD_DESCRIPTIONS.romantic,
    icon: '✨',
  },
  {
    id: 'adventure',
    name: TRAVEL_STYLE_LABELS.adventure,
    description: TRAVEL_STYLE_CARD_DESCRIPTIONS.adventure,
    icon: '⛰️',
  },
  {
    id: 'artistic',
    name: TRAVEL_STYLE_LABELS.artistic,
    description: TRAVEL_STYLE_CARD_DESCRIPTIONS.artistic,
    icon: '🎨',
  },
];

const syncStyleFieldWithAvailable = () => {
  const ids = new Set(availableStyles.value.map((s) => s.id));
  if (formData.style && !ids.has(formData.style)) {
    formData.style = '';
    saveStateToStorage();
  }
};

const loadAvailableStyles = async () => {
  stylesLoading.value = true;
  try {
    const response: { data?: { styles?: unknown } } | { styles?: unknown } =
      (await aiApi.getStyles()) as { data?: { styles?: unknown } };
    const stylesData = (response as { data?: { styles?: unknown } })?.data ?? response;
    const list = (stylesData as { styles?: unknown })?.styles;
    const raw = Array.isArray(list) ? list : [];
    availableStyles.value = raw
      .map((s: unknown) => {
        const row = s as { id?: string; name?: string; description?: string; icon?: string };
        const id = String(row?.id || '').trim();
        if (!id) return null;
        return {
          id,
          name: String(row?.name || TRAVEL_STYLE_LABELS[id] || id),
          description: row?.description,
          icon: row?.icon,
        } as ItineraryStyleRow;
      })
      .filter((x): x is ItineraryStyleRow => x != null);
    if (!availableStyles.value.length) {
      throw new Error('风格列表为空');
    }
  } catch {
    console.error('[ItineraryPlanning] 获取风格列表失败，使用与虚拍试衣相同的默认列表');
    message.error('获取风格列表失败，已使用默认风格');
    availableStyles.value = defaultStylesFallback();
  } finally {
    stylesLoading.value = false;
  }
  syncStyleFieldWithAvailable();
};

// 状态持久化的 key
const STORAGE_KEY = 'itinerary-planning-state';

// 保存状态到 sessionStorage
const saveStateToStorage = () => {
  try {
    const state = {
      destination: formData.destination,
      duration: formData.duration,
      style: formData.style,
      interests: [...formData.interests],
      result: result.value,
      selectedDay: selectedDay.value,
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
      formData.destination = state.destination || '';
      {
        const d = Number(state.duration);
        formData.duration = Number.isFinite(d) ? Math.min(14, Math.max(1, Math.round(d))) : 5;
      }
      formData.style = state.style || '';
      formData.interests = state.interests || [];
      result.value = state.result || null;
      selectedDay.value = state.selectedDay ?? null;
      packingDetailOpen.value = false;
      localTipsDetailOpen.value = false;
      shootingTimeTipsOpen.value = false;
      console.log('已恢复行程规划页面状态');
    }
  } catch (error) {
    console.error('恢复状态失败:', error);
  }
};

// 清空状态和存储
const clearStateAndStorage = () => {
  formData.destination = '';
  formData.duration = 5;
  formData.style = '';
  formData.interests = [];
  result.value = null;
  selectedDay.value = null;
  sessionStorage.removeItem(STORAGE_KEY);
  message.info('已清空，可以重新开始生成');
};

// 预设的目的地列表（每个省份/地区只展示3个热门目的地）
const presetDestinations = [
  // 直辖市
  { value: '北京', label: '🏰 北京' },
  { value: '上海', label: '🌃 上海' },
  { value: '天津', label: '🌉 天津' },
  { value: '重庆', label: '🌉 重庆' },

  // 广东省（热门3个）
  { value: '广州', label: '🏙️ 广州' },
  { value: '深圳', label: '🌆 深圳' },
  { value: '珠海', label: '🌊 珠海' },

  // 浙江省（热门3个）
  { value: '杭州', label: '🌸 杭州' },
  { value: '宁波', label: '🌊 宁波' },
  { value: '温州', label: '🌊 温州' },

  // 江苏省（热门3个）
  { value: '南京', label: '🏯 南京' },
  { value: '苏州', label: '🏛️ 苏州' },
  { value: '无锡', label: '🌊 无锡' },

  // 四川省（热门3个）
  { value: '成都', label: '🐼 成都' },
  { value: '乐山', label: '🏔️ 乐山' },
  { value: '阿坝', label: '🏔️ 阿坝' },

  // 云南省（热门3个）
  { value: '昆明', label: '🌸 昆明' },
  { value: '大理', label: '🌄 大理' },
  { value: '丽江', label: '🏔️ 丽江' },

  // 山东省（热门3个）
  { value: '济南', label: '💧 济南' },
  { value: '青岛', label: '🏖️ 青岛' },
  { value: '烟台', label: '🌊 烟台' },

  // 福建省（热门3个）
  { value: '福州', label: '🌊 福州' },
  { value: '厦门', label: '🌊 厦门' },
  { value: '泉州', label: '🏛️ 泉州' },

  // 湖南省（热门3个）
  { value: '长沙', label: '🌶️ 长沙' },
  { value: '张家界', label: '🏔️ 张家界' },
  { value: '岳阳', label: '🌊 岳阳' },

  // 湖北省（热门3个）
  { value: '武汉', label: '🌸 武汉' },
  { value: '宜昌', label: '🌊 宜昌' },
  { value: '恩施', label: '🏔️ 恩施' },

  // 河南省（热门3个）
  { value: '郑州', label: '🏛️ 郑州' },
  { value: '洛阳', label: '🏛️ 洛阳' },
  { value: '开封', label: '🏛️ 开封' },

  // 安徽省（热门3个）
  { value: '合肥', label: '🌊 合肥' },
  { value: '黄山', label: '🏔️ 黄山' },
  { value: '芜湖', label: '🌊 芜湖' },

  // 江西省（热门3个）
  { value: '南昌', label: '🌊 南昌' },
  { value: '景德镇', label: '🏺 景德镇' },
  { value: '婺源', label: '🌾 婺源' },

  // 河北省（热门3个）
  { value: '石家庄', label: '🏛️ 石家庄' },
  { value: '秦皇岛', label: '🌊 秦皇岛' },
  { value: '承德', label: '🏔️ 承德' },

  // 山西省（热门3个）
  { value: '太原', label: '🏛️ 太原' },
  { value: '大同', label: '🏛️ 大同' },
  { value: '平遥', label: '🏛️ 平遥' },

  // 辽宁省（热门3个）
  { value: '沈阳', label: '🏛️ 沈阳' },
  { value: '大连', label: '🌊 大连' },
  { value: '丹东', label: '🌊 丹东' },

  // 吉林省（热门3个）
  { value: '长春', label: '🏛️ 长春' },
  { value: '吉林', label: '🏔️ 吉林' },
  { value: '延边', label: '🏔️ 延边' },

  // 黑龙江省（热门3个）
  { value: '哈尔滨', label: '❄️ 哈尔滨' },
  { value: '牡丹江', label: '🌺 牡丹江' },
  { value: '大兴安岭', label: '🌲 大兴安岭' },

  // 陕西省（热门3个）
  { value: '西安', label: '🏛️ 西安' },
  { value: '延安', label: '🏛️ 延安' },
  { value: '汉中', label: '🏔️ 汉中' },

  // 甘肃省（热门3个）
  { value: '兰州', label: '🌊 兰州' },
  { value: '敦煌', label: '🏜️ 敦煌' },
  { value: '张掖', label: '🏔️ 张掖' },

  // 青海省（热门3个）
  { value: '西宁', label: '🏔️ 西宁' },
  { value: '青海湖', label: '💧 青海湖' },
  { value: '茶卡盐湖', label: '💎 茶卡盐湖' },

  // 新疆（热门3个）
  { value: '乌鲁木齐', label: '🏔️ 乌鲁木齐' },
  { value: '喀什', label: '🏛️ 喀什' },
  { value: '伊犁', label: '🌾 伊犁' },

  // 西藏（热门3个）
  { value: '拉萨', label: '🏔️ 拉萨' },
  { value: '林芝', label: '🏔️ 林芝' },
  { value: '日喀则', label: '🏔️ 日喀则' },

  // 内蒙古（热门3个）
  { value: '呼和浩特', label: '🌾 呼和浩特' },
  { value: '呼伦贝尔', label: '🌲 呼伦贝尔' },
  { value: '鄂尔多斯', label: '🏛️ 鄂尔多斯' },

  // 广西（热门3个）
  { value: '南宁', label: '🌺 南宁' },
  { value: '桂林', label: '🏔️ 桂林' },
  { value: '北海', label: '🌊 北海' },

  // 海南省（热门3个）
  { value: '海口', label: '🌴 海口' },
  { value: '三亚', label: '⛱️ 三亚' },
  { value: '万宁', label: '🌊 万宁' },

  // 贵州省（热门3个）
  { value: '贵阳', label: '🏔️ 贵阳' },
  { value: '遵义', label: '🏛️ 遵义' },
  { value: '黔东南', label: '🏔️ 黔东南' },

  // 宁夏（热门3个）
  { value: '银川', label: '🌾 银川' },
  { value: '中卫', label: '🏛️ 中卫' },
  { value: '固原', label: '🏔️ 固原' },

  // 特别行政区
  { value: '香港', label: '🌉 香港' },
  { value: '澳门', label: '🎰 澳门' },
  { value: '台北', label: '🏙️ 台北' },

  // 国外热门目的地（精选）
  { value: '巴厘岛', label: '🏖️ 巴厘岛' },
  { value: '马尔代夫', label: '🏝️ 马尔代夫' },
  { value: '普吉岛', label: '🌴 普吉岛' },
  { value: '日本', label: '🌸 日本' },
  { value: '韩国', label: '🏯 韩国' },
  { value: '泰国', label: '🐘 泰国' },
  { value: '新加坡', label: '🌴 新加坡' },
  { value: '法国', label: '🗼 法国' },
  { value: '意大利', label: '🏛️ 意大利' },
  { value: '希腊', label: '🏛️ 希腊' },
  { value: '土耳其', label: '🕌 土耳其' },
  { value: '冰岛', label: '❄️ 冰岛' },
  { value: '瑞士', label: '🏔️ 瑞士' },
  { value: '美国', label: '🗽 美国' },
  { value: '澳大利亚', label: '🦘 澳大利亚' },
];

// 动态目的地选项（包含预设和用户输入）
const filteredDestinationOptions = ref(presetDestinations);

// 检查是否是预设目的地
const isPresetDestination = (value: string) => {
  return presetDestinations.some((item) => item.value === value);
};

// 处理目的地搜索
const handleDestinationSearch = (value: string) => {
  searchKeyword.value = value;
  if (!value) {
    filteredDestinationOptions.value = presetDestinations;
    return;
  }

  // 过滤预设目的地
  const filtered = presetDestinations.filter(
    (item) =>
      item.value.toLowerCase().includes(value.toLowerCase()) ||
      item.label.toLowerCase().includes(value.toLowerCase())
  );

  // 如果用户输入的内容不在预设列表中，添加自定义选项
  const exactMatch = presetDestinations.find(
    (item) => item.value.toLowerCase() === value.toLowerCase()
  );

  if (!exactMatch && value.trim()) {
    filteredDestinationOptions.value = [
      ...filtered,
      { value: value.trim(), label: `✏️ ${value.trim()}（自定义）` },
    ];
  } else {
    filteredDestinationOptions.value = filtered;
  }
};

// 处理目的地选择
const handleDestinationSelect = (value: string) => {
  formData.destination = value;
  searchKeyword.value = '';
  saveStateToStorage();
};

// 生成行程
const handlePlanItinerary = async () => {
  const destination = formData.destination.trim();
  if (!destination || !formData.style) {
    message.warning('请输入目的地并选择拍摄风格');
    return;
  }

  await runAiFlight('itinerary-planning', async () => {
    try {
      const request: ItineraryPlanningRequest = {
        destination,
        duration: formData.duration,
        style: formData.style,
        interests: formData.interests.length > 0 ? formData.interests : undefined,
      };

      const response = await aiApi.planItinerary(request);
      // 处理嵌套的响应结构，取最内层的 data
      result.value = response.data?.data || response.data;
      selectedDay.value = 1;
      packingDetailOpen.value = false;
      localTipsDetailOpen.value = false;
      shootingTimeTipsOpen.value = false;
      message.success('行程规划生成成功！');

      // 保存状态到 sessionStorage
      saveStateToStorage();

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
    }
  });
};

// 下载行程
const handleDownloadItinerary = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new window.Blob([content], { type: 'application/json' });
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

// 重新生成（清空）
const handleReset = () => {
  clearStateAndStorage();
};

watch(loading, (now, prev) => {
  if (prev && !now) {
    restoreStateFromStorage();
  }
});

onMounted(async () => {
  authStore.initializeAuth();
  restoreStateFromStorage();
  await loadAvailableStyles();
});
</script>

<style scoped lang="less">
.itinerary-planning-container {
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
    margin: 0;
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

  :deep(.ant-select) {
    .ant-select-selector {
      min-height: 40px;
    }
  }
}

.destination-option {
  padding: 4px 0;
}

.custom-destination-tip {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  color: #d46b08;
  font-size: 0.85rem;
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

.right-panel-generating-placeholder {
  min-height: 400px;
  flex: 1;
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
  padding: 0;
  text-align: center;
  margin-top: -4px;

  h2 {
    margin: 0;
    font-size: 1.6rem;
    color: #111;
  }
}

.daily-schedules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;

  &--three-col {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
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
  }

  .day-number {
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .day-theme {
    font-size: 0.85rem;
    color: #ff758c;
  }
}

.day-detail {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.day-detail-bottom-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
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

  .schedule-segment {
    &:not(:first-of-type) {
      margin-top: 8px;
    }
  }

  .schedule-segment-label {
    color: #334155;
    font-weight: 600;
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

.itinerary-extras-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.itinerary-extras-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.extras-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111;
}

.extras-toggle-btn {
  flex-shrink: 0;
  min-width: 100px;
  border-color: #ff758c;
  color: #ff758c;

  &:hover {
    color: #fff !important;
    border-color: #ff758c !important;
    background: #ff758c !important;
  }
}

.itinerary-extras-body {
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;

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

  .local-tip-paragraph {
    word-break: keep-all;
    overflow-wrap: break-word;

    &:not(:first-of-type) {
      margin-top: 10px;
    }
  }
}

.shooting-subsection {
  &:not(:first-child) {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e5e7eb;
  }

  h5 {
    margin: 0 0 6px 0;
    font-size: 0.9rem;
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

  .itinerary-extras-bar {
    display: none;
  }

  .day-detail .itinerary-extras-body {
    display: block !important;
  }
}
</style>
