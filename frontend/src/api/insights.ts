import { httpClient } from './client';

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
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
  businessReport: string[];
  marketingSuggestions: string[];
  dataAnalysis: string[];
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
      .then((res) => unwrap<OperationalInsightReport>(res)),
};
