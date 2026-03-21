/**
 * 解析 axios 拦截器 reject 的 Nest 错误体（message 可能为 string | string[]）
 */
export function getApiErrorMessage(err: unknown): string {
  if (err == null) return '操作失败';
  const e = err as Record<string, unknown>;
  const m = e.message;
  if (Array.isArray(m)) return m.map(String).join('; ');
  if (typeof m === 'string' && m.trim()) return m;
  return '操作失败';
}
