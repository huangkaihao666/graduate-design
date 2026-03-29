<template>
  <div class="order-container">
    <!-- 页面标题（有套餐时为标准下单；无套餐时为个性化入口） -->
    <div class="page-header" :class="{ 'header-hub': packageMissing }">
      <template v-if="packageMissing">
        <h1>✨ 制定个性化行程</h1>
        <p>
          从这里开始：用 AI
          规划拍摄路线与日程，或发布定制旅拍需求由摄影师接单；若已选好固定套餐，也可从下方进入套餐下单。
        </p>
      </template>
      <template v-else>
        <h1>📝 在线预约下单</h1>
        <p>填写下单信息后提交预约，我们会为您安排专业团队跟进</p>
      </template>
    </div>

    <div v-if="selectedPackage" class="content-grid">
      <!-- 左侧：下单表单 -->
      <div class="left-panel">
        <div class="package-card">
          <div class="package-card-top">
            <div class="package-info">
              <h2 class="package-title">{{ selectedPackage.name }}</h2>
              <div class="package-meta">
                <span>📍 {{ selectedPackage.location }}</span>
                <span>🎨 {{ getStyleName(selectedPackage.style) }}</span>
                <span>📅 {{ selectedPackage.duration }} 天</span>
                <span>👥 最多 {{ selectedPackage.maxPeople }} 人</span>
              </div>
            </div>
            <div class="package-price">
              <div class="price-amount">¥{{ selectedPackage.price.toLocaleString() }}</div>
              <div v-if="selectedPackage.originalPrice" class="origin-price">
                原价 ¥{{ selectedPackage.originalPrice.toLocaleString() }}
              </div>
            </div>
          </div>
          <div class="package-image">
            <a-image
              :src="selectedPackage.coverImage"
              :alt="selectedPackage.name"
              :preview="false"
            />
          </div>
        </div>

        <a-form
          ref="orderFormRef"
          layout="vertical"
          :model="orderForm"
          :rules="orderRules"
          class="order-form"
          @finish="handleSubmit"
        >
          <a-form-item label="预约人姓名" name="contactName">
            <a-input v-model:value="orderForm.contactName" placeholder="请输入您的姓名" />
          </a-form-item>

          <a-form-item label="联系电话" name="phone">
            <a-input
              v-model:value="orderForm.phone"
              placeholder="请输入手机号（11位）"
              :maxlength="11"
            />
          </a-form-item>

          <a-form-item label="邮箱（可选）" name="email">
            <a-input v-model:value="orderForm.email" placeholder="请输入邮箱（可选）" />
          </a-form-item>

          <a-form-item label="指定摄影师（可选）">
            <a-select
              v-model:value="selectedPhotographerId"
              placeholder="暂不指定，由门店安排"
              allow-clear
              :loading="photographersLoading"
              style="width: 100%"
              @change="onPhotographerSelectChange"
            >
              <a-select-option v-for="p in photographerPublicList" :key="p.id" :value="p.id">
                {{ p.name }}{{ p.title ? ` · ${p.title}` : '' }}
              </a-select-option>
            </a-select>
            <div v-if="selectedPhotographerName" class="photographer-hint">
              当前已选：<strong>{{ selectedPhotographerName }}</strong>
              <span v-if="route.query.photographerId" class="hint-tag"
                >（来自本店摄影师/套餐页）</span
              >
            </div>
          </a-form-item>

          <a-form-item label="拍摄日期" name="shootingDate" :rules="shootingDateRules">
            <div v-if="usePhotographerScheduleCalendar" class="schedule-calendar">
              <div class="calendar-legend">
                <span class="legend-item available">可约</span>
                <span class="legend-item booked">已约</span>
                <span class="legend-item rest">休息</span>
                <span class="legend-item unavailable">未开放</span>
              </div>
              <div class="calendar-header">
                <a-button size="small" @click="goPrevCalendarMonth">上个月</a-button>
                <span class="calendar-title">{{ calendarMonthTitle }}</span>
                <a-button size="small" @click="goNextCalendarMonth">下个月</a-button>
              </div>
              <div class="calendar-weekdays">
                <span v-for="w in calendarWeekLabels" :key="w">{{ w }}</span>
              </div>
              <div class="calendar-grid">
                <button
                  v-for="d in calendarDays"
                  :key="d.dateKey"
                  type="button"
                  class="calendar-day"
                  :class="[
                    scheduleCellStatus(d.dateKey, d.inCurrentMonth),
                    { selected: orderForm.shootingDate === d.dateKey, outside: !d.inCurrentMonth },
                  ]"
                  @click="onCalendarDayClick(d)"
                >
                  {{ d.day }}
                </button>
              </div>

              <div class="calendar-picked">
                已选择拍摄日期：
                <strong>{{
                  orderForm.shootingDate
                    ? formatShootingDateLabel(orderForm.shootingDate)
                    : '未选择'
                }}</strong>
              </div>
            </div>
            <a-input v-else v-model:value="orderForm.shootingDate" type="date" />
            <div v-if="photographerScheduleNote" class="schedule-tip">
              档期说明：{{ photographerScheduleNote }}
            </div>
            <div
              v-else-if="
                usePhotographerScheduleCalendar && !photographerAvailableDatesSorted.length
              "
              class="schedule-tip muted"
            >
              该摄影师尚未开放可约日期，请稍后再试或联系客服。
            </div>
          </a-form-item>

          <a-form-item label="预约人数" name="numberOfPeople">
            <a-select v-model:value="orderForm.numberOfPeople" placeholder="请选择人数">
              <a-select-option v-for="n in peopleOptions" :key="n" :value="n"
                >{{ n }} 人</a-select-option
              >
            </a-select>
          </a-form-item>

          <a-form-item label="支付方式" name="paymentMethod">
            <a-select v-model:value="orderForm.paymentMethod" placeholder="请选择支付方式">
              <a-select-option value="wechat">微信支付</a-select-option>
              <a-select-option value="alipay">支付宝</a-select-option>
              <a-select-option value="offline">线下支付</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="备注（可选）" name="remark">
            <a-textarea
              v-model:value="orderForm.remark"
              placeholder="例如：希望的拍摄时间、服装偏好、特别需求等"
              :rows="4"
              :maxlength="300"
              show-count
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="submitting" class="submit-btn">
                {{ submitting ? '提交中...' : '提交预约' }}
              </a-button>
              <a-button html-type="button" :disabled="submitting" @click="handleReset"
                >重置</a-button
              >
            </a-space>
          </a-form-item>
        </a-form>
        <div class="bottom-price-bar">
          <div class="bar-left">
            <span class="label">当前合计</span>
            <span class="price">¥{{ previewTotalAmount.toLocaleString() }}</span>
          </div>
          <div class="bar-right">
            <span>{{ orderForm.numberOfPeople }} 人</span>
            <span>单价 ¥{{ selectedPackage.price.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：订单摘要 -->
      <div class="right-panel">
        <div class="summary-card">
          <h3>订单摘要</h3>

          <div class="summary-row">
            <span class="label">套餐</span>
            <span class="value">{{ selectedPackage.name }}</span>
          </div>

          <div v-if="selectedPhotographerName" class="summary-row">
            <span class="label">指定摄影师</span>
            <span class="value">{{ selectedPhotographerName }}</span>
          </div>

          <div class="summary-row">
            <span class="label">预约人数</span>
            <span class="value">{{ orderForm.numberOfPeople }} 人</span>
          </div>

          <div class="summary-row">
            <span class="label">单价</span>
            <span class="value">¥{{ selectedPackage.price.toLocaleString() }}</span>
          </div>

          <div class="summary-row total">
            <span class="label">合计</span>
            <span class="value"
              >¥{{ (selectedPackage.price * orderForm.numberOfPeople).toLocaleString() }}</span
            >
          </div>

          <div class="summary-tips">
            <p>
              温馨提示：订单提交后将写入服务器；在线支付请使用微信/支付宝扫码，支付结果以系统查询为准。
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="packageMissing" class="personalize-hub">
      <div class="hub-cards">
        <div class="hub-card hub-card-primary">
          <div class="hub-card-icon">🗺️</div>
          <h2>AI 智能行程规划</h2>
          <p>填写目的地、天数与偏好，一键生成拍摄路线与时间安排，再按需预约或下单。</p>
          <a-button type="primary" size="large" @click="goItineraryPlanning">
            去制定个性化行程
          </a-button>
        </div>
        <div class="hub-card">
          <div class="hub-card-icon">🎯</div>
          <h2>定制旅拍需求</h2>
          <p>描述您的想法、档期与预算，摄影师可接单，您确认后再推进。</p>
          <a-button size="large" @click="router.push('/user/custom-requests')">
            发布定制需求
          </a-button>
        </div>
      </div>
      <div class="hub-footer">
        <span class="hub-footer-label">已有心仪套餐？</span>
        <router-link class="hub-footer-link" to="/booking/packages">
          前往套餐浏览，选好后将自动进入标准下单
        </router-link>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else class="loading-state">
      <a-spin size="large" />
      <p>加载套餐信息...</p>
    </div>

    <!-- 提交成功 -->
    <a-modal
      v-model:open="successModalVisible"
      title="预约提交成功"
      :footer="null"
      @cancel="successModalVisible = false"
    >
      <div class="success-content">
        <div class="success-order-no">订单编号：{{ successInfo?.orderNo }}</div>
        <div class="success-summary">
          <div>套餐：{{ successInfo?.packageName }}</div>
          <div v-if="successInfo?.photographerName">
            摄影师：{{ successInfo?.photographerName }}
          </div>
          <div>人数：{{ successInfo?.numberOfPeople }} 人</div>
          <div>合计：¥{{ successInfo?.totalAmount?.toLocaleString() }}</div>
        </div>

        <div v-if="successInfo?.paymentMethod === 'offline'" class="success-pay-note">
          线下支付：请在预约当天到店支付，工作人员会核对订单信息后为您安排拍摄。
        </div>
        <div v-else class="success-pay-note">
          在线支付：请选择下方「去支付」，使用微信/支付宝扫码完成付款；支付成功后订单将自动更新。
        </div>

        <div class="success-actions">
          <a-button type="primary" @click="successModalVisible = false">知道了</a-button>
          <a-button
            v-if="successInfo?.paymentMethod !== 'offline'"
            type="primary"
            ghost
            :loading="paymentPrepLoading"
            @click="openPaymentModal"
          >
            去支付
          </a-button>
          <a-button @click="goToOrders">去我的订单</a-button>
        </div>
      </div>
    </a-modal>

    <!-- 在线支付：后端生成真实二维码 -->
    <a-modal
      v-model:open="paymentModalVisible"
      title="在线支付"
      :footer="null"
      :width="860"
      @cancel="paymentModalVisible = false"
    >
      <div v-if="paymentInfo" class="payment-modal">
        <div class="payment-header">
          <div>
            <div class="payment-title">
              支付方式：{{ formatPayment(paymentInfo.paymentMethod) }}
            </div>
            <div class="payment-sub">订单号：{{ paymentInfo.orderNo }}</div>
            <div v-if="paymentInfo.mode" class="payment-mode">
              {{
                paymentInfo.mode === 'wechat_native'
                  ? '微信官方 Native 支付'
                  : '演示落地页（未配置微信证书时）'
              }}
            </div>
          </div>
          <div class="payment-amount">应付：¥{{ paymentInfo.totalAmount.toLocaleString() }}</div>
        </div>

        <div class="payment-body">
          <div v-if="paymentInfo.qrCodeDataUrl" class="payment-qr">
            <img :src="paymentInfo.qrCodeDataUrl" alt="支付二维码" class="qr-img" />
            <div class="qr-tip">
              演示流程：无需真实付款，点击下方「我已完成支付」即可标记为已支付。
            </div>
          </div>
          <p v-if="paymentInfo.hint" class="payment-hint">{{ paymentInfo.hint }}</p>
          <div class="payment-actions">
            <a-button type="primary" :loading="paymentSubmitting" @click="refreshPaymentStatus">
              我已完成支付
            </a-button>
            <a-button :disabled="paymentSubmitting" @click="paymentModalVisible = false"
              >稍后再说</a-button
            >
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ordersApi } from '@/api/orders';
import { packagesApi, type Package } from '@/api/packages';
import { paymentsApi } from '@/api/payments';
import { photographersApi, type PhotographerPublic } from '@/api/photographers';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import type { FormInstance } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const styleMap: Record<string, string> = { ...TRAVEL_STYLE_LABELS };

const getStyleName = (style: string) => styleMap[style] || style;

const formatPayment = (method: string) => {
  if (method === 'wechat') return '微信支付';
  if (method === 'alipay') return '支付宝';
  if (method === 'offline') return '线下支付';
  return method || '-';
};

// sessionStorage 的状态持久化（避免用户切路由丢失表单）
const STORAGE_KEY = 'online-order-state';
const ORDER_HISTORY_KEY = 'online-order-history';

/** 订单历史用 localStorage，关闭浏览器后仍保留；若仅有旧版 session 数据则迁移一次 */
const readOrderHistoryRaw = (): string | null => {
  let raw = localStorage.getItem(ORDER_HISTORY_KEY);
  if (!raw) {
    raw = sessionStorage.getItem(ORDER_HISTORY_KEY);
    if (raw) {
      localStorage.setItem(ORDER_HISTORY_KEY, raw);
      sessionStorage.removeItem(ORDER_HISTORY_KEY);
    }
  }
  return raw;
};
const writeOrderHistoryRaw = (json: string) => {
  localStorage.setItem(ORDER_HISTORY_KEY, json);
};

const orderFormRef = ref<FormInstance>();
const selectedPackage = ref<Package | null>(null);
const submitting = ref(false);

const successModalVisible = ref(false);
const successInfo = ref<{
  orderId?: number;
  orderNo: string;
  packageName: string;
  photographerName?: string;
  numberOfPeople: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
} | null>(null);

const selectedPhotographerId = ref<number | null>(null);
const selectedPhotographerName = ref('');
const photographerPublicList = ref<PhotographerPublic[]>([]);
const photographersLoading = ref(false);
/** 用于读取 availableDates / scheduleNote（优先列表，否则单次详情） */
const photographerScheduleDetail = ref<PhotographerPublic | null>(null);

const orderForm = reactive({
  packageId: 0,
  contactName: '',
  phone: '',
  email: '',
  shootingDate: '',
  numberOfPeople: 1,
  paymentMethod: 'wechat',
  remark: '',
});

const packageMissing = ref(false);

const goItineraryPlanning = () => {
  router.push('/ai/itinerary-planning');
};

const peopleOptions = computed(() => {
  const max = selectedPackage.value?.maxPeople ?? 1;
  return Array.from({ length: max }, (_, idx) => idx + 1);
});
const previewTotalAmount = computed(
  () => (selectedPackage.value?.price || 0) * (Number(orderForm.numberOfPeople) || 0)
);

/** 当前摄影师档期日期（YYYY-MM-DD，已排序） */
const photographerAvailableDatesSorted = computed(() => {
  const raw = photographerScheduleDetail.value?.availableDates;
  if (!raw?.length) return [];
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return [...raw]
    .filter((x) => re.test(String(x).trim()))
    .map((x) => String(x).trim())
    .sort();
});

const photographerAvailableDateSet = computed(
  () => new Set(photographerAvailableDatesSorted.value)
);

/** 休息日（与摄影师端「休息」一致） */
const photographerRestDatesSorted = computed(() => {
  const raw = photographerScheduleDetail.value?.restDates;
  if (!raw?.length) return [];
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return [...raw]
    .filter((x) => re.test(String(x).trim()))
    .map((x) => String(x).trim())
    .sort();
});
const photographerRestDateSet = computed(() => new Set(photographerRestDatesSorted.value));

const photographerBookedDates = ref<string[]>([]);
const photographerBookedDateSet = computed(() => new Set(photographerBookedDates.value));
const calendarMonthCursor = ref(new Date());
const calendarWeekLabels = ['日', '一', '二', '三', '四', '五', '六'];
type CalendarCell = { dateKey: string; day: number; inCurrentMonth: boolean };

/**
 * 已选摄影师时使用月历档期（与摄影师端同一套数据：可约 / 休息 / 已约 / 未开放）
 */
const usePhotographerScheduleCalendar = computed(() => !!selectedPhotographerId.value);

const photographerScheduleNote = computed(() => {
  if (!selectedPhotographerId.value) return '';
  return (photographerScheduleDetail.value?.scheduleNote || '').trim();
});

const formatShootingDateLabel = (iso: string) => {
  const t = String(iso).trim();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(t)) return iso;
  const d = new Date(`${t}T12:00:00`);
  if (Number.isNaN(d.getTime())) return t;
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${t}（周${w}）`;
};

const scheduleCellStatus = (
  iso: string,
  inCurrentMonth = true
): 'available' | 'booked' | 'rest' | 'unavailable' => {
  if (!inCurrentMonth) return 'unavailable';
  if (iso < todayKey()) return 'unavailable';
  if (photographerBookedDateSet.value.has(iso)) return 'booked';
  if (photographerRestDateSet.value.has(iso)) return 'rest';
  if (photographerAvailableDateSet.value.has(iso)) return 'available';
  return 'unavailable';
};

const todayKey = () => {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const calendarMonthTitle = computed(() => {
  const d = calendarMonthCursor.value;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
});

const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const calendarDays = computed<CalendarCell[]>(() => {
  const base = new Date(
    calendarMonthCursor.value.getFullYear(),
    calendarMonthCursor.value.getMonth(),
    1
  );
  const start = new Date(base);
  start.setDate(1 - start.getDay());
  const arr: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      inCurrentMonth: d.getMonth() === base.getMonth(),
    });
  }
  return arr;
});

const syncCalendarMonthByCurrentContext = () => {
  const selected = orderForm.shootingDate?.trim();
  const anchor =
    (selected && /^\d{4}-\d{2}-\d{2}$/.test(selected) ? selected : '') ||
    photographerAvailableDatesSorted.value[0] ||
    '';
  if (!anchor) {
    calendarMonthCursor.value = new Date();
    return;
  }
  const dt = new Date(`${anchor}T12:00:00`);
  if (Number.isNaN(dt.getTime())) {
    calendarMonthCursor.value = new Date();
    return;
  }
  calendarMonthCursor.value = new Date(dt.getFullYear(), dt.getMonth(), 1);
};

const goPrevCalendarMonth = () => {
  const d = calendarMonthCursor.value;
  calendarMonthCursor.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
};

const goNextCalendarMonth = () => {
  const d = calendarMonthCursor.value;
  calendarMonthCursor.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
};

const shootingDateRules = computed(() => {
  const list: Array<Record<string, any>> = [
    { required: true, message: '请选择拍摄日期', trigger: 'change' },
  ];
  if (usePhotographerScheduleCalendar.value) {
    list.push({
      validator: async (_rule: unknown, value: string) => {
        if (!value) return Promise.reject('请选择拍摄日期');
        if (!photographerAvailableDatesSorted.value.includes(value)) {
          return Promise.reject('所选日期不在该摄影师可约档期内，请在月历中选择「可约」日期');
        }
        if (photographerBookedDateSet.value.has(value)) {
          return Promise.reject('该日期已约满，请选择其他可约日期');
        }
        if (photographerRestDateSet.value.has(value)) {
          return Promise.reject('该日期为摄影师休息日');
        }
        return Promise.resolve();
      },
      trigger: 'change',
    });
  }
  return list;
});

/**
 * 同步摄影师详情（含档期、档期说明）。
 * 必须请求 getPublicOne：列表接口可能在进入页面时缓存，与摄影师端刚保存的后端数据不一致；
 * 仅用列表会导致用户端档期与摄影师端/数据库不同步。
 */
const refreshPhotographerScheduleDetail = async () => {
  const id = selectedPhotographerId.value;
  if (!id) {
    photographerScheduleDetail.value = null;
    return;
  }
  const fromList = photographerPublicList.value.find((x) => x.id === id);
  try {
    photographerScheduleDetail.value = await photographersApi.getPublicOne(id);
  } catch {
    photographerScheduleDetail.value = fromList ?? null;
  }
};

const refreshPhotographerBookedDates = async () => {
  const id = selectedPhotographerId.value;
  if (!id) {
    photographerBookedDates.value = [];
    return;
  }
  try {
    const list = await ordersApi.getPhotographerBookedDates(id);
    const re = /^\d{4}-\d{2}-\d{2}$/;
    photographerBookedDates.value = (Array.isArray(list) ? list : [])
      .map((x) => String(x || '').trim())
      .filter((d) => re.test(d));
  } catch {
    photographerBookedDates.value = [];
  }
};

/** 会话恢复或切换摄影师后，若当前拍摄日不在档期内则清空并提示 */
const ensureShootingDateMatchesSchedule = () => {
  if (!usePhotographerScheduleCalendar.value) return;
  const d = orderForm.shootingDate?.trim();
  if (!d) return;
  if (
    !photographerAvailableDatesSorted.value.includes(d) ||
    photographerBookedDateSet.value.has(d) ||
    photographerRestDateSet.value.has(d)
  ) {
    orderForm.shootingDate = '';
    message.warning('当前拍摄日期不在该摄影师可约档期内，请重新选择可约日期。');
  }
};

const onScheduleCalendarSelect = (dateValue: any) => {
  if (!usePhotographerScheduleCalendar.value) return;
  const iso = typeof dateValue?.dateKey === 'string' ? dateValue.dateKey : '';
  if (!iso) return;
  const status = scheduleCellStatus(iso, true);
  if (status === 'unavailable') {
    message.warning('该日期未开放预约，请在摄影师已标注「可约」的日期中选择。');
    return;
  }
  if (status === 'rest') {
    message.warning('该日期为摄影师休息日，请选择其他可约日期。');
    return;
  }
  if (status === 'booked') {
    message.warning('该日期已约满，请选择其他可约日期。');
    return;
  }
  orderForm.shootingDate = iso;
  void orderFormRef.value?.validateFields(['shootingDate']);
};

const onCalendarDayClick = (cell: CalendarCell) => {
  if (!cell.inCurrentMonth) return;
  onScheduleCalendarSelect(cell);
};

const paymentModalVisible = ref(false);
const paymentSubmitting = ref(false);
const paymentPrepLoading = ref(false);
let paymentPollTimer: ReturnType<typeof setInterval> | null = null;

const paymentInfo = ref<{
  orderNo: string;
  paymentMethod: string;
  totalAmount: number;
  mode?: 'wechat_native' | 'landing';
  qrCodeDataUrl?: string;
  codeUrl?: string;
  hint?: string;
} | null>(null);

const emailValidator = (_rule: any, value: string) => {
  if (!value) return Promise.resolve();
  // 简单邮箱校验
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailReg.test(value) ? Promise.resolve() : Promise.reject('请输入有效的邮箱地址');
};

const orderRules = {
  contactName: [{ required: true, message: '请输入预约人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '手机号格式不正确',
      trigger: 'blur',
    },
  ],
  email: [{ validator: emailValidator, trigger: 'blur' }],
  numberOfPeople: [{ required: true, message: '请选择预约人数', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  remark: [{ max: 300, message: '备注最多300字', trigger: 'blur' }],
};

const saveStateToStorage = () => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        packageId: orderForm.packageId,
        contactName: orderForm.contactName,
        phone: orderForm.phone,
        email: orderForm.email,
        shootingDate: orderForm.shootingDate,
        numberOfPeople: orderForm.numberOfPeople,
        paymentMethod: orderForm.paymentMethod,
        remark: orderForm.remark,
        photographerId: selectedPhotographerId.value ?? undefined,
        photographerName: selectedPhotographerName.value || undefined,
      })
    );
  } catch (e) {
    console.warn('保存订单状态失败：', e);
  }
};

const restoreStateFromStorage = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state?.packageId && Number(state.packageId) === Number(orderForm.packageId)) {
      orderForm.contactName = state.contactName || '';
      orderForm.phone = state.phone || '';
      orderForm.email = state.email || '';
      orderForm.shootingDate = state.shootingDate || '';
      orderForm.numberOfPeople = state.numberOfPeople ?? 1;
      orderForm.paymentMethod = state.paymentMethod || 'wechat';
      orderForm.remark = state.remark || '';
      const pid = state.photographerId != null ? Number(state.photographerId) : NaN;
      if (!Number.isNaN(pid) && pid > 0) {
        selectedPhotographerId.value = pid;
        selectedPhotographerName.value = String(state.photographerName || '');
      }
    }
  } catch (e) {
    console.warn('恢复订单状态失败：', e);
  }
};

const generateMockPackageById = (id: number): Package => {
  const locations = ['三亚', '大理', '丽江', '厦门', '青岛', '巴厘岛', '普吉岛'];
  const styles = ['romantic', 'artistic', 'bohemian', 'minimalist', 'classical', 'adventure'];
  const durations = [1, 2, 3, 5, 7];
  const basePrices = [2999, 3999, 4999, 5999, 6999, 8999, 12999];
  const maxPeopleList = [2, 4, 6];

  const imageUrls = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=800&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=800&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=1200&h=800&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=800&fit=crop&auto=format&q=80',
  ];

  const detailImageUrls = [
    [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=1200&h=900&fit=crop&auto=format&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=900&fit=crop&auto=format&q=80',
    ],
  ];

  const location = locations[(id - 1) % locations.length];
  const style = styles[(id - 1) % styles.length];
  const duration = durations[(id - 1) % durations.length];
  const basePrice = basePrices[(id - 1) % basePrices.length];
  const hasDiscount = id % 2 === 0;

  const coverImage = imageUrls[(id - 1) % imageUrls.length];
  const images = detailImageUrls[(id - 1) % detailImageUrls.length];

  const maxPeople = maxPeopleList[(id - 1) % maxPeopleList.length];
  const isPopular = id % 3 === 0;
  const isHot = id % 5 === 0;

  return {
    id,
    spotId: id,
    name: `${location}${duration}日${getStyleName(style)}旅拍套餐`,
    description: `精选${location}最美景点，专业摄影师全程跟拍，${duration}天体验，为您打造难忘的旅拍回忆。`,
    price: hasDiscount ? Math.floor(basePrice * 0.8) : basePrice,
    originalPrice: hasDiscount ? basePrice : undefined,
    duration,
    location,
    style,
    coverImage,
    images,
    features: [
      '专业摄影师全程跟拍',
      '精美婚纱礼服提供',
      '专业化妆造型服务',
      '精修照片30张以上',
      '视频花絮制作',
    ],
    includes: [
      '专业摄影师服务',
      '化妆造型服务',
      '精美婚纱礼服',
      '景点门票',
      '精修照片30张',
      '视频花絮',
    ],
    excludes: ['往返交通', '住宿费用', '餐饮费用'],
    maxPeople,
    isPopular,
    isHot,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/** URL 中带 photographerId 时优先拉取（覆盖会话里恢复的摄影师） */
const applyPhotographerFromUrl = async () => {
  const raw = route.query.photographerId;
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) {
    return;
  }
  try {
    const p = await photographersApi.getPublicOne(id);
    selectedPhotographerId.value = p.id;
    selectedPhotographerName.value = p.name;
    photographerScheduleDetail.value = p;
  } catch {
    selectedPhotographerId.value = null;
    selectedPhotographerName.value = '';
    photographerScheduleDetail.value = null;
    message.warning('未找到所选摄影师或已下架，请重新选择');
  }
};

const loadPhotographersList = async () => {
  photographersLoading.value = true;
  try {
    photographerPublicList.value = await photographersApi.getPublic();
  } catch {
    photographerPublicList.value = [];
  } finally {
    photographersLoading.value = false;
  }
};

const onPhotographerSelectChange = async (val: number | string | undefined) => {
  if (val == null || val === '') {
    selectedPhotographerId.value = null;
    selectedPhotographerName.value = '';
    photographerScheduleDetail.value = null;
    const q = { ...route.query } as Record<string, string | string[] | undefined>;
    delete q.photographerId;
    router.replace({ path: route.path, query: q });
    saveStateToStorage();
    return;
  }
  const id = typeof val === 'string' ? Number(val) : Number(val);
  if (Number.isNaN(id) || id <= 0) {
    selectedPhotographerId.value = null;
    selectedPhotographerName.value = '';
    return;
  }
  let name = photographerPublicList.value.find((x) => x.id === id)?.name;
  if (!name) {
    try {
      const p = await photographersApi.getPublicOne(id);
      name = p.name;
    } catch {
      message.error('获取摄影师信息失败');
      selectedPhotographerId.value = null;
      selectedPhotographerName.value = '';
      return;
    }
  }
  selectedPhotographerId.value = id;
  selectedPhotographerName.value = name || '';
  router.replace({
    path: route.path,
    query: { ...route.query, photographerId: String(id) },
  });
  await refreshPhotographerScheduleDetail();
  await refreshPhotographerBookedDates();
  ensureShootingDateMatchesSchedule();
  syncCalendarMonthByCurrentContext();
  saveStateToStorage();
};

const loadSelectedPackage = async () => {
  packageMissing.value = false;
  const idRaw = route.query.packageId;
  let id = Number(idRaw);

  // 不自动回填：必须先在“套餐浏览”选择套餐并带上 packageId 才能进入下单页
  if (!idRaw || Number.isNaN(id) || id <= 0) {
    packageMissing.value = true;
    selectedPackage.value = null;
    selectedPhotographerId.value = null;
    selectedPhotographerName.value = '';
    photographerScheduleDetail.value = null;
    return;
  }

  orderForm.packageId = id;
  selectedPhotographerId.value = null;
  selectedPhotographerName.value = '';
  photographerScheduleDetail.value = null;

  restoreStateFromStorage();
  await applyPhotographerFromUrl();
  await loadPhotographersList();
  await refreshPhotographerScheduleDetail();
  await refreshPhotographerBookedDates();

  selectedPackage.value = null;
  try {
    const pkg = await packagesApi.getPackageDetail(id);
    selectedPackage.value = pkg;
  } catch (e) {
    console.warn('获取套餐详情失败，已使用本地模拟数据：', e);
    selectedPackage.value = generateMockPackageById(id);
  }

  if (!selectedPackage.value) {
    packageMissing.value = true;
    return;
  }

  // 若会话恢复了摄影师但 URL 无 photographerId，补全姓名（列表可能晚于恢复）
  if (selectedPhotographerId.value && !selectedPhotographerName.value) {
    const fromList = photographerPublicList.value.find(
      (x) => x.id === selectedPhotographerId.value
    );
    if (fromList) {
      selectedPhotographerName.value = fromList.name;
    } else {
      try {
        const p = await photographersApi.getPublicOne(selectedPhotographerId.value);
        selectedPhotographerName.value = p.name;
        photographerScheduleDetail.value = p;
      } catch {
        /* ignore */
      }
    }
  }

  await refreshPhotographerScheduleDetail();
  await refreshPhotographerBookedDates();
  ensureShootingDateMatchesSchedule();
  syncCalendarMonthByCurrentContext();
};

const handleReset = () => {
  orderForm.contactName = '';
  orderForm.phone = '';
  orderForm.email = '';
  orderForm.shootingDate = '';
  orderForm.numberOfPeople = 1;
  orderForm.paymentMethod = 'wechat';
  orderForm.remark = '';
  selectedPhotographerId.value = null;
  selectedPhotographerName.value = '';
  photographerScheduleDetail.value = null;
  const q = { ...route.query } as Record<string, string | string[] | undefined>;
  delete q.photographerId;
  router.replace({ path: route.path, query: q });
  sessionStorage.removeItem(STORAGE_KEY);
  orderFormRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!selectedPackage.value) return;

  submitting.value = true;
  try {
    const orderNo = `ORD-${Date.now()}`;
    const totalAmount = selectedPackage.value.price * orderForm.numberOfPeople;

    const isOnlinePayment =
      orderForm.paymentMethod === 'wechat' || orderForm.paymentMethod === 'alipay';
    const paymentStatus = isOnlinePayment ? 'unpaid' : 'offline_pending';
    const paymentNo = `PAY-${Date.now()}`;

    const order = {
      orderNo,
      packageId: selectedPackage.value.id,
      packageName: selectedPackage.value.name,
      location: selectedPackage.value.location,
      style: selectedPackage.value.style,
      duration: selectedPackage.value.duration,
      unitPrice: selectedPackage.value.price,
      numberOfPeople: orderForm.numberOfPeople,
      shootingDate: orderForm.shootingDate,
      contactName: orderForm.contactName,
      phone: orderForm.phone,
      email: orderForm.email || undefined,
      paymentMethod: orderForm.paymentMethod,
      remark: orderForm.remark || undefined,
      photographerId: selectedPhotographerId.value ?? undefined,
      photographerName: selectedPhotographerName.value || undefined,
      totalAmount,
      paymentStatus,
      paymentNo,
      paidAt: undefined as string | undefined,
      createdAt: new Date().toISOString(),
    };

    const raw = readOrderHistoryRaw();
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(order);
    writeOrderHistoryRaw(JSON.stringify(history));

    // 写入数据库订单
    const createdOrder: any = await ordersApi.createOrder(order);
    const orderData = createdOrder?.data || createdOrder;

    if (orderData?.id) {
      try {
        const rawAfter = readOrderHistoryRaw();
        const histAfter = rawAfter ? JSON.parse(rawAfter) : [];
        const hi = histAfter.findIndex((x: any) => x.orderNo === orderNo);
        if (hi !== -1) {
          histAfter[hi] = { ...histAfter[hi], orderId: orderData.id };
          writeOrderHistoryRaw(JSON.stringify(histAfter));
        }
      } catch {
        /* ignore */
      }
    }

    successInfo.value = {
      orderId: orderData?.id,
      orderNo,
      packageName: order.packageName,
      photographerName: order.photographerName,
      numberOfPeople: order.numberOfPeople,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    };
    successModalVisible.value = true;
    message.success('预约提交成功');

    // 清空当前表单（保留套餐信息）
    handleReset();
  } catch (e: any) {
    message.error(e?.message || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
};

const stopPaymentPoll = () => {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
};

const syncLocalOrderHistoryPaid = (orderNo: string) => {
  try {
    const raw = readOrderHistoryRaw();
    const history = raw ? JSON.parse(raw) : [];
    const idx = history.findIndex((x: any) => x.orderNo === orderNo);
    if (idx !== -1) {
      history[idx] = {
        ...history[idx],
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
      };
      writeOrderHistoryRaw(JSON.stringify(history));
    }
  } catch {
    /* ignore */
  }
};

const startPaymentPoll = () => {
  stopPaymentPoll();
  const orderNo = successInfo.value?.orderNo;
  if (!orderNo) return;
  paymentPollTimer = setInterval(async () => {
    try {
      const st = await paymentsApi.getStatus(orderNo);
      if (st.paid) {
        stopPaymentPoll();
        if (successInfo.value) {
          successInfo.value.paymentStatus = 'paid';
        }
        syncLocalOrderHistoryPaid(orderNo);
        message.success('支付成功');
        paymentModalVisible.value = false;
      }
    } catch {
      /* 轮询失败忽略 */
    }
  }, 2500);
};

const openPaymentModal = async () => {
  if (!successInfo.value?.orderId) {
    message.error('缺少订单信息，无法发起支付');
    return;
  }
  paymentPrepLoading.value = true;
  try {
    const ch = successInfo.value.paymentMethod === 'alipay' ? 'alipay' : 'wechat';
    const data = await paymentsApi.prepay({
      orderId: successInfo.value.orderId,
      channel: ch,
    });
    paymentInfo.value = {
      orderNo: successInfo.value.orderNo,
      paymentMethod: successInfo.value.paymentMethod,
      totalAmount: successInfo.value.totalAmount,
      mode: data.mode,
      qrCodeDataUrl: data.qrCodeDataUrl,
      codeUrl: data.codeUrl,
      hint: data.hint,
    };
    // 进入支付页后不再保留「预约提交成功」弹窗，避免关闭支付弹窗时再次出现
    successModalVisible.value = false;
    paymentModalVisible.value = true;
    startPaymentPoll();
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '获取支付二维码失败';
    message.error(msg);
  } finally {
    paymentPrepLoading.value = false;
  }
};

const refreshPaymentStatus = async () => {
  if (!successInfo.value?.orderNo) return;
  paymentSubmitting.value = true;
  try {
    await paymentsApi.demoComplete({ orderNo: successInfo.value.orderNo });
    if (successInfo.value) {
      successInfo.value.paymentStatus = 'paid';
    }
    syncLocalOrderHistoryPaid(successInfo.value.orderNo);
    message.success('支付成功');
    paymentModalVisible.value = false;
    stopPaymentPoll();
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '操作失败';
    message.error(msg);
  } finally {
    paymentSubmitting.value = false;
  }
};

const goToOrders = () => {
  successModalVisible.value = false;
  router.push('/user/orders');
};

watch(
  () => [
    orderForm.contactName,
    orderForm.phone,
    orderForm.email,
    orderForm.shootingDate,
    orderForm.numberOfPeople,
    orderForm.paymentMethod,
    orderForm.remark,
    selectedPhotographerId.value,
    selectedPhotographerName.value,
  ],
  () => saveStateToStorage(),
  { deep: false }
);

watch(
  () => selectedPackage.value,
  (pkg) => {
    if (!pkg) return;
    if (orderForm.numberOfPeople > pkg.maxPeople) {
      orderForm.numberOfPeople = pkg.maxPeople;
    }
  }
);

watch(
  () => [route.query.packageId, route.query.photographerId],
  () => {
    void loadSelectedPackage();
  }
);

watch(usePhotographerScheduleCalendar, (useCal) => {
  if (useCal) {
    ensureShootingDateMatchesSchedule();
    syncCalendarMonthByCurrentContext();
  }
});

watch(paymentModalVisible, (open) => {
  if (!open) {
    stopPaymentPoll();
  }
});

onMounted(() => {
  authStore.initializeAuth();
  loadSelectedPackage();
});

onUnmounted(() => {
  stopPaymentPoll();
});
</script>

<style scoped lang="less">
.order-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 55%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  color: #334155;
  text-shadow: none;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  p {
    font-size: 1.1rem;
    opacity: 0.9;
    margin: 0;
  }

  &.header-hub p {
    max-width: 640px;
    margin: 0 auto;
    line-height: 1.65;
    color: #64748b;
    opacity: 1;
  }
}

.personalize-hub {
  max-width: 920px;
  margin: 0 auto;
  padding: 8px 0 48px;
}

.hub-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.hub-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 107, 139, 0.12);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #1e293b;
  }

  p {
    margin: 0 0 8px;
    color: #64748b;
    font-size: 0.95rem;
    line-height: 1.6;
    flex: 1;
  }
}

.hub-card-primary {
  border-color: rgba(255, 107, 139, 0.35);
  box-shadow: 0 12px 48px rgba(255, 107, 139, 0.14);
}

.hub-card-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.hub-footer {
  margin-top: 28px;
  text-align: center;
  font-size: 0.95rem;
  color: #64748b;

  .hub-footer-label {
    margin-right: 8px;
  }

  .hub-footer-link {
    color: #ff6b8b;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 26px;
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
  padding: 26px;
}

.right-panel {
  padding: 26px;
}

.bottom-price-bar {
  position: sticky;
  bottom: 8px;
  margin-top: 30px;
  width: 100%;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 107, 139, 0.22);
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  padding: 16px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  z-index: 2;

  .bar-left {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    .label {
      font-size: 15px;
      color: #64748b;
    }
    .price {
      font-size: 26px;
      font-weight: 800;
      color: #ff5c8a;
      line-height: 1;
    }
  }

  .bar-right {
    display: inline-flex;
    gap: 14px;
    color: #475569;
    font-size: 14px;
    white-space: nowrap;
  }
}

.package-card {
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
}

.package-card-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.package-title {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.package-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #666;
  font-size: 0.9rem;

  span {
    white-space: nowrap;
  }
}

.package-price {
  text-align: right;
  min-width: 160px;

  .price-amount {
    color: #ff758c;
    font-size: 1.6rem;
    font-weight: 800;
  }

  .origin-price {
    color: #999;
    font-size: 0.9rem;
    text-decoration: line-through;
    margin-top: 4px;
  }
}

.package-image {
  :deep(.ant-image-img) {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 10px;
    display: block;
  }
}

.order-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 600;
    color: #333;
  }

  :deep(.ant-input),
  :deep(.ant-select-selector),
  :deep(.ant-input-textarea) {
    border-radius: 10px;
  }
}

.photographer-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;

  strong {
    color: #ff5c8a;
  }

  .hint-tag {
    color: #94a3b8;
    font-size: 12px;
  }
}

.schedule-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;

  &.muted {
    color: #94a3b8;
    font-size: 12px;
  }
}

.schedule-calendar {
  margin-top: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.calendar-title {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.calendar-legend {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #475569;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  font-weight: 600;

  &.available {
    color: #237804;
  }
  &.booked {
    color: #cf1322;
  }
  &.unavailable {
    color: #94a3b8;
  }
  &.rest {
    color: #4b5563;
  }
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;

  span {
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    padding: 4px 0;
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  border: 1px solid transparent;
  border-radius: 8px;
  height: 38px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: #f8fafc;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;

  &.available {
    background: rgba(82, 196, 26, 0.15);
    color: #237804;
  }

  &.booked {
    background: rgba(245, 34, 45, 0.14);
    color: #cf1322;
  }

  &.unavailable {
    background: #f1f5f9;
    color: #94a3b8;
  }

  &.rest {
    background: rgba(107, 114, 128, 0.14);
    color: #4b5563;
  }

  &.selected {
    border-color: #ff6b8b;
    box-shadow: 0 0 0 1px #ff6b8b inset;
  }

  &.outside {
    opacity: 0.5;
    cursor: default;
  }
}

.calendar-picked {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;

  strong {
    color: #ff5c8a;
    margin-left: 4px;
  }
}

.submit-btn {
  height: 44px;
  min-width: 160px;
}

.summary-card {
  padding: 18px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;

  h3 {
    margin: 0 0 14px 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: #333;
  }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  color: #555;
  font-size: 0.95rem;

  &.total {
    border-top: 1px solid #f0f0f0;
    margin-top: 8px;
    padding-top: 14px;
    font-size: 1.05rem;

    .value {
      color: #ff758c;
      font-weight: 900;
      font-size: 1.25rem;
    }
  }
}

.summary-tips {
  margin-top: 14px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 10px;
  padding: 12px;
  color: #8a5200;
  font-size: 0.9rem;
  line-height: 1.6;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 360px;
  color: #666;

  p {
    margin-top: 12px;
  }
}

.success-content {
  display: flex;
  flex-direction: column;
  gap: 14px;

  .success-order-no {
    font-size: 1.05rem;
    font-weight: 800;
    color: #333;
  }

  .success-summary {
    color: #666;
    line-height: 1.8;
  }

  .success-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.payment-modal {
  .payment-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .payment-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #333;
  }

  .payment-sub {
    font-size: 13px;
    color: #64748b;
    margin-top: 6px;
  }

  .payment-mode {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }

  .payment-amount {
    font-size: 1.35rem;
    font-weight: 800;
    color: #ff5c8a;
    white-space: nowrap;
  }

  .payment-qr {
    text-align: center;
    margin-bottom: 16px;
  }

  .qr-img {
    width: 280px;
    height: 280px;
    object-fit: contain;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    background: #fff;
  }

  .qr-tip {
    margin-top: 10px;
    font-size: 13px;
    color: #64748b;
  }

  .payment-hint {
    font-size: 13px;
    color: #475569;
    line-height: 1.6;
    margin-bottom: 16px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .payment-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}
</style>
