<template>
  <div class="page">
    <div class="head">
      <div class="btns">
        <a-button class="pill rest-btn" @click="setRest">设置休息</a-button>
        <a-button type="primary" class="pill ghost" @click="clearAll">清空档期</a-button>
      </div>
    </div>

    <div class="grid">
      <section class="main">
        <div class="panel calendar-panel">
          <div class="calendar-head">
            <div>
              <div class="panel-title">月历视图</div>
              <div class="panel-sub">点击日期可在可预约与休息之间切换，已约满会自动标注。</div>
            </div>
            <div class="legend">
              <span class="lg"><i class="dot a" />可预约</span>
              <span class="lg"><i class="dot f" />已约满</span>
              <span class="lg"><i class="dot r" />休息</span>
            </div>
          </div>
          <div class="calendar-frame">
            <div class="month-toolbar">
              <a-button size="small" class="month-btn" @click="goPrevMonth">上个月</a-button>
              <div class="month-label">{{ monthLabel }}</div>
              <a-button size="small" class="month-btn" @click="goNextMonth">下个月</a-button>
            </div>
            <div class="week-row">
              <span v-for="w in weekLabels" :key="w" class="week-cell">{{ w }}</span>
            </div>
            <div class="month-grid">
              <button
                v-for="d in calendarCells"
                :key="d.key"
                type="button"
                class="day-card"
                :class="[
                  !d.inMonth && 'muted-day',
                  isToday(d.day) && 'today',
                  isSelected(d.day) && 'selected',
                  statusClass(d.day),
                ]"
                @click="onDayClick(d.day)"
              >
                <span class="day-num">{{ d.day.date() }}</span>
                <span v-if="statusText(d.day)" class="tag" :class="statusClass(d.day)">
                  {{ statusText(d.day) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside class="right">
        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">当日/当周预约统计</div>
          </div>
          <div class="stat">
            <div class="s">
              <div class="n">{{ stats.booked }}</div>
              <div class="t">已约数量</div>
            </div>
            <div class="s">
              <div class="n soft">{{ stats.free }}</div>
              <div class="t">空闲数量</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">快速设置</div>
          </div>
          <a-form layout="vertical">
            <a-form-item label="日期范围">
              <a-range-picker
                v-model:value="range"
                class="pill-input"
                :locale="datePickerLocaleZhCN"
              />
            </a-form-item>
            <a-form-item label="设置为">
              <a-segmented v-model:value="mode" :options="modes" />
            </a-form-item>
            <a-button type="primary" class="pill" block @click="applyRange">批量应用</a-button>
          </a-form>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpClient } from '@/api/client';
import { authApi } from '@/api/auth';
import { photographersApi, type PhotographerPublic } from '@/api/photographers';
import { useAuthStore } from '@/store/auth';
import { unwrapOrderListPayload } from '@/utils/workerOrders';
import datePickerLocaleZhCN from 'ant-design-vue/es/date-picker/locale/zh_CN';
import { message } from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { computed, onMounted, ref } from 'vue';

type Kind = 'available' | 'rest';

dayjs.locale('zh-cn');

const range = ref<[Dayjs, Dayjs] | null>(null);
const mode = ref<Kind>('available');
const modes = [
  { label: '可预约', value: 'available' },
  { label: '休息', value: 'rest' },
];

const authStore = useAuthStore();
const uid = () => authStore.user?.id ?? 'guest';
const keyAvail = () => `worker_${uid()}_schedule_available`;
const keyRest = () => `worker_${uid()}_schedule_rest`;
const keyFull = () => `worker_${uid()}_schedule_full_auto`;

const loadSet = (key: string) => {
  const raw = localStorage.getItem(key);
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  return new Set(Array.isArray(arr) ? arr : []);
};
const saveSet = (key: string, set: Set<string>) => {
  localStorage.setItem(key, JSON.stringify([...set].sort()));
};
const dayKey = (d: Dayjs) => d.format('YYYY-MM-DD');
const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const currentMonth = ref(dayjs().startOf('month'));
const selectedDate = ref(dayjs().startOf('day'));
const availableDates = ref<Set<string>>(new Set());
const restDates = ref<Set<string>>(new Set());
const photographerId = ref<number | null>(null);
const syncWarned = ref(false);
const missingBindingWarned = ref(false);

const booked = ref<Set<string>>(new Set());

const syncScheduleFromStorage = () => {
  availableDates.value = loadSet(keyAvail());
  restDates.value = loadSet(keyRest());
};

const persistSchedule = () => {
  saveSet(keyAvail(), availableDates.value);
  saveSet(keyRest(), restDates.value);
};

const dedupeSortedDates = (dates: Iterable<string>) => {
  return Array.from(new Set(Array.from(dates).filter(Boolean))).sort();
};

const resolveWorkerPhotographer = async (): Promise<number | null> => {
  if (photographerId.value) return photographerId.value;
  let boundId = Number(authStore.user?.workerPhotographerId || 0);
  // 先尝试刷新一次用户信息，避免本地 user 缓存过旧导致拿不到绑定关系
  if (!Number.isFinite(boundId) || boundId <= 0) {
    try {
      await authStore.getProfile();
      boundId = Number(authStore.user?.workerPhotographerId || 0);
    } catch {
      // ignore
    }
  }
  if (Number.isFinite(boundId) && boundId > 0) {
    photographerId.value = boundId;
    return photographerId.value;
  }
  const workerName = String(authStore.user?.name || '').trim();
  if (!workerName) return null;
  try {
    const me = await photographersApi.getMine();
    if (me?.id) {
      photographerId.value = Number(me.id);
      return photographerId.value;
    }
  } catch {
    /* ignore */
  }
  try {
    const pub = await photographersApi.getPublic();
    const hit = (Array.isArray(pub) ? pub : []).find(
      (x: PhotographerPublic) => String(x.name || '').trim() === workerName
    );
    if (hit?.id) {
      photographerId.value = Number(hit.id);
      return photographerId.value;
    }
  } catch {
    /* ignore */
  }
  // 再兜底：直接调用 profile（避免 Pinia 未及时更新）
  try {
    const p: any = await authApi.getProfile();
    const data = (p as { data?: any })?.data?.data || (p as { data?: any })?.data || p;
    const pid = Number(data?.workerPhotographerId || 0);
    if (Number.isFinite(pid) && pid > 0) {
      photographerId.value = pid;
      return photographerId.value;
    }
  } catch {
    // ignore
  }
  return null;
};

const pullAvailableDatesFromBackend = async () => {
  try {
    const hit = await photographersApi.getMine();
    photographerId.value = hit.id;
    availableDates.value = new Set(dedupeSortedDates(hit.availableDates || []));
    restDates.value = new Set(dedupeSortedDates(hit.restDates || []));
    persistSchedule();
  } catch {
    if (!missingBindingWarned.value) {
      message.warning('当前账号未关联摄影师档案或无法拉取档期，将仅使用本地数据');
      missingBindingWarned.value = true;
    }
  }
};

const syncAvailableDatesToBackend = async () => {
  if (!authStore.user?.workerPhotographerId) {
    if (!missingBindingWarned.value) {
      message.warning('未找到可同步的摄影师档案，请先在个人中心完成档案关联');
      missingBindingWarned.value = true;
    }
    return;
  }
  try {
    await photographersApi.updateMine({
      availableDates: dedupeSortedDates(availableDates.value),
      restDates: dedupeSortedDates(restDates.value),
    });
    syncWarned.value = false;
    missingBindingWarned.value = false;
  } catch {
    if (!syncWarned.value) {
      message.warning('档期已本地保存，后端同步失败，请稍后重试');
      syncWarned.value = true;
    }
  }
};

const refreshBooked = async () => {
  try {
    const res: any = await httpClient.get('/orders/worker');
    const list = unwrapOrderListPayload(res);
    const full = new Set<string>();
    for (const o of Array.isArray(list) ? list : []) {
      const s = String(o?.paymentStatus || '');
      if (s === 'cancelled') continue;
      const d = String(o?.shootingDate || '').slice(0, 10);
      if (d) full.add(d);
    }
    booked.value = full;
    saveSet(keyFull(), full);
  } catch {
    booked.value = loadSet(keyFull());
  }
};

const statusText = (d: Dayjs) => {
  const k = dayKey(d);
  if (booked.value.has(k)) return '已约满';
  if (restDates.value.has(k)) return '休息';
  if (availableDates.value.has(k)) return '可预约';
  return '';
};

const statusClass = (d: Dayjs) => {
  const k = dayKey(d);
  if (booked.value.has(k)) return 'full';
  if (restDates.value.has(k)) return 'rest';
  if (availableDates.value.has(k)) return 'avail';
  return 'none';
};

const toggleDate = (d: any) => {
  const k = dayKey(dayjs(d.toDate?.() ? d.toDate() : d));
  if (booked.value.has(k)) {
    message.warning('已约满日期由订单自动标注，不建议手工修改');
    return;
  }
  const a = new Set(availableDates.value);
  const r = new Set(restDates.value);
  if (a.has(k)) {
    a.delete(k);
    r.add(k);
  } else if (r.has(k)) {
    r.delete(k);
  } else {
    a.add(k);
  }
  availableDates.value = a;
  restDates.value = r;
  persistSchedule();
  void syncAvailableDatesToBackend();
};

const monthLabel = computed(() => currentMonth.value.format('YYYY 年 M 月'));

const calendarCells = computed(() => {
  const start = currentMonth.value.startOf('month');
  const startWeek = (start.day() + 6) % 7;
  const gridStart = start.subtract(startWeek, 'day');
  const cells: Array<{ key: string; day: Dayjs; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const day = gridStart.add(i, 'day');
    cells.push({
      key: day.format('YYYY-MM-DD'),
      day,
      inMonth: day.month() === currentMonth.value.month(),
    });
  }
  return cells;
});

const isToday = (d: Dayjs) => d.isSame(dayjs(), 'day');
const isSelected = (d: Dayjs) => d.isSame(selectedDate.value, 'day');
const onDayClick = (d: Dayjs) => {
  selectedDate.value = d.startOf('day');
  toggleDate(d);
};
const goPrevMonth = () => {
  currentMonth.value = currentMonth.value.subtract(1, 'month').startOf('month');
};
const goNextMonth = () => {
  currentMonth.value = currentMonth.value.add(1, 'month').startOf('month');
};

const setRest = () => {
  message.info('请选择日期后点击切换即可设置休息');
};

const clearAll = () => {
  availableDates.value = new Set();
  restDates.value = new Set();
  persistSchedule();
  void syncAvailableDatesToBackend();
  message.success('已清空档期（不影响订单自动标注）');
};

const applyRange = () => {
  if (!range.value) {
    message.warning('请选择日期范围');
    return;
  }
  const [start, end] = range.value;
  const a = new Set(availableDates.value);
  const r = new Set(restDates.value);
  let cur = start.startOf('day');
  const last = end.startOf('day');
  while (cur.isBefore(last) || cur.isSame(last)) {
    const k = dayKey(cur);
    if (!booked.value.has(k)) {
      if (mode.value === 'available') {
        r.delete(k);
        a.add(k);
      } else {
        a.delete(k);
        r.add(k);
      }
    }
    cur = cur.add(1, 'day');
  }
  availableDates.value = a;
  restDates.value = r;
  persistSchedule();
  void syncAvailableDatesToBackend();
  message.success('已批量设置');
};

const stats = computed(() => {
  return { booked: booked.value.size, free: availableDates.value.size };
});

onMounted(() => {
  authStore.initializeAuth();
  syncScheduleFromStorage();
  void pullAvailableDatesFromBackend();
  refreshBooked();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
  padding-top: 8px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
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
.btns {
  display: flex;
  gap: 10px;
}
.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
.rest-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}
.rest-btn:hover,
.rest-btn:focus,
.rest-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.btns .pill.ghost:hover,
.btns .pill.ghost:focus,
.btns .pill.ghost:active {
  background: rgba(255, 107, 139, 0.18) !important;
  border-color: rgba(255, 107, 139, 0.34) !important;
  color: #be185d !important;
  box-shadow: none !important;
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
.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
  margin-bottom: 14px;
}
.calendar-panel {
  padding: 16px;
  background: linear-gradient(180deg, #fff7fb 0%, #ffffff 48%);
}
.calendar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.panel-sub {
  margin-top: 4px;
  color: #9ca3af;
  font-size: 12px;
}
.calendar-frame {
  border: 1px solid rgba(255, 107, 139, 0.16);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 8px 20px rgba(255, 107, 139, 0.08);
}
.month-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff5f9 0%, #ffffff 100%);
}
.month-label {
  text-align: center;
  font-size: 22px;
  font-weight: 900;
  color: #1f2937;
  letter-spacing: 1px;
}
.month-btn {
  border-radius: 999px;
  border-color: rgba(255, 107, 139, 0.35);
  color: #be185d;
  font-weight: 700;
  background: #fff;
}
.month-btn:hover,
.month-btn:focus,
.month-btn:active {
  color: #a61b5b !important;
  border-color: #f472b6 !important;
  background: #ffe4ee !important;
  box-shadow: none !important;
}
.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin: 12px 0 16px;
}
.week-cell {
  text-align: center;
  font-size: 16px;
  color: #111827;
  font-weight: 800;
  line-height: 1.7;
  padding: 6px 0;
  border-radius: 10px;
  background: rgba(255, 107, 139, 0.08);
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
.day-card {
  border: 1px solid rgba(17, 24, 39, 0.14);
  border-radius: 10px;
  min-height: 64px;
  background: #fff;
  padding: 7px 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
}
.day-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 107, 139, 0.48);
  box-shadow: 0 8px 16px rgba(255, 107, 139, 0.16);
}
.day-card.muted-day {
  opacity: 0.5;
  background: #f8fafc;
}
.day-card.today {
  box-shadow: inset 0 0 0 1px rgba(255, 107, 139, 0.2);
}
.day-card.selected {
  border-color: rgba(255, 107, 139, 0.68);
  box-shadow:
    inset 0 0 0 1px rgba(255, 107, 139, 0.3),
    0 6px 12px rgba(255, 107, 139, 0.16);
}
.day-num {
  font-size: 16px;
  font-weight: 800;
  color: #1f2937;
}
.day-card.none {
  background: #fff;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}
.legend {
  display: flex;
  gap: 10px;
  color: #6b7280;
  font-size: 14px;
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.dot.a {
  background: rgba(255, 107, 139, 0.55);
}
.dot.f {
  background: #e53935;
}
.dot.r {
  background: #9ca3af;
}
.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.28);
  background: rgba(255, 107, 139, 0.12);
  color: #be185d;
  font-weight: 700;
}
.tag.full {
  border-color: rgba(229, 57, 53, 0.5);
  background: rgba(229, 57, 53, 0.18);
  color: #c62828;
}
.tag.rest {
  border-color: rgba(107, 114, 128, 0.32);
  background: rgba(107, 114, 128, 0.12);
  color: #4b5563;
}
.hint {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
}
.stat {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.s {
  border-radius: var(--r);
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
  padding: 12px;
}
.n {
  font-size: 22px;
  font-weight: 900;
  color: #d6336c;
}
.n.soft {
  color: #374151;
}
.t {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}
.pill-input :deep(.ant-picker) {
  border-radius: 999px !important;
}
</style>
