import { httpClient } from './client';

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

// 套餐类型定义
export interface Package {
  id: number;
  /** 关联景点 ID；景点删除后下架套餐可能为空 */
  spotId: number | null;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: number; // 天数
  /** 目的地（城市），与景点 city 一致 */
  location: string;
  /** 景点名称（展示） */
  spotName?: string;
  style: string;
  coverImage: string;
  images?: string[];
  features: string[];
  includes: string[];
  excludes?: string[];
  maxPeople: number;
  isPopular?: boolean;
  isHot?: boolean;
  /** 后端：draft | published | offline */
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackageListParams {
  page?: number;
  pageSize?: number;
  style?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  keyword?: string;
}

export interface PackageListResponse {
  items: Package[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PackageRecommendationResponse {
  items: Package[];
  locations: string[];
}

export type CreatePackageBody = {
  spotId?: number | null;
  location?: string;
  name: string;
  style: string;
  price: number;
  description?: string;
  duration?: number;
  coverImage?: string;
  images?: string[];
  features?: string[];
  includes?: string[];
  excludes?: string[];
  maxPeople?: number;
  originalPrice?: number | null;
  isPopular?: boolean;
  isHot?: boolean;
  status?: string;
};

export const packagesApi = {
  /** 用户端：仅已上架列表（当前后端一次返回全部已上架，前端再筛选分页） */
  getPackages: (params?: PackageListParams): Promise<PackageListResponse> =>
    httpClient.get<PackageListResponse>('/packages', { params }).then((res) => unwrap(res)),

  getPackageDetail: (id: number): Promise<Package> =>
    httpClient.get<Package>(`/packages/${id}`).then((res) => unwrap(res)),

  getRecommendations: (): Promise<PackageRecommendationResponse> =>
    httpClient
      .get<PackageRecommendationResponse>('/packages/recommendations')
      .then((res) => unwrap(res)),

  /** 管理端 */
  getAdminPackages: (): Promise<Package[]> =>
    httpClient.get<Package[]>('/packages/admin/all').then((res) => unwrap(res)),

  createPackage: (body: CreatePackageBody): Promise<Package> =>
    httpClient.post<Package>('/packages', body).then((res) => unwrap(res)),

  updatePackage: (id: number, body: Partial<CreatePackageBody>): Promise<Package> =>
    httpClient.patch<Package>(`/packages/${id}`, body).then((res) => unwrap(res)),

  togglePackageStatus: (id: number): Promise<Package> =>
    httpClient.patch<Package>(`/packages/${id}/status`).then((res) => unwrap(res)),
};
