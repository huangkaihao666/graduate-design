import { httpClient } from './client';

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

export type OnlinePrepayResult = {
  mode: 'wechat_native' | 'landing';
  qrCodeDataUrl: string;
  codeUrl: string;
  orderNo: string;
  outTradeNo: string;
  hint: string;
};

export type PaymentStatusResult = {
  paid: boolean;
  paymentStatus: string;
};

export const paymentsApi = {
  /** 生成真实二维码（Base64）与支付链接 */
  prepay: (body: { orderId: number; channel: 'wechat' | 'alipay' }) =>
    httpClient
      .post<unknown>('/payments/online/prepay', body, { timeout: 60000 })
      .then((res) => unwrap<OnlinePrepayResult>(res)),

  getStatus: (orderNo: string) =>
    httpClient
      .get<unknown>(`/payments/online/status/${encodeURIComponent(orderNo)}`)
      .then((res) => unwrap<PaymentStatusResult>(res)),

  /** 演示：无需真实支付，点击「我已完成支付」即服务端标记已付 */
  demoComplete: (body: { orderNo: string }) =>
    httpClient
      .post<unknown>('/payments/online/demo-complete', body)
      .then((res) => unwrap<{ ok: boolean; alreadyPaid: boolean }>(res)),

  getLandingSummary: (params: { orderNo: string; ts: string; sign: string }) =>
    httpClient
      .get<unknown>('/payments/online/landing-summary', { params })
      .then((res) => unwrap(res)),

  confirmLanding: (body: { orderNo: string; ts: string; sign: string }) =>
    httpClient.post<unknown>('/payments/online/landing-confirm', body).then((res) => unwrap(res)),
};
