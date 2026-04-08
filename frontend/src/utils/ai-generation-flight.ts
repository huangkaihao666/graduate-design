import { computed, reactive, type ComputedRef } from 'vue';

/** 与 AI 生成页一一对应，用于跨路由保持「生成中」 */
export type AiFlightKey =
  | 'virtual-try-on'
  | 'makeup-try-on'
  | 'style-recommendation'
  | 'itinerary-planning';

/**
 * 使用 reactive：对 Record 逐项赋值可稳定触发视图与 computed 更新；
 * ref 包一层对象后对「仅改某个 key」在部分场景下可能不触发依赖（弹窗 :open 不刷新）。
 */
const pending = reactive<Record<AiFlightKey, boolean>>({
  'virtual-try-on': false,
  'makeup-try-on': false,
  'style-recommendation': false,
  'itinerary-planning': false,
});

/**
 * 供各 AI 页绑定按钮 loading、弹窗与右栏占位；路由切回后仍为 true 时继续显示生成中。
 */
export function useAiFlightPending(key: AiFlightKey): ComputedRef<boolean> {
  return computed(() => pending[key]);
}

/**
 * 包裹单次生成：在请求整段逻辑（含保存历史）结束前保持 pending。
 */
export async function runAiFlight(key: AiFlightKey, work: () => Promise<void>): Promise<void> {
  if (pending[key]) {
    return;
  }
  pending[key] = true;
  try {
    await work();
  } finally {
    pending[key] = false;
  }
}
