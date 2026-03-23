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
        <span class="count">共 {{ orders.length }} 条订单</span>
      </div>

      <div v-if="filteredOrders.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无订单（或没有匹配的搜索结果）</p>
      </div>

      <div v-else class="orders-grid">
        <div v-for="o in filteredOrders" :key="o.orderNo" class="order-card">
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
            <div class="meta-item">支付状态：{{ formatPaymentStatus(o.paymentStatus) }}</div>
          </div>

          <div class="order-card-bottom">
            <div class="created-at">提交时间：{{ formatDate(o.createdAt) }}</div>
            <div class="order-actions">
              <a-button type="text" @click="openDetail(o)">查看详情</a-button>
              <a-button
                v-if="canCheckOnlinePayment(o)"
                type="text"
                @click.stop="confirmDemoPaid(o.orderNo)"
              >
                确认已支付
              </a-button>
              <a-popconfirm
                title="确认删除该订单吗？"
                ok-text="确认"
                cancel-text="取消"
                @confirm="deleteOrder(o.orderNo)"
              >
                <a-button type="text" danger>删除</a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>
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
              <span class="k">拍摄日期</span><span class="v">{{ activeOrder.shootingDate }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付方式</span
              ><span class="v">{{ formatPayment(activeOrder.paymentMethod) }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付状态</span
              ><span class="v">{{ formatPaymentStatus(activeOrder.paymentStatus) }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import { paymentsApi } from '@/api/payments';

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
  totalAmount: number;
  createdAt: string;
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

const detailVisible = ref(false);
const activeOrder = ref<BookingOrder | null>(null);

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
    // 兜底：确保字段类型正确
    orders.value = list.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount ?? 0),
      unitPrice: Number(o.unitPrice ?? 0),
      numberOfPeople: Number(o.numberOfPeople ?? 1),
      duration: Number(o.duration ?? 0),
    }));
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

const clearAllOrders = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  orders.value = [];
  message.success('已清空所有订单');
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

/** 与预约页二维码弹窗一致：演示流程下直接标记服务端已支付 */
const confirmDemoPaid = async (orderNo: string) => {
  const raw = readOrderHistoryStorage();
  const history = raw ? parseOrders(raw) : [];
  const idx = history.findIndex((x: any) => x.orderNo === orderNo);
  if (idx === -1) {
    message.error('订单不存在');
    return;
  }
  try {
    await paymentsApi.demoComplete({ orderNo });
    history[idx] = {
      ...history[idx],
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
    };
    writeOrderHistoryStorage(JSON.stringify(history));
    orders.value = history as BookingOrder[];
    message.success('已标记为支付成功');
  } catch {
    message.error('操作失败，请检查网络或稍后重试');
  }
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

onMounted(() => {
  authStore.initializeAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  loadOrders();
});
</script>

<style scoped lang="less">
.orders-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 28px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  h1 {
    font-size: 2.3rem;
    font-weight: 800;
    margin-bottom: 8px;
  }

  p {
    font-size: 1.05rem;
    opacity: 0.95;
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
