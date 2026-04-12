<!-- stylelint-disable -->
<template>
  <div class="page">
    <div class="grid single">
      <section class="panel full">
        <div class="panel-h">
          <div class="panel-title">智能拍摄建议</div>
        </div>

        <a-form layout="vertical" class="form">
          <a-row :gutter="[16, 16]" class="traits-photo-row" align="top">
            <a-col :xs="24" :lg="16" :xl="17" class="traits-col">
              <a-row :gutter="[14, 10]">
                <a-col :xs="24" :md="12">
                  <a-form-item label="拍摄场景 / 主题（可选）">
                    <a-select
                      v-model:value="shootForm.sceneHint"
                      allow-clear
                      placeholder="选择或留空由模型综合判断"
                    >
                      <a-select-option v-for="x in sceneOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="12">
                  <a-form-item label="客户类型（可选）">
                    <a-select
                      v-model:value="shootForm.clientType"
                      allow-clear
                      placeholder="如：双人新人"
                    >
                      <a-select-option v-for="x in clientOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="[14, 10]">
                <a-col :xs="24" :md="12">
                  <a-form-item label="镜头 / 焦段偏好（可选）">
                    <a-select
                      v-model:value="shootForm.lensPreference"
                      allow-clear
                      placeholder="如：偏好 85 定焦虚化"
                    >
                      <a-select-option v-for="x in lensOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="12">
                  <a-form-item label="光线条件（可选）">
                    <a-select
                      v-model:value="shootForm.lightingCondition"
                      allow-clear
                      placeholder="选择或留空由模型综合判断"
                    >
                      <a-select-option v-for="x in lightingOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="[14, 10]">
                <a-col :xs="24" :md="12">
                  <a-form-item label="拍摄风格（可选）">
                    <a-select
                      v-model:value="shootForm.shootStyle"
                      allow-clear
                      placeholder="选择或留空由模型综合判断"
                    >
                      <a-select-option v-for="x in styleOptions" :key="x" :value="x">{{
                        x
                      }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="[14, 10]">
                <a-col :span="24">
                  <a-form-item label="注意事项（可选）">
                    <a-textarea
                      v-model:value="shootForm.notes"
                      :rows="3"
                      :maxlength="2000"
                      show-count
                      placeholder="如：客户不爱摆拍、尽量拍左脸、忌仰拍、需兼顾长辈合影等"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <div class="actions">
                <a-button
                  type="primary"
                  class="pill"
                  :loading="adviceLoading"
                  :disabled="!photoDataUrl"
                  @click="generateAdvice"
                >
                  {{ adviceLoading ? '正在生成建议…' : '生成拍摄建议方案' }}
                </a-button>
                <a-button class="pill ghost" :disabled="!adviceText" @click="copyAdvice">
                  复制建议
                </a-button>
                <a-button class="pill ghost" @click="clearCurrentAdvice">清空当前方案</a-button>
              </div>
            </a-col>
            <a-col :xs="24" :lg="8" :xl="7" class="photo-col">
              <div class="photo-analyze-panel">
                <div class="photo-analyze-title">参考证件照 / 正面人像</div>
                <label class="slot-upload">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="sr-only"
                    @change="onPhotoChange"
                  />
                  <div class="slot-preview">
                    <img v-if="photoPreview" :src="photoPreview" alt="参考照预览" />
                    <span v-else class="slot-placeholder">点击上传证件照或清晰正面胸像</span>
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
                <p class="photo-analyze-hint">
                  建议正面、肩颈完整、光线均匀；生成会压缩后上传，请勿上传过大原图。
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
        <a-empty v-else description="上传参考照并点击生成，查看构图、机位与拍摄流程等建议" />

        <a-divider />

        <div class="history-head">
          <div class="advice-title">历史记录</div>
        </div>
        <div v-if="adviceHistory.length" class="history-list">
          <div v-for="item in adviceHistory" :key="item.id" class="history-item">
            <div class="history-row">
              <span class="history-time">{{ item.time }}</span>
              <a-space>
                <a-button size="small" class="history-detail-btn" @click="viewHistoryDetail(item)"
                  >查看详情</a-button
                >
                <a-button size="small" danger @click="removeHistory(item.id)">删除</a-button>
              </a-space>
            </div>
            <div class="history-summary">{{ item.summary }}</div>
          </div>
        </div>
        <a-empty v-else description="暂无历史记录" />

        <a-modal
          v-model:open="historyDetailVisible"
          title="历史记录详情"
          :width="860"
          :footer="null"
        >
          <div v-if="currentHistoryDetail" class="detail-wrap">
            <div class="detail-meta">生成时间：{{ currentHistoryDetail.time }}</div>
            <div class="detail-form">
              <div>
                <strong>场景：</strong>{{ currentHistoryDetail.shootForm.sceneHint || '未选' }}
              </div>
              <div>
                <strong>客户：</strong>{{ currentHistoryDetail.shootForm.clientType || '未选' }}
              </div>
              <div>
                <strong>镜头偏好：</strong
                >{{ currentHistoryDetail.shootForm.lensPreference || '未选' }}
              </div>
              <div>
                <strong>光线条件：</strong
                >{{ currentHistoryDetail.shootForm.lightingCondition || '未选' }}
              </div>
              <div>
                <strong>拍摄风格：</strong>{{ currentHistoryDetail.shootForm.shootStyle || '未选' }}
              </div>
              <div>
                <strong>注意事项：</strong
                >{{ (currentHistoryDetail.shootForm.notes || '').trim() || '无' }}
              </div>
            </div>
            <pre class="advice-pre detail-pre">{{ currentHistoryDetail.adviceText }}</pre>
          </div>
        </a-modal>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { aiApi } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

const sceneOptions = [
  '室内棚拍',
  '海边旅拍',
  '古城街拍',
  '森系外景',
  '夕阳氛围感',
  '汉服外景',
  '草坪婚礼',
  '城市天台夜景',
];

const clientOptions = ['新娘', '新郎', '双人新人', '轻婚纱旅拍'];

const lensOptions = [
  '变焦抓拍为主（24-70）',
  '定焦虚化人像（50/85）',
  '长焦压缩空间（70-200）',
  '一镜走天下（28-200）',
  '广角环境叙事（16-35）',
];

const lightingOptions = [
  '自然光为主',
  '阴天柔光',
  '逆光 / 侧逆光',
  '夜景 / 弱光环境',
  '棚内人造光（常亮 / 闪光灯）',
  '混合光（室内外衔接）',
];

const styleOptions = [
  '纪实抓拍',
  '电影感叙事',
  '清新日系',
  '复古胶片感',
  '韩式简约清透',
  '高级灰肖像',
  '甜美浪漫',
];

function unwrapAiBody<T>(raw: unknown): T {
  const r = raw as { data?: unknown };
  let v: unknown = r?.data ?? r;
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
    const maxSide = 1280;
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
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close?.();
  }
}

const authStore = useAuthStore();
const photoPreview = ref('');
const photoDataUrl = ref('');
const adviceLoading = ref(false);
const adviceText = ref('');

const shootForm = reactive({
  sceneHint: undefined as string | undefined,
  clientType: undefined as string | undefined,
  lensPreference: undefined as string | undefined,
  lightingCondition: undefined as string | undefined,
  shootStyle: undefined as string | undefined,
  notes: '',
});

type ShootHistoryItem = {
  id: string;
  time: string;
  summary: string;
  adviceText: string;
  shootForm: {
    sceneHint?: string;
    clientType?: string;
    lensPreference?: string;
    lightingCondition?: string;
    shootStyle?: string;
    notes?: string;
  };
};

const adviceHistory = ref<ShootHistoryItem[]>([]);
const historyDetailVisible = ref(false);
const currentHistoryDetail = ref<ShootHistoryItem | null>(null);

const STORAGE_KEY = computed(
  () => `worker_photographer_shoot_advice_v1_${authStore.user?.id ?? ''}`
);

async function onPhotoChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const url = await compressImageToJpegDataUrl(file);
    photoDataUrl.value = url;
    photoPreview.value = url;
    persistState();
  } catch (e: unknown) {
    message.error((e as Error)?.message || '图片处理失败');
  }
}

function clearPhoto() {
  photoPreview.value = '';
  photoDataUrl.value = '';
  persistState();
}

async function generateAdvice() {
  if (!photoDataUrl.value) {
    message.warning('请先上传参考证件照或正面人像');
    return;
  }
  adviceLoading.value = true;
  try {
    const raw = await aiApi.photographerShootingAdvice({
      photo: photoDataUrl.value,
      sceneHint: shootForm.sceneHint,
      clientType: shootForm.clientType,
      lensPreference: shootForm.lensPreference,
      lightingCondition: shootForm.lightingCondition,
      shootStyle: shootForm.shootStyle,
      notes: shootForm.notes?.trim() || undefined,
    });
    const data = unwrapAiBody<{ adviceText?: string }>(raw);
    const text = String(data?.adviceText || '').trim();
    const cleaned = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^\s*[-•]\s+/gm, '')
      .replace(/^\s*#+\s*/gm, '')
      .trim();
    adviceText.value = cleaned || '（未获取到建议内容，请稍后重试）';
    if (adviceText.value) {
      const summary =
        adviceText.value.length > 70 ? `${adviceText.value.slice(0, 70)}…` : adviceText.value;
      adviceHistory.value = [
        {
          id: String(Date.now()),
          time: new Date().toLocaleString('zh-CN'),
          summary,
          adviceText: adviceText.value,
          shootForm: {
            sceneHint: shootForm.sceneHint,
            clientType: shootForm.clientType,
            lensPreference: shootForm.lensPreference,
            lightingCondition: shootForm.lightingCondition,
            shootStyle: shootForm.shootStyle,
            notes: shootForm.notes?.trim() || undefined,
          },
        },
        ...adviceHistory.value,
      ].slice(0, 30);
    }
    persistState();
    message.success('拍摄建议已生成');
  } catch (e: any) {
    message.error(e?.message || '生成失败，请重试');
  } finally {
    adviceLoading.value = false;
  }
}

function resetShootDraftOnly() {
  adviceText.value = '';
  shootForm.sceneHint = undefined;
  shootForm.clientType = undefined;
  shootForm.lensPreference = undefined;
  shootForm.lightingCondition = undefined;
  shootForm.shootStyle = undefined;
  shootForm.notes = '';
  photoPreview.value = '';
  photoDataUrl.value = '';
}

function clearCurrentAdvice() {
  resetShootDraftOnly();
  persistState();
  message.success('已清空当前方案（表单、参考照与建议正文，历史记录保留）');
}

function persistState() {
  try {
    const uid = authStore.user?.id;
    if (uid === undefined || uid === null || uid === '') return;
    const payload = {
      shootForm: {
        sceneHint: shootForm.sceneHint,
        clientType: shootForm.clientType,
        lensPreference: shootForm.lensPreference,
        lightingCondition: shootForm.lightingCondition,
        shootStyle: shootForm.shootStyle,
        notes: shootForm.notes,
      },
      adviceText: adviceText.value,
      adviceHistory: adviceHistory.value,
      photoDataUrl: photoDataUrl.value,
      photoPreview: photoPreview.value,
    };
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function restoreState() {
  try {
    if (authStore.user?.id == null || authStore.user?.id === '') return;
    const raw = localStorage.getItem(STORAGE_KEY.value);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      shootForm?: {
        sceneHint?: string;
        clientType?: string;
        lensPreference?: string;
        lightingCondition?: string;
        shootStyle?: string;
        notes?: string;
      };
      adviceText?: string;
      adviceHistory?: ShootHistoryItem[];
      photoDataUrl?: string;
      photoPreview?: string;
    };
    shootForm.sceneHint = parsed.shootForm?.sceneHint;
    shootForm.clientType = parsed.shootForm?.clientType;
    shootForm.lensPreference = parsed.shootForm?.lensPreference;
    shootForm.lightingCondition = parsed.shootForm?.lightingCondition;
    shootForm.shootStyle = parsed.shootForm?.shootStyle;
    shootForm.notes = parsed.shootForm?.notes ?? '';
    adviceText.value = parsed.adviceText || '';
    adviceHistory.value = Array.isArray(parsed.adviceHistory) ? parsed.adviceHistory : [];
    photoDataUrl.value = parsed.photoDataUrl || '';
    photoPreview.value = parsed.photoPreview || '';
  } catch {
    // ignore
  }
}

function removeHistory(id: string) {
  adviceHistory.value = adviceHistory.value.filter((i) => i.id !== id);
  persistState();
  message.success('已删除该条历史');
}

function viewHistoryDetail(item: ShootHistoryItem) {
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
  restoreState();
});

watch(
  () => authStore.user?.id,
  (id, oldId) => {
    if ((id == null || id === '') && oldId != null && oldId !== '') {
      resetShootDraftOnly();
    }
    if (id != null && id !== '') restoreState();
  }
);

watch(
  () => [
    shootForm.sceneHint,
    shootForm.clientType,
    shootForm.lensPreference,
    shootForm.lightingCondition,
    shootForm.shootStyle,
    shootForm.notes,
    adviceText.value,
    adviceHistory.value,
    photoDataUrl.value,
    photoPreview.value,
  ],
  () => persistState(),
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
  padding: 22px 24px 18px 22px;
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
  margin-top: -20px;
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
}
.photo-analyze-hint {
  margin: 6px 0 0;
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
  margin-bottom: 0;
}
.form {
  :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector),
  :deep(.ant-select-focused:not(.ant-select-disabled) .ant-select-selector),
  :deep(.ant-select-open:not(.ant-select-disabled) .ant-select-selector) {
    border-color: rgba(255, 107, 139, 0.78) !important;
    box-shadow: none !important;
  }

  :deep(textarea.ant-input:hover:not(:disabled)),
  :deep(textarea.ant-input:focus),
  :deep(.ant-input:not(:disabled):hover),
  :deep(.ant-input:focus),
  :deep(.ant-input-focused:not(.ant-input-disabled)) {
    border-color: rgba(255, 107, 139, 0.78) !important;
    box-shadow: none !important;
  }
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
/* 缩小「注意事项」与按钮行之间的留白（表单项默认 margin-bottom 较大） */
.traits-col > .ant-row:last-of-type :deep(.ant-form-item) {
  margin-bottom: 0;
}
/* 字数统计与输入框之间仍占一行，略上移按钮行 */
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: -6px;
}
.advice-head {
  margin-bottom: 8px;
}
.advice-title {
  font-weight: 900;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
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
  margin-bottom: 10px;
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
.history-list :deep(.history-detail-btn.ant-btn-default) {
  border-color: rgba(255, 107, 139, 0.42);
  color: #d6336c;
  background: #fff;
  box-shadow: none;
}
.history-list :deep(.history-detail-btn.ant-btn-default:hover),
.history-list :deep(.history-detail-btn.ant-btn-default:focus) {
  border-color: rgba(240, 84, 123, 0.85) !important;
  color: #be185d !important;
  background: rgba(255, 107, 139, 0.06) !important;
  box-shadow: none !important;
}
.history-list :deep(.history-detail-btn.ant-btn-default:active) {
  border-color: #e23f67 !important;
  color: #9d174d !important;
  background: rgba(255, 107, 139, 0.1) !important;
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
  font-size: 13px;
  color: #475569;
}
.detail-pre {
  margin-top: 4px;
}
</style>
