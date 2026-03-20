import { httpClient } from './client';

export const ordersApi = {
  createOrder: (data: any) => httpClient.post<any>('/orders', data),
  getAdminOrders: () => httpClient.get<any>('/orders'),
  updateOrderStatus: (id: number, status: string) =>
    httpClient.patch<any>(`/orders/${id}/status`, { status }),
  getDashboardStats: () => httpClient.get<any>('/orders/dashboard/stats'),
};
