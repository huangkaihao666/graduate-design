<template>
  <div class="page">
    <div class="head">
      <div>
        <div class="title">我的订单</div>
        <div class="sub">卡片式列表 + 右侧详情面板，温柔粉系风格。</div>
      </div>
      <div class="filters">
        <a-space>
          <a-select v-model:value="status" class="pill" style="width: 140px">
            <a-select-option value="all">全部状态</a-select-option>
            <a-select-option value="pending">待确认</a-select-option>
            <a-select-option value="confirmed">已确认</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
          </a-select>
          <a-date-picker v-model:value="date" class="pill" placeholder="按日期筛选" />
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
          </div>
          <div v-else class="empty">请选择一条订单</div>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">操作</div>
          </div>
          <div class="btns">
            <a-button type="primary" class="pill" @click="confirm">确认接单</a-button>
            <a-button type="primary" class="pill ghost" @click="reschedule">修改时间</a-button>
            <a-button type="primary" class="pill ghost" @click="contact">联系客户</a-button>
          </div>
          <div class="tip">
            说明：这里先做界面与交互，若后端未接入工作人员接单流程，可按需再联调。
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpClient } from '@/api/client';
import { message } from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

type UiStatus = 'pending' | 'confirmed' | 'completed';
type OrderRow = any & { uiStatus: UiStatus };

const router = useRouter();

const loading = ref(false);
const rows = ref<OrderRow[]>([]);
const selected = ref<OrderRow | null>(null);

const status = ref<'all' | UiStatus>('all');
const date = ref<Dayjs | null>(null);

const normalizeStatus = (o: any): UiStatus => {
  const s = String(o?.paymentStatus || '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'paid') return 'confirmed';
  return 'pending';
};

const load = async () => {
  loading.value = true;
  try {
    const res: any = await httpClient.get('/orders');
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : res?.data?.data || [];
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

const confirm = () => {
  if (!selected.value) return;
  message.success('已确认接单（演示）');
  selected.value.uiStatus = 'confirmed';
};

const reschedule = () => {
  if (!selected.value) return;
  message.info('修改时间（演示）：请在后端接入改期接口后联调');
};

const contact = () => {
  router.push('/worker/messages');
};

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
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
  background: var(--pink);
  border-color: var(--pink);
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.tip {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
}
</style>
