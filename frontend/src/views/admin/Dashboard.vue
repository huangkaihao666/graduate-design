<template>
  <div class="admin-dashboard-container">
    <div class="page-header">
      <h1>管理员数据看板</h1>
      <p>运营数据总览与关键指标监控</p>
    </div>

    <div class="stats-grid" v-if="!loading">
      <a-card v-for="item in stats" :key="item.label" class="stat-card" :bordered="false">
        <p class="label">{{ item.label }}</p>
        <h2 class="value">{{ item.value }}</h2>
        <span class="trend">{{ item.trend }}</span>
      </a-card>
    </div>
    <a-skeleton active v-else />

    <div class="panels">
      <a-card title="热门目的地 Top5" :bordered="false">
        <a-table
          :columns="locationColumns"
          :data-source="hotLocations"
          :pagination="false"
          size="small"
        />
      </a-card>
      <a-card title="待处理事项" :bordered="false">
        <a-timeline>
          <a-timeline-item color="red">待确认订单 12 条</a-timeline-item>
          <a-timeline-item color="orange">待上架套餐 3 个</a-timeline-item>
          <a-timeline-item color="blue">用户反馈待处理 5 条</a-timeline-item>
        </a-timeline>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { ordersApi } from '@/api/orders';

const loading = ref(false);
const stats = ref([
  { label: '注册用户', value: '-', trend: '来自数据库' },
  { label: '总订单数', value: '-', trend: '来自数据库' },
  { label: '已支付订单', value: '-', trend: '来自数据库' },
  { label: '已完成订单', value: '-', trend: '来自数据库' },
]);

const locationColumns = [
  { title: '排名', dataIndex: 'rank', key: 'rank', width: 70 },
  { title: '目的地', dataIndex: 'name', key: 'name' },
  { title: '预约量', dataIndex: 'count', key: 'count' },
];

const hotLocations = ref<any[]>([]);

const loadDashboardStats = async () => {
  loading.value = true;
  try {
    const response: any = await ordersApi.getDashboardStats();
    const data = response?.data || response;
    stats.value = [
      { label: '注册用户', value: String(data?.usersCount ?? 0), trend: '来自数据库' },
      { label: '总订单数', value: String(data?.totalOrders ?? 0), trend: '来自数据库' },
      { label: '已支付订单', value: String(data?.paidOrders ?? 0), trend: '来自数据库' },
      { label: '已完成订单', value: String(data?.completedOrders ?? 0), trend: '来自数据库' },
    ];
    hotLocations.value = (data?.hotLocations || []).map((x: any, idx: number) => ({
      key: idx + 1,
      rank: x.rank ?? idx + 1,
      name: x.name,
      count: x.count,
    }));
  } catch (error) {
    console.error('加载看板数据失败:', error);
    message.error('加载看板数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadDashboardStats();
});
</script>

<style scoped lang="less">
.admin-dashboard-container {
  padding: 20px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.page-header {
  margin-bottom: 16px;

  h1 {
    margin: 0;
    font-size: 26px;
  }

  p {
    color: #666;
    margin: 6px 0 0;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  .label {
    color: #8c8c8c;
    margin: 0;
  }

  .value {
    margin: 8px 0;
    color: #111;
  }

  .trend {
    color: #52c41a;
    font-size: 12px;
  }
}

.panels {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .stats-grid,
  .panels {
    grid-template-columns: 1fr;
  }
}
</style>
