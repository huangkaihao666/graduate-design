<template>
  <div class="virtual-try-on-container">
    <div class="page-shell">
      <div class="page-header">
        <h1>💄 AI 一键试妆</h1>
        <p>上传证件照/正面照，选择妆容风格，快速体验不同妆容效果</p>
      </div>

      <div class="step-progress card-base">
        <div class="step-item" :class="{ active: currentStep >= 1 }">
          <span class="step-index">1</span>
          <span>上传照片</span>
        </div>
        <span class="step-line" :class="{ active: currentStep >= 2 }"></span>
        <div class="step-item" :class="{ active: currentStep >= 2 }">
          <span class="step-index">2</span>
          <span>选择风格</span>
        </div>
        <span class="step-line" :class="{ active: currentStep >= 3 }"></span>
        <div class="step-item" :class="{ active: currentStep >= 3 }">
          <span class="step-index">3</span>
          <span>生成结果</span>
        </div>
      </div>

      <div class="builder card-base">
        <div class="builder-row">
          <section class="upload-section">
            <h3>上传照片</h3>
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
              </div>
              <div v-else class="image-preview">
                <a-image :src="uploadedImage" :preview="true" class="upload-preview-image" />
                <button type="button" class="remove-btn" @click.stop="clearImage">重新选择</button>
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png"
              style="display: none"
              @change="handleFileUpload"
            />
          </section>

          <section class="style-section">
            <h3>选择妆容风格</h3>
            <div class="style-grid">
              <div
                v-for="s in makeupStyles"
                :key="s.id"
                class="style-card"
                :class="{ active: selectedStyle === s.id }"
                @click="selectedStyle = s.id"
              >
                <div class="style-icon">{{ s.icon }}</div>
                <div class="style-name">{{ s.name }}</div>
                <div class="style-desc">{{ s.desc }}</div>
              </div>
            </div>
          </section>
        </div>

        <a-button
          type="primary"
          size="large"
          block
          :loading="generating"
          :disabled="!uploadedImage"
          class="generate-btn"
          @click="generateTryOn"
        >
          {{ generating ? '正在生成试妆效果...' : '✨ 一键生成试妆效果' }}
        </a-button>
      </div>

      <div class="right-panel">
        <div v-if="generating" class="right-panel-generating-placeholder" aria-hidden="true" />

        <div v-else-if="!uploadedImage" class="empty-state">
          <span class="empty-icon">✨</span>
          <p>请先上传照片并选择妆容风格</p>
        </div>

        <div v-else-if="!hasGenerated" class="empty-state">
          <span class="empty-icon">⏳</span>
          <p>已上传照片，点击「一键生成试妆效果」后查看结果</p>
        </div>

        <div v-else class="result-container">
          <div class="result-summary">
            <h2>{{ styleName(selectedStyle) }} 试妆效果</h2>
            <div class="result-time">仅面部妆容发生变化</div>
          </div>

          <div class="image-comparison">
            <div class="comparison-item">
              <div class="label">原始照片</div>
              <a-image
                :src="uploadedImage"
                :preview="true"
                class="comparison-image"
                :width="450"
                :height="600"
              />
            </div>
            <div class="arrow">→</div>
            <div class="comparison-item">
              <div class="label">试妆结果</div>
              <a-image
                v-if="resultImage"
                :src="resultImage"
                :preview="true"
                class="comparison-image"
                :width="450"
                :height="600"
              />
              <div v-else class="mock-preview">
                <img :src="uploadedImage" alt="快速预览" :style="mockFilterStyle" />
                <div class="mock-badge">快速预览</div>
              </div>
            </div>
          </div>

          <div class="result-actions">
            <p v-if="authStore.isAuthenticated" class="auto-save-hint">
              已自动保存到「AI 生成历史」
            </p>
            <p v-else class="auto-save-hint guest">登录后将自动保存生成记录到「AI 生成历史」</p>
            <a-button @click="handleReset">🔄 重新生成</a-button>
            <a-button type="primary" class="sync-vto-btn" @click="syncToVirtualTryOn">
              带入虚拍试衣
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <AiGeneratingWaitModal :open="generating" feature-hint="试妆效果生成中" />
  </div>
</template>

<script setup lang="ts">
import AiGeneratingWaitModal from '@/components/ai/AiGeneratingWaitModal.vue';
import { aiApi } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { runAiFlight, useAiFlightPending } from '@/utils/ai-generation-flight';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

type MakeupStyleId =
  | 'korean'
  | 'japanese-magazine'
  | 'new-chinese'
  | 'forest'
  | 'french-retro'
  | 'light-thai';

const fileInput = ref<HTMLInputElement>();
const dragActive = ref(false);
const uploadedImage = ref('');
const selectedStyle = ref<MakeupStyleId>('korean');
const generating = useAiFlightPending('makeup-try-on');
const resultImage = ref('');
const hasGenerated = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const STORAGE_KEY = 'makeup_try_on_state_v1';
const currentStep = computed(() => {
  if (!uploadedImage.value) return 1;
  if (!resultImage.value) return 2;
  return 3;
});

const makeupStyles: Array<{
  id: MakeupStyleId;
  name: string;
  desc: string;
  icon: string;
  filter: string;
}> = [
  {
    id: 'korean',
    name: '韩系',
    desc: '清透水光、温柔减龄、伪素颜气质',
    icon: '💧',
    filter: 'saturate(1.1) brightness(1.04) contrast(1.02)',
  },
  {
    id: 'japanese-magazine',
    name: '日杂',
    desc: '雾面通透、松弛慵懒、低饱和治愈感',
    icon: '🍵',
    filter: 'saturate(0.95) brightness(1.02) contrast(1.03)',
  },
  {
    id: 'new-chinese',
    name: '新中式',
    desc: '端庄雅致、红调唇色、精致东方感',
    icon: '🏮',
    filter: 'contrast(1.08) saturate(0.98) brightness(0.99)',
  },
  {
    id: 'forest',
    name: '森系',
    desc: '轻薄自然、灵动通透、户外氛围感',
    icon: '🍃',
    filter: 'saturate(0.98) brightness(1.02) hue-rotate(-6deg)',
  },
  {
    id: 'french-retro',
    name: '法式复古',
    desc: '雾面高级、红唇复古、优雅迷人',
    icon: '🥀',
    filter: 'contrast(1.15) saturate(1.02) sepia(0.12)',
  },
  {
    id: 'light-thai',
    name: '轻泰',
    desc: '立体精致、明艳上镜、眼妆轮廓感强',
    icon: '🌺',
    filter: 'contrast(1.14) saturate(1.1) brightness(1.0)',
  },
];

const styleName = (id: string) => makeupStyles.find((x) => x.id === id)?.name || id;
const styleFeaturePrompt: Record<MakeupStyleId, string> = {
  korean:
    '韩系妆：底妆清透水光，伪素颜感；眉毛自然平缓，眼妆柔和淡雅；睫毛纤长、根根分明、自然卷翘，不厚重；腮红嫩感通透，唇色淡雅温柔；整体干净减龄，温柔显气质。',
  'japanese-magazine':
    '日杂妆：底妆通透雾面，氛围感强；眉毛偏野生感，眼妆慵懒柔和；睫毛自然纤长，略带空气感，不刻意浓密；腮红大面积柔和提色，唇妆低饱和杏色、豆沙色；整体松弛随性、日系治愈。',
  'new-chinese':
    '新中式妆：底妆哑光高级，端庄大气；眉形利落流畅，眼妆内敛有神；睫毛纤长整齐，强调精致感，不夸张不杂乱；唇色以红调、豆沙红为主；整体温婉雅致，适配中式婚纱、秀禾、旗袍。',
  forest:
    '森系妆：底妆轻薄透气，贴近自然；色彩以大地色、淡杏色为主；眼妆清淡柔和；睫毛自然纤细、轻盈通透，像原生睫毛一样清新；腮红与唇色水润透亮；整体灵动干净，适合森林、草坪、户外旅拍。',
  'french-retro':
    '法式复古妆：底妆雾面高级，慵懒优雅；眉形微挑有弧度；眼尾眼线微扬；睫毛浓密卷翘，存在感强，复古氛围感拉满；搭配复古腮红与红唇；气质优雅迷人，适合复古、法式、教堂拍摄。',
  'light-thai':
    '轻泰妆：底妆干净紧致，立体精致；毛流眉清晰有力；眼妆轮廓感强；睫毛浓密纤长、卷翘上扬，放大双眼效果明显；鼻影自然立体，唇色红棕、橘棕调；整体明艳高级，上镜超好看。',
};
const makeupToVtoSyncMap: Record<MakeupStyleId, { vtoStyle: string; makeupValue: string }> = {
  korean: { vtoStyle: 'minimalist', makeupValue: 'ks_bare' },
  'japanese-magazine': { vtoStyle: 'artistic', makeupValue: 'js_soft' },
  'new-chinese': { vtoStyle: 'classical', makeupValue: 'gf_red_brow' },
  forest: { vtoStyle: 'romantic', makeupValue: 'sx_fresh' },
  'french-retro': { vtoStyle: 'artistic', makeupValue: 'js_wine' },
  'light-thai': { vtoStyle: 'adventure', makeupValue: 'ky_contour' },
};
const mockFilterStyle = computed(() => ({
  filter: makeupStyles.find((x) => x.id === selectedStyle.value)?.filter || '',
}));

const saveStateToStorage = () => {
  try {
    const payload = {
      uploadedImage: uploadedImage.value,
      selectedStyle: selectedStyle.value,
      resultImage: resultImage.value,
      hasGenerated: hasGenerated.value,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

const restoreStateFromStorage = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      uploadedImage?: string;
      selectedStyle?: MakeupStyleId;
      resultImage?: string;
      hasGenerated?: boolean;
    };
    uploadedImage.value = parsed.uploadedImage || '';
    selectedStyle.value = parsed.selectedStyle || 'korean';
    resultImage.value = parsed.resultImage || '';
    hasGenerated.value = Boolean(parsed.hasGenerated);
  } catch {
    // ignore parse errors
  }
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || !files.length) return;
  const file = files[0];
  if (file.size > 10 * 1024 * 1024) {
    message.error('文件大小不能超过 10MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage.value = String(e.target?.result || '');
    resultImage.value = '';
    hasGenerated.value = false;
  };
  reader.readAsDataURL(file);
};

const handleDrop = (event: DragEvent) => {
  dragActive.value = false;
  const files = event.dataTransfer?.files;
  if (!files || !files.length) return;
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
    uploadedImage.value = String(e.target?.result || '');
    resultImage.value = '';
    hasGenerated.value = false;
  };
  reader.readAsDataURL(file);
};

const clearImage = () => {
  uploadedImage.value = '';
  resultImage.value = '';
  hasGenerated.value = false;
  if (fileInput.value) fileInput.value.value = '';
  saveStateToStorage();
};

const handleReset = () => {
  uploadedImage.value = '';
  selectedStyle.value = 'korean';
  resultImage.value = '';
  hasGenerated.value = false;
  if (fileInput.value) fileInput.value.value = '';
  sessionStorage.removeItem(STORAGE_KEY);
  message.info('已清空，可以重新开始生成');
};

const syncToVirtualTryOn = () => {
  if (!hasGenerated.value) {
    message.warning('请先生成并确认喜欢的试妆效果');
    return;
  }
  const sync = makeupToVtoSyncMap[selectedStyle.value];
  router.push({
    path: '/ai/virtual-try-on',
    query: {
      syncMakeup: '1',
      vtoStyle: sync.vtoStyle,
      makeupValue: sync.makeupValue,
      makeupStyle: selectedStyle.value,
      makeupCorePrompt: styleFeaturePrompt[selectedStyle.value],
    },
  });
};

const generateTryOn = async () => {
  if (!uploadedImage.value) {
    message.warning('请先上传照片');
    return;
  }
  await runAiFlight('makeup-try-on', async () => {
    try {
      const resp: any = await aiApi.virtualTryOn({
        imageUrl: uploadedImage.value,
        style: `makeup-${selectedStyle.value}`,
        makeupOnly: true,
        subjectRole: 'female',
        preferences: { makeup: selectedStyle.value },
        preferenceLabels: {
          makeup: `${styleName(selectedStyle.value)}。请严格按以下妆容特征生成：${styleFeaturePrompt[selectedStyle.value]}`,
        },
      });
      const data = resp?.data?.data || resp?.data || resp;
      const url = String(data?.modifiedImageUrl || '').trim();
      if (url && (url.startsWith('data:') || url.startsWith('http'))) {
        resultImage.value = url;
      } else {
        resultImage.value = '';
      }
      hasGenerated.value = true;

      if (authStore.isAuthenticated) {
        try {
          await aiApi.saveHistory({
            type: 'virtual-try-on',
            input: {
              imageUrl: uploadedImage.value,
              style: `makeup-${selectedStyle.value}`,
              makeupOnly: true,
              subjectRole: 'female',
              preferences: { makeup: selectedStyle.value },
              preferenceLabels: {
                makeup: `${styleName(selectedStyle.value)}。请严格按以下妆容特征生成：${styleFeaturePrompt[selectedStyle.value]}`,
              },
            },
            output: data,
          });
          message.success('试妆效果已生成，已自动保存到 AI 历史');
        } catch (saveErr) {
          console.error('[MakeupTryOn] 自动保存历史失败:', saveErr);
          message.warning('试妆效果已生成，但自动保存历史失败');
        }
      } else if (url && (url.startsWith('data:') || url.startsWith('http'))) {
        message.success('试妆效果已生成');
      } else {
        message.success('已生成，当前展示快速预览');
      }
    } catch (e: any) {
      hasGenerated.value = false;
      message.error(e?.message || '生成失败，请重试');
    }
  });
};

watch([uploadedImage, selectedStyle, resultImage, hasGenerated], () => {
  saveStateToStorage();
});

watch(generating, (now, prev) => {
  if (prev && !now) {
    restoreStateFromStorage();
  }
});

onMounted(() => {
  restoreStateFromStorage();
});
</script>

<style scoped lang="less">
/* 复用虚拍试衣页同布局尺寸 */
.virtual-try-on-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
  padding: 0 0 40px;
}

.page-shell {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  text-align: center;
  padding-top: 28px;
  margin-top: 0;
  margin-bottom: 10px;
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

.upload-section,
.style-section {
  h3 {
    font-size: 18px;
    margin: 0 0 12px;
    color: #333;
    font-weight: 700;
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
}
.upload-area.active {
  border-color: #ff6b8b;
  background: #fff6f9;
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
  max-width: 340px;
  margin: 0 auto;
}
.upload-preview-image {
  width: 100%;
  max-height: 220px;
  border-radius: 8px;
  display: block;

  :deep(.ant-image) {
    display: block;
    width: 100%;
  }

  :deep(.ant-image-img) {
    width: 100%;
    max-height: 220px;
    border-radius: 8px;
    object-fit: cover;
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

.style-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.style-card {
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
  &:hover {
    border-color: #ff6b8b;
    transform: translateY(-2px);
  }
  &.active {
    border-color: #ff6b8b;
    box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.24);
  }
}

.style-icon {
  font-size: 26px;
  margin-bottom: 6px;
}
.style-name {
  font-weight: 700;
  margin-bottom: 2px;
}
.style-desc {
  color: #6b7280;
  font-size: 12px;
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

.right-panel-generating-placeholder {
  min-height: 400px;
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
    margin: 0 0 8px;
    font-size: 1.3rem;
  }
  .result-time {
    font-size: 0.85rem;
    opacity: 0.9;
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
  align-items: center;
  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    text-align: center;
  }
}
.comparison-image {
  width: 450px;
  height: 600px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;

  :deep(.ant-image) {
    width: 450px;
    height: 600px;
    display: block;
  }

  :deep(.ant-image-img) {
    width: 450px;
    height: 600px;
    object-fit: cover;
  }
}
.arrow {
  font-size: 1.5rem;
  color: #ff758c;
  font-weight: bold;
  text-align: center;
}
.mock-preview {
  width: 450px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  img {
    width: 100%;
    height: 600px;
    object-fit: cover;
    display: block;
  }
}
.mock-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
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

.sync-vto-btn {
  background: #ff6b8b;
  border-color: #ff6b8b;

  &:hover,
  &:focus {
    background: #f0547b;
    border-color: #f0547b;
  }
}

@media (max-width: 768px) {
  .step-progress .step-item {
    font-size: 16px;
  }
}

@media (max-width: 1200px) {
  .style-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
