import { httpClient } from './client';

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const inner = (res as { data?: unknown })?.data;
  if (Array.isArray(inner)) return inner as T[];
  return [];
}

export const ordersApi = {
  createOrder: (data: any) => httpClient.post<unknown>('/orders', data).then((res) => unwrap(res)),
  getAdminOrders: () => httpClient.get<unknown>('/orders').then((res) => unwrap(res)),
  getWorkerOrders: () => httpClient.get<unknown>('/orders/worker').then((res) => unwrap(res)),
  getMyOrders: () => httpClient.get<unknown>('/orders/user/me').then((res) => unwrapList<any>(res)),
  getOrderById: (id: number) => httpClient.get<unknown>(`/orders/${id}`).then((res) => unwrap(res)),
  getPhotographerBookedDates: (photographerId: number) =>
    httpClient
      .get<unknown>(`/orders/photographers/${photographerId}/booked-dates`)
      .then((res) => unwrapList<string>(res)),
  getMakeupArtistBookedDates: (makeupArtistId: number) =>
    httpClient
      .get<unknown>(`/orders/makeup-artists/${makeupArtistId}/booked-dates`)
      .then((res) => unwrapList<string>(res)),
  updateOrderStatus: (id: number, status: string) =>
    httpClient.patch<unknown>(`/orders/${id}/status`, { status }).then((res) => unwrap(res)),
  requestReschedule: (id: number, body: { newShootingDate: string; reason?: string }) =>
    httpClient.patch<unknown>(`/orders/${id}/reschedule-request`, body).then((res) => unwrap(res)),
  reviewRescheduleRequest: (
    id: number,
    body: { action: 'approve' | 'reject'; reviewNote?: string }
  ) =>
    httpClient.patch<unknown>(`/orders/${id}/reschedule-review`, body).then((res) => unwrap(res)),
  getDashboardStats: () =>
    httpClient.get<unknown>('/orders/dashboard/stats').then((res) => unwrap(res)),
  confirmMakeupSchedule: (id: number) =>
    httpClient.patch<unknown>(`/orders/worker/${id}/makeup-confirm`, {}).then((res) => unwrap(res)),
};
