import { httpClient } from './client';

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

/** 定制旅拍确认后关联的预约订单（与 booking_orders 一致） */
export type LinkedBookingOrder = {
  id: number;
  orderNo: string;
  packageId?: number | null;
  packageName: string;
  location: string;
  style: string;
  duration: number;
  unitPrice: number;
  numberOfPeople: number;
  shootingDate: string;
  contactName: string;
  phone: string;
  email?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  photographerId?: number | null;
  photographerName?: string | null;
  workerUserId?: number | null;
  workerName?: string | null;
  workerTakenAt?: string | Date | null;
  createdAt?: string | Date;
  customShootRequestId?: number | null;
};

export type CustomShootRequestRow = {
  id: number;
  requestNo: string;
  userId: number;
  title?: string | null;
  description?: string | null;
  location: string;
  style: string;
  shootingDate: string;
  duration: number;
  numberOfPeople: number;
  budgetHint?: number | null;
  contactName: string;
  phone: string;
  status: string;
  photographerId?: number | null;
  claimedWorkerUserId?: number | null;
  claimMessage?: string | null;
  claimedAt?: string | null;
  userConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; phone?: string };
  photographer?: { id: number; name: string; avatar?: string | null } | null;
  linkedBookingOrder?: LinkedBookingOrder | null;
};

export type CustomShootConfirmResult = CustomShootRequestRow & {
  bookingOrder?: LinkedBookingOrder | null;
};

export type CreateCustomShootBody = {
  title?: string;
  description?: string;
  location: string;
  style: string;
  shootingDate: string;
  duration?: number;
  numberOfPeople?: number;
  budgetHint?: number | null;
  contactName: string;
  phone: string;
};

export const customShootRequestsApi = {
  create: (body: CreateCustomShootBody) =>
    httpClient
      .post<unknown>('/custom-shoot-requests', body)
      .then((res) => unwrap<CustomShootRequestRow>(res)),

  update: (id: number, body: CreateCustomShootBody) =>
    httpClient
      .patch<unknown>(`/custom-shoot-requests/${id}`, body)
      .then((res) => unwrap<CustomShootRequestRow>(res)),

  listMine: () =>
    httpClient
      .get<unknown>('/custom-shoot-requests/mine')
      .then((res) => unwrap<CustomShootRequestRow[]>(res)),

  listMarket: () =>
    httpClient
      .get<unknown>('/custom-shoot-requests/market')
      .then((res) => unwrap<CustomShootRequestRow[]>(res)),

  getOne: (id: number) =>
    httpClient
      .get<unknown>(`/custom-shoot-requests/${id}`)
      .then((res) => unwrap<CustomShootRequestRow>(res)),

  cancel: (id: number) =>
    httpClient
      .patch<unknown>(`/custom-shoot-requests/${id}/cancel`, {})
      .then((res) => unwrap<CustomShootRequestRow>(res)),

  remove: (id: number) =>
    httpClient
      .delete<unknown>(`/custom-shoot-requests/${id}`)
      .then((res) => unwrap<{ id: number; deleted: boolean; removedOrderNo?: string }>(res)),

  claim: (id: number, claimMessage?: string) =>
    httpClient
      .patch<unknown>(`/custom-shoot-requests/${id}/claim`, { claimMessage })
      .then((res) => unwrap<CustomShootRequestRow>(res)),

  withdrawClaim: (id: number) =>
    httpClient
      .patch<unknown>(`/custom-shoot-requests/${id}/withdraw-claim`, {})
      .then((res) => unwrap<CustomShootRequestRow>(res)),

  confirmPhotographer: (id: number) =>
    httpClient
      .patch<unknown>(`/custom-shoot-requests/${id}/confirm-photographer`, {})
      .then((res) => unwrap<CustomShootConfirmResult>(res)),

  rejectPhotographer: (id: number) =>
    httpClient
      .patch<unknown>(`/custom-shoot-requests/${id}/reject-photographer`, {})
      .then((res) => unwrap<CustomShootRequestRow>(res)),
};
