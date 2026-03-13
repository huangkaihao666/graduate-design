import { httpClient } from './client';

// 套餐类型定义
export interface Package {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: number; // 天数
  location: string;
  style: string;
  coverImage: string;
  images?: string[];
  features: string[];
  includes: string[];
  excludes?: string[];
  maxPeople: number;
  isPopular?: boolean;
  isHot?: boolean;
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

export const packagesApi = {
  /**
   * 获取套餐列表
   */
  getPackages: (params?: PackageListParams) =>
    httpClient.get<PackageListResponse>('/packages', {
      params,
    }),

  /**
   * 获取套餐详情
   */
  getPackageDetail: (id: number) => httpClient.get<Package>(`/packages/${id}`),
};
