import type { VirtualTryOnSubjectRole } from '@/constants/virtual-tryon-subject';
import { httpClient } from './client';

export type { VirtualTryOnSubjectRole } from '@/constants/virtual-tryon-subject';

export interface VirtualTryOnRequest {
  imageUrl: string;
  style: string;
  /** 仅面部试妆：不换装，不改背景 */
  makeupOnly?: boolean;
  /** 出镜方式：女生（新娘）/ 男生（新郎）/ 双人合影，默认 female */
  subjectRole?: VirtualTryOnSubjectRole;
  preferences?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
    accessory?: string;
  };
  /** 与 preferences 对应的中文文案，供后端图生图 prompt 使用 */
  preferenceLabels?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
    accessory?: string;
  };
}

export interface StyleRecommendationRequest {
  preferences: string;
  budget?: number;
  occasions?: string[];
}

export interface ItineraryPlanningRequest {
  destination: string;
  duration: number;
  style: string;
  interests?: string[];
}

export interface CustomerSupportMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AiHistoryType =
  | 'virtual-try-on'
  | 'style-recommendation'
  | 'itinerary-planning'
  | 'all';
export type VirtualTryOnHistoryScene = 'all' | 'virtual-try-on' | 'makeup-try-on';

export const aiApi = {
  /**
   * 获取可用的拍摄风格列表
   */
  getStyles: () => httpClient.get('/ai/styles'),

  /**
   * AI 虚拍 - 生成虚拍建议（长时间处理，超时时间设置为 120 秒）
   */
  virtualTryOn: (data: VirtualTryOnRequest) =>
    httpClient.post('/ai/virtual-try-on', data, { timeout: 120000 }),

  /**
   * 智能风格推荐 - 推荐拍摄风格和景点（DeepSeek 调用，超时时间设置为 90 秒）
   */
  recommendStyle: (data: StyleRecommendationRequest) =>
    httpClient.post('/ai/style-recommendation', data, { timeout: 90000 }),

  /**
   * 智能行程规划 - 生成详细行程（DeepSeek 调用，超时时间设置为 90 秒）
   */
  planItinerary: (data: ItineraryPlanningRequest) =>
    httpClient.post('/ai/itinerary-planning', data, { timeout: 90000 }),

  /**
   * 帮助中心智能客服问答
   */
  customerSupport: (data: { question: string; history?: CustomerSupportMessage[] }) =>
    httpClient.post('/ai/customer-support', data, { timeout: 90000 }),

  /**
   * 保存客服问答历史（登录用户）
   */
  saveCustomerSupportHistory: (data: { question: string; answer: string }) =>
    httpClient.post('/ai/customer-support/history', data),

  /**
   * 获取客服问答历史（登录用户）
   */
  getCustomerSupportHistory: (params?: { page?: number; pageSize?: number }) =>
    httpClient.get('/ai/customer-support/history', { params }),

  /** 更新客服历史自定义标题 */
  updateCustomerSupportHistoryTitle: (id: number, data: { title: string }) =>
    httpClient.patch(`/ai/customer-support/history/${id}`, data),

  /** 置顶 / 取消置顶 */
  toggleCustomerSupportHistoryPin: (id: number) =>
    httpClient.post(`/ai/customer-support/history/${id}/pin`, {}),

  /** 删除单条客服历史 */
  deleteCustomerSupportHistory: (id: number) =>
    httpClient.delete(`/ai/customer-support/history/${id}`),

  /**
   * 保存 AI 生成历史
   */
  saveHistory: (data: {
    type: 'virtual-try-on' | 'style-recommendation' | 'itinerary-planning';
    input: any;
    output: any;
  }) => httpClient.post('/ai/save-history', data),

  /**
   * 获取当前用户的 AI 生成历史
   * @param subjectRole 仅 type=virtual-try-on 时有效：female | male | couple
   */
  getHistory: (params: {
    type?: AiHistoryType;
    page?: number;
    pageSize?: number;
    subjectRole?: VirtualTryOnSubjectRole;
    scene?: VirtualTryOnHistoryScene;
  }) =>
    httpClient.get('/ai/history', {
      params,
    }),

  /**
   * 删除 AI 生成历史
   */
  deleteHistory: (
    type: 'virtual-try-on' | 'style-recommendation' | 'itinerary-planning',
    id: number
  ) => httpClient.delete(`/ai/history/${type}/${id}`),
};
