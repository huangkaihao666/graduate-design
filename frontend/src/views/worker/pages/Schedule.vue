<template>
  <div class="page">
    <div class="head">
      <div>
        <div class="title">档期管理</div>
        <div class="sub">月历视图：可预约 / 已约满 / 休息。支持批量设置与右侧快速设置。</div>
      </div>
      <div class="btns">
        <a-button type="primary" class="pill" @click="setRest">设置休息</a-button>
        <a-button type="primary" class="pill ghost" @click="clearAll">清空档期</a-button>
      </div>
    </div>

    <div class="grid">
      <section class="main">
        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">月历视图</div>
            <div class="legend">
              <span class="lg"><i class="dot a" />可预约</span>
              <span class="lg"><i class="dot f" />已约满</span>
              <span class="lg"><i class="dot r" />休息</span>
            </div>
          </div>
          <a-calendar class="cal" :fullscreen="false" @select="toggleDate">
            <template #dateCellRender="{ current }">
              <div class="cell">
                <span v-if="tagText(current)" class="tag" :class="tagClass(current)">{{
                  tagText(current)
                }}</span>
              </div>
            </template>
          </a-calendar>
          <div class="hint">
            点击日期在「可预约 → 休息 → 清空」之间切换；已约满日期会根据订单自动标红（演示）。
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
              <a-range-picker v-model:value="range" class="pill-input" />
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
import dayjs, { Dayjs } from 'dayjs';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

type Kind = 'available' | 'rest';

const range = ref<[Dayjs, Dayjs] | null>(null);
const mode = ref<Kind>('available');
const modes = [
  { label: '可预约', value: 'available' },
  { label: '休息', value: 'rest' },
];

const keyAvail = 'worker_schedule_available';
const keyRest = 'worker_schedule_rest';
const keyFull = 'worker_schedule_full_auto';

const loadSet = (key: string) => {
  const raw = localStorage.getItem(key);
  const arr = raw ? (JSON.parse(raw) as string[]) : [];
  return new Set(Array.isArray(arr) ? arr : []);
};
const saveSet = (key: string, set: Set<string>) => {
  localStorage.setItem(key, JSON.stringify([...set].sort()));
};
const dayKey = (d: Dayjs) => d.format('YYYY-MM-DD');

const booked = ref<Set<string>>(new Set());

const refreshBooked = async () => {
  try {
    const res: any = await httpClient.get('/orders');
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : res?.data?.data || [];
    const full = new Set<string>();
    for (const o of Array.isArray(list) ? list : []) {
      const s = String(o?.paymentStatus || '');
      if (s === 'cancelled') continue;
      const d = String(o?.shootingDate || '').slice(0, 10);
      if (d) full.add(d);
    }
    booked.value = full;
    saveSet(keyFull, full);
  } catch {
    booked.value = loadSet(keyFull);
  }
};

const tagText = (current: any) => {
  const k = dayKey(dayjs(current.toDate()));
  if (booked.value.has(k)) return '已约满';
  const a = loadSet(keyAvail);
  const r = loadSet(keyRest);
  if (r.has(k)) return '休息';
  if (a.has(k)) return '可预约';
  return '';
};

const tagClass = (current: any) => {
  const k = dayKey(dayjs(current.toDate()));
  if (booked.value.has(k)) return 'full';
  const a = loadSet(keyAvail);
  const r = loadSet(keyRest);
  if (r.has(k)) return 'rest';
  if (a.has(k)) return 'avail';
  return '';
};

const toggleDate = (d: any) => {
  const k = dayKey(dayjs(d.toDate?.() ? d.toDate() : d));
  if (booked.value.has(k)) {
    message.warning('已约满日期由订单自动标注，不建议手工修改');
    return;
  }
  const a = loadSet(keyAvail);
  const r = loadSet(keyRest);
  if (a.has(k)) {
    a.delete(k);
    r.add(k);
  } else if (r.has(k)) {
    r.delete(k);
  } else {
    a.add(k);
  }
  saveSet(keyAvail, a);
  saveSet(keyRest, r);
};

const setRest = () => {
  message.info('请选择日期后点击切换即可设置休息');
};

const clearAll = () => {
  saveSet(keyAvail, new Set());
  saveSet(keyRest, new Set());
  message.success('已清空档期（不影响订单自动标注）');
};

const applyRange = () => {
  if (!range.value) {
    message.warning('请选择日期范围');
    return;
  }
  const [start, end] = range.value;
  const a = loadSet(keyAvail);
  const r = loadSet(keyRest);
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
  saveSet(keyAvail, a);
  saveSet(keyRest, r);
  message.success('已批量设置');
};

const stats = computed(() => {
  const a = loadSet(keyAvail);
  return { booked: booked.value.size, free: a.size };
});

onMounted(() => {
  refreshBooked();
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
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
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
  background: rgba(255, 107, 139, 0.55);
}
.dot.f {
  background: #ff4d4f;
}
.dot.r {
  background: #9ca3af;
}
.cal :deep(.ant-picker-calendar-date-content) {
  height: 26px;
}
.cell {
  height: 18px;
  margin-top: 4px;
}
.tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.08);
  color: #d6336c;
}
.tag.full {
  border-color: rgba(255, 77, 79, 0.22);
  background: rgba(255, 77, 79, 0.1);
  color: #cf1322;
}
.tag.rest {
  border-color: rgba(156, 163, 175, 0.35);
  background: rgba(156, 163, 175, 0.12);
  color: #6b7280;
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
