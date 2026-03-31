<!-- stylelint-disable -->
<template>
  <div class="page">
    <div class="grid single">
      <section class="panel full">
        <div class="panel-h">
          <div class="panel-title">妆容建议方案</div>
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
            <a-button class="pill ghost" @click="clearAdviceRecords">清空记录</a-button>
          </div>
        </a-form>

        <a-divider />

        <div v-if="adviceText" class="advice">
          <div class="advice-head">
            <div class="advice-title">建议结果</div>
          </div>
          <pre class="advice-pre">{{ adviceText }}</pre>
        </div>
        <a-empty v-else description="填写信息后点击生成" />

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
import { aiApi } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

const authStore = useAuthStore();

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
type AdviceHistoryItem = {
  id: string;
  time: string;
  summary: string;
  adviceText: string;
  adviceForm: {
    faceShape?: string;
    skinTone?: string;
    features: string[];
    shootTheme: string;
    keywords: string;
    notes: string;
  };
};
const adviceHistory = ref<AdviceHistoryItem[]>([]);
const historyDetailVisible = ref(false);
const currentHistoryDetail = ref<AdviceHistoryItem | null>(null);
const ADVICE_STORAGE_KEY = computed(
  () => `worker_makeup_advice_state_v1_${authStore.user?.id ?? 'guest'}`
);

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
    adviceForm.shootTheme = form.shootTheme || '';
    adviceForm.keywords = form.keywords || '';
    adviceForm.notes = form.notes || '';
    adviceText.value = parsed.adviceText || '';
    adviceHistory.value = Array.isArray(parsed.adviceHistory) ? parsed.adviceHistory : [];
  } catch {
    // ignore
  }
}

function clearAdviceRecords() {
  adviceForm.faceShape = undefined;
  adviceForm.skinTone = undefined;
  adviceForm.features = [];
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
    await navigator.clipboard.writeText(adviceText.value);
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
  @media (max-width: 1200px) {
    grid-column: auto;
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
  font-size: 18px;
  line-height: 1.3;
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

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
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
