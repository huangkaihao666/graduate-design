/** 与 MakeupAI.vue 中 ADVICE_STORAGE_KEY 保持一致 */
const STORAGE_KEY_PREFIX = 'worker_makeup_advice_state_v2_';

/** 持久化中的「空表单」形态（不含脸型/肤色键，恢复时按 undefined 处理） */
function emptyAdviceFormForStorage() {
  return {
    features: [] as string[],
    skinVisible: [] as string[],
    faceRatio: [] as string[],
    makeupStyles: [] as string[],
    shootThemes: [] as string[],
    keywords: [] as string[],
    notes: [] as string[],
  };
}

/**
 * 登出/清认证时：清空已持久化的当前草稿（建议正文 + 表单填写项），仅保留历史记录。
 */
export function resetMakeupAdviceDraftInStorage(userId: string | number) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.adviceText = '';
    parsed.adviceForm = emptyAdviceFormForStorage();
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}
