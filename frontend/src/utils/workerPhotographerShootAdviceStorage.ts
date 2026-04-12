/** 与 PhotographerShootAdvice.vue 中 STORAGE_KEY 前缀一致 */
const STORAGE_KEY_PREFIX = 'worker_photographer_shoot_advice_v1_';

/**
 * 登出/清认证时：清空已持久化的当前草稿（表单、参考照、当前建议正文），仅保留历史记录。
 */
export function resetPhotographerShootDraftInStorage(userId: string | number) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      adviceHistory?: unknown;
    };
    const adviceHistory = Array.isArray(parsed.adviceHistory) ? parsed.adviceHistory : [];
    localStorage.setItem(
      key,
      JSON.stringify({
        shootForm: {},
        adviceText: '',
        adviceHistory,
        photoDataUrl: '',
        photoPreview: '',
      })
    );
  } catch {
    // ignore
  }
}
