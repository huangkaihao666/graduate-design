/**
 * 用户端与工作人员端共用同一订单会话的消息存储（本地演示）。
 * 会话 id 约定为：`order_${orderNo}`
 */
export function orderThreadId(orderNo: string): string {
  return `order_${orderNo}`;
}

export function isOrderThreadId(id: string): boolean {
  return id.startsWith('order_');
}

export function orderNoFromThreadId(id: string): string {
  return id.startsWith('order_') ? id.slice('order_'.length) : '';
}

/** 与工作人员端 Messages.vue 使用同一 key，才能看到同一会话记录 */
export function sharedOrderMessagesStorageKey(orderNo: string): string {
  return `shared_order_chat_${orderNo}`;
}
