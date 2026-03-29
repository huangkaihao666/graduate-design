<template>
  <div class="admin-insights">
    <div class="page-header">
      <h1>运营洞察与优化建议</h1>
      <p>
        综合用户下单、收藏、套餐浏览埋点及 AI
        功能使用数据，生成商业报告、营销建议与数据分析，辅助迭代产品与运营策略。
      </p>
      <a-space>
        <a-button type="primary" :loading="loading" @click="loadReport">刷新报告</a-button>
        <span v-if="report?.generatedAt" class="muted"
          >生成时间：{{ formatTime(report.generatedAt) }}</span
        >
      </a-space>
    </div>

    <a-skeleton v-if="loading && !report" active />

    <template v-else-if="report">
      <div class="summary-grid">
        <a-card v-for="card in summaryCards" :key="card.label" size="small" class="sum-card">
          <div class="sum-label">{{ card.label }}</div>
          <div class="sum-value">{{ card.value }}</div>
        </a-card>
      </div>

      <a-tabs v-model:activeKey="activeTab" class="insight-tabs">
        <a-tab-pane key="report" tab="商业报告">
          <a-card title="摘要" :bordered="false" class="pane-card">
            <ul class="prose-list">
              <li v-for="(p, i) in report.businessReport" :key="'br-' + i">{{ p }}</li>
            </ul>
          </a-card>
        </a-tab-pane>
        <a-tab-pane key="marketing" tab="营销建议">
          <a-card title="可执行方向" :bordered="false" class="pane-card">
            <ol class="prose-list numbered">
              <li v-for="(p, i) in report.marketingSuggestions" :key="'mk-' + i">{{ p }}</li>
            </ol>
          </a-card>
        </a-tab-pane>
        <a-tab-pane key="analysis" tab="数据分析">
          <a-card title="数据解读" :bordered="false" class="pane-card">
            <ul class="prose-list">
              <li v-for="(p, i) in report.dataAnalysis" :key="'da-' + i">{{ p }}</li>
            </ul>
          </a-card>
        </a-tab-pane>
        <a-tab-pane key="metrics" tab="指标明细">
          <a-row :gutter="[16, 16]">
            <a-col :xs="24" :lg="12">
              <a-card title="购买需求 · 热门风格" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.purchaseDemand.topStyles"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-card title="购买需求 · 热门目的地" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.purchaseDemand.topLocations"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-card title="购买需求 · 热门套餐（按订单）" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.purchaseDemand.topPackages"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-card title="浏览兴趣 · 近 7 日套餐浏览 TOP" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.browseInterest.topPackages7d"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-card title="收藏热度 TOP" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.favorites.topPackages"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-card title="AI 行为 · 虚拍风格分布" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.aiBehavior.virtualTryOnByStyle"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-card title="AI 行程规划 · 热门目的地" :bordered="false" size="small">
                <a-table
                  :columns="rankCols"
                  :data-source="report.aiBehavior.itineraryTopDestinations"
                  :pagination="false"
                  size="small"
                  row-key="key"
                />
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
      </a-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { insightsApi, type OperationalInsightReport } from '@/api/insights';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';

const loading = ref(false);
const report = ref<OperationalInsightReport | null>(null);
const activeTab = ref('report');

const rankCols = [
  { title: '名称', dataIndex: 'label', key: 'label', ellipsis: true },
  { title: '次数', dataIndex: 'count', key: 'count', width: 88 },
];

const summaryCards = computed(() => {
  const s = report.value?.summary;
  if (!s) return [];
  return [
    { label: '注册用户', value: String(s.usersCount) },
    { label: '累计订单', value: String(s.ordersTotal) },
    { label: '近 7 日订单', value: String(s.ordersLast7Days) },
    { label: '近 7 日浏览埋点', value: String(s.browseEvents7d) },
    { label: '已支付', value: String(s.paidOrders) },
    { label: '待支付', value: String(s.unpaidOrders) },
    { label: '风格推荐会话（累计）', value: String(s.styleRecommendationSessions) },
  ];
});

function formatTime(iso: string) {
  try {
    return dayjs(iso).format('YYYY-MM-DD HH:mm');
  } catch {
    return iso;
  }
}

function formatApiError(e: unknown): string {
  const er = e as { statusCode?: number; message?: string | string[] };
  const m = er?.message;
  const text = Array.isArray(m) ? m.join('；') : typeof m === 'string' ? m.trim() : '';
  if (text) return text;
  if (er?.statusCode === 401) return '未授权：请使用「管理员登录」或有效的管理员账号 Token';
  if (er?.statusCode === 500)
    return '服务器错误：请查看后端日志，或确认已执行数据库迁移（含 package_browse_logs 表）';
  return '加载运营报告失败，请确认网络与后端已启动';
}

async function loadReport() {
  loading.value = true;
  try {
    report.value = await insightsApi.getOperationalReport();
  } catch (e) {
    console.error(e);
    message.error(formatApiError(e));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadReport();
});
</script>

<style scoped lang="less">
.admin-insights {
  padding: 20px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.page-header {
  margin-bottom: 20px;
  h1 {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
    margin: 0 0 8px;
  }
  p {
    color: #6b7280;
    margin: 0 0 14px;
    max-width: 920px;
    line-height: 1.6;
  }
}

.muted {
  color: #9ca3af;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.sum-card {
  border-radius: 10px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  :deep(.ant-card-body) {
    padding: 12px 14px;
  }
}

.sum-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.sum-value {
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}

.insight-tabs {
  background: #fff;
  padding: 12px 16px 20px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.pane-card {
  margin-top: 8px;
  border: none;
}

.prose-list {
  margin: 0;
  padding-left: 1.2rem;
  color: #374151;
  line-height: 1.75;
  li + li {
    margin-top: 10px;
  }
  &.numbered {
    list-style: decimal;
  }
}
</style>
