<!-- stylelint-disable -->
<template>
  <div class="page">
    <div class="grid single">
      <section class="panel full">
        <div class="panel-h">
          <div class="panel-title">妆容建议方案</div>
          <div class="panel-sub">
            基于脸型/肤色/五官/可见肤况/三庭五眼倾向/推荐风格 +
            拍摄需求生成可落地的妆容建议（含色彩、重点、禁忌）
          </div>
        </div>

        <a-form layout="vertical" class="form">
          <a-row :gutter="[16, 16]" class="traits-photo-row" align="top">
            <a-col :xs="24" :lg="16" :xl="17" class="traits-col">
              <a-row :gutter="[14, 10]">
                <a-col :xs="24" :sm="12" :md="8">
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
                <a-col :xs="24" :sm="12" :md="8">
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
                <a-col :xs="24" :sm="24" :md="8">
                  <a-form-item label="五官特点（可多选，含眉型）">
                    <a-select
                      v-model:value="adviceForm.features"
                      mode="multiple"
                      allow-clear
                      placeholder="如：单眼皮/平眉/高鼻梁"
                      @change="onFeaturesChange"
                    >
                      <a-select-option v-for="x in featureOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="[14, 10]">
                <a-col :xs="24" :sm="24" :md="8">
                  <a-form-item label="可见皮肤状态（可多选）">
                    <a-select
                      v-model:value="adviceForm.skinVisible"
                      mode="multiple"
                      allow-clear
                      placeholder="照片中可见，非医学诊断"
                      @change="onSkinVisibleChange"
                    >
                      <a-select-option v-for="x in skinVisibleOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="24" :md="8">
                  <a-form-item label="三庭五眼倾向（可多选）">
                    <a-select
                      v-model:value="adviceForm.faceRatio"
                      mode="multiple"
                      allow-clear
                      placeholder="大致比例倾向"
                      @change="onFaceRatioChange"
                    >
                      <a-select-option v-for="x in faceRatioOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="24" :md="8">
                  <a-form-item label="适合妆容风格（可多选）">
                    <a-select
                      v-model:value="adviceForm.makeupStyles"
                      mode="multiple"
                      allow-clear
                      placeholder="如：可爱、御姐、清冷"
                      @change="onMakeupStylesChange"
                    >
                      <a-select-option v-for="x in makeupStyleOptions" :key="x" :value="x">{{
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

              <a-form-item label="其他补充（可选）" class="notes-field-item">
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
                <a-button class="pill ghost" @click="clearAdviceRecords">清空记录</a-button>
              </div>
            </a-col>
            <a-col :xs="24" :lg="8" :xl="7" class="photo-col">
              <div class="photo-analyze-panel">
                <div class="photo-analyze-title">照片识别</div>
                <label class="slot-upload">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="sr-only"
                    @change="onPhotoChange"
                  />
                  <div class="slot-preview">
                    <img v-if="photoPreview" :src="photoPreview" alt="照片预览" />
                    <span v-else class="slot-placeholder">点击上传正面或证件照</span>
                  </div>
                </label>
                <a-button
                  v-if="photoPreview"
                  type="link"
                  size="small"
                  danger
                  block
                  class="slot-remove"
                  @click.prevent="clearPhoto"
                >
                  移除照片
                </a-button>
                <a-button
                  type="primary"
                  block
                  class="recognize-btn"
                  :loading="recognizeLoading"
                  :disabled="!photoDataUrl"
                  @click="recognizeFromPhotos"
                >
                  {{ recognizeLoading ? '识别中…' : '识别并填充' }}
                </a-button>
                <p class="photo-analyze-hint">
                  上传一张清晰正面人脸照，自动填充左侧标签；仍可随时手动修改。
                </p>
              </div>
            </a-col>
          </a-row>
        </a-form>

        <a-divider />

        <div v-if="adviceText" class="advice">
          <div class="advice-head">
            <div class="advice-title">建议结果</div>
          </div>
          <pre class="advice-pre">{{ adviceText }}</pre>
        </div>
        <a-empty v-else description="填写信息或上传照片识别后点击生成" />

        <a-divider />

        <div class="history-head">
          <div class="advice-title">历史记录</div>
        </div>
        <div v-if="adviceHistory.length" class="history-list">
          <div v-for="item in adviceHistory" :key="item.id" class="history-item">
            <div class="history-row">
              <span class="history-time">{{ item.time }}</span>
              <a-space>
                <a-button size="small" @click="viewHistoryDetail(item)">查看详情</a-button>
                <a-button size="small" danger @click="removeHistory(item.id)">删除</a-button>
              </a-space>
            </div>
            <div class="history-summary">{{ item.summary }}</div>
          </div>
        </div>
        <a-empty v-else description="暂无历史记录" />
      </section>
    </div>

    <a-modal v-model:open="historyDetailVisible" title="历史记录详情" :width="860" :footer="null">
      <div v-if="currentHistoryDetail" class="detail-wrap">
        <div class="detail-meta">生成时间：{{ currentHistoryDetail.time }}</div>
        <div class="detail-form">
          <div>
            <strong>脸型：</strong>{{ currentHistoryDetail.adviceForm.faceShape || '未填写' }}
          </div>
          <div>
            <strong>肤色：</strong>{{ currentHistoryDetail.adviceForm.skinTone || '未填写' }}
          </div>
          <div>
            <strong>五官特点：</strong
            >{{
              currentHistoryDetail.adviceForm.features?.length
                ? currentHistoryDetail.adviceForm.features.join('、')
                : '未填写'
            }}
          </div>
          <div>
            <strong>可见皮肤状态：</strong
            >{{
              currentHistoryDetail.adviceForm.skinVisible?.length
                ? currentHistoryDetail.adviceForm.skinVisible.join('、')
                : '未填写'
            }}
          </div>
          <div>
            <strong>三庭五眼倾向：</strong
            >{{
              currentHistoryDetail.adviceForm.faceRatio?.length
                ? currentHistoryDetail.adviceForm.faceRatio.join('、')
                : '未填写'
            }}
          </div>
          <div>
            <strong>适合妆容风格：</strong
            >{{
              currentHistoryDetail.adviceForm.makeupStyles?.length
                ? currentHistoryDetail.adviceForm.makeupStyles.join('、')
                : '未填写'
            }}
          </div>
          <div>
            <strong>拍摄主题/场景：</strong
            >{{ currentHistoryDetail.adviceForm.shootTheme || '未填写' }}
          </div>
          <div>
            <strong>风格关键词：</strong>{{ currentHistoryDetail.adviceForm.keywords || '未填写' }}
          </div>
          <div>
            <strong>其他补充：</strong>{{ currentHistoryDetail.adviceForm.notes || '未填写' }}
          </div>
        </div>
        <pre class="advice-pre detail-pre">{{ currentHistoryDetail.adviceText }}</pre>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { aiApi, type MakeupAdvisorFaceAnalysis } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

const authStore = useAuthStore();

/** 与 axios 拦截器 + Nest 包装结构兼容 */
function unwrapAiBody<T>(raw: unknown): T {
  const r = raw as { data?: unknown };
  let v: unknown = r?.data ?? raw;
  if (v && typeof v === 'object' && 'data' in v && (v as { data: unknown }).data !== undefined) {
    v = (v as { data: unknown }).data;
  }
  return v as T;
}

async function compressImageToJpegDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传 JPG/PNG/WebP 图片');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 1024;
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, maxSide / Math.max(w, h, 1));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    bitmap.close?.();
  }
}

const photoPreview = ref<string>('');
const photoDataUrl = ref<string>('');
const recognizeLoading = ref(false);

async function onPhotoChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const url = await compressImageToJpegDataUrl(file);
    photoDataUrl.value = url;
    photoPreview.value = url;
  } catch (e: unknown) {
    message.error((e as Error)?.message || '图片处理失败');
  }
}

function clearPhoto() {
  photoPreview.value = '';
  photoDataUrl.value = '';
}

function formatReqError(e: unknown): string {
  const er = e as { statusCode?: number; message?: string | string[] };
  const m = er?.message;
  const text = Array.isArray(m) ? m.join('；') : typeof m === 'string' ? m.trim() : '';
  if (text) return text;
  return '识别失败：请在后端 .env 配置 VOLCES_VISION_CHAT_MODEL（方舟支持图片理解的接入点 ID，如 ep-xxx），与 VOLCES_API_KEY 配合使用';
}

async function recognizeFromPhotos() {
  if (!photoDataUrl.value) {
    message.warning('请先上传照片');
    return;
  }
  recognizeLoading.value = true;
  const closeLoading = message.loading({
    content: '正在识别面部特征…',
    duration: 0,
    key: 'makeup-face-recognize',
  });
  try {
    const raw = await aiApi.analyzeFaceForMakeupAdvisor({
      photo: photoDataUrl.value,
    });
    const data = unwrapAiBody<MakeupAdvisorFaceAnalysis>(raw);
    if (data.faceShape) adviceForm.faceShape = data.faceShape;
    if (data.skinTone) adviceForm.skinTone = data.skinTone;
    if (Array.isArray(data.features) && data.features.length) {
      adviceForm.features = [...data.features].slice(0, 8);
    }
    if (Array.isArray(data.skinVisible) && data.skinVisible.length) {
      adviceForm.skinVisible = [...data.skinVisible].slice(0, 5);
    }
    if (Array.isArray(data.faceRatio) && data.faceRatio.length) {
      adviceForm.faceRatio = [...data.faceRatio].slice(0, 5);
    }
    if (Array.isArray(data.makeupStyles) && data.makeupStyles.length) {
      adviceForm.makeupStyles = [...data.makeupStyles].slice(0, 3);
    }
    const tip = data.rawNote ? ` ${data.rawNote}` : '';
    message.success(`已填充脸型/肤色/五官与扩展项。${tip}`.trim());
  } catch (e: unknown) {
    console.error(e);
    message.error(formatReqError(e));
  } finally {
    closeLoading();
    recognizeLoading.value = false;
  }
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
  '平眉',
  '挑眉',
  '弯眉',
  '眉峰明显',
  '眉毛偏粗',
  '眉毛偏细',
];

const skinVisibleOptions = [
  '未见明显瑕疵',
  '略有暗沉',
  '可见泛红',
  '可见痘印',
  'T区油光/毛孔可见',
  '干燥起皮可见',
];

const faceRatioOptions = [
  '上庭略长',
  '上庭略短',
  '中庭略长',
  '中庭略短',
  '下庭略长',
  '下庭略短',
  '眼距略宽',
  '眼距略窄',
  '三庭比例较均衡',
  '五眼比例较均衡',
];

const makeupStyleOptions = [
  '可爱',
  '御姐',
  '清冷',
  '温柔知性',
  '元气少女',
  '气场全开',
  '伪素颜',
  '复古文艺',
  '轻熟优雅',
];

function onFeaturesChange(v: string[]) {
  adviceForm.features = v.slice(0, 8);
}
function onSkinVisibleChange(v: string[]) {
  adviceForm.skinVisible = v.slice(0, 5);
}
function onFaceRatioChange(v: string[]) {
  adviceForm.faceRatio = v.slice(0, 5);
}
function onMakeupStylesChange(v: string[]) {
  adviceForm.makeupStyles = v.slice(0, 3);
}

const adviceForm = reactive({
  faceShape: undefined as string | undefined,
  skinTone: undefined as string | undefined,
  features: [] as string[],
  skinVisible: [] as string[],
  faceRatio: [] as string[],
  makeupStyles: [] as string[],
  shootTheme: '',
  keywords: '',
  notes: '',
});

const adviceLoading = ref(false);
const adviceText = ref('');
type AdviceHistoryItem = {
  id: string;
  time: string;
  summary: string;
  adviceText: string;
  adviceForm: {
    faceShape?: string;
    skinTone?: string;
    features?: string[];
    skinVisible?: string[];
    faceRatio?: string[];
    makeupStyles?: string[];
    shootTheme?: string;
    keywords?: string;
    notes?: string;
  };
};
const adviceHistory = ref<AdviceHistoryItem[]>([]);
const historyDetailVisible = ref(false);
const currentHistoryDetail = ref<AdviceHistoryItem | null>(null);
const ADVICE_STORAGE_KEY = computed(
  () => `worker_makeup_advice_state_v2_${authStore.user?.id ?? 'guest'}`
);

const canGenerateAdvice = computed(() => {
  return (
    String(adviceForm.faceShape || '').trim() ||
    String(adviceForm.skinTone || '').trim() ||
    (Array.isArray(adviceForm.features) && adviceForm.features.length > 0) ||
    (Array.isArray(adviceForm.skinVisible) && adviceForm.skinVisible.length > 0) ||
    (Array.isArray(adviceForm.faceRatio) && adviceForm.faceRatio.length > 0) ||
    (Array.isArray(adviceForm.makeupStyles) && adviceForm.makeupStyles.length > 0) ||
    String(adviceForm.shootTheme || '').trim() ||
    String(adviceForm.keywords || '').trim() ||
    String(adviceForm.notes || '').trim()
  );
});

function buildAdvicePrompt() {
  const parts: string[] = [];
  parts.push('你是一位资深妆造师，需要给旅拍客户输出“可执行的妆容建议方案”。');
  parts.push('请按以下结构输出，语言简洁但专业、可落地：');
  parts.push(
    '输出要求：不要使用 Markdown 语法，不要出现 * 号、** 加粗、# 标题、- 列表符。请用纯文本（中文）输出。'
  );
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
  parts.push(`可见皮肤状态（非诊断）：${(adviceForm.skinVisible || []).join('、') || '未提供'}`);
  parts.push(`三庭五眼大致倾向：${(adviceForm.faceRatio || []).join('、') || '未提供'}`);
  parts.push(`适合妆容风格：${(adviceForm.makeupStyles || []).join('、') || '未提供'}`);
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
    const cleaned = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^\s*[-•]\s+/gm, '')
      .replace(/^\s*#+\s*/gm, '')
      .trim();
    adviceText.value = cleaned || '（未获取到建议内容，请稍后重试）';
    if (adviceText.value) {
      const summary =
        adviceText.value.length > 60 ? `${adviceText.value.slice(0, 60)}...` : adviceText.value;
      adviceHistory.value = [
        {
          id: String(Date.now()),
          time: new Date().toLocaleString('zh-CN'),
          summary,
          adviceText: adviceText.value,
          adviceForm: {
            faceShape: adviceForm.faceShape,
            skinTone: adviceForm.skinTone,
            features: Array.isArray(adviceForm.features) ? [...adviceForm.features] : [],
            skinVisible: Array.isArray(adviceForm.skinVisible) ? [...adviceForm.skinVisible] : [],
            faceRatio: Array.isArray(adviceForm.faceRatio) ? [...adviceForm.faceRatio] : [],
            makeupStyles: Array.isArray(adviceForm.makeupStyles)
              ? [...adviceForm.makeupStyles]
              : [],
            shootTheme: adviceForm.shootTheme,
            keywords: adviceForm.keywords,
            notes: adviceForm.notes,
          },
        },
        ...adviceHistory.value,
      ].slice(0, 30);
    }
    persistAdviceState();
    message.success('妆容建议已生成');
  } catch (e: any) {
    message.error(e?.message || '生成建议失败，请重试');
  } finally {
    adviceLoading.value = false;
  }
}

function persistAdviceState() {
  try {
    const payload = {
      adviceForm: {
        faceShape: adviceForm.faceShape,
        skinTone: adviceForm.skinTone,
        features: Array.isArray(adviceForm.features) ? [...adviceForm.features] : [],
        skinVisible: Array.isArray(adviceForm.skinVisible) ? [...adviceForm.skinVisible] : [],
        faceRatio: Array.isArray(adviceForm.faceRatio) ? [...adviceForm.faceRatio] : [],
        makeupStyles: Array.isArray(adviceForm.makeupStyles) ? [...adviceForm.makeupStyles] : [],
        shootTheme: adviceForm.shootTheme,
        keywords: adviceForm.keywords,
        notes: adviceForm.notes,
      },
      adviceText: adviceText.value,
      adviceHistory: adviceHistory.value,
    };
    sessionStorage.setItem(ADVICE_STORAGE_KEY.value, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function restoreAdviceState() {
  try {
    const raw = sessionStorage.getItem(ADVICE_STORAGE_KEY.value);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      adviceForm?: {
        faceShape?: string;
        skinTone?: string;
        features?: string[];
        skinVisible?: string[];
        faceRatio?: string[];
        makeupStyles?: string[];
        shootTheme?: string;
        keywords?: string;
        notes?: string;
      };
      adviceText?: string;
      adviceHistory?: AdviceHistoryItem[];
    };
    const form = parsed.adviceForm || {};
    adviceForm.faceShape = form.faceShape || undefined;
    adviceForm.skinTone = form.skinTone || undefined;
    adviceForm.features = Array.isArray(form.features) ? form.features : [];
    adviceForm.skinVisible = Array.isArray(form.skinVisible) ? form.skinVisible : [];
    adviceForm.faceRatio = Array.isArray(form.faceRatio) ? form.faceRatio : [];
    adviceForm.makeupStyles = Array.isArray(form.makeupStyles) ? form.makeupStyles : [];
    adviceForm.shootTheme = form.shootTheme || '';
    adviceForm.keywords = form.keywords || '';
    adviceForm.notes = form.notes || '';
    adviceText.value = parsed.adviceText || '';
    adviceHistory.value = Array.isArray(parsed.adviceHistory)
      ? parsed.adviceHistory.map((h) => {
          const f = h.adviceForm || {};
          return {
            ...h,
            adviceForm: {
              faceShape: f.faceShape,
              skinTone: f.skinTone,
              features: Array.isArray(f.features) ? f.features : [],
              skinVisible: Array.isArray(f.skinVisible) ? f.skinVisible : [],
              faceRatio: Array.isArray(f.faceRatio) ? f.faceRatio : [],
              makeupStyles: Array.isArray(f.makeupStyles) ? f.makeupStyles : [],
              shootTheme: f.shootTheme ?? '',
              keywords: f.keywords ?? '',
              notes: f.notes ?? '',
            },
          };
        })
      : [];
  } catch {
    // ignore
  }
}

function clearAdviceRecords() {
  adviceForm.faceShape = undefined;
  adviceForm.skinTone = undefined;
  adviceForm.features = [];
  adviceForm.skinVisible = [];
  adviceForm.faceRatio = [];
  adviceForm.makeupStyles = [];
  adviceForm.shootTheme = '';
  adviceForm.keywords = '';
  adviceForm.notes = '';
  adviceText.value = '';
  // 仅清空当前输入与当前建议，历史记录保留
  persistAdviceState();
  message.success('已清空当前妆容建议');
}

function removeHistory(id: string) {
  adviceHistory.value = adviceHistory.value.filter((item) => item.id !== id);
  persistAdviceState();
  message.success('已删除历史记录');
}

function viewHistoryDetail(item: AdviceHistoryItem) {
  currentHistoryDetail.value = item;
  historyDetailVisible.value = true;
}

async function copyAdvice() {
  if (!adviceText.value.trim()) return;
  try {
    await window.navigator.clipboard.writeText(adviceText.value);
    message.success('已复制');
  } catch {
    message.warning('复制失败，请手动选择文本复制');
  }
}

onMounted(() => {
  authStore.initializeAuth();
  restoreAdviceState();
});

watch(
  () => [
    adviceForm.faceShape,
    adviceForm.skinTone,
    adviceForm.features,
    adviceForm.skinVisible,
    adviceForm.faceRatio,
    adviceForm.makeupStyles,
    adviceForm.shootTheme,
    adviceForm.keywords,
    adviceForm.notes,
    adviceText.value,
  ],
  () => {
    persistAdviceState();
  },
  { deep: true }
);
</script>

<style scoped lang="less">
/* stylelint-disable */
.page {
  --pink: #ff6b8b;
  --r: 12px;
  padding-top: 0;
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
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}
.grid.single {
  grid-template-columns: 1fr;
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
  /* 上、左留白略大，标题与表单不贴边 */
  padding: 22px 24px 18px 22px;
  @media (max-width: 1200px) {
    grid-column: auto;
  }
}
.panel-h {
  margin-bottom: 14px;
}
.traits-photo-row {
  margin-bottom: 2px;
}
.traits-col {
  min-width: 0;
}
@media (min-width: 992px) {
  .photo-col {
    display: flex;
    justify-content: flex-end;
  }
}
.photo-analyze-panel {
  width: 100%;
  max-width: 264px;
  margin-top: -40px;
  margin-left: auto;
  margin-right: auto;
  padding: 9px 9px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 107, 139, 0.28);
  background: linear-gradient(165deg, #fff 0%, #fff5f8 100%);
  box-shadow: 0 6px 16px rgba(255, 107, 139, 0.08);
}
@media (min-width: 992px) {
  .photo-analyze-panel {
    margin-left: auto;
    margin-right: 25px;
  }
}
.photo-analyze-title {
  font-weight: 800;
  font-size: 13px;
  color: #be185d;
  margin-bottom: 8px;
}
.slot-upload {
  display: block;
  cursor: pointer;
  margin: 0 0 5px;
}
.slot-preview {
  aspect-ratio: 3 / 4;
  border-radius: 9px;
  border: 1px dashed rgba(255, 107, 139, 0.45);
  background: rgba(255, 255, 255, 0.85);
  display: grid;
  place-items: center;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.slot-upload:hover .slot-preview {
  border-color: rgba(236, 72, 153, 0.75);
  background: #fff;
}
.slot-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slot-placeholder {
  font-size: 11px;
  color: #9ca3af;
  padding: 6px;
  text-align: center;
  line-height: 1.4;
}
.slot-remove {
  padding: 0;
  height: auto;
  font-size: 12px;
  align-self: center;
}
.recognize-btn {
  border-radius: 999px;
  margin-bottom: 6px;
}
.photo-analyze-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: #9ca3af;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.panel-title {
  font-weight: 900;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
  margin-bottom: 4px;
}
.panel-sub {
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.5;
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

:deep(.ant-btn.pill:hover),
:deep(.ant-btn.pill:focus) {
  background: #f0547b !important;
  border-color: #f0547b !important;
  color: #fff !important;
}

:deep(.ant-btn.pill:active) {
  background: #e23f67 !important;
  border-color: #e23f67 !important;
  color: #fff !important;
}

:deep(.ant-btn.pill.ghost:hover),
:deep(.ant-btn.pill.ghost:focus) {
  background: rgba(255, 107, 139, 0.14) !important;
  border-color: rgba(240, 84, 123, 0.55) !important;
  color: #c2185b !important;
}

:deep(.ant-btn.pill.ghost:active) {
  background: rgba(255, 107, 139, 0.18) !important;
  border-color: rgba(226, 63, 103, 0.6) !important;
  color: #ad1457 !important;
}

/* 与「其他补充」间距收紧（按钮已放在左侧列内，不再被照片栏撑高） */
:deep(.notes-field-item.ant-form-item) {
  margin-bottom: 4px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 55px;
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
  font-size: 18px;
  line-height: 1.3;
}
.advice-meta {
  color: #94a3b8;
  font-size: 12px;
}
.advice-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff5f7;
  color: #334155;
  border: 1px solid rgba(255, 107, 139, 0.18);
  border-radius: 12px;
  padding: 12px 14px;
  line-height: 1.8;
  font-size: 15px;
}

.history-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.history-list {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.history-item {
  border: 1px solid rgba(255, 107, 139, 0.2);
  background: rgba(255, 245, 247, 0.65);
  border-radius: 10px;
  padding: 10px 12px;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.history-time {
  font-size: 12px;
  color: #94a3b8;
}

.history-summary {
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.detail-wrap {
  display: grid;
  gap: 12px;
}

.detail-meta {
  color: #64748b;
  font-size: 13px;
}

.detail-form {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fffafc;
  border: 1px solid rgba(255, 107, 139, 0.15);
  color: #475569;
  font-size: 13px;
}

.detail-pre {
  margin-top: 4px;
}
</style>
