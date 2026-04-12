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
  /** 双人合影：同会话同风格下递增，用于后端轮换双人姿态，避免连续生成同一动作 */
  poseVariantIndex?: number;
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

/** 妆造师妆容建议：照片识别填充脸型/肤色/五官等 */
export interface MakeupAdvisorFaceAnalysis {
  faceShape?: string;
  skinTone?: string;
  features: string[];
  /** 照片中可见皮肤状态（非诊断） */
  skinVisible?: string[];
  /** 三庭五眼大致倾向 */
  faceRatio?: string[];
  /** 推荐妆容风格 */
  makeupStyles?: string[];
  rawNote?: string;
}

/** 管理端景点：AI 生成介绍 + 后台配图 */
export interface SpotDraftRequest {
  cityName: string;
  spotName: string;
  category?: string;
}

/** 管理端套餐：AI 生成介绍（仅文案） */
export interface PackageDescriptionDraftRequest {
  location: string;
  spotName?: string;
  spotNames?: string[];
  styleLabel: string;
  priceYuan: number;
  durationDays: number;
  featuresHint?: string;
}

export interface PackageDescriptionDraftResult {
  description: string;
  features?: string[];
  includes?: string[];
  excludes?: string[];
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
   * 管理端：景点介绍 AI 草稿 + 后台自动配图（返回 data URL，需配置 PEXELS_API_KEY 等）
   */
  generateSpotDraft: (data: SpotDraftRequest) =>
    httpClient.post('/ai/admin/spot-draft', data, { timeout: 180000 }),

  /** 管理端：套餐介绍文案（DeepSeek） */
  generatePackageDescriptionDraft: (data: PackageDescriptionDraftRequest) =>
    httpClient.post('/ai/admin/package-description-draft', data, { timeout: 120000 }),

  /**
   * 妆造师端：证件照/正脸照识别脸型、肤色、五官（后端走火山方舟图片理解，需 VOLCES_VISION_CHAT_MODEL）
   */
  analyzeFaceForMakeupAdvisor: (data: { photo?: string; idPhoto?: string; frontPhoto?: string }) =>
    httpClient.post<unknown>('/ai/makeup-advisor/analyze-face', data, {
      timeout: 130000,
    }),

  /** 摄影师端：证件照/正面参考图 → 构图、姿势、机位与镜头、拍摄流程等（方舟视觉） */
  photographerShootingAdvice: (data: {
    photo: string;
    sceneHint?: string;
    clientType?: string;
    lensPreference?: string;
    lightingCondition?: string;
    shootStyle?: string;
    notes?: string;
  }) =>
    httpClient.post<unknown>('/ai/photographer-advisor/shooting-advice', data, {
      timeout: 130000,
    }),

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
