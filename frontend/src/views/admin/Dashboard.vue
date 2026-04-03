<template>
  <div class="admin-dashboard-container">
    <div class="page-header">
      <h1>管理员数据看板</h1>
      <p>运营数据总览与关键指标监控（含图表可视化）</p>
    </div>

    <div v-if="!loading" class="stats-grid">
      <a-card v-for="item in stats" :key="item.label" class="stat-card" :bordered="false">
        <p class="label">{{ item.label }}</p>
        <h2 class="value">{{ item.value }}</h2>
        <span class="trend">{{ item.trend }}</span>
      </a-card>
    </div>
    <a-skeleton v-else active />

    <div v-show="!loading" class="charts-row">
      <a-card title="热门目的地 Top5" :bordered="false" class="chart-card">
        <div ref="barChartRef" class="echart" />
        <p v-if="!hasLocationData" class="empty-hint">暂无订单数据，图表将在有预约后显示</p>
      </a-card>
      <a-card title="订单支付状态分布" :bordered="false" class="chart-card">
        <div ref="pieChartRef" class="echart" />
        <p v-if="!hasOrderData" class="empty-hint">暂无订单数据</p>
      </a-card>
    </div>

    <div v-show="!loading" class="panels">
      <a-card title="热门目的地明细" :bordered="false">
        <a-table
          :columns="locationColumns"
          :data-source="hotLocations"
          :pagination="false"
          size="small"
        />
      </a-card>
      <a-card title="待关注数据" :bordered="false">
        <a-timeline>
          <a-timeline-item v-if="pendingUnpaid > 0" color="red">
            待支付订单 {{ pendingUnpaid }} 条
          </a-timeline-item>
          <a-timeline-item v-else color="green">暂无待支付订单</a-timeline-item>
          <a-timeline-item color="blue">注册用户 {{ usersCount }} 人</a-timeline-item>
          <a-timeline-item color="gray">图表数据来自数据库实时统计</a-timeline-item>
        </a-timeline>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ordersApi } from '@/api/orders';
import { message } from 'ant-design-vue';
import * as echarts from 'echarts';
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue';

type HotLoc = { key: number; rank: number; name: string; count: number };
type StatusRow = { status: string; count: number };

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

const hotLocations = ref<HotLoc[]>([]);
const orderByStatus = ref<StatusRow[]>([]);
const usersCount = ref(0);

const barChartRef = ref<HTMLElement | null>(null);
const pieChartRef = ref<HTMLElement | null>(null);
const barChart = shallowRef<echarts.ECharts | null>(null);
const pieChart = shallowRef<echarts.ECharts | null>(null);

const STATUS_LABEL: Record<string, string> = {
  unpaid: '待支付',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  offline_pending: '线下待确认',
};

const hasLocationData = computed(
  () => hotLocations.value.length > 0 && hotLocations.value.some((x) => x.count > 0)
);
const hasOrderData = computed(() => orderByStatus.value.some((x) => x.count > 0));

const pendingUnpaid = computed(() => {
  const row = orderByStatus.value.find((x) => x.status === 'unpaid');
  return row?.count ?? 0;
});

function disposeCharts() {
  barChart.value?.dispose();
  pieChart.value?.dispose();
  barChart.value = null;
  pieChart.value = null;
}

function renderCharts() {
  if (!barChartRef.value || !pieChartRef.value) return;

  const palette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#9a60b4'];

  // 柱状图：热门目的地
  if (!barChart.value) {
    barChart.value = echarts.init(barChartRef.value);
  }
  const locNames = hotLocations.value.map((x) => x.name);
  const locCounts = hotLocations.value.map((x) => x.count);
  barChart.value.setOption(
    {
      color: palette,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: {
        type: 'category',
        data: locNames.length ? locNames : ['暂无数据'],
        inverse: true,
      },
      series: [
        {
          name: '预约量',
          type: 'bar',
          data: locNames.length ? locCounts : [0],
          barMaxWidth: 28,
          label: { show: locNames.length > 0, position: 'right' },
        },
      ],
    },
    true
  );

  // 饼图：订单状态
  if (!pieChart.value) {
    pieChart.value = echarts.init(pieChartRef.value);
  }
  const pieData = orderByStatus.value
    .filter((x) => x.count > 0)
    .map((x) => ({
      name: STATUS_LABEL[x.status] ?? x.status,
      value: x.count,
    }));
  pieChart.value.setOption(
    {
      color: palette,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, left: 'center', show: pieData.length > 0 },
      series: [
        {
          name: '订单状态',
          type: 'pie',
          radius: ['38%', '68%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { formatter: '{b}\n{d}%' },
          data: pieData.length ? pieData : [],
        },
      ],
    },
    true
  );
}

function handleResize() {
  barChart.value?.resize();
  pieChart.value?.resize();
}

const loadDashboardStats = async () => {
  loading.value = true;
  try {
    const response: unknown = await ordersApi.getDashboardStats();
    const data = (response as { data?: unknown })?.data ?? response;
    const d = data as {
      usersCount?: number;
      totalOrders?: number;
      paidOrders?: number;
      completedOrders?: number;
      hotLocations?: { rank?: number; name: string; count: number }[];
      orderByStatus?: { status: string; count: number }[];
    };

    stats.value = [
      { label: '注册用户', value: String(d?.usersCount ?? 0), trend: '来自数据库' },
      { label: '总订单数', value: String(d?.totalOrders ?? 0), trend: '来自数据库' },
      { label: '已支付订单', value: String(d?.paidOrders ?? 0), trend: '来自数据库' },
      { label: '已完成订单', value: String(d?.completedOrders ?? 0), trend: '来自数据库' },
    ];
    usersCount.value = d?.usersCount ?? 0;

    hotLocations.value = (d?.hotLocations || []).map((x, idx: number) => ({
      key: idx + 1,
      rank: x.rank ?? idx + 1,
      name: x.name,
      count: x.count,
    }));
    orderByStatus.value = Array.isArray(d?.orderByStatus) ? d.orderByStatus : [];
  } catch (error) {
    console.error('加载看板数据失败:', error);
    message.error('加载看板数据失败');
  } finally {
    loading.value = false;
  }
  await nextTick();
  await nextTick();
  renderCharts();
};

onMounted(() => {
  loadDashboardStats();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  disposeCharts();
});
</script>

<style scoped lang="less">
.admin-dashboard-container {
  padding: 32px 24px 24px;
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

.charts-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.chart-card {
  position: relative;

  .echart {
    height: 320px;
    width: 100%;
  }

  .empty-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 12px;
    color: #999;
    pointer-events: none;
  }
}

.panels {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .stats-grid,
  .charts-row,
  .panels {
    grid-template-columns: 1fr;
  }
}
</style>
