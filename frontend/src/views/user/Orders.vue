<template>
  <div class="orders-container">
    <div class="page-header">
      <h1>📦 我的订单</h1>
      <p>查看您的预约订单，并进行详情查看/删除操作</p>
    </div>

    <div class="toolbar">
      <a-input
        v-model:value="keyword"
        placeholder="搜索订单编号 / 手机号 / 套餐名称 / 摄影师"
        allow-clear
        class="search-input"
      />
      <div class="toolbar-actions">
        <a-button :loading="loading" @click="loadOrders"> 刷新 </a-button>
        <a-popconfirm
          title="确认清空所有本地订单记录吗？"
          ok-text="确认"
          cancel-text="取消"
          @confirm="clearAllOrders"
        >
          <a-button danger :disabled="orders.length === 0">清空</a-button>
        </a-popconfirm>
      </div>
    </div>

    <div class="content-card">
      <div class="content-header">
        <span class="count">共 {{ filteredOrders.length }} 条订单</span>
      </div>

      <div v-if="filteredOrders.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无订单（或没有匹配的搜索结果）</p>
      </div>

      <div v-else class="orders-grid">
        <div v-for="o in pagedOrders" :key="o.orderNo" class="order-card">
          <div class="order-card-top">
            <div class="order-no">订单号：{{ o.orderNo }}</div>
            <div class="order-amount">¥{{ o.totalAmount.toLocaleString() }}</div>
          </div>

          <div class="order-card-meta">
            <div class="meta-item">套餐：{{ o.packageName }}</div>
            <div v-if="o.photographerName" class="meta-item">摄影师：{{ o.photographerName }}</div>
            <div class="meta-item">人数：{{ o.numberOfPeople }} 人</div>
            <div class="meta-item">联系人：{{ o.contactName }}（{{ o.phone }}）</div>
            <div class="meta-item">支付方式：{{ formatPayment(o.paymentMethod) }}</div>
            <div class="meta-item">
              支付状态：
              <span
                class="status-pill"
                :class="{ unpaid: o.paymentStatus === 'unpaid', paid: o.paymentStatus === 'paid' }"
              >
                {{ formatPaymentStatus(o.paymentStatus) }}
              </span>
            </div>
            <div class="meta-item">
              订单确认：
              <span
                class="status-pill"
                :class="{ confirmed: isOrderConfirmed(o), unconfirmed: !isOrderConfirmed(o) }"
              >
                {{ isOrderConfirmed(o) ? '已确认' : '未确认' }}
              </span>
            </div>
            <div v-if="isRescheduled(o)" class="meta-item rescheduled-mark">
              拍摄日期：{{ o.shootingDate }}（已改期）
            </div>
            <div v-if="o.rescheduleRequestStatus" class="meta-item">
              改期状态：{{ formatRescheduleStatus(o.rescheduleRequestStatus) }}
            </div>
          </div>

          <div class="order-card-bottom">
            <div class="created-at">提交时间：{{ formatDate(o.createdAt) }}</div>
            <div class="order-actions">
              <a-button type="text" @click="openDetail(o)">查看详情</a-button>
              <a-button type="text" danger @click="openDeleteModal(o.orderNo)">删除</a-button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredOrders.length > pageSize" class="pagination-wrap">
        <a-pagination
          v-model:current="currentPage"
          :page-size="pageSize"
          :total="filteredOrders.length"
          :show-size-changer="false"
          size="small"
        />
      </div>
    </div>

    <a-modal
      v-model:open="detailVisible"
      title="订单详情"
      :footer="null"
      :width="860"
      @cancel="closeDetail"
    >
      <div v-if="activeOrder" class="detail-modal">
        <div class="detail-header">
          <div class="detail-order-no">订单号：{{ activeOrder.orderNo }}</div>
          <div class="detail-total">合计：¥{{ activeOrder.totalAmount.toLocaleString() }}</div>
        </div>

        <div class="detail-body">
          <div class="detail-section">
            <h3>套餐信息</h3>
            <div class="detail-row">
              <span class="k">套餐名称</span><span class="v">{{ activeOrder.packageName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">地点</span><span class="v">{{ activeOrder.location }}</span>
            </div>
            <div class="detail-row">
              <span class="k">风格</span
              ><span class="v">{{ getStyleName(activeOrder.style) }}</span>
            </div>
            <div class="detail-row">
              <span class="k">行程天数</span><span class="v">{{ activeOrder.duration }} 天</span>
            </div>
            <div v-if="activeOrder.photographerName" class="detail-row">
              <span class="k">指定摄影师</span
              ><span class="v">{{ activeOrder.photographerName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">单价</span
              ><span class="v">¥{{ activeOrder.unitPrice.toLocaleString() }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>预约信息</h3>
            <div class="detail-row">
              <span class="k">预约人数</span
              ><span class="v">{{ activeOrder.numberOfPeople }} 人</span>
            </div>
            <div class="detail-row">
              <span class="k">拍摄日期</span>
              <span class="v">
                {{ activeOrder.shootingDate }}
                <a-tag v-if="isRescheduled(activeOrder)" color="green" style="margin-left: 6px"
                  >已改期</a-tag
                >
                <a-button
                  v-if="canRequestReschedule(activeOrder)"
                  type="link"
                  size="small"
                  style="padding: 0 0 0 8px"
                  @click="openRescheduleModal(activeOrder)"
                >
                  申请改期
                </a-button>
              </span>
            </div>
            <div v-if="activeOrder.rescheduleRequestStatus" class="detail-row">
              <span class="k">改期审批</span>
              <span class="v">{{
                formatRescheduleStatus(activeOrder.rescheduleRequestStatus)
              }}</span>
            </div>
            <div v-if="activeOrder.rescheduleReviewNote" class="detail-row">
              <span class="k">审批备注</span>
              <span class="v">{{ activeOrder.rescheduleReviewNote }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付方式</span
              ><span class="v">{{ formatPayment(activeOrder.paymentMethod) }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付状态</span
              ><span class="v">
                <span
                  class="status-pill"
                  :class="{
                    unpaid: activeOrder.paymentStatus === 'unpaid',
                    paid: activeOrder.paymentStatus === 'paid',
                  }"
                >
                  {{ formatPaymentStatus(activeOrder.paymentStatus) }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="k">订单确认</span>
              <span class="v">
                <span
                  class="status-pill"
                  :class="{
                    confirmed: isOrderConfirmed(activeOrder),
                    unconfirmed: !isOrderConfirmed(activeOrder),
                  }"
                >
                  {{ isOrderConfirmed(activeOrder) ? '已确认' : '未确认' }}
                </span>
              </span>
            </div>
            <div v-if="isOrderConfirmed(activeOrder) && activeOrder.workerName" class="detail-row">
              <span class="k">确认人员</span><span class="v">{{ activeOrder.workerName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付时间</span
              ><span class="v">{{
                activeOrder.paidAt ? formatDate(activeOrder.paidAt) : '-'
              }}</span>
            </div>
            <div class="detail-row">
              <span class="k">提交时间</span
              ><span class="v">{{ formatDate(activeOrder.createdAt) }}</span>
            </div>
            <div v-if="activeOrder.photographerName" class="detail-row">
              <span class="k">沟通</span>
              <span class="v">
                <a-button
                  type="link"
                  size="small"
                  style="padding-right: 0"
                  @click="goChatWithPhotographer(activeOrder)"
                >
                  联系摄影师
                </a-button>
              </span>
            </div>
            <div v-if="canCheckOnlinePayment(activeOrder)" class="detail-row">
              <span class="k">支付</span>
              <span class="v">
                <a-button
                  type="link"
                  size="small"
                  style="padding-right: 0"
                  @click="openPaymentModal(activeOrder)"
                >
                  去支付
                </a-button>
              </span>
            </div>
          </div>

          <div class="detail-section">
            <h3>联系人</h3>
            <div class="detail-row">
              <span class="k">姓名</span><span class="v">{{ activeOrder.contactName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">手机号</span><span class="v">{{ activeOrder.phone }}</span>
            </div>
            <div class="detail-row">
              <span class="k">邮箱</span><span class="v">{{ activeOrder.email || '-' }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>备注</h3>
            <div class="detail-remark">{{ activeOrder.remark || '—' }}</div>
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="deleteModalVisible"
      title="确认删除订单"
      :width="460"
      ok-text="确认删除"
      cancel-text="取消"
      centered
      @ok="confirmDeleteOrder"
      @cancel="closeDeleteModal"
    >
      <div class="delete-modal-body">删除后不可恢复，确认删除该订单吗？</div>
    </a-modal>

    <a-modal
      v-model:open="paymentModalVisible"
      title="扫码支付"
      :footer="null"
      :width="480"
      @cancel="closePaymentModal"
    >
      <div class="payment-modal-body">
        <a-spin :spinning="paymentLoading">
          <template v-if="paymentInfo">
            <div class="payment-summary">
              <div>订单号：{{ paymentInfo.orderNo }}</div>
              <div>支付方式：{{ formatPayment(paymentInfo.paymentMethod) }}</div>
              <div>应付金额：¥{{ paymentInfo.totalAmount.toLocaleString() }}</div>
            </div>
            <div class="payment-qr-wrap">
              <a-image
                v-if="paymentInfo.qrCodeDataUrl"
                :src="paymentInfo.qrCodeDataUrl"
                :preview="false"
                class="payment-qr-img"
              />
              <div v-else class="payment-qr-empty">二维码加载中...</div>
            </div>
            <div class="payment-hint">
              {{ paymentInfo.hint || '请使用对应支付 App 扫码完成支付' }}
            </div>
            <div class="payment-actions">
              <a-button type="primary" :loading="paymentSubmitting" @click="confirmPaidAndClose">
                已支付
              </a-button>
            </div>
          </template>
        </a-spin>
      </div>
    </a-modal>

    <a-modal
      v-model:open="rescheduleModalVisible"
      title="申请改期（免费一次）"
      :confirm-loading="rescheduleSubmitting"
      ok-text="提交申请"
      cancel-text="取消"
      @ok="submitRescheduleRequest"
      @cancel="closeRescheduleModal"
    >
      <div class="reschedule-modal-body">
        <div v-if="rescheduleTarget" class="reschedule-current">
          当前拍摄日期：{{ rescheduleTarget.shootingDate }}
        </div>
        <div class="reschedule-calendar">
          <div class="calendar-header">
            <a-button size="small" @click="goPrevRescheduleMonth">上个月</a-button>
            <span class="calendar-title">{{ rescheduleCalendarTitle }}</span>
            <a-button size="small" @click="goNextRescheduleMonth">下个月</a-button>
          </div>
          <div class="calendar-legend">
            <span class="legend-item available">可改</span>
            <span class="legend-item booked">已约</span>
            <span class="legend-item unavailable">不可改</span>
          </div>
          <div class="calendar-weekdays">
            <span v-for="w in ['日', '一', '二', '三', '四', '五', '六']" :key="w">{{ w }}</span>
          </div>
          <div class="calendar-grid">
            <button
              v-for="cell in rescheduleCalendarCells"
              :key="cell.date"
              type="button"
              class="calendar-day"
              :class="[
                cell.status,
                {
                  muted: !cell.inCurrentMonth,
                  selected: rescheduleForm.newShootingDate === cell.date,
                },
              ]"
              :disabled="!cell.inCurrentMonth || cell.status !== 'available'"
              @click="selectRescheduleDate(cell.date)"
            >
              <span class="day-num">{{ cell.day }}</span>
              <span class="day-status">
                {{
                  cell.status === 'available'
                    ? '可改'
                    : cell.status === 'booked'
                      ? '已约'
                      : '不可改'
                }}
              </span>
            </button>
          </div>
        </div>
        <div class="reschedule-current">
          已选新日期：{{ rescheduleForm.newShootingDate || '未选择' }}
        </div>
        <a-textarea
          v-model:value="rescheduleForm.reason"
          :rows="3"
          :maxlength="120"
          show-count
          placeholder="改期原因（选填）"
          style="margin-top: 10px"
        />
        <div class="reschedule-tip">仅支持拍摄日前3天及以上免费改期一次，需管理员审批。</div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import { paymentsApi } from '@/api/payments';
import { ordersApi } from '@/api/orders';
import { photographersApi } from '@/api/photographers';

type PaymentMethod = 'wechat' | 'alipay' | 'offline' | string;

interface BookingOrder {
  orderNo: string;
  /** 服务端订单主键，用于发起 prepay */
  orderId?: number;
  packageId: number;
  packageName: string;
  location: string;
  style: string;
  duration: number;
  unitPrice: number;
  numberOfPeople: number;
  shootingDate: string;
  contactName: string;
  phone: string;
  email?: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: string;
  paymentNo?: string;
  paidAt?: string;
  remark?: string;
  photographerId?: number;
  photographerName?: string;
  workerUserId?: number;
  workerName?: string;
  workerTakenAt?: string;
  totalAmount: number;
  createdAt: string;
  rescheduleCount?: number;
  rescheduleRequestStatus?: 'pending' | 'approved' | 'rejected' | string;
  rescheduleRequestedDate?: string;
  rescheduleRequestReason?: string;
  rescheduleRequestedAt?: string;
  rescheduleReviewNote?: string;
  rescheduleReviewedAt?: string;
}

const STORAGE_KEY = 'online-order-history';

const readOrderHistoryStorage = (): string | null => {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      localStorage.setItem(STORAGE_KEY, raw);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
  return raw;
};
const writeOrderHistoryStorage = (json: string) => {
  localStorage.setItem(STORAGE_KEY, json);
};

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const keyword = ref('');
const orders = ref<BookingOrder[]>([]);
const currentPage = ref(1);
const pageSize = 6;

const detailVisible = ref(false);
const activeOrder = ref<BookingOrder | null>(null);
const paymentModalVisible = ref(false);
const paymentLoading = ref(false);
const paymentSubmitting = ref(false);
let paymentPollTimer: ReturnType<typeof setInterval> | null = null;
const paymentInfo = ref<{
  orderNo: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  qrCodeDataUrl?: string;
  codeUrl?: string;
  hint?: string;
} | null>(null);
const deleteModalVisible = ref(false);
const pendingDeleteOrderNo = ref('');
const rescheduleModalVisible = ref(false);
const rescheduleSubmitting = ref(false);
const rescheduleTarget = ref<BookingOrder | null>(null);
const rescheduleForm = ref({
  newShootingDate: '',
  reason: '',
});
const rescheduleAvailableDates = ref<string[]>([]);
const rescheduleBookedDates = ref<string[]>([]);
const rescheduleCalendarMonth = ref(new Date());

const styleMap: Record<string, string> = { ...TRAVEL_STYLE_LABELS };

const getStyleName = (style: string) => styleMap[style] || style;

const formatPayment = (method: PaymentMethod) => {
  if (method === 'wechat') return '微信支付';
  if (method === 'alipay') return '支付宝';
  if (method === 'offline') return '线下支付';
  return method || '-';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? dateString : d.toLocaleString('zh-CN');
};

const formatPaymentStatus = (status?: string) => {
  if (!status) return '-';
  if (status === 'unpaid') return '待支付';
  if (status === 'paid') return '已支付';
  if (status === 'offline_pending') return '线下待支付';
  return status;
};

const formatRescheduleStatus = (status?: string) => {
  if (!status) return '-';
  if (status === 'pending') return '待审批';
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return status;
};

const isRescheduled = (o: BookingOrder) =>
  (o.rescheduleCount || 0) > 0 || o.rescheduleRequestStatus === 'approved';
const isOrderConfirmed = (o: BookingOrder | null | undefined) =>
  !!o && (Number(o.workerUserId || 0) > 0 || !!String(o.workerTakenAt || '').trim());

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const rescheduleAvailableSet = computed(() => new Set(rescheduleAvailableDates.value));
const rescheduleBookedSet = computed(() => new Set(rescheduleBookedDates.value));

const rescheduleCalendarTitle = computed(() => {
  const y = rescheduleCalendarMonth.value.getFullYear();
  const m = rescheduleCalendarMonth.value.getMonth() + 1;
  return `${y}年${m}月`;
});

const getRescheduleDateStatus = (iso: string): 'available' | 'booked' | 'unavailable' => {
  const todayIso = toIsoDate(new Date());
  if (rescheduleBookedSet.value.has(iso)) return 'booked';
  if (rescheduleAvailableSet.value.has(iso) && iso >= todayIso) return 'available';
  return 'unavailable';
};

const rescheduleCalendarCells = computed(() => {
  const base = new Date(
    rescheduleCalendarMonth.value.getFullYear(),
    rescheduleCalendarMonth.value.getMonth(),
    1
  );
  const firstWeekday = base.getDay();
  const start = new Date(base);
  start.setDate(base.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toIsoDate(d);
    return {
      date: iso,
      day: d.getDate(),
      inCurrentMonth: d.getMonth() === base.getMonth(),
      status: getRescheduleDateStatus(iso),
    };
  });
});

const goPrevRescheduleMonth = () => {
  const d = rescheduleCalendarMonth.value;
  rescheduleCalendarMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
};

const goNextRescheduleMonth = () => {
  const d = rescheduleCalendarMonth.value;
  rescheduleCalendarMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
};

const selectRescheduleDate = (iso: string) => {
  if (getRescheduleDateStatus(iso) !== 'available') return;
  rescheduleForm.value.newShootingDate = iso;
};

const parseOrders = (raw: string | null): BookingOrder[] => {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list as BookingOrder[];
  } catch {
    return [];
  }
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const raw = readOrderHistoryStorage();
    const list = parseOrders(raw);
    const normalized = list.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount ?? 0),
      unitPrice: Number(o.unitPrice ?? 0),
      numberOfPeople: Number(o.numberOfPeople ?? 1),
      duration: Number(o.duration ?? 0),
    }));
    const synced = await Promise.all(
      normalized.map(async (o) => {
        if (!o.orderId) return o;
        try {
          const latest: any = await ordersApi.getOrderById(o.orderId);
          return {
            ...o,
            shootingDate: latest?.shootingDate || o.shootingDate,
            workerUserId: Number(latest?.workerUserId ?? o.workerUserId ?? 0) || undefined,
            workerName: latest?.workerName || o.workerName,
            workerTakenAt: latest?.workerTakenAt || o.workerTakenAt,
            rescheduleCount: Number(latest?.rescheduleCount ?? o.rescheduleCount ?? 0),
            rescheduleRequestStatus: latest?.rescheduleRequestStatus || o.rescheduleRequestStatus,
            rescheduleRequestedDate: latest?.rescheduleRequestedDate || o.rescheduleRequestedDate,
            rescheduleReviewNote: latest?.rescheduleReviewNote || o.rescheduleReviewNote,
            rescheduleReviewedAt: latest?.rescheduleReviewedAt || o.rescheduleReviewedAt,
          } as BookingOrder;
        } catch {
          return o;
        }
      })
    );
    orders.value = synced;
    writeOrderHistoryStorage(JSON.stringify(synced));
  } catch (e: any) {
    console.error('加载订单失败:', e);
    message.error('加载订单失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const saveOrdersToStorage = (next: BookingOrder[]) => {
  writeOrderHistoryStorage(JSON.stringify(next));
  orders.value = next;
};

const deleteOrder = (orderNo: string) => {
  const next = orders.value.filter((o) => o.orderNo !== orderNo);
  saveOrdersToStorage(next);
  message.success('订单已删除');
};

const openDeleteModal = (orderNo: string) => {
  pendingDeleteOrderNo.value = orderNo;
  deleteModalVisible.value = true;
};

const closeDeleteModal = () => {
  deleteModalVisible.value = false;
  pendingDeleteOrderNo.value = '';
};

const confirmDeleteOrder = () => {
  if (!pendingDeleteOrderNo.value) return;
  deleteOrder(pendingDeleteOrderNo.value);
  closeDeleteModal();
};

const clearAllOrders = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  orders.value = [];
  message.success('已清空所有订单');
};

const goChatWithPhotographer = (o: BookingOrder) => {
  router.push({
    path: '/user/chat',
    query: {
      orderNo: o.orderNo,
      peerName: o.photographerName || '工作人员',
      shootingDate: String(o.shootingDate || ''),
    },
  });
};

const openDetail = (order: BookingOrder) => {
  activeOrder.value = order;
  detailVisible.value = true;
};

const closeDetail = () => {
  detailVisible.value = false;
  activeOrder.value = null;
};

const canCheckOnlinePayment = (o: BookingOrder) => {
  const onlineMethods = ['wechat', 'alipay'];
  return onlineMethods.includes(o.paymentMethod as string) && o.paymentStatus === 'unpaid';
};

const canRequestReschedule = (o: BookingOrder) => {
  if (!o.orderId) return false;
  if ((o.rescheduleCount || 0) >= 1) return false;
  if (o.rescheduleRequestStatus === 'pending') return false;
  if (o.paymentStatus === 'cancelled') return false;
  const d = new Date(`${o.shootingDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 3;
};

const openRescheduleModal = (order: BookingOrder) => {
  closeDetail();
  rescheduleTarget.value = order;
  rescheduleForm.value = {
    newShootingDate: '',
    reason: '',
  };
  rescheduleAvailableDates.value = [];
  rescheduleBookedDates.value = [];
  const [y, m] = String(order.shootingDate || '')
    .split('-')
    .map((x) => Number(x));
  rescheduleCalendarMonth.value = y && m ? new Date(y, m - 1, 1) : new Date();
  rescheduleModalVisible.value = true;
  void loadRescheduleCalendar(order);
};

const closeRescheduleModal = () => {
  rescheduleTarget.value = null;
  rescheduleAvailableDates.value = [];
  rescheduleBookedDates.value = [];
  rescheduleModalVisible.value = false;
};

const loadRescheduleCalendar = async (order: BookingOrder) => {
  if (!order.photographerId) return;
  try {
    const [p, booked] = await Promise.all([
      photographersApi.getPublicOne(order.photographerId),
      ordersApi.getPhotographerBookedDates(order.photographerId),
    ]);
    const available = Array.isArray(p.availableDates) ? p.availableDates : [];
    rescheduleAvailableDates.value = available
      .map((x) => String(x).trim())
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
    rescheduleBookedDates.value = (Array.isArray(booked) ? booked : [])
      .map((x) => String(x).trim())
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  } catch {
    rescheduleAvailableDates.value = [];
    rescheduleBookedDates.value = [];
  }
};

const submitRescheduleRequest = async () => {
  const target = rescheduleTarget.value;
  if (!target?.orderId) {
    message.error('订单缺少服务端ID，暂无法申请改期');
    return;
  }
  if (!rescheduleForm.value.newShootingDate) {
    message.warning('请选择新拍摄日期');
    return;
  }
  if (getRescheduleDateStatus(rescheduleForm.value.newShootingDate) !== 'available') {
    message.warning('请在该摄影师可预约档期内选择可改日期');
    return;
  }
  rescheduleSubmitting.value = true;
  try {
    const updated: any = await ordersApi.requestReschedule(target.orderId, {
      newShootingDate: rescheduleForm.value.newShootingDate,
      reason: rescheduleForm.value.reason || undefined,
    });
    const idx = orders.value.findIndex((x) => x.orderNo === target.orderNo);
    if (idx !== -1) {
      orders.value[idx] = {
        ...orders.value[idx],
        rescheduleRequestStatus: updated?.rescheduleRequestStatus || 'pending',
        rescheduleRequestedDate:
          updated?.rescheduleRequestedDate || rescheduleForm.value.newShootingDate,
        rescheduleRequestReason:
          updated?.rescheduleRequestReason || rescheduleForm.value.reason || undefined,
        rescheduleRequestedAt: updated?.rescheduleRequestedAt || new Date().toISOString(),
      };
      writeOrderHistoryStorage(JSON.stringify(orders.value));
    }
    message.success('改期申请已提交，等待管理员审批');
    closeRescheduleModal();
  } catch (e: any) {
    message.error(e?.message || '提交改期申请失败');
  } finally {
    rescheduleSubmitting.value = false;
  }
};

const stopPaymentPoll = () => {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
};

const markOrderPaidLocal = (orderNo: string) => {
  const raw = readOrderHistoryStorage();
  const history = raw ? parseOrders(raw) : [];
  const idx = history.findIndex((x: any) => x.orderNo === orderNo);
  if (idx === -1) return;
  history[idx] = {
    ...history[idx],
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
  };
  writeOrderHistoryStorage(JSON.stringify(history));
  orders.value = history as BookingOrder[];
};

const handlePaymentSuccess = (orderNo: string) => {
  markOrderPaidLocal(orderNo);
  stopPaymentPoll();
  paymentModalVisible.value = false;
  paymentInfo.value = null;
  message.success('支付成功');
};

const startPaymentPoll = () => {
  stopPaymentPoll();
  const orderNo = paymentInfo.value?.orderNo;
  if (!orderNo) return;
  paymentPollTimer = setInterval(async () => {
    try {
      const st = await paymentsApi.getStatus(orderNo);
      if (st.paid) {
        handlePaymentSuccess(orderNo);
      }
    } catch {
      /* ignore */
    }
  }, 2500);
};

const openPaymentModal = async (order: BookingOrder) => {
  if (!order.orderId) {
    message.error('订单缺少支付信息（orderId），请重新下单或联系管理员');
    return;
  }
  paymentLoading.value = true;
  paymentInfo.value = null;
  paymentModalVisible.value = true;
  try {
    const channel = order.paymentMethod === 'alipay' ? 'alipay' : 'wechat';
    const data = await paymentsApi.prepay({
      orderId: order.orderId,
      channel,
    });
    paymentInfo.value = {
      orderNo: order.orderNo,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      qrCodeDataUrl: data.qrCodeDataUrl,
      codeUrl: data.codeUrl,
      hint: data.hint,
    };
    startPaymentPoll();
  } catch (e: any) {
    paymentModalVisible.value = false;
    message.error(e?.message || '获取支付二维码失败');
  } finally {
    paymentLoading.value = false;
  }
};

const confirmPaidAndClose = async () => {
  const orderNo = paymentInfo.value?.orderNo;
  if (!orderNo) return;
  paymentSubmitting.value = true;
  try {
    await paymentsApi.demoComplete({ orderNo });
    handlePaymentSuccess(orderNo);
  } catch (e: any) {
    message.error(e?.message || '操作失败，请稍后重试');
  } finally {
    paymentSubmitting.value = false;
  }
};

const closePaymentModal = () => {
  stopPaymentPoll();
  paymentInfo.value = null;
};

const filteredOrders = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return orders.value;
  return orders.value.filter((o) => {
    return (
      (o.orderNo || '').toLowerCase().includes(kw) ||
      (o.phone || '').toLowerCase().includes(kw) ||
      (o.packageName || '').toLowerCase().includes(kw) ||
      (o.photographerName || '').toLowerCase().includes(kw)
    );
  });
});

const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredOrders.value.slice(start, start + pageSize);
});

const ensurePageInRange = () => {
  const totalPages = Math.max(1, Math.ceil(filteredOrders.value.length / pageSize));
  if (currentPage.value > totalPages) currentPage.value = totalPages;
  if (currentPage.value < 1) currentPage.value = 1;
};

onMounted(() => {
  authStore.initializeAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  loadOrders();
});

watch(
  () => filteredOrders.value.length,
  () => {
    ensurePageInRange();
  }
);

onUnmounted(() => {
  stopPaymentPoll();
});
</script>

<style scoped lang="less">
.orders-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 28px;
  color: #334155;
  text-shadow: none;

  h1 {
    font-size: 2.3rem;
    font-weight: 800;
    margin-bottom: 8px;
  }

  p {
    font-size: 1.05rem;
    opacity: 0.9;
    margin: 0;
  }
}

.toolbar {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.search-input {
  flex: 1;
  max-width: 620px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.content-card {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.content-header {
  padding: 18px 22px;
  border-bottom: 1px solid #f0f0f0;
}

.count {
  font-weight: 600;
  color: #666;
}

.empty-state {
  padding: 90px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.6;
  margin-bottom: 12px;
}

.orders-grid {
  padding: 18px 22px 26px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.pagination-wrap {
  padding: 0 22px 20px;
  display: flex;
  justify-content: flex-end;
}

.order-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 16px;
  background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.order-no {
  font-weight: 800;
  color: #333;
  font-size: 1.02rem;
}

.order-amount {
  font-weight: 900;
  color: #ff758c;
  font-size: 1.1rem;
  white-space: nowrap;
}

.order-card-meta {
  color: #666;
  font-size: 0.93rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  margin-left: 4px;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;

  &.unpaid {
    color: #be185d;
    background: #fff1f6;
    border-color: #f9a8d4;
    font-weight: 700;
  }

  &.paid {
    color: #0f766e;
    background: #f0fdfa;
    border-color: #99f6e4;
    font-weight: 700;
  }

  &.confirmed {
    color: #155eef;
    background: #eef4ff;
    border-color: #b2ccff;
    font-weight: 700;
  }

  &.unconfirmed {
    color: #854d0e;
    background: #fff7ed;
    border-color: #fed7aa;
    font-weight: 700;
  }
}

.order-card-bottom {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.created-at {
  color: #999;
  font-size: 0.86rem;
  white-space: nowrap;
}

.order-actions {
  display: flex;
  gap: 8px;
}

.detail-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  color: white;
}

.detail-order-no {
  font-weight: 900;
  font-size: 1.05rem;
}

.detail-total {
  font-weight: 900;
  font-size: 1.2rem;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.detail-section {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 16px;
  background: #fff;
}

.detail-section h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 800;
  color: #333;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  color: #666;
  font-size: 0.92rem;
}

.detail-row .k {
  color: #999;
  white-space: nowrap;
}

.detail-row .v {
  text-align: right;
  word-break: break-word;
  color: #333;
}

.detail-remark {
  color: #333;
  line-height: 1.7;
  font-size: 0.95rem;
}

.payment-modal-body {
  padding-top: 4px;
}

.payment-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.92rem;
  color: #555;
  margin-bottom: 12px;
}

.payment-qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 260px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
}

.payment-qr-img {
  width: 240px;
  height: 240px;
}

.payment-qr-empty {
  color: #999;
  font-size: 0.9rem;
}

.payment-hint {
  margin-top: 10px;
  color: #888;
  font-size: 0.88rem;
  text-align: center;
}

.payment-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.delete-modal-body {
  min-height: 66px;
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #334155;
}

.reschedule-modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reschedule-current {
  font-size: 0.9rem;
  color: #666;
}

.reschedule-tip {
  font-size: 12px;
  color: #999;
}

.reschedule-calendar {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.calendar-title {
  font-weight: 700;
  color: #334155;
}

.calendar-legend {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.legend-item {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid transparent;

  &.available {
    color: #166534;
    background: #dcfce7;
    border-color: #86efac;
  }
  &.booked {
    color: #991b1b;
    background: #fee2e2;
    border-color: #fca5a5;
  }
  &.unavailable {
    color: #475569;
    background: #f1f5f9;
    border-color: #cbd5e1;
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
    color: #64748b;
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  min-height: 48px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;

  .day-num {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    line-height: 1;
  }

  .day-status {
    font-size: 10px;
    line-height: 1;
  }

  &.available {
    border-color: #86efac;
    background: #f0fdf4;
    .day-status {
      color: #16a34a;
    }
  }

  &.booked {
    border-color: #fca5a5;
    background: #fef2f2;
    .day-status {
      color: #dc2626;
    }
  }

  &.unavailable {
    border-color: #e2e8f0;
    background: #f8fafc;
    .day-status {
      color: #94a3b8;
    }
  }

  &.selected {
    box-shadow: 0 0 0 2px rgba(255, 117, 140, 0.25) inset;
  }

  &.muted {
    opacity: 0.35;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

@media (max-width: 900px) {
  .detail-body {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    justify-content: flex-end;
  }
}
</style>
