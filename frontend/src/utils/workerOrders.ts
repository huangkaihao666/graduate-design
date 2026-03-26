/**
 * 解析订单列表响应（兼容 TransformInterceptor 包装与直接数组）
 */
export function unwrapOrderListPayload(res: any): any[] {
  const list = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
      ? res
      : res?.data?.data || [];
  return Array.isArray(list) ? list : [];
}
