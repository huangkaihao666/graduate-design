/**
 * 用户端与工作人员端共用同一订单会话的消息存储（本地演示）。
 * 会话 id 约定：
 * - 旧版：`order_${orderNo}`
 * - 新版（按工作人员档案隔离）：`order_${orderNo}__p${photographerId}`
 */
export function orderThreadId(orderNo: string, photographerId?: number | null): string {
  const pid = Number(photographerId);
  if (Number.isFinite(pid) && pid > 0) {
    return `order_${orderNo}__p${Math.floor(pid)}`;
  }
  return `order_${orderNo}`;
}

export function isOrderThreadId(id: string): boolean {
  return id.startsWith('order_');
}

export function orderNoFromThreadId(id: string): string {
  if (!id.startsWith('order_')) return '';
  const raw = id.slice('order_'.length);
  const idx = raw.indexOf('__p');
  return idx >= 0 ? raw.slice(0, idx) : raw;
}

/** 从会话 id 解析工作人员档案 id（旧版会话无此信息） */
export function photographerIdFromThreadId(id: string): number | undefined {
  if (!id.startsWith('order_')) return undefined;
  const raw = id.slice('order_'.length);
  const idx = raw.indexOf('__p');
  if (idx < 0) return undefined;
  const pid = Number(raw.slice(idx + '__p'.length));
  if (!Number.isFinite(pid) || pid <= 0) return undefined;
  return Math.floor(pid);
}

/**
 * 订单会话消息存储键：必须带摄影师档案 id（users.workerPhotographerId / 订单 photographerId），
 * 否则同一浏览器下多名摄影师会共用 `shared_order_chat_${orderNo}` 而互相看到对话。
 */
export function sharedOrderMessagesStorageKey(
  orderNo: string,
  photographerId?: number | null
): string {
  const pid = Number(photographerId);
  if (Number.isFinite(pid) && pid > 0) {
    return `shared_order_chat_v2_${pid}_${orderNo}`;
  }
  /** 无摄影师 id 的旧数据/兜底，仍用旧键（建议订单侧始终传 photographerId） */
  return `shared_order_chat_${orderNo}`;
}

/** 工作人员端发现会话：只匹配当前绑定摄影师的 v2 键前缀 */
export function sharedOrderMessagesKeyPrefixV2(photographerId: number): string {
  return `shared_order_chat_v2_${photographerId}_`;
}

/** 从 localStorage 原始 JSON 解析最后一条消息的预览文案（用户端 / 工作人员端共用） */
export function previewLastMessageFromOrderStorage(
  raw: string | null,
  emptyFallback = '新消息'
): string {
  let last = emptyFallback;
  try {
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length) {
      const m = arr[arr.length - 1] as { content?: string };
      const c = String(m?.content || '');
      if (/^data:image\//.test(c)) last = '[图片]';
      else if (c.length > 40) last = `${c.slice(0, 40)}…`;
      else if (c) last = c;
    }
  } catch {
    /* ignore */
  }
  return last;
}

export type SharedOrderMsgKeyInfo = {
  storageKey: string;
  photographerId?: number;
  orderNo: string;
};

/**
 * 遍历本域下所有订单会话消息键（v2 与旧版），供用户端同步左侧列表预览与未读。
 */
export function forEachSharedOrderMessageStorageKey(
  cb: (info: SharedOrderMsgKeyInfo) => void
): void {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey) continue;
      if (storageKey.startsWith('shared_order_chat_v2_')) {
        const rest = storageKey.slice('shared_order_chat_v2_'.length);
        const underscore = rest.indexOf('_');
        if (underscore <= 0) continue;
        const pidStr = rest.slice(0, underscore);
        const orderNo = rest.slice(underscore + 1);
        const pid = Number(pidStr);
        if (!orderNo || !Number.isFinite(pid) || pid <= 0) continue;
        cb({ storageKey, photographerId: Math.floor(pid), orderNo });
        continue;
      }
      if (
        storageKey.startsWith('shared_order_chat_') &&
        !storageKey.startsWith('shared_order_chat_v2_')
      ) {
        const orderNo = storageKey.slice('shared_order_chat_'.length);
        if (!orderNo) continue;
        cb({ storageKey, photographerId: undefined, orderNo });
      }
    }
  } catch {
    /* ignore */
  }
}
