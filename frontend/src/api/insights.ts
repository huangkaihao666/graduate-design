import { httpClient } from './client';

/**
 * 解析 Nest TransformInterceptor 包一层后的 body：{ statusCode, message, data: T }
 * 仅当内层仍像同一格式的信封时才继续剥 data，避免误剥业务对象里合法的 data 字段；
 * 且 data 为 null 时不再剥，防止整段结果变成 null。
 */
function peelInsightPayload<T>(res: unknown): T {
  let v: unknown = (res as { data?: unknown })?.data ?? res;
  for (let i = 0; i < 2; i++) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) break;
    const o = v as Record<string, unknown>;
    const looksLikeEnvelope =
      typeof o.statusCode === 'number' && typeof o.message === 'string' && 'data' in o;
    if (!looksLikeEnvelope) break;
    const inner = o.data;
    if (inner === undefined || inner === null) break;
    v = inner;
  }
  return v as T;
}

export type InsightRank = { key: string; label: string; count: number };

export type OperationalInsightReport = {
  generatedAt: string;
  summary: {
    usersCount: number;
    ordersTotal: number;
    ordersLast7Days: number;
    ordersLast30Days: number;
    orderWeekOverWeekPercent: number;
    paidOrders: number;
    completedOrders: number;
    unpaidOrders: number;
    browseEvents7d: number;
    browseEvents30d: number;
    styleRecommendationSessions: number;
  };
  purchaseDemand: {
    topStyles: InsightRank[];
    topLocations: InsightRank[];
    topPackages: InsightRank[];
  };
  browseInterest: { topPackages7d: InsightRank[]; topPackages30d: InsightRank[] };
  favorites: { topPackages: InsightRank[] };
  aiBehavior: {
    virtualTryOnByStyle: InsightRank[];
    styleRecommendationCount: number;
    itineraryTopDestinations: InsightRank[];
  };
  /** 一、现状分析 */
  situationAnalysis: string[];
  /** 二、数据解读与问题发现 */
  dataInterpretationAndIssues: string[];
  /** 三、针对性改善建议 */
  improvementSuggestions: string[];
};

export type MarketingSuggestionsResponse = {
  reportGeneratedAt: string;
  items: string[];
};

export const insightsApi = {
  logBrowse: (packageId: number, context?: string) =>
    httpClient
      .post<unknown>('/insights/browse', { packageId, context })
      .then(() => {})
      .catch(() => {}),

  getOperationalReport: () =>
    httpClient
      .get<unknown>('/admin/insights/report')
      .then((res) => peelInsightPayload<OperationalInsightReport>(res)),

  generateMarketingSuggestions: () =>
    httpClient
      .post<unknown>('/admin/insights/marketing-suggestions', {}, { timeout: 120000 })
      .then((res) => peelInsightPayload<MarketingSuggestionsResponse>(res)),
};
