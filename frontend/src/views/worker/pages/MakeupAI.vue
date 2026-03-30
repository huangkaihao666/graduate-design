<!-- stylelint-disable -->
<template>
  <div class="page">
    <div class="head">
      <div>
        <div class="title">智能试妆工作台</div>
        <div class="sub">
          上传证件照/正面照，一键生成试妆效果；切换不同妆容风格；保存试妆图并发送给用户确认；也可生成妆容建议方案。
        </div>
      </div>
      <a-space wrap>
        <a-button class="pill ghost" @click="goMessages">打开消息中心</a-button>
        <a-button type="primary" class="pill" :disabled="!resultImage" @click="downloadResult">
          下载试妆图
        </a-button>
      </a-space>
    </div>

    <div class="grid">
      <section class="panel">
        <div class="panel-h">
          <div class="panel-title">1）上传照片</div>
          <div class="panel-sub">建议：正面、光线均匀、无遮挡；JPG/PNG ≤ 10MB</div>
        </div>
        <div
          class="upload-area"
          :class="{ active: dragActive }"
          @click="() => fileInput?.click()"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="handleDrop"
        >
          <div v-if="!uploadedImage" class="upload-placeholder">
            <div class="upload-icon">📷</div>
            <div class="upload-text">拖拽照片到此或点击选择</div>
            <div class="upload-hint">支持证件照/正面照；用于试妆不影响原图保存</div>
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
            <button type="button" class="remove-btn" @click.stop="clearImage">重新选择</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-h">
          <div class="panel-title">2）选择妆容风格</div>
          <div class="panel-sub">点击卡片切换风格，可反复生成对比</div>
        </div>
        <div class="style-grid">
          <button
            v-for="s in makeupStyles"
            :key="s.id"
            type="button"
            class="style-card"
            :class="{ active: selectedStyle === s.id }"
            @click="() => (selectedStyle = s.id)"
          >
            <div class="style-icon">{{ s.icon }}</div>
            <div class="style-name">{{ s.name }}</div>
            <div class="style-desc">{{ s.desc }}</div>
          </button>
        </div>

        <div class="actions">
          <a-button
            type="primary"
            class="pill"
            :loading="generating"
            :disabled="!uploadedImage || !selectedStyle"
            @click="generateTryOn"
          >
            {{ generating ? '正在生成试妆效果…' : '一键生成试妆效果' }}
          </a-button>
          <a-button class="pill ghost" :disabled="!resultImage" @click="copyResultToClipboard">
            复制试妆图
          </a-button>
          <a-button class="pill ghost" :disabled="!resultImage" @click="saveToLocalHistory">
            保存到本机
          </a-button>
        </div>

        <a-divider />

        <div class="panel-h" style="margin-bottom: 6px">
          <div class="panel-title">3）效果预览</div>
          <div class="panel-sub">
            左侧原图，右侧试妆图（若后端暂未返回图，则展示“快速预览”效果）
          </div>
        </div>
        <div class="compare">
          <div class="cmp">
            <div class="cmp-label">原始照片</div>
            <a-image v-if="uploadedImage" :src="uploadedImage" :preview="true" class="cmp-img" />
            <div v-else class="cmp-empty">请先上传照片</div>
          </div>
          <div class="arrow">→</div>
          <div class="cmp">
            <div class="cmp-label">{{ styleName(selectedStyle) }} 试妆</div>
            <div class="cmp-img-wrap">
              <a-image
                v-if="resultImage"
                :src="resultImage"
                :preview="true"
                class="cmp-img"
                :fallback="resultImage"
              />
              <div v-else-if="uploadedImage" class="mock-preview">
                <img :src="uploadedImage" alt="快速预览" :style="mockFilterStyle" />
                <div class="mock-badge">快速预览</div>
              </div>
              <div v-else class="cmp-empty">生成后在此展示</div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel full">
        <div class="panel-h">
          <div class="panel-title">妆容建议方案（AI）</div>
          <div class="panel-sub">
            基于脸型/肤色/五官 + 拍摄需求生成可落地的妆容建议（含色彩、重点、禁忌）
          </div>
        </div>

        <a-form layout="vertical" class="form">
          <a-row :gutter="[14, 10]">
            <a-col :xs="24" :md="8">
              <a-form-item label="脸型">
                <a-select
                  v-model:value="adviceForm.faceShape"
                  allow-clear
                  placeholder="如：鹅蛋脸/圆脸/方圆脸"
                >
                  <a-select-option v-for="x in faceShapes" :key="x" :value="x">{{
                    x
                  }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="肤色">
                <a-select
                  v-model:value="adviceForm.skinTone"
                  allow-clear
                  placeholder="如：冷白皮/暖黄皮"
                >
                  <a-select-option v-for="x in skinTones" :key="x" :value="x">{{
                    x
                  }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="五官特点（可多选）">
                <a-select
                  v-model:value="adviceForm.features"
                  mode="multiple"
                  allow-clear
                  placeholder="如：单眼皮/高鼻梁/唇形偏薄"
                >
                  <a-select-option v-for="x in featureOptions" :key="x" :value="x">{{
                    x
                  }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="[14, 10]">
            <a-col :xs="24" :md="12">
              <a-form-item label="拍摄主题/场景">
                <a-input
                  v-model:value="adviceForm.shootTheme"
                  placeholder="如：海边旅拍 / 室内棚拍 / 夕阳街拍"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="想要的风格关键词">
                <a-input
                  v-model:value="adviceForm.keywords"
                  placeholder="如：清透、耐看、上镜、显幼态、氛围感"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="其他补充（可选）">
            <a-textarea
              v-model:value="adviceForm.notes"
              :rows="3"
              placeholder="如：易出油/痘痘肌；希望遮黑眼圈；对红唇接受度低等"
            />
          </a-form-item>

          <div class="actions">
            <a-button
              type="primary"
              class="pill"
              :loading="adviceLoading"
              :disabled="!canGenerateAdvice"
              @click="generateAdvice"
            >
              {{ adviceLoading ? '正在生成建议…' : '生成妆容建议方案' }}
            </a-button>
            <a-button class="pill ghost" :disabled="!adviceText" @click="copyAdvice">
              复制建议
            </a-button>
          </div>
        </a-form>

        <a-divider />

        <div v-if="adviceText" class="advice">
          <div class="advice-head">
            <div class="advice-title">建议结果</div>
            <div class="advice-meta">可直接复制发给用户确认，也可结合试妆图一起发送</div>
          </div>
          <pre class="advice-pre">{{ adviceText }}</pre>
        </div>
        <a-empty v-else description="填写信息后点击生成" />
      </section>

      <aside class="panel right">
        <div class="panel-h">
          <div class="panel-title">本机试妆历史</div>
          <div class="panel-sub">仅保存在当前浏览器（演示）</div>
        </div>
        <div class="history">
          <div v-for="h in localHistory" :key="h.id" class="h-item">
            <div class="h-top">
              <span class="h-style">{{ styleName(h.style) }}</span>
              <span class="h-time">{{ h.time }}</span>
            </div>
            <div class="h-imgs">
              <a-image :src="h.original" :preview="true" :width="70" :height="70" class="h-img" />
              <a-image :src="h.result" :preview="true" :width="70" :height="70" class="h-img" />
            </div>
            <a-space>
              <a-button size="small" class="pill ghost" @click="applyHistory(h)">恢复</a-button>
              <a-button size="small" danger class="pill ghost" @click="removeHistory(h.id)"
                >删除</a-button
              >
            </a-space>
          </div>
          <a-empty v-if="!localHistory.length" description="暂无记录" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { aiApi } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

type MakeupStyleId = 'fresh' | 'retro' | 'korean' | 'forest' | 'wild' | 'glam' | 'clean';

const authStore = useAuthStore();
const router = useRouter();

const dragActive = ref(false);
const fileInput = ref<HTMLInputElement>();
const uploadedImage = ref<string>('');
const uploadedFileName = ref<string>('');

const generating = ref(false);
const selectedStyle = ref<MakeupStyleId>('fresh');
const resultImage = ref<string>('');

const makeupStyles: Array<{
  id: MakeupStyleId;
  name: string;
  desc: string;
  icon: string;
  filter: string;
}> = [
  {
    id: 'fresh',
    name: '清新',
    desc: '轻薄底妆、自然腮红、柔雾唇',
    icon: '🌿',
    filter: 'saturate(1.12) contrast(1.03) brightness(1.03)',
  },
  {
    id: 'korean',
    name: '韩式',
    desc: '水光肌、干净眼妆、氛围感唇色',
    icon: '🫧',
    filter: 'saturate(1.06) contrast(1.02) brightness(1.04)',
  },
  {
    id: 'retro',
    name: '复古',
    desc: '哑光质感、深色唇、轮廓更立体',
    icon: '📼',
    filter: 'contrast(1.12) saturate(0.92) sepia(0.18)',
  },
  {
    id: 'forest',
    name: '森系',
    desc: '低饱和、柔和眼妆、通透氛围',
    icon: '🍃',
    filter: 'saturate(0.98) contrast(1.02) brightness(1.02) hue-rotate(-6deg)',
  },
  {
    id: 'wild',
    name: '野性',
    desc: '强调眉眼、拉长眼型、棕调高光',
    icon: '🦂',
    filter: 'contrast(1.16) saturate(1.08) brightness(0.98)',
  },
  {
    id: 'glam',
    name: '浓颜',
    desc: '高对比、闪片眼妆、红棕唇',
    icon: '✨',
    filter: 'contrast(1.18) saturate(1.14) brightness(1.0)',
  },
  {
    id: 'clean',
    name: '通勤',
    desc: '高级干净、低调修容、耐看上镜',
    icon: '🧼',
    filter: 'saturate(1.02) contrast(1.01) brightness(1.02)',
  },
];

const styleName = (id: string | undefined) =>
  makeupStyles.find((x) => x.id === id)?.name || (id ? String(id) : '—');

const mockFilterStyle = computed(() => {
  const f = makeupStyles.find((x) => x.id === selectedStyle.value)?.filter || '';
  return { filter: f };
});

const STORAGE_KEY = computed(
  () => `worker_makeup_tryon_history_v1_${authStore.user?.id ?? 'guest'}`
);

type LocalHistoryItem = {
  id: string;
  time: string;
  style: MakeupStyleId;
  original: string;
  result: string;
};

const localHistory = ref<LocalHistoryItem[]>([]);

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.value);
    const list = raw ? (JSON.parse(raw) as LocalHistoryItem[]) : [];
    localHistory.value = Array.isArray(list) ? list.slice(0, 30) : [];
  } catch {
    localHistory.value = [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(localHistory.value.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

function saveToLocalHistory() {
  if (!uploadedImage.value || !resultImage.value) {
    message.warning('请先生成试妆效果');
    return;
  }
  const id = String(Date.now());
  localHistory.value = [
    {
      id,
      time: dayjs().format('MM-DD HH:mm'),
      style: selectedStyle.value,
      original: uploadedImage.value,
      result: resultImage.value,
    },
    ...localHistory.value,
  ].slice(0, 30);
  persistHistory();
  message.success('已保存到本机历史');
}

function applyHistory(h: LocalHistoryItem) {
  uploadedImage.value = h.original;
  uploadedFileName.value = 'history';
  selectedStyle.value = h.style;
  resultImage.value = h.result;
  message.success('已恢复');
}

function removeHistory(id: string) {
  localHistory.value = localHistory.value.filter((x) => x.id !== id);
  persistHistory();
  message.success('已删除');
}

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
      uploadedImage.value = String(e.target?.result || '');
      uploadedFileName.value = file.name;
      resultImage.value = '';
    };
    reader.readAsDataURL(file);
  }
};

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
      uploadedImage.value = String(e.target?.result || '');
      uploadedFileName.value = file.name;
      resultImage.value = '';
    };
    reader.readAsDataURL(file);
  }
};

const clearImage = () => {
  uploadedImage.value = '';
  uploadedFileName.value = '';
  resultImage.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

async function generateTryOn() {
  if (!uploadedImage.value) {
    message.warning('请先上传照片');
    return;
  }
  generating.value = true;
  try {
    // 复用后端已有图生图接口（/ai/virtual-try-on）。这里将 style 作为“妆容风格”传入。
    // 若后端未返回图片（modifiedImageUrl），前端会展示“快速预览”（仅做滤镜预览）。
    const resp: any = await aiApi.virtualTryOn({
      imageUrl: uploadedImage.value,
      style: `makeup-${selectedStyle.value}`,
      subjectRole: 'female',
      preferences: {
        makeup: selectedStyle.value,
      },
      preferenceLabels: {
        makeup: styleName(selectedStyle.value),
      },
    });
    const data = resp?.data?.data || resp?.data || resp;
    const url = String(data?.modifiedImageUrl || '').trim();
    if (url && (url.startsWith('data:') || url.startsWith('http'))) {
      resultImage.value = url;
      message.success('试妆效果已生成');
    } else {
      resultImage.value = '';
      message.success('已生成（当前展示快速预览）');
    }

    if (authStore.isAuthenticated) {
      try {
        await aiApi.saveHistory({
          type: 'virtual-try-on',
          input: { imageUrl: uploadedImage.value, style: `makeup-${selectedStyle.value}` },
          output: data,
        });
      } catch {
        /* ignore */
      }
    }
  } catch (e: any) {
    message.error(e?.message || '生成失败，请重试');
  } finally {
    generating.value = false;
  }
}

async function copyResultToClipboard() {
  if (!resultImage.value) {
    message.warning('请先生成试妆图');
    return;
  }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(resultImage.value);
      message.success('已复制试妆图链接/内容（Base64）');
      return;
    }
  } catch {
    // ignore
  }
  message.warning('当前环境不支持复制，请使用下载按钮保存后发送');
}

function downloadResult() {
  const src = resultImage.value || uploadedImage.value;
  if (!src) {
    message.warning('暂无可下载图片');
    return;
  }
  const a = document.createElement('a');
  a.href = src;
  a.download = `试妆-${styleName(selectedStyle.value)}-${dayjs().format('YYYYMMDD-HHmm')}.png`;
  a.click();
  message.success('已触发下载');
}

function goMessages() {
  router.push('/worker/messages');
}

// --- 妆容建议（AI 文本） ---
const faceShapes = ['鹅蛋脸', '圆脸', '方脸', '方圆脸', '长脸', '心形脸', '菱形脸'];
const skinTones = ['冷白皮', '中性肤色', '暖黄皮', '小麦色', '偏红肌', '偏暗沉'];
const featureOptions = [
  '单眼皮',
  '内双',
  '双眼皮',
  '眼距偏宽',
  '眼距偏近',
  '黑眼圈明显',
  '鼻梁偏低',
  '高鼻梁',
  '面中偏短',
  '面中偏长',
  '唇形偏薄',
  '唇形偏厚',
  '嘴角偏下',
  '痘痘肌/闭口',
  '毛孔明显/出油',
  '干皮/卡粉',
];

const adviceForm = reactive({
  faceShape: undefined as string | undefined,
  skinTone: undefined as string | undefined,
  features: [] as string[],
  shootTheme: '',
  keywords: '',
  notes: '',
});

const adviceLoading = ref(false);
const adviceText = ref('');

const canGenerateAdvice = computed(() => {
  return (
    String(adviceForm.faceShape || '').trim() ||
    String(adviceForm.skinTone || '').trim() ||
    (Array.isArray(adviceForm.features) && adviceForm.features.length > 0) ||
    String(adviceForm.shootTheme || '').trim() ||
    String(adviceForm.keywords || '').trim() ||
    String(adviceForm.notes || '').trim()
  );
});

function buildAdvicePrompt() {
  const parts: string[] = [];
  parts.push('你是一位资深化妆师，需要给旅拍客户输出“可执行的妆容建议方案”。');
  parts.push('请按以下结构输出，语言简洁但专业、可落地：');
  parts.push('1) 底妆（色号/冷暖/遮瑕与定妆策略）');
  parts.push('2) 眉眼（眉形建议、眼妆重点、眼型修饰、眼线/睫毛建议）');
  parts.push('3) 腮红与修容高光（位置与色调）');
  parts.push('4) 唇妆（适合色系、质地、叠涂建议）');
  parts.push('5) 与拍摄主题/光线/服装的搭配建议');
  parts.push('6) 需要避雷的点（至少3条）');
  parts.push('7) 可选备选方案（更浓/更淡各1套）');
  parts.push('');
  parts.push(`脸型：${adviceForm.faceShape || '未提供'}`);
  parts.push(`肤色：${adviceForm.skinTone || '未提供'}`);
  parts.push(`五官特点：${(adviceForm.features || []).join('、') || '未提供'}`);
  parts.push(`拍摄主题/场景：${adviceForm.shootTheme.trim() || '未提供'}`);
  parts.push(`风格关键词：${adviceForm.keywords.trim() || '未提供'}`);
  parts.push(`其他补充：${adviceForm.notes.trim() || '未提供'}`);
  parts.push('');
  parts.push('注意：不要输出与“无法判断”相关的废话；给出明确建议；尽量用条目/小标题。');
  return parts.join('\n');
}

async function generateAdvice() {
  if (!canGenerateAdvice.value) {
    message.warning('请先填写至少一项信息');
    return;
  }
  adviceLoading.value = true;
  try {
    const resp: any = await aiApi.customerSupport({ question: buildAdvicePrompt() });
    const data = resp?.data?.data || resp?.data || resp;
    const text = String(data?.answer || data?.content || data?.message || '').trim();
    adviceText.value = text || '（未获取到建议内容，请稍后重试）';
    message.success('妆容建议已生成');
  } catch (e: any) {
    message.error(e?.message || '生成建议失败，请重试');
  } finally {
    adviceLoading.value = false;
  }
}

async function copyAdvice() {
  if (!adviceText.value.trim()) return;
  try {
    await navigator.clipboard.writeText(adviceText.value);
    message.success('已复制');
  } catch {
    message.warning('复制失败，请手动选择文本复制');
  }
}

onMounted(() => {
  authStore.initializeAuth();
  loadHistory();
});
</script>

<style scoped lang="less">
/* stylelint-disable */
.page {
  --pink: #ff6b8b;
  --r: 12px;
  padding-top: 10px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.title {
  font-weight: 900;
  color: #111827;
  font-size: 18px;
  margin-bottom: 4px;
}
.sub {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.55;
  max-width: 820px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 380px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
}
.panel.full {
  grid-column: 1 / span 2;
  @media (max-width: 1200px) {
    grid-column: auto;
  }
}
.panel.right {
  grid-row: 1 / span 2;
  @media (max-width: 1200px) {
    grid-row: auto;
  }
}

.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}
.panel-sub {
  color: #9ca3af;
  font-size: 12px;
}

.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}

.upload-area {
  border: 2px dashed rgba(255, 107, 139, 0.32);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  background: linear-gradient(180deg, #fff7fb 0%, #ffffff 100%);
  transition: all 0.2s ease;
}
.upload-area:hover {
  border-color: rgba(255, 107, 139, 0.55);
  box-shadow: 0 10px 22px rgba(255, 107, 139, 0.12);
}
.upload-area.active {
  border-color: rgba(255, 107, 139, 0.75);
  background: rgba(255, 107, 139, 0.06);
}
.upload-placeholder {
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 18px 0;
  color: #374151;
}
.upload-icon {
  font-size: 38px;
}
.upload-text {
  font-weight: 800;
}
.upload-hint {
  font-size: 12px;
  color: #9ca3af;
}
.image-preview {
  position: relative;
}
.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(17, 24, 39, 0.68);
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 700;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.style-card {
  text-align: left;
  border: 1px solid rgba(17, 24, 39, 0.1);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.style-card:hover {
  border-color: rgba(255, 107, 139, 0.42);
  box-shadow: 0 10px 22px rgba(255, 107, 139, 0.12);
  transform: translateY(-1px);
}
.style-card.active {
  border-color: rgba(255, 107, 139, 0.68);
  box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.18);
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.08) 0%, rgba(255, 155, 180, 0.06) 100%);
}
.style-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 107, 139, 0.2);
  background: rgba(255, 107, 139, 0.08);
  margin-bottom: 8px;
  font-size: 18px;
}
.style-name {
  font-weight: 900;
  color: #111827;
}
.style-desc {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}
.arrow {
  font-size: 20px;
  font-weight: 900;
  color: #ff6b8b;
  text-align: center;
}
.cmp-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 700;
  text-align: center;
}
.cmp-empty {
  border: 1px dashed rgba(17, 24, 39, 0.2);
  border-radius: 12px;
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #9ca3af;
}
.cmp-img-wrap {
  position: relative;
}
.mock-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
}
.mock-preview img {
  width: 100%;
  height: 260px;
  object-fit: cover;
  display: block;
}
.mock-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(17, 24, 39, 0.65);
  color: #fff;
  font-weight: 900;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
}

.history {
  display: grid;
  gap: 12px;
  max-height: calc(100vh - 220px);
  overflow: auto;
  padding-right: 2px;
}
.h-item {
  border: 1px solid rgba(255, 107, 139, 0.18);
  border-radius: 12px;
  padding: 12px;
  background: rgba(255, 107, 139, 0.04);
}
.h-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.h-style {
  font-weight: 900;
  color: #be185d;
}
.h-time {
  color: #94a3b8;
  font-size: 12px;
}
.h-imgs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.h-img :deep(img) {
  width: 70px;
  height: 70px;
  border-radius: 10px;
  object-fit: cover;
}

.advice-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.advice-title {
  font-weight: 900;
  color: #111827;
}
.advice-meta {
  color: #94a3b8;
  font-size: 12px;
}
.advice-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #0b1220;
  color: #e5e7eb;
  border-radius: 12px;
  padding: 12px 14px;
  line-height: 1.6;
  font-size: 13px;
}
</style>
