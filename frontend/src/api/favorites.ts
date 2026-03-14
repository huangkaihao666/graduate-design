import { httpClient } from './client';

// 收藏类型定义
export interface Favorite {
  id: number;
  userId: number;
  packageId: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteListResponse {
  items: Favorite[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FavoriteCheckResponse {
  isFavorite: boolean;
}

export interface FavoritePackageIdsResponse {
  packageIds: number[];
}

export const favoritesApi = {
  /**
   * 添加收藏
   */
  addFavorite: (packageId: number) => httpClient.post<Favorite>(`/favorites/packages/${packageId}`),

  /**
   * 删除收藏（通过收藏ID）
   */
  removeFavorite: (favoriteId: number) => httpClient.delete(`/favorites/${favoriteId}`),

  /**
   * 删除收藏（通过套餐ID）
   */
  removeFavoriteByPackageId: (packageId: number) =>
    httpClient.delete(`/favorites/packages/${packageId}`),

  /**
   * 检查是否已收藏
   */
  checkFavorite: (packageId: number) =>
    httpClient.get<FavoriteCheckResponse>(`/favorites/packages/${packageId}/check`),

  /**
   * 获取收藏列表
   */
  getFavorites: (params?: { page?: number; pageSize?: number }) =>
    httpClient.get<FavoriteListResponse>('/favorites', {
      params,
    }),

  /**
   * 批量获取收藏的套餐ID列表
   */
  getFavoritePackageIds: () =>
    httpClient.get<FavoritePackageIdsResponse>('/favorites/packages/ids'),
};
