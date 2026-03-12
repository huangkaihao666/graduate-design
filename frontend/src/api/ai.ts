import { httpClient } from './client';

export interface VirtualTryOnRequest {
  imageUrl: string;
  style: string;
  preferences?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
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

export type AiHistoryType =
  | 'virtual-try-on'
  | 'style-recommendation'
  | 'itinerary-planning'
  | 'all';

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
   * 保存 AI 生成历史
   */
  saveHistory: (data: {
    type: 'virtual-try-on' | 'style-recommendation' | 'itinerary-planning';
    input: any;
    output: any;
  }) => httpClient.post('/ai/save-history', data),

  /**
   * 获取当前用户的 AI 生成历史
   */
  getHistory: (params: { type?: AiHistoryType; page?: number; pageSize?: number }) =>
    httpClient.get('/ai/history', {
      params,
    }),
};
