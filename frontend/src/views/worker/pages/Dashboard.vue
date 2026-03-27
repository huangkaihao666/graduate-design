<template>
  <div class="page">
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
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">作品管理</div>
            <div class="actions">
              <a-button class="pill-btn upload-btn" @click="go('/worker/portfolio')"
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
              <span class="lg"><i class="dot r" />休息</span>
            </div>
          </div>
          <div class="mini-calendar">
            <div class="mini-toolbar">
              <a-button size="small" class="mini-month-btn" @click="prevMonth">上个月</a-button>
              <span class="mini-month-title">{{ monthTitle }}</span>
              <a-button size="small" class="mini-month-btn" @click="nextMonth">下个月</a-button>
            </div>
            <div class="mini-week">
              <span v-for="w in weekLabels" :key="w" class="mini-week-cell">{{ w }}</span>
            </div>
            <div class="mini-grid">
              <div
                v-for="cell in dashboardCells"
                :key="cell.key"
                class="mini-day"
                :class="[
                  !cell.inMonth && 'muted',
                  isTodayDay(cell.day) && 'today',
                  dayStatusClass(cell.day),
                ]"
              >
                <span class="mini-num">{{ cell.day.date() }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel order-detail-panel">
          <div class="panel-h">
            <div class="panel-title">订单详情</div>
          </div>
          <div v-if="orderBriefList.length" class="order-brief-list">
            <div
              v-for="o in orderBriefList"
              :key="String(o.id || o.orderNo || o.shootingDate)"
              class="brief-item"
            >
              <div class="brief-name">{{ o.contactName || '客户' }}</div>
              <div class="brief-meta">
                <span class="k">时间</span><span class="v">{{ o.shootingDate || '-' }}</span>
              </div>
              <div class="brief-meta">
                <span class="k">地点</span><span class="v">{{ o.location || '-' }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty">暂无订单可展示</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpClient } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import { unwrapOrderListPayload } from '@/utils/workerOrders';
import dayjs, { Dayjs } from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

type OrderRow = any;

const router = useRouter();
const authStore = useAuthStore();
const uid = () => authStore.user?.id ?? 'guest';
const portfolioUrlsKey = () => `worker_portfolio_urls_${uid()}`;
const scheduleAvailKey = () => `worker_${uid()}_schedule_available`;
const scheduleFullKey = () => `worker_${uid()}_schedule_full_auto`;
const scheduleRestKey = () => `worker_${uid()}_schedule_rest`;
const dashboardMonth = ref(dayjs().startOf('month'));
const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];

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
  const raw = localStorage.getItem(portfolioUrlsKey());
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  return Array.isArray(arr) ? arr.slice(0, 8) : [];
});

const upcomingDates = computed(() => {
  const raw = localStorage.getItem(scheduleAvailKey());
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  if (!Array.isArray(arr)) return [];
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return arr
    .map((x) => String(x).trim())
    .filter((x) => re.test(x))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
});

const orderBriefList = computed(() => orders.value.slice(0, 6));

const go = (to: string) => router.push(to);

const scheduleKey = (d: Date) => d.toISOString().slice(0, 10);

const dayStatusClass = (d: Dayjs) => {
  const k = d.format('YYYY-MM-DD');
  const full = getSchedule('full');
  const rest = getSchedule('rest');
  const avail = getSchedule('available');
  if (full.has(k)) return 'full';
  if (rest.has(k)) return 'rest';
  if (avail.has(k)) return 'available';
  return 'none';
};

const getSchedule = (kind: 'available' | 'full' | 'rest') => {
  const key =
    kind === 'available'
      ? scheduleAvailKey()
      : kind === 'full'
        ? scheduleFullKey()
        : scheduleRestKey();
  const raw = localStorage.getItem(key);
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  return new Set(Array.isArray(arr) ? arr : []);
};

const monthTitle = computed(() => dashboardMonth.value.format('YYYY年M月'));

const dashboardCells = computed(() => {
  const start = dashboardMonth.value.startOf('month');
  const startWeek = (start.day() + 6) % 7;
  const gridStart = start.subtract(startWeek, 'day');
  const out: Array<{ key: string; day: Dayjs; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const day = gridStart.add(i, 'day');
    out.push({
      key: day.format('YYYY-MM-DD'),
      day,
      inMonth: day.month() === dashboardMonth.value.month(),
    });
  }
  return out;
});

const isTodayDay = (d: Dayjs) => d.isSame(dayjs(), 'day');
const prevMonth = () => {
  dashboardMonth.value = dashboardMonth.value.subtract(1, 'month').startOf('month');
};
const nextMonth = () => {
  dashboardMonth.value = dashboardMonth.value.add(1, 'month').startOf('month');
};

const loadOrders = async () => {
  try {
    const res: any = await httpClient.get('/orders/worker');
    const list = unwrapOrderListPayload(res);
    orders.value = Array.isArray(list) ? list.slice(0, 20) : [];
  } catch {
    orders.value = [];
  }
};

onMounted(() => {
  authStore.initializeAuth();
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
  margin: 4px 0 0;
  max-height: 132px;
  overflow: hidden;
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
.upload-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}
.upload-btn:hover,
.upload-btn:focus,
.upload-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}
.pill-btn.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.pill-btn.ghost:hover,
.pill-btn.ghost:focus,
.pill-btn.ghost:active {
  background: rgba(255, 107, 139, 0.2) !important;
  border-color: rgba(255, 107, 139, 0.36) !important;
  color: #be185d !important;
  box-shadow: none !important;
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
  aspect-ratio: 3 / 4;
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
  background: #ff0000;
}
.dot.r {
  background: #9ca3af;
}

.mini-calendar {
  border: 1px solid rgba(255, 107, 139, 0.16);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff8fc 0%, #fff 100%);
  padding: 10px;
}
.mini-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.mini-month-btn {
  border-radius: 999px;
  border-color: rgba(255, 107, 139, 0.28);
  color: #be185d;
  background: #fff;
  padding: 0 8px;
}
.mini-month-title {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  color: #374151;
}
.mini-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.mini-week-cell {
  text-align: center;
  font-size: 11px;
  color: #6b7280;
  font-weight: 700;
}
.mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.mini-day {
  border: 1px solid rgba(17, 24, 39, 0.1);
  border-radius: 8px;
  min-height: 28px;
  background: #fff;
  display: grid;
  place-items: center;
}
.mini-day.muted {
  opacity: 0.4;
}
.mini-day.today {
  box-shadow: inset 0 0 0 1px rgba(255, 107, 139, 0.4);
}
.mini-day.available {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.28);
}
.mini-day.full {
  background: rgba(255, 0, 0, 0.28);
  border-color: rgba(255, 0, 0, 0.56);
}
.mini-day.rest {
  background: rgba(156, 163, 175, 0.12);
  border-color: rgba(107, 114, 128, 0.28);
}
.mini-num {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
}

.order-brief-list {
  display: grid;
  gap: 10px;
  max-height: 340px;
  overflow: auto;
}
.brief-item {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 10px;
  background: rgba(255, 107, 139, 0.08);
  padding: 7px 10px;
}
.brief-name {
  font-weight: 800;
  color: #111827;
  margin-bottom: 4px;
}
.brief-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 1px 0;
}
.order-detail-panel {
  padding-top: 10px;
  padding-bottom: 10px;
}
.k {
  color: #6b7280;
}
.v {
  color: #111827;
  text-align: right;
}
</style>
