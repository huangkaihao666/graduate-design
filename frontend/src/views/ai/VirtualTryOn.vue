<template>
  <div class="virtual-try-on-container">
    <div class="page-shell">
      <!-- 页面导语（与行程规划页面同款样式） -->
      <div class="page-header">
        <h1>👰‍♀️ AI 虚拍试衣</h1>
        <p>上传一张样貌片，选择风格与偏好，AI 为你生成更贴近真实旅拍效果的虚拍建议</p>
      </div>

      <div class="step-progress card-base">
        <div class="step-item" :class="{ active: currentStep >= 1 }">
          <span class="step-index">1</span>
          <span>选择出镜方式</span>
        </div>
        <span class="step-line" :class="{ active: currentStep >= 2 }"></span>
        <div class="step-item" :class="{ active: currentStep >= 2 }">
          <span class="step-index">2</span>
          <span>上传照片</span>
        </div>
        <span class="step-line" :class="{ active: currentStep >= 3 }"></span>
        <div class="step-item" :class="{ active: currentStep >= 3 }">
          <span class="step-index">3</span>
          <span>选择风格</span>
        </div>
        <span class="step-line" :class="{ active: currentStep >= 4 }"></span>
        <div class="step-item" :class="{ active: currentStep >= 4 }">
          <span class="step-index">4</span>
          <span>个性化偏好</span>
        </div>
      </div>

      <div class="builder card-base">
        <div class="builder-row">
          <section class="subject-section">
            <h3>选择出镜方式</h3>
            <div class="subject-grid">
              <div
                v-for="s in subjectOptions"
                :key="s.value"
                class="subject-card"
                :class="{ active: subjectRole === s.value }"
                @click="
                  () => {
                    subjectRole = s.value;
                    saveStateToStorage();
                  }
                "
              >
                <div class="subject-short">{{ s.short }}</div>
                <div class="subject-label">{{ s.label }}</div>
                <div class="subject-desc">{{ s.desc }}</div>
              </div>
            </div>
          </section>

          <section class="upload-section">
            <h3>样貌片</h3>
            <div
              class="upload-area"
              :class="{ active: dragActive }"
              @click="() => fileInput?.click()"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="handleDrop"
            >
              <div v-if="!uploadedImage" class="upload-placeholder">
                <span class="upload-icon">📷</span>
                <p>拖拽照片到此或点击选择</p>
                <small>支持 JPG/PNG，最大 10MB</small>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png"
                  style="display: none"
                  @change="handleFileUpload"
                />
              </div>
              <div v-else class="image-preview">
                <a-image
                  :src="uploadedImage"
                  :alt="uploadedFileName"
                  :preview="true"
                  class="upload-preview-image"
                  :fallback="uploadedImage"
                />
                <button type="button" class="remove-btn" @click="clearImage">重新选择</button>
              </div>
            </div>
          </section>
        </div>

        <div class="builder-row styles-row">
          <section class="style-section">
            <h3>选择风格</h3>
            <div class="style-grid">
              <div
                v-for="style in styleDisplayList"
                :key="style.id"
                class="style-card"
                :class="{ active: selectedStyle === style.id }"
                :title="style.id === 'minimalist' ? minimalistDetailForRole : undefined"
                @click="
                  () => {
                    selectedStyle = style.id;
                    saveStateToStorage();
                  }
                "
              >
                <img :src="style.preview" :alt="style.name" />
                <div class="style-name">{{ style.name }}</div>
              </div>
            </div>
          </section>

          <section class="preferences-section">
            <h3>个性化偏好</h3>
            <a-form layout="vertical">
              <a-form-item label="妆容">
                <a-select
                  v-model:value="preferences.makeup"
                  placeholder="妆容"
                  allow-clear
                  @change="saveStateToStorage"
                >
                  <a-select-option v-for="opt in makeupOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="发型">
                <a-select
                  v-model:value="preferences.hairstyle"
                  placeholder="发型"
                  allow-clear
                  @change="saveStateToStorage"
                >
                  <a-select-option
                    v-for="opt in hairstyleOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="服装风格">
                <a-select
                  v-model:value="preferences.dress"
                  placeholder="服装风格"
                  allow-clear
                  @change="saveStateToStorage"
                >
                  <a-select-option v-for="opt in dressOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="配饰">
                <a-select
                  v-model:value="preferences.accessory"
                  placeholder="配饰"
                  allow-clear
                  @change="saveStateToStorage"
                >
                  <a-select-option v-for="opt in accessoryOptions" :key="opt" :value="opt">
                    {{ opt }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </section>
        </div>

        <a-button
          type="primary"
          size="large"
          block
          :loading="generating"
          :disabled="!uploadedImage || !selectedStyle"
          class="generate-btn"
          @click="handleGenerate"
        >
          {{ generating ? '正在生成虚拍建议...' : '✨ 生成虚拍建议' }}
        </a-button>
      </div>

      <div class="right-panel">
        <div v-if="generating" class="loading-state">
          <div class="spinner"></div>
          <p>正在生成虚拍建议...</p>
          <small>这可能需要 30-60 秒，请耐心等待 ✨</small>
        </div>

        <div v-else-if="!result" class="empty-state">
          <span class="empty-icon">✨</span>
          <p>完成左侧配置后，点击按钮生成虚拍建议</p>
        </div>

        <div v-else class="result-container">
          <!-- 结果概览 -->
          <div class="result-summary">
            <h2>{{ result.style }} - 虚拍效果</h2>
            <div v-if="result.subjectRole" class="result-subject">
              出镜方式：{{
                VTO_SUBJECT_LABELS[result.subjectRole as VirtualTryOnSubjectRole] ||
                result.subjectRole
              }}
            </div>
            <div class="result-time">生成时间：{{ formatTime(result.timestamp) }}</div>
          </div>

          <!-- 修改后的图片展示 -->
          <div class="image-comparison">
            <div class="comparison-item">
              <div class="label">原始照片</div>
              <a-image
                v-if="uploadedImage"
                :src="uploadedImage"
                :alt="uploadedFileName"
                :preview="true"
                class="comparison-image"
                :fallback="uploadedImage"
              />
            </div>
            <div class="arrow">→</div>
            <div class="comparison-item">
              <div class="label">{{ result.style }} 风格效果</div>
              <div class="image-wrapper">
                <a-image
                  v-if="getResultImageUrl()"
                  :src="getResultImageUrl()!"
                  alt="修改后的图片"
                  :preview="true"
                  class="comparison-image modified-preview"
                  @error="handleResultImageError"
                />
                <div v-else class="no-image-placeholder">
                  <span class="placeholder-text">暂无生成效果</span>
                </div>
                <div class="no-image-placeholder" style="display: none">
                  <span class="placeholder-text">图片已过期</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 详细建议 -->
          <a-collapse class="advice-collapse">
            <!-- 妆容建议 -->
            <template #items>
              <a-collapse-panel key="makeup" header="💄 妆容建议">
                <p>{{ result.makeupAdvice }}</p>
              </a-collapse-panel>

              <!-- 发型建议 -->
              <a-collapse-panel key="hairstyle" header="💇 发型建议">
                <p>{{ result.hairstyleAdvice }}</p>
              </a-collapse-panel>

              <!-- 服装建议 -->
              <a-collapse-panel key="dress" header="👗 服装建议">
                <p>{{ result.dressAdvice }}</p>
              </a-collapse-panel>

              <!-- 拍摄技巧 -->
              <a-collapse-panel key="tips" header="📸 拍摄技巧">
                <ul class="tips-list">
                  <li v-for="(tip, index) in result.shootingTips" :key="index">
                    {{ tip }}
                  </li>
                </ul>
              </a-collapse-panel>

              <!-- 预览描述 -->
              <a-collapse-panel key="preview" header="🎬 预览效果">
                <p>{{ result.previewDescription }}</p>
              </a-collapse-panel>
            </template>
          </a-collapse>

          <!-- 操作按钮 -->
          <div class="result-actions">
            <p v-if="authStore.isAuthenticated" class="auto-save-hint">
              已自动保存到「AI 生成历史」
            </p>
            <p v-else class="auto-save-hint guest">登录后将自动保存生成记录到「AI 生成历史」</p>
            <a-button @click="handleReset">🔄 重新生成</a-button>
            <a-button type="text" danger @click="handleDownload"> ⬇️ 下载建议 </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { aiApi, VirtualTryOnRequest } from '@/api/ai';
import hero1 from '@/assets/images/hero/hero1.jpg';
import hero2 from '@/assets/images/hero/hero2.jpg';
import hero3 from '@/assets/images/hero/hero3.jpg';
import hero4 from '@/assets/images/hero/hero4.jpg';
import hero5 from '@/assets/images/hero/hero5.jpg';
import hero6 from '@/assets/images/hero/hero6.jpg';
import {
  TRAVEL_STYLE_CARD_DESCRIPTIONS,
  TRAVEL_STYLE_DETAIL_MINIMALIST_COUPLE,
  TRAVEL_STYLE_DETAIL_MINIMALIST_FEMALE,
  TRAVEL_STYLE_DETAIL_MINIMALIST_MALE,
  TRAVEL_STYLE_LABELS,
} from '@/constants/travel-style-labels';
import { getVtoPreferencesForStyle } from '@/constants/virtual-tryon-preferences';
import {
  VTO_SUBJECT_LABELS,
  VTO_SUBJECT_OPTIONS,
  type VirtualTryOnSubjectRole,
} from '@/constants/virtual-tryon-subject';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

// 状态管理
const uploadedImage = ref<string>('');
const uploadedFileName = ref<string>('');
const dragActive = ref<boolean>(false);
const selectedStyle = ref<string>('minimalist');
const subjectRole = ref<VirtualTryOnSubjectRole>('female');
const subjectOptions = VTO_SUBJECT_OPTIONS;
const generating = ref<boolean>(false);
const result = ref<any>(null);
const lastRequest = ref<VirtualTryOnRequest | null>(null);
const fileInput = ref<HTMLInputElement>();

const preferences = reactive({
  makeup: undefined,
  hairstyle: undefined,
  dress: undefined,
  accessory: undefined as string | undefined,
});

const availableStyles = ref<any[]>([]);
const authStore = useAuthStore();

const currentStep = computed(() => {
  if (!subjectRole.value) return 1;
  if (!uploadedImage.value) return 1;
  if (!selectedStyle.value) return 2;
  return 4;
});

const stylePreviewMap: Record<string, string> = {
  minimalist: hero1,
  classical: hero2,
  bohemian: hero3,
  romantic: hero4,
  adventure: hero5,
  oldtown: hero6,
};

const styleDisplayList = computed(() => {
  const baseList = (availableStyles.value || []).map((style: any) => ({
    ...style,
    preview: stylePreviewMap[style.id] || hero1,
  }));

  const hasOldtown = baseList.some((s: any) => s.id === 'oldtown' || s.name === '古镇纪实');
  if (!hasOldtown) {
    baseList.push({
      id: 'oldtown',
      name: '古镇纪实',
      description: '古镇街巷、人文纪实、烟火生活感',
      color: '#8b5e3c',
      preview: hero6,
    });
  }

  return baseList.slice(0, 6);
});

const accessoryOptionsByStyle: Record<string, string[]> = {
  minimalist: ['轻薄头纱', '珍珠耳饰', '简约项链', '胸花'],
  classical: ['发簪', '步摇', '金钗', '流苏耳饰'],
  bohemian: ['花环', '贝壳耳饰', '编绳手链', '羽毛耳坠'],
  romantic: ['头纱', '珍珠项链', '花环', '蕾丝手套'],
  adventure: ['礼帽', '披肩', '皮质手套', '胸针'],
  oldtown: ['发簪', '复古耳饰', '手捧花', '披肩'],
};
const accessoryOptions = computed(() => {
  return accessoryOptionsByStyle[selectedStyle.value] || ['头纱', '花环', '项链', '耳饰'];
});

/** 韩式简约卡片悬停：随出镜方式切换完整说明 */
const minimalistDetailForRole = computed(() => {
  if (subjectRole.value === 'male') return TRAVEL_STYLE_DETAIL_MINIMALIST_MALE;
  if (subjectRole.value === 'couple') return TRAVEL_STYLE_DETAIL_MINIMALIST_COUPLE;
  return TRAVEL_STYLE_DETAIL_MINIMALIST_FEMALE;
});

const makeupOptions = computed(
  () => getVtoPreferencesForStyle(selectedStyle.value, subjectRole.value).makeup
);
const hairstyleOptions = computed(
  () => getVtoPreferencesForStyle(selectedStyle.value, subjectRole.value).hairstyle
);
const dressOptions = computed(
  () => getVtoPreferencesForStyle(selectedStyle.value, subjectRole.value).dress
);

/** 根据 value 解析下拉项中文 label，供后端图生图 prompt 使用 */
function resolveVtoPrefLabel(
  options: { value: string; label: string }[],
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return options.find((o) => o.value === value)?.label;
}

/** 若当前偏好不在当前风格+出镜方式对应的列表中则清空（恢复 session 后也会调用） */
function pruneInvalidVtoPreferences() {
  const g = getVtoPreferencesForStyle(selectedStyle.value, subjectRole.value);
  const mk = new Set(g.makeup.map((o) => o.value));
  const hs = new Set(g.hairstyle.map((o) => o.value));
  const dr = new Set(g.dress.map((o) => o.value));
  const acc = new Set(accessoryOptions.value);
  if (preferences.makeup && !mk.has(preferences.makeup)) preferences.makeup = undefined;
  if (preferences.hairstyle && !hs.has(preferences.hairstyle)) preferences.hairstyle = undefined;
  if (preferences.dress && !dr.has(preferences.dress)) preferences.dress = undefined;
  if (preferences.accessory && !acc.has(preferences.accessory)) preferences.accessory = undefined;
}

/** 切换主风格或出镜方式时，若原偏好不在新列表中则清空，避免脏值 */
watch([selectedStyle, subjectRole], () => {
  pruneInvalidVtoPreferences();
  saveStateToStorage();
});

// 状态持久化的 key（仅当前浏览器会话内有效）
const STORAGE_KEY = 'virtual-try-on-state';

// 保存状态到 sessionStorage
const saveStateToStorage = () => {
  try {
    const state = {
      uploadedImage: uploadedImage.value,
      uploadedFileName: uploadedFileName.value,
      subjectRole: subjectRole.value,
      selectedStyle: selectedStyle.value,
      preferences: { ...preferences },
      result: result.value,
      lastRequest: lastRequest.value,
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
      uploadedImage.value = state.uploadedImage || '';
      uploadedFileName.value = state.uploadedFileName || '';
      const sr = state.subjectRole as VirtualTryOnSubjectRole | undefined;
      subjectRole.value = sr === 'male' || sr === 'couple' || sr === 'female' ? sr : 'female';
      selectedStyle.value = state.selectedStyle || 'minimalist';
      if (state.preferences) {
        preferences.makeup = state.preferences.makeup;
        preferences.hairstyle = state.preferences.hairstyle;
        preferences.dress = state.preferences.dress;
        preferences.accessory = state.preferences.accessory;
      }
      pruneInvalidVtoPreferences();
      result.value = state.result || null;
      lastRequest.value = state.lastRequest || null;
      console.log('[VirtualTryOn] 已恢复页面状态');
    }
  } catch (error) {
    console.error('恢复状态失败:', error);
  }
};

// 获取可用风格列表
onMounted(async () => {
  authStore.initializeAuth();
  // 先恢复保存的状态（确保返回页面后仍可展示之前结果）
  restoreStateFromStorage();

  try {
    const response: any = await aiApi.getStyles();
    // 后端返回格式: { statusCode: 200, message: '...', data: { styles: [...] } }
    // 前端响应拦截器返回 response.data，所以这里收到的是: { statusCode: 200, message: '...', data: { styles: [...] } }
    // 需要访问 response.data.styles 来获取实际的风格列表
    const stylesData = response?.data || response;
    availableStyles.value = stylesData?.styles || [];

    if (availableStyles.value.length === 0) {
      console.warn('获取到的风格列表为空，使用默认风格列表');
      throw new Error('风格列表为空');
    }
    console.log('获取到的风格列表:', availableStyles.value);
  } catch (error) {
    console.error('获取风格列表失败:', error);
    message.error('获取风格列表失败，已使用默认风格');
    // 如果 API 失败，使用默认风格列表
    availableStyles.value = [
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
  }
});

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string;
      uploadedFileName.value = file.name;
      saveStateToStorage();
    };
    reader.readAsDataURL(file);
  }
};

// 清除图片
const clearImage = () => {
  uploadedImage.value = '';
  uploadedFileName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  // 清图后也要同步持久化
  saveStateToStorage();
};

// 处理拖拽上传
const handleDrop = (event: DragEvent) => {
  dragActive.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string;
      uploadedFileName.value = file.name;
      saveStateToStorage();
    };
    reader.readAsDataURL(file);
  }
};

// 生成虚拍建议
const handleGenerate = async () => {
  if (!uploadedImage.value || !selectedStyle.value) {
    message.warning('请先上传照片并选择风格');
    return;
  }

  generating.value = true;
  try {
    // 使用用户实际上传的图片（Base64 格式）
    // uploadedImage.value 已经是 Base64 格式：data:image/jpeg;base64,...
    const request: VirtualTryOnRequest = {
      imageUrl: uploadedImage.value, // 使用用户上传的图片，而不是固定的 URL
      style: selectedStyle.value,
      subjectRole: subjectRole.value,
      preferences: {
        makeup: preferences.makeup,
        hairstyle: preferences.hairstyle,
        dress: preferences.dress,
        accessory: preferences.accessory,
      },
      preferenceLabels: {
        makeup: resolveVtoPrefLabel(makeupOptions.value, preferences.makeup),
        hairstyle: resolveVtoPrefLabel(hairstyleOptions.value, preferences.hairstyle),
        dress: resolveVtoPrefLabel(dressOptions.value, preferences.dress),
        accessory: preferences.accessory,
      },
    };
    lastRequest.value = request;

    const response = await aiApi.virtualTryOn(request);
    // 处理嵌套的响应结构，取最内层的 data
    result.value = response.data?.data || response.data;

    // 生成成功后持久化（保存生成结果与最后一次请求）
    saveStateToStorage();

    // 登录用户：自动写入服务端「AI 生成历史」
    if (authStore.isAuthenticated && result.value && lastRequest.value) {
      try {
        await aiApi.saveHistory({
          type: 'virtual-try-on',
          input: { ...lastRequest.value },
          output: result.value,
        });
        message.success('虚拍建议生成成功，已保存到生成历史');
      } catch (saveErr: any) {
        console.error('[VirtualTryOn] 自动保存历史失败:', saveErr);
        message.warning('生成成功，但保存到历史失败，请稍后重试或检查网络');
      }
    } else {
      message.success('虚拍建议生成成功！');
    }
  } catch (error: any) {
    message.error(error.message || '生成失败，请重试');
    console.error('虚拍生成错误:', error);
  } finally {
    generating.value = false;
  }
};

// 重新生成
const handleReset = () => {
  uploadedImage.value = '';
  uploadedFileName.value = '';
  subjectRole.value = 'female';
  selectedStyle.value = 'minimalist';
  preferences.makeup = undefined;
  preferences.hairstyle = undefined;
  preferences.dress = undefined;
  result.value = null;
  lastRequest.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  // 清空持久化
  sessionStorage.removeItem(STORAGE_KEY);
  message.info('已清空，可以重新开始生成');
};

// 下载建议
const handleDownload = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `虚拍建议-${new Date().getTime()}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
  message.success('已下载建议文件');
};

// 格式化时间
const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

// 智能选择结果图片URL：优先base64格式，避免外部URL过期
const getResultImageUrl = (): string | null => {
  if (!result.value) return null;

  const item = result.value;
  console.log('[VirtualTryOn] 处理结果图片URL选择:', {
    hasModifiedImageUrl: !!item.modifiedImageUrl,
    modifiedImageUrlType: item.modifiedImageUrl
      ? item.modifiedImageUrl.startsWith('data:')
        ? 'base64'
        : item.modifiedImageUrl.startsWith('http')
          ? 'external'
          : 'other'
      : 'null',
    modifiedImageUrlPreview: item.modifiedImageUrl?.substring(0, 80),
    hasImageUrl: !!uploadedImage.value,
    imageUrlType: uploadedImage.value
      ? uploadedImage.value.startsWith('data:')
        ? 'base64'
        : uploadedImage.value.startsWith('http')
          ? 'external'
          : 'other'
      : 'null',
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
      if (modifiedUrl.startsWith('data:')) {
        console.log('[VirtualTryOn] ✅ 使用base64格式的生成图片');
        return modifiedUrl;
      }
    }
  }

  // 策略2: 如果修改后的图片是外部URL，先尝试使用（失败时会回退到原始图片）
  if (item.modifiedImageUrl && typeof item.modifiedImageUrl === 'string') {
    const modifiedUrl = item.modifiedImageUrl.trim();
    if (
      modifiedUrl &&
      modifiedUrl !== '' &&
      modifiedUrl !== 'null' &&
      modifiedUrl !== 'undefined' &&
      modifiedUrl.startsWith('http')
    ) {
      console.log(
        '[VirtualTryOn] ⚠️ 使用外部URL的生成图片（可能过期，失败时将回退到原始图片）:',
        modifiedUrl.substring(0, 50)
      );
      return modifiedUrl;
    }
  }

  // 策略3: 如果没有生成图片，使用原始图片（base64格式）
  if (uploadedImage.value && typeof uploadedImage.value === 'string') {
    const originalUrl = uploadedImage.value.trim();
    if (
      originalUrl &&
      originalUrl !== '' &&
      originalUrl !== 'null' &&
      originalUrl !== 'undefined'
    ) {
      if (originalUrl.startsWith('data:')) {
        console.log('[VirtualTryOn] ⚠️ 使用base64格式的原始图片（没有生成图片）');
        return originalUrl;
      }
    }
  }

  console.warn('[VirtualTryOn] ❌ 没有找到有效的图片URL');
  return null;
};

// 处理结果图片加载错误：外部URL失败时回退到原始图片
const handleResultImageError = (event: any) => {
  const img = (event.target as HTMLImageElement) || event.target?.querySelector?.('img');
  if (!img) {
    console.warn('[VirtualTryOn] 无法找到图片元素');
    return;
  }

  const failedSrc = img.src || event.target?.src;
  if (!failedSrc) return;

  console.warn('[VirtualTryOn] 结果图片加载失败，尝试回退:', {
    failedSrc: failedSrc.substring(0, 100),
    hasModifiedBase64: result.value?.modifiedImageUrl?.startsWith('data:'),
    hasOriginalBase64: uploadedImage.value?.startsWith('data:'),
    failedIsModified:
      failedSrc === result.value?.modifiedImageUrl ||
      (result.value?.modifiedImageUrl && failedSrc.includes(result.value.modifiedImageUrl)),
  });

  // 如果失败的是生成图片的外部URL，尝试使用原始图片（base64格式）
  const isFailedModifiedImage =
    failedSrc === result.value?.modifiedImageUrl ||
    (result.value?.modifiedImageUrl && failedSrc.includes(result.value.modifiedImageUrl));

  if (isFailedModifiedImage && failedSrc.startsWith('http')) {
    // 优先尝试base64格式的修改后图片
    if (
      result.value?.modifiedImageUrl &&
      result.value.modifiedImageUrl.startsWith('data:') &&
      result.value.modifiedImageUrl !== failedSrc
    ) {
      console.log('[VirtualTryOn] ✅ 回退到base64格式的生成图片');
      if (img) img.src = result.value.modifiedImageUrl;
      if (event.target && event.target.setAttribute) {
        event.target.setAttribute('src', result.value.modifiedImageUrl);
      }
      return;
    }
    // 如果没有base64格式的生成图片，回退到原始图片
    if (
      uploadedImage.value &&
      uploadedImage.value.startsWith('data:') &&
      uploadedImage.value !== failedSrc
    ) {
      console.warn('[VirtualTryOn] ⚠️ 生成图片的外部URL失败，回退到原始图片');
      if (img) {
        img.src = uploadedImage.value;
        img.onerror = null; // 清除错误处理器，避免循环
      }
      if (event.target) {
        if (event.target.setAttribute) {
          event.target.setAttribute('src', uploadedImage.value);
        }
        const innerImg = event.target.querySelector?.('img');
        if (innerImg) {
          innerImg.src = uploadedImage.value;
          innerImg.onerror = null;
        }
      }
      return;
    }
  }

  // 如果都失败了，显示占位符
  console.error('[VirtualTryOn] ❌ 所有图片URL都失败，显示占位符');
  showResultImagePlaceholder(event.target);
};

// 显示结果图片占位符
const showResultImagePlaceholder = (target: any) => {
  let container: HTMLElement | null = null;

  if (target) {
    container =
      target.closest?.('.image-wrapper') ||
      target.parentElement?.closest?.('.image-wrapper') ||
      target.querySelector?.('.image-wrapper');
  }

  if (!container) {
    container = document.querySelector('.comparison-item .image-wrapper') as HTMLElement;
  }

  if (!container) {
    console.warn('[VirtualTryOn] 无法找到图片容器');
    return;
  }

  setTimeout(() => {
    // 隐藏所有图片和a-image组件
    const images = container.querySelectorAll('img, .ant-image, .ant-image-img, .comparison-image');
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
</script>

<style scoped lang="less">
.virtual-try-on-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
  padding: 24px 16px 40px;
}

.page-header {
  text-align: center;
  margin-top: 10px;
  margin-bottom: 23px;
  color: #334155;
  text-shadow: none;

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

.page-shell {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-base {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.step-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 18px;
  gap: 10px;
  flex-wrap: wrap;

  .step-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-weight: 600;
    font-size: 18px;

    .step-index {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #e5e7eb;
      color: #fff;
      font-size: 13px;
    }

    &.active {
      color: #ff6b8b;
      .step-index {
        background: #ff6b8b;
      }
    }
  }

  @media (max-width: 768px) {
    .step-item {
      font-size: 16px;
    }
  }

  .step-line {
    width: 70px;
    height: 3px;
    border-radius: 999px;
    background: #d1d5db;

    &.active {
      background: #ff6b8b;
    }
  }
}

.builder {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.builder-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
}

.styles-row {
  grid-template-columns: 2fr 0.82fr;
  column-gap: 34px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    column-gap: 0;
  }
}

.subject-section,
.upload-section,
.style-section,
.preferences-section {
  h3 {
    font-size: 18px;
    margin: 0 0 12px;
    color: #333;
    font-weight: 700;
  }
}

.preferences-section {
  width: 100%;
  max-width: 320px;
  justify-self: end;

  @media (max-width: 980px) {
    max-width: none;
    justify-self: stretch;
  }
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.subject-card {
  padding: 14px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:hover {
    border-color: #ff758c;
    background: #fffafb;
  }

  &.active {
    border-color: #ff6b8b;
    background: #ffedf2;
    box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.22);
  }

  .subject-short {
    font-size: 1.35rem;
    font-weight: 800;
    color: #ff5c8a;
    margin-bottom: 6px;
  }

  .subject-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: #1f2937;
  }

  .subject-desc {
    font-size: 12px;
    color: #64748b;
    margin-top: 8px;
    line-height: 1.45;
  }
}

.upload-hints {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  align-items: center;

  small {
    color: #999;
  }

  .upload-tip-couple {
    color: #ea580c;
    font-weight: 500;
  }
}

.upload-area {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  background: #fff;
  position: relative;

  &:hover {
    border-color: #ff758c;
    background: #fff5f7;
  }

  &.active {
    border-color: #ff6b8b;
    background: #fff6f9;
  }

  input {
    display: none;
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .upload-icon {
    font-size: 3rem;
  }

  p {
    font-weight: 500;
    color: #333;
    margin: 0;
  }

  small {
    color: #999;
  }
}

.image-preview {
  position: relative;

  .upload-preview-image {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    cursor: pointer;
    display: block;

    :deep(.ant-image-img) {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      object-fit: cover;
    }

    &:hover {
      opacity: 0.9;
    }
  }

  .remove-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.3s;

    &:hover {
      background: rgba(0, 0, 0, 0.8);
    }
  }
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.style-card {
  padding: 7px 4px 9px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;

  img {
    width: 86%;
    aspect-ratio: 3 / 4;
    height: auto;
    max-height: 136px;
    border-radius: 7px;
    object-fit: cover;
    margin: 0 auto 5px;
    display: block;
  }

  &:hover {
    border-color: #ff6b8b;
    transform: translateY(-2px);
  }

  &.active {
    border-color: #ff6b8b;
    box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.24);
  }

  .style-name {
    font-weight: 600;
    font-size: 0.86rem;
    color: #333;
    margin: 0;
  }
}

.generate-btn {
  margin-top: 4px;
  height: 50px;
  font-size: 1rem;
  font-weight: 600;
  background: #ff6b8b;
  border: none;

  &:hover:not(:disabled) {
    background: #f0547b;
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(255, 107, 139, 0.35);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.right-panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
  gap: 20px;

  .spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #f0f0f0;
    border-top: 4px solid #ff758c;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0;
  }

  small {
    font-size: 0.9rem;
    color: #999;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
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

.result-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-summary {
  padding: 16px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;

  h2 {
    margin: 0 0 8px 0;
    font-size: 1.3rem;
  }

  .result-subject {
    font-size: 0.9rem;
    opacity: 0.95;
    margin-bottom: 6px;
  }

  .result-time {
    font-size: 0.85rem;
    opacity: 0.9;
  }
}

.advice-collapse {
  :deep(.ant-collapse-header) {
    font-weight: 600;
    font-size: 1rem;

    &:hover {
      color: #ff758c;
    }
  }

  :deep(.ant-collapse-content-box) {
    padding: 16px 12px;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #666;
  }
}

.tips-list {
  margin: 0;
  padding-left: 20px;

  li {
    margin-bottom: 8px;
    list-style-type: disc;
  }
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
  align-items: center;

  .auto-save-hint {
    flex: 1 0 100%;
    margin: 0 0 4px;
    font-size: 13px;
    color: #64748b;

    &.guest {
      color: #94a3b8;
    }
  }

  button {
    flex: 1;
    min-width: 120px;
  }
}

.image-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin: 20px 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    text-align: center;
  }
}

.comparison-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s;
  cursor: pointer;
  display: block;

  :deep(.ant-image-img) {
    max-width: 100%;
    max-height: 300px;
    border-radius: 6px;
    object-fit: cover;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: scale(1.02);
  }

  &.modified-preview {
    :deep(.ant-image-img) {
      filter: brightness(100%) contrast(1) saturate(1);
    }
  }
}

.image-wrapper {
  position: relative;
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f0f0f0;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  width: 100%;

  .placeholder-text {
    font-size: 0.875rem;
    color: #999;
    text-align: center;
  }
}

.arrow {
  font-size: 1.5rem;
  color: #ff758c;
  font-weight: bold;
  text-align: center;
}
</style>
