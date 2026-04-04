<template>
  <div class="admin-insights">
    <div class="page-header">
      <h1>运营洞察与商业报告</h1>
      <a-space wrap>
        <a-button type="primary" html-type="button" :loading="loading" @click.stop="loadReport">
          刷新报告
        </a-button>
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

      <a-tabs v-model:active-key="activeTab" class="insight-tabs">
        <a-tab-pane key="report" tab="商业报告">
          <div class="report-three-parts">
            <a-card title="一、现状分析" :bordered="false" class="pane-card part-card">
              <ul class="prose-list">
                <li v-for="(p, i) in report.situationAnalysis" :key="'s-' + i">{{ p }}</li>
              </ul>
            </a-card>
            <a-card title="二、数据解读与问题发现" :bordered="false" class="pane-card part-card">
              <ul class="prose-list">
                <li v-for="(p, i) in report.dataInterpretationAndIssues" :key="'d-' + i">
                  {{ p }}
                </li>
              </ul>
            </a-card>
            <a-card title="三、针对性改善建议" :bordered="false" class="pane-card part-card">
              <ol class="prose-list numbered">
                <li v-for="(p, i) in report.improvementSuggestions" :key="'m-' + i">{{ p }}</li>
              </ol>
            </a-card>
            <a-card
              title="四、AI 营销建议"
              :bordered="false"
              class="pane-card part-card marketing-card"
            >
              <template #extra>
                <a-button
                  type="primary"
                  html-type="button"
                  :disabled="loading || marketingLoading"
                  :loading="marketingLoading"
                  @click.stop="runMarketingSuggestions"
                >
                  {{ marketingItems.length ? '重新生成' : '生成营销建议' }}
                </a-button>
              </template>
              <p v-if="!marketingItems.length && !marketingLoading" class="marketing-placeholder">
                点击本卡片右上角「生成营销建议」，将基于当前库内运营数据调用 AI
                生成渠道、文案与活动向的可执行建议（与「刷新报告」同源快照）。
              </p>
              <ol v-else-if="marketingItems.length" class="prose-list numbered marketing-list">
                <li v-for="(p, i) in marketingItems" :key="'mk-' + i">{{ p }}</li>
              </ol>
              <a-spin v-else :spinning="marketingLoading" />
              <p v-if="marketingReportAt" class="marketing-meta muted">
                基于报告快照：{{ formatTime(marketingReportAt) }}
              </p>
            </a-card>
          </div>
        </a-tab-pane>
        <a-tab-pane key="metrics" tab="指标明细">
          <a-alert
            v-if="marketingItems.length"
            type="info"
            show-icon
            class="metrics-marketing-hint"
            message="AI 营销建议已在「商业报告」页签第四节展示，可切换页签查看。"
          />
          <a-row :gutter="[16, 16]" class="metrics-detail">
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
const marketingLoading = ref(false);
const marketingItems = ref<string[]>([]);
const marketingReportAt = ref<string | null>(null);

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
    marketingItems.value = [];
    marketingReportAt.value = null;
  } catch (e) {
    console.error(e);
    message.error(formatApiError(e));
  } finally {
    loading.value = false;
  }
}

async function runMarketingSuggestions() {
  if (marketingLoading.value) return;
  if (loading.value) {
    message.warning('请先等待当前报告加载完成');
    return;
  }
  marketingLoading.value = true;
  const closeLoading = message.loading({
    content: '正在生成营销建议，请稍候…',
    duration: 0,
    key: 'insight-marketing',
  });
  try {
    const res = await insightsApi.generateMarketingSuggestions();
    marketingItems.value = Array.isArray(res?.items) ? res.items : [];
    marketingReportAt.value = res?.reportGeneratedAt ?? null;
    activeTab.value = 'report';
    if (!marketingItems.value.length) {
      message.warning('未返回有效建议，请重试');
    } else {
      message.success('已生成营销建议');
    }
  } catch (e) {
    console.error(e);
    message.error(formatApiError(e));
  } finally {
    closeLoading();
    marketingLoading.value = false;
  }
}

onMounted(() => {
  loadReport();
});
</script>

<style scoped lang="less">
.admin-insights {
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

  :deep(.ant-space) {
    margin-top: 12px;
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

  :deep(.ant-tabs-tab) {
    font-size: 16px;
    padding: 12px 0;
  }

  :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
    font-weight: 600;
  }
}

.report-three-parts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.part-card {
  margin-top: 0;
  border: 1px solid rgba(17, 24, 39, 0.06);
  border-radius: 10px;
  :deep(.ant-card-head) {
    border-bottom: 1px solid rgba(17, 24, 39, 0.06);
    font-weight: 700;
    min-height: 52px;
  }
  :deep(.ant-card-head-title) {
    font-size: 17px;
  }
}

.pane-card {
  margin-top: 8px;
  border: none;
}

.prose-list {
  margin: 0;
  padding-left: 1.2rem;
  color: #374151;
  font-size: 16px;
  line-height: 1.8;
  li + li {
    margin-top: 12px;
  }
  &.numbered {
    list-style: decimal;
  }
}

.metrics-marketing-hint {
  margin-bottom: 16px;
}

.marketing-placeholder {
  margin: 0;
  color: #6b7280;
  font-size: 15px;
  line-height: 1.75;
}

.marketing-list {
  margin-bottom: 8px;
}

.marketing-meta {
  margin: 12px 0 0;
  font-size: 13px;
}

.marketing-card :deep(.ant-card-extra) {
  padding: 12px 0;
}

.metrics-detail {
  :deep(.ant-card-head-title) {
    font-size: 16px;
    font-weight: 600;
  }

  :deep(.ant-card-body) {
    font-size: 15px;
  }

  :deep(.ant-table) {
    font-size: 15px;
  }

  :deep(.ant-table-thead > tr > th) {
    font-size: 15px;
    padding: 12px 14px;
  }

  :deep(.ant-table-tbody > tr > td) {
    font-size: 15px;
    padding: 12px 14px;
  }
}
</style>
