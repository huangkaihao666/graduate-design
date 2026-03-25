<template>
  <div class="page">
    <div class="page-title">首页工作台</div>

    <div class="grid">
      <section class="main">
        <div class="top-cards">
          <div class="card card-pink">
            <div class="card-h">今日待服务订单卡片</div>
            <div class="card-b">
              <div class="num">{{ stats.today }}</div>
              <div class="sub">今日待服务</div>
            </div>
            <a-button type="primary" class="pill-btn" @click="go('/worker/orders')"
              >查看订单</a-button
            >
          </div>

          <div class="card">
            <div class="card-h">待确认预约</div>
            <div class="card-b">
              <div class="num soft">{{ stats.pending }}</div>
              <div class="sub">待确认</div>
            </div>
            <div class="hint">可在「我的订单」中确认接单</div>
          </div>

          <div class="card">
            <div class="card-h">近期档期展示</div>
            <div class="chips">
              <span v-for="d in upcomingDates" :key="d" class="chip">{{ d }}</span>
              <span v-if="!upcomingDates.length" class="muted">暂无档期</span>
            </div>
            <a-button class="pill-btn ghost" @click="go('/worker/schedule')">设置档期</a-button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">作品管理</div>
            <div class="actions">
              <a-button type="primary" class="pill-btn" @click="go('/worker/portfolio')"
                >上传作品</a-button
              >
              <a-button type="primary" class="pill-btn ghost" @click="go('/worker/schedule')"
                >设置档期</a-button
              >
            </div>
          </div>

          <div class="gallery">
            <div v-for="(url, idx) in gallery" :key="idx" class="img-wrap">
              <img :src="url" alt="作品" />
            </div>
            <div v-if="!gallery.length" class="empty">暂无作品，去「作品管理」上传</div>
          </div>
        </div>
      </section>

      <aside class="right">
        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">档期日历</div>
            <div class="legend">
              <span class="lg"><i class="dot a" />可预约</span>
              <span class="lg"><i class="dot f" />已约满</span>
            </div>
          </div>
          <a-calendar :fullscreen="false" class="calendar">
            <template #dateCellRender="{ current }">
              <div class="cell" :class="cellClass(current)">
                <span v-if="cellText(current)" class="cell-tag">{{ cellText(current) }}</span>
              </div>
            </template>
          </a-calendar>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">订单详情</div>
          </div>
          <div v-if="selectedOrder" class="detail">
            <div class="row">
              <span class="k">客户信息</span><span class="v">{{ selectedOrder.contactName }}</span>
            </div>
            <div class="row">
              <span class="k">拍摄风格</span>
              <span class="v"
                ><span class="tag">{{ selectedOrder.style || '主步' }}</span></span
              >
            </div>
            <div class="row">
              <span class="k">时间</span><span class="v">{{ selectedOrder.shootingDate }}</span>
            </div>
            <div class="row">
              <span class="k">地点</span><span class="v">{{ selectedOrder.location }}</span>
            </div>
            <div class="row">
              <span class="k">需求</span
              ><span class="v muted">{{ selectedOrder.remark || '—' }}</span>
            </div>
          </div>
          <div v-else class="empty">暂无订单可展示</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { httpClient } from '@/api/client';

type OrderRow = any;

const router = useRouter();
const orders = ref<OrderRow[]>([]);

const stats = computed(() => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const key = `${yyyy}-${mm}-${dd}`;

  const todayCount = orders.value.filter((o) => String(o.shootingDate).slice(0, 10) === key).length;
  const pending = orders.value.filter(
    (o) =>
      String(o.paymentStatus || '').includes('unpaid') ||
      String(o.paymentStatus || '').includes('pending')
  ).length;
  return { today: todayCount, pending };
});

const gallery = computed(() => {
  const raw = localStorage.getItem('worker_portfolio_urls');
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  return Array.isArray(arr) ? arr.slice(0, 8) : [];
});

const upcomingDates = computed(() => {
  const raw = localStorage.getItem('worker_schedule_available');
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 6);
});

const selectedOrder = computed(() => orders.value[0] || null);

const go = (to: string) => router.push(to);

const scheduleKey = (d: Date) => d.toISOString().slice(0, 10);

const cellClass = (current: any) => {
  const k = scheduleKey(current.toDate());
  const full = getSchedule('full');
  const avail = getSchedule('available');
  if (full.has(k)) return 'full';
  if (avail.has(k)) return 'available';
  return '';
};

const cellText = (current: any) => {
  const k = scheduleKey(current.toDate());
  const full = getSchedule('full');
  const avail = getSchedule('available');
  if (full.has(k)) return '已约满';
  if (avail.has(k)) return '可预约';
  return '';
};

const getSchedule = (kind: 'available' | 'full') => {
  const key = kind === 'available' ? 'worker_schedule_available' : 'worker_schedule_full';
  const raw = localStorage.getItem(key);
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  return new Set(Array.isArray(arr) ? arr : []);
};

const loadOrders = async () => {
  try {
    // 这里复用已有订单接口（若后端未按工作人员区分，会显示最近订单用于界面演示）
    const res: any = await httpClient.get('/orders');
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : res?.data?.data || [];
    orders.value = Array.isArray(list) ? list.slice(0, 20) : [];
  } catch {
    orders.value = [];
  }
};

onMounted(() => {
  loadOrders();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
}

.page-title {
  font-weight: 800;
  color: #111827;
  font-size: 18px;
  margin: 2px 0 14px;
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

.top-cards {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 14px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.card {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px 14px 12px;
  box-shadow: 0 10px 28px rgba(255, 107, 139, 0.06);
}

.card-pink {
  border-color: rgba(255, 107, 139, 0.22);
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.22) 0%, rgba(255, 155, 180, 0.14) 100%);
}

.card-h {
  font-weight: 800;
  color: #111827;
  margin-bottom: 10px;
}

.card-b {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.num {
  font-size: 28px;
  font-weight: 900;
  color: #d6336c;
}
.num.soft {
  color: #374151;
}
.sub {
  color: #6b7280;
}
.hint {
  font-size: 12px;
  color: #9ca3af;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 10px;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 107, 139, 0.08);
  border: 1px solid rgba(255, 107, 139, 0.18);
  color: #d6336c;
  font-size: 12px;
}
.muted {
  color: #9ca3af;
}

.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 28px rgba(17, 24, 39, 0.05);
  margin-top: 14px;
}
.panel:first-child {
  margin-top: 0;
}

.panel-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.panel-title {
  font-weight: 800;
  color: #111827;
}
.actions {
  display: flex;
  gap: 10px;
}

.pill-btn {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
.pill-btn.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  min-height: 180px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
}
.img-wrap {
  border-radius: var(--r);
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: #f9fafb;
  height: 96px;
}
.img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}
.img-wrap:hover img {
  transform: scale(1.06);
}
.empty {
  grid-column: 1 / -1;
  display: grid;
  place-items: center;
  color: #9ca3af;
  padding: 14px 0;
}

.legend {
  display: flex;
  gap: 10px;
  color: #6b7280;
  font-size: 12px;
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.dot.a {
  background: rgba(255, 107, 139, 0.45);
}
.dot.f {
  background: #ff4d4f;
}

.calendar :deep(.ant-picker-calendar-date-content) {
  height: 26px;
}
.cell {
  height: 18px;
  margin-top: 4px;
}
.cell-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 107, 139, 0.08);
  border: 1px solid rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.cell.full .cell-tag {
  background: rgba(255, 77, 79, 0.1);
  border-color: rgba(255, 77, 79, 0.2);
  color: #cf1322;
}

.detail .row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed rgba(17, 24, 39, 0.1);
}
.detail .row:last-child {
  border-bottom: none;
}
.k {
  color: #6b7280;
}
.v {
  color: #111827;
  text-align: right;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 107, 139, 0.1);
  border: 1px solid rgba(255, 107, 139, 0.18);
  color: #d6336c;
  font-weight: 700;
  font-size: 12px;
}
</style>
