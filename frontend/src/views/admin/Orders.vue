<template>
  <div class="admin-orders-container">
    <div class="header">
      <h1>订单管理</h1>
      <a-space>
        <a-select v-model:value="statusFilter" style="width: 140px">
          <a-select-option value="all">全部状态</a-select-option>
          <a-select-option value="待支付">待支付</a-select-option>
          <a-select-option value="已支付">已支付</a-select-option>
          <a-select-option value="已完成">已完成</a-select-option>
          <a-select-option value="已取消">已取消</a-select-option>
        </a-select>
        <a-select v-model:value="rescheduleFilter" style="width: 160px">
          <a-select-option value="all">全部改期状态</a-select-option>
          <a-select-option value="pending">改期待审批</a-select-option>
          <a-select-option value="approved">改期已通过</a-select-option>
          <a-select-option value="rejected">改期已驳回</a-select-option>
          <a-select-option value="none">无改期申请</a-select-option>
        </a-select>
      </a-space>
    </div>

    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="filteredOrders"
        :pagination="{ pageSize: 8 }"
        :loading="loading"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'photographerName'">
            {{ record.photographerName || '—' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColorMap[record.status as OrderStatus]">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'rescheduleRequestedDate'">
            <template v-if="record.rescheduleRequestStatus">
              <a-tag
                :color="
                  record.rescheduleRequestStatus === 'pending'
                    ? 'gold'
                    : record.rescheduleRequestStatus === 'approved'
                      ? 'green'
                      : 'red'
                "
              >
                {{ formatRescheduleStatus(record.rescheduleRequestStatus) }}
              </a-tag>
              <span v-if="record.rescheduleRequestedDate"
                >→ {{ record.rescheduleRequestedDate }}</span
              >
            </template>
            <span v-else>无</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="updateStatus(record.id, '已支付')">标记已支付</a>
              <a @click="updateStatus(record.id, '已完成')">标记完成</a>
              <a @click="updateStatus(record.id, '已取消')">取消</a>
              <a-button
                v-if="record.rescheduleRequestStatus === 'pending'"
                type="primary"
                size="small"
                class="approve-btn"
                @click="openReviewModal(record.id, 'approve')"
              >
                通过改期
              </a-button>
              <a-button
                v-if="record.rescheduleRequestStatus === 'pending'"
                danger
                size="small"
                class="reject-btn"
                @click="openReviewModal(record.id, 'reject')"
              >
                驳回改期
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="reviewModalVisible"
      :title="reviewAction === 'approve' ? '通过改期申请' : '驳回改期申请'"
      :confirm-loading="reviewSubmitting"
      ok-text="提交审批"
      cancel-text="取消"
      @ok="submitReviewWithNote"
      @cancel="closeReviewModal"
    >
      <a-textarea
        v-model:value="reviewNote"
        :rows="4"
        :maxlength="120"
        show-count
        :placeholder="
          reviewAction === 'approve' ? '请填写通过原因（必填）' : '请填写驳回原因（必填）'
        "
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { ordersApi } from '@/api/orders';

type OrderStatus = '待支付' | '已支付' | '已完成' | '已取消';
type AdminOrder = {
  id: number;
  orderNo: string;
  user: string;
  packageName: string;
  photographerName?: string;
  amount: number;
  status: OrderStatus;
  shootingDate: string;
  rescheduleRequestStatus?: 'pending' | 'approved' | 'rejected' | string;
  rescheduleRequestedDate?: string;
  createdAt: string;
};

const statusFilter = ref<'all' | OrderStatus>('all');
const rescheduleFilter = ref<'all' | 'pending' | 'approved' | 'rejected' | 'none'>('all');
const loading = ref(false);
const orders = ref<AdminOrder[]>([]);
const reviewModalVisible = ref(false);
const reviewSubmitting = ref(false);
const reviewTargetId = ref<number | null>(null);
const reviewAction = ref<'approve' | 'reject'>('approve');
const reviewNote = ref('');

const columns = [
  { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
  { title: '用户', dataIndex: 'user', key: 'user' },
  { title: '套餐', dataIndex: 'packageName', key: 'packageName' },
  { title: '摄影师', dataIndex: 'photographerName', key: 'photographerName', ellipsis: true },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    customRender: ({ text }: any) => `¥${Number(text).toLocaleString()}`,
  },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '拍摄日期', dataIndex: 'shootingDate', key: 'shootingDate' },
  { title: '改期申请', dataIndex: 'rescheduleRequestedDate', key: 'rescheduleRequestedDate' },
  { title: '下单时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'actions', width: 300 },
];

const statusColorMap: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已完成: 'green',
  已取消: 'red',
};

const filteredOrders = computed(() => {
  let list =
    statusFilter.value === 'all'
      ? orders.value
      : orders.value.filter((x) => x.status === statusFilter.value);

  if (rescheduleFilter.value === 'all') return list;
  if (rescheduleFilter.value === 'none') {
    return list.filter((x) => !x.rescheduleRequestStatus);
  }
  return list.filter((x) => x.rescheduleRequestStatus === rescheduleFilter.value);
});

const statusMap: Record<string, OrderStatus> = {
  unpaid: '待支付',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  offline_pending: '待支付',
};

const normalizeOrders = (raw: any): AdminOrder[] => {
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return list.map((item: any) => ({
    id: Number(item.id),
    orderNo: item.orderNo,
    user: item.contactName || '-',
    packageName: item.packageName || '-',
    photographerName: item.photographerName || '',
    amount: Number(item.totalAmount || 0),
    status: statusMap[item.paymentStatus] || '待支付',
    shootingDate: item.shootingDate || '-',
    rescheduleRequestStatus: item.rescheduleRequestStatus || undefined,
    rescheduleRequestedDate: item.rescheduleRequestedDate || '',
    createdAt: item.createdAt ? String(item.createdAt).replace('T', ' ').slice(0, 16) : '-',
  }));
};

const formatRescheduleStatus = (s?: string) => {
  if (!s) return '无';
  if (s === 'pending') return '待审批';
  if (s === 'approved') return '已通过';
  if (s === 'rejected') return '已驳回';
  return s;
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const response: any = await ordersApi.getAdminOrders();
    orders.value = normalizeOrders(response);
  } catch (error) {
    console.error('加载订单失败:', error);
    message.error('加载订单失败');
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (id: number, status: OrderStatus) => {
  const idx = orders.value.findIndex((x) => x.id === id);
  if (idx < 0) return;
  try {
    await ordersApi.updateOrderStatus(id, status);
    orders.value[idx].status = status;
    message.success(`订单状态已更新为：${status}`);
  } catch (error) {
    console.error('更新订单状态失败:', error);
    message.error('更新订单状态失败');
  }
};

const reviewReschedule = async (id: number, action: 'approve' | 'reject') => {
  const idx = orders.value.findIndex((x) => x.id === id);
  if (idx < 0) return;
  try {
    const row: any = await ordersApi.reviewRescheduleRequest(id, {
      action,
      reviewNote: reviewNote.value.trim(),
    });
    orders.value[idx] = {
      ...orders.value[idx],
      shootingDate: row.shootingDate || orders.value[idx].shootingDate,
      rescheduleRequestStatus:
        row.rescheduleRequestStatus || orders.value[idx].rescheduleRequestStatus,
      rescheduleRequestedDate:
        row.rescheduleRequestedDate || orders.value[idx].rescheduleRequestedDate,
    };
    message.success(action === 'approve' ? '改期审批已通过' : '改期申请已驳回');
  } catch (error) {
    console.error('审批改期失败:', error);
    message.error('审批改期失败');
  }
};

const openReviewModal = (id: number, action: 'approve' | 'reject') => {
  reviewTargetId.value = id;
  reviewAction.value = action;
  reviewNote.value = '';
  reviewModalVisible.value = true;
};

const closeReviewModal = () => {
  reviewTargetId.value = null;
  reviewNote.value = '';
  reviewModalVisible.value = false;
};

const submitReviewWithNote = async () => {
  if (!reviewTargetId.value) return;
  if (!reviewNote.value.trim()) {
    message.warning('请填写审批备注');
    return;
  }
  reviewSubmitting.value = true;
  try {
    await reviewReschedule(reviewTargetId.value, reviewAction.value);
    const idx = orders.value.findIndex((x) => x.id === reviewTargetId.value);
    if (idx !== -1) {
      (orders.value[idx] as any).rescheduleReviewNote = reviewNote.value.trim();
    }
    closeReviewModal();
  } finally {
    reviewSubmitting.value = false;
  }
};

onMounted(() => {
  loadOrders();
});
</script>

<style scoped lang="less">
.admin-orders-container {
  padding: 32px 24px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h1 {
    margin: 0;
  }
}

:deep(.approve-btn.ant-btn-primary) {
  background: #bbf7d0;
  border: 1px solid #4ade80;
  color: #14532d;
  box-shadow: 0 3px 8px rgba(22, 163, 74, 0.18);
}

:deep(.approve-btn.ant-btn-primary:hover) {
  background: #86efac;
  border-color: #22c55e;
  color: #14532d;
}

:deep(.reject-btn.ant-btn-dangerous) {
  background: #fbcfe8;
  border: 1px solid #f472b6;
  color: #831843;
  box-shadow: 0 3px 8px rgba(219, 39, 119, 0.18);
}

:deep(.reject-btn.ant-btn-dangerous:hover) {
  background: #f9a8d4;
  border-color: #ec4899;
  color: #701a75;
}
</style>
