<template>
  <div class="page">
    <div class="head">
      <div class="filters">
        <a-space>
          <a-select v-model:value="status" class="pill" style="width: 140px">
            <a-select-option value="all">全部状态</a-select-option>
            <a-select-option value="pending">待确认</a-select-option>
            <a-select-option value="confirmed">已确认</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
          </a-select>
          <a-date-picker
            v-model:value="date"
            class="pill"
            placeholder="按日期筛选"
            :locale="datePickerLocaleZhCN"
            popup-class-name="orders-filter-date-popup"
          />
          <a-button class="pill ghost" @click="load">筛选</a-button>
        </a-space>
      </div>
    </div>

    <div class="grid">
      <section class="list">
        <div
          v-for="o in filtered"
          :key="o.id"
          class="order-card"
          :class="{ active: selected?.id === o.id }"
          @click="select(o)"
        >
          <div class="row1">
            <div class="name">{{ o.contactName || '客户' }}</div>
            <span class="status" :class="o.uiStatus">{{ statusLabel(o.uiStatus) }}</span>
          </div>
          <div class="row2">
            <span class="meta"><b>时间</b> {{ o.shootingDate || '-' }}</span>
            <span class="meta"><b>地点</b> {{ o.location || '-' }}</span>
          </div>
          <div class="row3">
            <span class="meta"><b>套餐</b> {{ o.packageName || '-' }}</span>
          </div>
        </div>
        <a-empty v-if="!loading && !filtered.length" description="暂无订单" />
      </section>

      <aside class="right">
        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">订单详情</div>
          </div>
          <div v-if="selected" class="detail">
            <div class="kv">
              <span class="k">客户姓名</span><span class="v">{{ selected.contactName }}</span>
            </div>
            <div class="kv">
              <span class="k">手机号</span><span class="v">{{ selected.phone }}</span>
            </div>
            <div class="kv">
              <span class="k">拍摄需求</span
              ><span class="v muted">{{ selected.remark || '—' }}</span>
            </div>
            <div class="kv">
              <span class="k">套餐内容</span><span class="v">{{ selected.packageName }}</span>
            </div>
            <div class="kv">
              <span class="k">沟通记录</span><span class="v muted">在「消息中心」查看</span>
            </div>
            <div class="kv">
              <span class="k">更多信息</span>
              <span class="v">
                <a-button type="link" size="small" style="padding-right: 0" @click="openDeepDetail">
                  查看详情
                </a-button>
              </span>
            </div>
          </div>
          <div v-else class="empty">请选择一条订单</div>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">操作</div>
          </div>
          <div class="btns">
            <a-button
              v-if="selected && selected.uiStatus === 'pending'"
              class="pill take-btn"
              @click="openTakeConfirm"
            >
              确认接单
            </a-button>
            <a-button type="primary" class="pill ghost" @click="reschedule">修改时间</a-button>
            <a-button type="primary" class="pill ghost" @click="contact">联系客户</a-button>
          </div>
        </div>
      </aside>
    </div>

    <a-modal
      v-model:open="takeConfirmOpen"
      title="确认接单"
      :confirm-loading="takeSubmitting"
      ok-text="确认接单"
      cancel-text="取消"
      centered
      class="take-confirm-modal"
      :ok-button-props="{
        class: 'take-ok-btn',
        style: {
          backgroundColor: '#ff6b8b',
          borderColor: '#ff6b8b',
          color: '#fff',
          boxShadow: 'none',
        },
      }"
      :cancel-button-props="{ class: 'take-cancel-btn' }"
      @ok="confirm"
    >
      <div class="confirm-body">是否确认接下该订单？</div>
    </a-modal>

    <a-modal
      v-model:open="rescheduleOpen"
      title="修改拍摄时间"
      :confirm-loading="rescheduleSubmitting"
      ok-text="确认修改"
      cancel-text="取消"
      :ok-button-props="{ class: 'take-ok-btn' }"
      :cancel-button-props="{ class: 'take-cancel-btn' }"
      @ok="submitReschedule"
    >
      <a-form layout="vertical">
        <a-form-item label="新拍摄日期">
          <a-date-picker
            v-model:value="rescheduleDate"
            style="width: 100%"
            :locale="datePickerLocaleZhCN"
            popup-class-name="reschedule-date-popup"
          />
        </a-form-item>
        <a-form-item label="备注（可选）">
          <a-input v-model:value="rescheduleNote" placeholder="如：客户有事，改到下周" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="deepDetailOpen"
      title="订单详细信息"
      :footer="null"
      :width="940"
      centered
      class="deep-detail-modal"
    >
      <div v-if="selected" class="deep-detail">
        <div class="deep-grid">
          <section class="deep-card">
            <div class="deep-title">客户证件照（示意轮播）</div>
            <a-carousel autoplay class="photo-carousel">
              <div v-for="src in demoIdPhotos" :key="src" class="photo-slide">
                <img :src="src" alt="证件照示意" />
              </div>
            </a-carousel>
            <div class="deep-tip">当前为示意图轮播，可替换为用户真实上传证件照。</div>
          </section>

          <section class="deep-card">
            <div class="deep-title">基础信息</div>
            <div class="deep-kv">
              <span>客户姓名</span><b>{{ selected.contactName || '-' }}</b>
            </div>
            <div class="deep-kv">
              <span>手机号</span><b>{{ selected.phone || '-' }}</b>
            </div>
            <div class="deep-kv">
              <span>人数</span><b>{{ selected.numberOfPeople || 1 }} 人</b>
            </div>
            <div class="deep-kv">
              <span>拍摄日期</span><b>{{ selected.shootingDate || '-' }}</b>
            </div>
            <div class="deep-kv">
              <span>地点</span><b>{{ selected.location || '-' }}</b>
            </div>
            <div class="deep-kv">
              <span>套餐</span><b>{{ selected.packageName || '-' }}</b>
            </div>
            <div class="deep-kv">
              <span>风格</span><b>{{ getStyleName(selected.style) }}</b>
            </div>
            <div class="deep-kv">
              <span>备注</span><b>{{ selected.remark || '无' }}</b>
            </div>
          </section>
        </div>

        <section class="deep-card tips-card">
          <div class="deep-title">拍摄建议（基于风格与人物证件照特征的通用建议）</div>
          <div class="tips-grid">
            <div class="tip-item">
              <span class="label">构图建议</span>
              <p>{{ shootingTips.composition }}</p>
            </div>
            <div class="tip-item">
              <span class="label">姿势引导</span>
              <p>{{ shootingTips.pose }}</p>
            </div>
            <div class="tip-item">
              <span class="label">机位与镜头</span>
              <p>{{ shootingTips.camera }}</p>
            </div>
            <div class="tip-item">
              <span class="label">参数建议</span>
              <p>{{ shootingTips.params }}</p>
            </div>
            <div class="tip-item">
              <span class="label">光线与场景</span>
              <p>{{ shootingTips.lighting }}</p>
            </div>
            <div class="tip-item">
              <span class="label">沟通技巧</span>
              <p>{{ shootingTips.communication }}</p>
            </div>
          </div>
        </section>

        <section class="deep-card checklist-card">
          <div class="deep-title">拍摄流程清单</div>
          <div class="process-flow">
            <div class="cycle-flow">
              <div class="cycle-center">拍摄执行</div>
              <div class="cycle-ring"></div>

              <div class="cycle-node n1">
                <span class="step">前期准备</span>
                <p>确认订单与器材</p>
              </div>
              <div class="cycle-node n2">
                <span class="step">到场沟通</span>
                <p>确认风格与需求</p>
              </div>
              <div class="cycle-node n3">
                <span class="step">主场景拍摄</span>
                <p>全中近特写推进</p>
              </div>
              <div class="cycle-node n4">
                <span class="step">细节补拍</span>
                <p>手部/眼神/裙摆</p>
              </div>
              <div class="cycle-node n5">
                <span class="step">创意镜头</span>
                <p>逆光/抓拍/前景</p>
              </div>
              <div class="cycle-node n6">
                <span class="step">收尾复核</span>
                <p>检查素材并交底</p>
              </div>

              <span class="cycle-arrow a1">↻</span>
              <span class="cycle-arrow a2">↻</span>
              <span class="cycle-arrow a3">↻</span>
            </div>
          </div>
        </section>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { httpClient } from '@/api/client';
import hero2Image from '@/assets/images/hero/hero2.jpg';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import { unwrapOrderListPayload } from '@/utils/workerOrders';
import datePickerLocaleZhCN from 'ant-design-vue/es/date-picker/locale/zh_CN';
import { message } from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

type UiStatus = 'pending' | 'confirmed' | 'completed';
type OrderRow = any & { uiStatus: UiStatus };
const styleMap: Record<string, string> = { ...TRAVEL_STYLE_LABELS };

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const rows = ref<OrderRow[]>([]);
const selected = ref<OrderRow | null>(null);

const status = ref<'all' | UiStatus>('all');
const date = ref<Dayjs | null>(null);

const rescheduleOpen = ref(false);
const rescheduleSubmitting = ref(false);
const rescheduleDate = ref<Dayjs | null>(null);
const rescheduleNote = ref('');
const takeConfirmOpen = ref(false);
const takeSubmitting = ref(false);
const deepDetailOpen = ref(false);
dayjs.locale('zh-cn');

const demoIdPhotos = [hero2Image];

const styleTipsMap: Record<
  string,
  {
    composition: string;
    pose: string;
    camera: string;
    params: string;
    lighting: string;
    communication: string;
  }
> = {
  romantic: {
    composition: '多用中近景与前景虚化，保留环境层次；人物置于三分线，突出情绪互动。',
    pose: '以对视、牵手、回眸、额头轻贴为主，动作幅度小但连续，抓取自然瞬间。',
    camera: '优先 50mm / 85mm，机位略低于眼平增强人物比例，适当环绕拍摄增强流动感。',
    params: '建议 f1.8-f2.8、1/250s 以上、ISO 100-400；移动抓拍可提高到 1/500s。',
    lighting: '黄金时段逆光更柔和，必要时补反光板；夜景可加小功率常亮灯补眼神光。',
    communication: '用情景问题引导（“第一次见面时的感觉”），比口令式摆拍更易出表情。',
  },
  classical: {
    composition: '偏对称与居中构图，利用门框、长廊、窗棂做几何引导线，强调仪式感。',
    pose: '动作收敛，手部线条要干净；站姿可微侧身 30°，避免正面僵硬。',
    camera: '35mm 交代环境，85mm 突出细节；机位稳定，少大幅度倾斜。',
    params: 'f2.8-f4 保证服饰细节，快门 1/200s 左右，ISO 100-320。',
    lighting: '以侧光塑形，控制高光溢出；室内优先自然窗光配柔光补光。',
    communication: '先给“标准动作”再引导微变化，逐步放松表情，保证片子稳定出片。',
  },
};

const shootingTips = computed(() => {
  const key = String(selected.value?.style || '').toLowerCase();
  return (
    styleTipsMap[key] || {
      composition: '使用三分法与留白，先拍全景交代环境，再拍中景与特写形成完整叙事。',
      pose: '优先从站姿、行走、回头这三组基础动作开始，逐步加入互动动作。',
      camera: '35mm 拍环境，50/85mm 拍人像；同一场景至少准备远中近三个机位。',
      params: '白天建议 f2.0-f2.8、1/250s、ISO 100-400；阴天可提升 ISO 保证快门。',
      lighting: '优先找侧逆光和干净背景，必要时用反光板补面部阴影，避免硬顶光。',
      communication: '先示范动作再让客户复现，及时正向反馈，减少紧张感提高表现力。',
    }
  );
});

const normalizeStatus = (o: any): UiStatus => {
  const s = String(o?.paymentStatus || '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (Number(o?.workerUserId || 0) > 0 || String(o?.workerTakenAt || '').trim()) return 'confirmed';
  return 'pending';
};

const load = async () => {
  loading.value = true;
  try {
    const res: any = await httpClient.get('/orders/worker');
    const list = unwrapOrderListPayload(res);
    rows.value = (Array.isArray(list) ? list : []).map((o: any) => ({
      ...o,
      uiStatus: normalizeStatus(o),
    }));
    if (rows.value.length && !selected.value) {
      selected.value = rows.value[0] ?? null;
    }
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const filtered = computed(() => {
  const d = date.value ? dayjs(date.value).format('YYYY-MM-DD') : '';
  return rows.value.filter((o) => {
    if (status.value !== 'all' && o.uiStatus !== status.value) return false;
    if (d && String(o.shootingDate || '').slice(0, 10) !== d) return false;
    return true;
  });
});

const select = (o: OrderRow) => {
  selected.value = o;
};

const statusLabel = (s: UiStatus) => {
  if (s === 'pending') return '待确认';
  if (s === 'confirmed') return '已确认';
  return '已完成';
};

const getStyleName = (style: string) => styleMap[style] || style || '-';

const openTakeConfirm = () => {
  if (!selected.value) {
    message.warning('请先选择一条订单');
    return;
  }
  takeConfirmOpen.value = true;
};

const confirm = () => {
  if (!selected.value) return;
  const id = Number(selected.value.id);
  if (!Number.isFinite(id)) return;
  takeSubmitting.value = true;
  httpClient
    .patch(`/orders/worker/${id}/take`)
    .then((res: any) => {
      const updated = (res?.data || res) as any;
      const idx = rows.value.findIndex((x) => Number(x.id) === id);
      if (idx !== -1) {
        rows.value[idx] = {
          ...rows.value[idx],
          ...updated,
          workerUserId: updated?.workerUserId ?? rows.value[idx].workerUserId ?? authStore.user?.id,
          workerName: updated?.workerName ?? rows.value[idx].workerName ?? authStore.user?.name,
          workerTakenAt:
            updated?.workerTakenAt ?? rows.value[idx].workerTakenAt ?? new Date().toISOString(),
          uiStatus: 'confirmed',
        };
        selected.value = rows.value[idx];
      }
      message.success('已确认接单');
      takeConfirmOpen.value = false;
      // 后台再同步一次，确保与数据库最终状态一致
      void load();
    })
    .finally(() => {
      takeSubmitting.value = false;
    });
};

const reschedule = () => {
  if (!selected.value) {
    message.warning('请先选择一条订单');
    return;
  }
  rescheduleDate.value = selected.value.shootingDate
    ? dayjs(String(selected.value.shootingDate).slice(0, 10))
    : null;
  rescheduleNote.value = '';
  rescheduleOpen.value = true;
};

const submitReschedule = async () => {
  if (!selected.value) return;
  if (!rescheduleDate.value) {
    message.warning('请选择新拍摄日期');
    return;
  }
  const id = Number(selected.value.id);
  if (!Number.isFinite(id)) return;
  rescheduleSubmitting.value = true;
  try {
    await httpClient.patch(`/orders/worker/${id}/reschedule`, {
      newShootingDate: dayjs(rescheduleDate.value).format('YYYY-MM-DD'),
      note: rescheduleNote.value,
    });
    message.success('已修改时间');
    rescheduleOpen.value = false;
    selected.value = null;
    await load();
  } finally {
    rescheduleSubmitting.value = false;
  }
};

const contact = () => {
  if (!selected.value) {
    message.warning('请先选择一条订单');
    return;
  }
  const name = String(selected.value.contactName || '').trim() || '客户';
  const phone = String(selected.value.phone || '').trim();
  const orderNo = String(selected.value.orderNo || selected.value.id || '').trim();
  router.push({
    path: '/worker/messages',
    query: {
      name,
      phone,
      orderNo,
    },
  });
};

const openDeepDetail = () => {
  if (!selected.value) {
    message.warning('请先选择一条订单');
    return;
  }
  deepDetailOpen.value = true;
};

onMounted(() => {
  authStore.initializeAuth();
  load();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
  padding-top: 8px;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 14px;
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
}
.pill :deep(.ant-select-selector),
.pill :deep(.ant-picker),
.pill.ghost {
  border-radius: 999px !important;
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.08);
  border: 1px solid rgba(255, 107, 139, 0.18);
  color: #d6336c;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.order-card {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
}
.order-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 107, 139, 0.25);
}
.order-card.active {
  border-color: rgba(255, 107, 139, 0.35);
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.1) 0%, rgba(255, 155, 180, 0.08) 100%);
}
.row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.name {
  font-weight: 900;
  color: #111827;
}
.status {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.18);
}
.status.pending {
  color: #d6336c;
  background: rgba(255, 107, 139, 0.08);
}
.status.confirmed {
  color: #389e0d;
  background: rgba(82, 196, 26, 0.1);
  border-color: rgba(82, 196, 26, 0.18);
}
.status.completed {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.08);
  border-color: rgba(22, 119, 255, 0.16);
}
.row2,
.row3 {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #6b7280;
  font-size: 13px;
}
.meta b {
  color: #374151;
  margin-right: 6px;
}

.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
  margin-bottom: 14px;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}
.detail .kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed rgba(17, 24, 39, 0.1);
}
.detail .kv:last-child {
  border-bottom: none;
}
.k {
  color: #6b7280;
}
.v {
  color: #111827;
  text-align: right;
}
.muted {
  color: #9ca3af;
}
.empty {
  color: #9ca3af;
  padding: 10px 0;
}
.btns {
  display: grid;
  gap: 10px;
}
.pill {
  border-radius: 999px;
}
:deep(.ant-btn.pill) {
  background: var(--pink);
  border-color: var(--pink);
}
:deep(.ant-picker.pill) {
  background: rgba(255, 107, 139, 0.12);
  border-color: rgba(255, 107, 139, 0.26);
}
:deep(.ant-picker.pill .ant-picker-input > input) {
  color: #1f2937;
}
:deep(.ant-picker.pill .ant-picker-input > input::placeholder) {
  color: #6b7280;
}
:deep(.ant-picker.pill .ant-picker-suffix),
:deep(.ant-picker.pill .ant-picker-clear) {
  color: #374151;
}
.take-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}
.take-btn:hover,
.take-btn:focus,
.take-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
  transition: all 0.2s ease;
}
.pill.ghost:hover {
  background: rgba(255, 107, 139, 0.18);
  border-color: rgba(255, 107, 139, 0.34);
  color: #be185d;
  box-shadow: 0 2px 6px rgba(255, 107, 139, 0.12);
}
.tip {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
}

.confirm-body {
  min-height: 56px;
  display: flex;
  align-items: center;
  color: #374151;
  font-size: 15px;
}

.deep-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.deep-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.deep-card {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.deep-title {
  font-weight: 800;
  color: #111827;
  margin-bottom: 10px;
}

.photo-carousel {
  border-radius: 10px;
  overflow: hidden;
  background: #f8fafc;
  max-width: 320px;
  margin: 0 auto;
}

.photo-slide {
  height: 200px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: #f8fafc;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.deep-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.deep-kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(17, 24, 39, 0.1);
  color: #6b7280;

  b {
    color: #111827;
    text-align: right;
    font-weight: 700;
    max-width: 60%;
    word-break: break-word;
  }
}

.deep-kv:last-child {
  border-bottom: none;
}

.tips-card .tips-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.tip-item {
  background: #fff7fa;
  border: 1px solid rgba(255, 107, 139, 0.18);
  border-radius: 10px;
  padding: 10px;

  .label {
    display: inline-block;
    color: #be185d;
    font-weight: 700;
    margin-bottom: 6px;
    font-size: 13px;
  }

  p {
    margin: 0;
    color: #475569;
    font-size: 13px;
    line-height: 1.65;
  }
}

.checklist-card {
  .process-flow {
    display: flex;
    justify-content: center;
  }

  .cycle-flow {
    position: relative;
    width: 620px;
    height: 460px;
    max-width: 100%;
    margin: 0 auto;
  }

  .cycle-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 320px;
    height: 320px;
    transform: translate(-50%, -50%);
    border: 2px dashed rgba(255, 107, 139, 0.35);
    border-radius: 50%;
  }

  .cycle-center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: #fff0f6;
    border: 1px solid rgba(255, 107, 139, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #be185d;
    font-weight: 800;
  }

  .cycle-node {
    position: absolute;
    width: 170px;
    min-height: 78px;
    padding: 8px 10px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid rgba(255, 107, 139, 0.24);
    box-shadow: 0 3px 8px rgba(255, 107, 139, 0.08);
    text-align: center;

    .step {
      display: block;
      color: #be185d;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 3px;
    }

    p {
      margin: 0;
      color: #475569;
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .n1 {
    left: 50%;
    top: 10px;
    transform: translateX(-50%);
  }
  .n2 {
    right: 26px;
    top: 95px;
  }
  .n3 {
    right: 26px;
    bottom: 95px;
  }
  .n4 {
    left: 50%;
    bottom: 10px;
    transform: translateX(-50%);
  }
  .n5 {
    left: 26px;
    bottom: 95px;
  }
  .n6 {
    left: 26px;
    top: 95px;
  }

  .cycle-arrow {
    position: absolute;
    color: #f472b6;
    font-weight: 700;
    font-size: 18px;
    opacity: 0.8;
  }

  .a1 {
    left: 76%;
    top: 24%;
  }
  .a2 {
    left: 73%;
    top: 66%;
  }
  .a3 {
    left: 21%;
    top: 45%;
  }

  @media (max-width: 860px) {
    .cycle-flow {
      height: 640px;
    }
    .cycle-ring {
      display: none;
    }
    .cycle-center {
      position: static;
      transform: none;
      margin: 0 auto 10px;
    }
    .cycle-node {
      position: static;
      width: 100%;
      min-height: auto;
      margin-bottom: 8px;
    }
    .n1,
    .n2,
    .n3,
    .n4,
    .n5,
    .n6 {
      transform: none;
    }
    .cycle-arrow {
      display: none;
    }
  }
}

:deep(.take-confirm-modal .ant-modal-content) {
  border-radius: 14px;
  background: linear-gradient(180deg, #fff8fb 0%, #ffffff 100%);
}

:deep(.take-confirm-modal .ant-modal-header) {
  background: transparent;
  border-bottom: 1px solid rgba(255, 107, 139, 0.16);
}

:deep(.take-confirm-modal .ant-modal-title) {
  color: #be185d;
  font-weight: 800;
}

:deep(.take-confirm-modal .ant-modal-footer .take-ok-btn) {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  font-weight: 700;
  box-shadow: none !important;
}

:deep(.take-confirm-modal .ant-modal-footer .take-ok-btn:hover),
:deep(.take-confirm-modal .ant-modal-footer .take-ok-btn:focus),
:deep(.take-confirm-modal .ant-modal-footer .take-ok-btn:active) {
  background: #e11d48 !important;
  border-color: #e11d48 !important;
  color: #fff !important;
  box-shadow: none !important;
}

:deep(.take-confirm-modal .ant-modal-footer .take-cancel-btn:hover),
:deep(.take-confirm-modal .ant-modal-footer .take-cancel-btn:focus),
:deep(.take-confirm-modal .ant-modal-footer .take-cancel-btn:active) {
  color: #d6336c !important;
  border-color: #ff9fbc !important;
  background: #fff5f8 !important;
  box-shadow: 0 0 0 2px rgba(255, 107, 139, 0.18) !important;
}

/* 兜底：直接命中按钮类，避免 Teleport/层级影响 */
:deep(.ant-btn.take-ok-btn:hover),
:deep(.ant-btn.take-ok-btn:focus),
:deep(.ant-btn.take-ok-btn:active) {
  background: #e11d48 !important;
  border-color: #e11d48 !important;
  color: #fff !important;
  box-shadow: none !important;
}

:deep(.ant-btn.take-cancel-btn:hover),
:deep(.ant-btn.take-cancel-btn:focus),
:deep(.ant-btn.take-cancel-btn:active) {
  color: #d6336c !important;
  border-color: #ff9fbc !important;
  background: #fff5f8 !important;
  box-shadow: 0 0 0 2px rgba(255, 107, 139, 0.18) !important;
}
</style>

<style lang="less">
.ant-btn.take-ok-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.take-ok-btn:hover,
.ant-btn.take-ok-btn:focus,
.ant-btn.take-ok-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.take-cancel-btn:hover,
.ant-btn.take-cancel-btn:focus,
.ant-btn.take-cancel-btn:active {
  color: #d6336c !important;
  border-color: #ff9fbc !important;
  background: #fff5f8 !important;
  box-shadow: none !important;
}

.reschedule-date-popup {
  .ant-picker-panel-container {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 107, 139, 0.2);
    box-shadow: 0 10px 24px rgba(255, 107, 139, 0.16);
  }

  .ant-picker-header {
    background: #fff4f8;
    border-bottom-color: rgba(255, 107, 139, 0.18);
  }

  .ant-picker-content th {
    color: #be185d;
    font-weight: 700;
  }

  .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner,
  .ant-picker-cell-in-view.ant-picker-cell-range-start .ant-picker-cell-inner,
  .ant-picker-cell-in-view.ant-picker-cell-range-end .ant-picker-cell-inner {
    background: #ff6b8b;
    color: #fff;
  }

  .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before {
    border-color: #ff6b8b;
  }

  .ant-picker-cell-in-view:hover .ant-picker-cell-inner {
    background: rgba(255, 107, 139, 0.12);
  }

  .ant-picker-today-btn {
    color: #ff6b8b;
    font-weight: 700;
  }

  .ant-picker-today-btn:hover {
    color: #ef476f;
  }
}

.orders-filter-date-popup {
  .ant-picker-panel-container {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 107, 139, 0.2);
    box-shadow: 0 10px 24px rgba(255, 107, 139, 0.16);
  }

  .ant-picker-header {
    background: #fff4f8;
    border-bottom-color: rgba(255, 107, 139, 0.18);
  }

  .ant-picker-content th {
    color: #be185d;
    font-weight: 700;
  }

  .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner {
    background: #ff6b8b;
    color: #fff;
  }

  .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before {
    border-color: #ff6b8b;
  }

  .ant-picker-cell-in-view:hover .ant-picker-cell-inner {
    background: rgba(255, 107, 139, 0.12);
  }

  .ant-picker-today-btn {
    color: #ff6b8b;
    font-weight: 700;
  }
}
</style>
