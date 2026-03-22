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
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="updateStatus(record.id, '已支付')">标记已支付</a>
              <a @click="updateStatus(record.id, '已完成')">标记完成</a>
              <a @click="updateStatus(record.id, '已取消')">取消</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
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
  createdAt: string;
};

const statusFilter = ref<'all' | OrderStatus>('all');
const loading = ref(false);
const orders = ref<AdminOrder[]>([]);

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
  { title: '下单时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'actions', width: 220 },
];

const statusColorMap: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已完成: 'green',
  已取消: 'red',
};

const filteredOrders = computed(() =>
  statusFilter.value === 'all'
    ? orders.value
    : orders.value.filter((x) => x.status === statusFilter.value)
);

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
    createdAt: item.createdAt ? String(item.createdAt).replace('T', ' ').slice(0, 16) : '-',
  }));
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

onMounted(() => {
  loadOrders();
});
</script>

<style scoped lang="less">
.admin-orders-container {
  padding: 20px 24px;
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
</style>
