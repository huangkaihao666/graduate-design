import type { LinkedBookingOrder } from '@/api/customShootRequests';

const STORAGE_KEY = 'online-order-history';

function readRaw(): string | null {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      localStorage.setItem(STORAGE_KEY, raw);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
  return raw;
}

function toLocalEntry(bo: LinkedBookingOrder): Record<string, unknown> {
  const wt = bo.workerTakenAt;
  const ca = bo.createdAt;
  return {
    orderNo: bo.orderNo,
    orderId: bo.id,
    packageId: bo.packageId ?? 0,
    packageName: bo.packageName,
    location: bo.location,
    style: bo.style,
    duration: bo.duration,
    unitPrice: bo.unitPrice,
    numberOfPeople: bo.numberOfPeople,
    shootingDate: bo.shootingDate,
    contactName: bo.contactName,
    phone: bo.phone,
    email: bo.email ?? undefined,
    paymentMethod: bo.paymentMethod,
    paymentStatus: bo.paymentStatus,
    totalAmount: bo.totalAmount,
    photographerId: bo.photographerId ?? undefined,
    photographerName: bo.photographerName ?? undefined,
    workerUserId: bo.workerUserId ?? undefined,
    workerName: bo.workerName ?? undefined,
    workerTakenAt:
      typeof wt === 'string'
        ? wt
        : wt instanceof Date
          ? wt.toISOString()
          : wt
            ? String(wt)
            : undefined,
    createdAt:
      typeof ca === 'string'
        ? ca
        : ca instanceof Date
          ? ca.toISOString()
          : new Date().toISOString(),
    orderSource: 'custom_shoot',
    customShootRequestId: bo.customShootRequestId ?? undefined,
  };
}

/** 将服务端订单合并进「我的订单」本地列表（与套餐下单共用 online-order-history） */
export function mergeBookingOrderIntoLocalHistory(bo: LinkedBookingOrder): void {
  const raw = readRaw();
  let list: unknown[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    list = Array.isArray(parsed) ? parsed : [];
  } catch {
    list = [];
  }
  const entry = toLocalEntry(bo);
  const orderNo = bo.orderNo;
  const idx = list.findIndex((x) => {
    const o = x as { orderNo?: string };
    return o?.orderNo === orderNo;
  });
  if (idx >= 0) {
    list[idx] = { ...(list[idx] as object), ...entry };
  } else {
    list.unshift(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** 从「我的订单」本地列表按订单号移除（删除定制记录后同步） */
export function removeOrderFromLocalHistory(orderNo: string): void {
  if (!orderNo?.trim()) return;
  const raw = readRaw();
  let list: unknown[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    list = Array.isArray(parsed) ? parsed : [];
  } catch {
    list = [];
  }
  const next = list.filter((x) => {
    const o = x as { orderNo?: string };
    return o?.orderNo !== orderNo;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
