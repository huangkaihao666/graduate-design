import { httpClient } from './client';

export interface PhotographerPublic {
  id: number;
  name: string;
  title?: string;
  avatar?: string;
  shootingStyle: string;
  yearsExperience: number;
  bio?: string;
  portfolioImages: string[];
  sortOrder: number;
}

export interface PhotographerAdmin extends PhotographerPublic {
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

/** 列表接口：兼容 axios 体为「数组」或 { data: 数组 }，避免解析错导致一直显示空列表 */
function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) {
    return res as T[];
  }
  const r = res as { data?: unknown };
  const inner = r?.data;
  if (Array.isArray(inner)) {
    return inner as T[];
  }
  if (inner && typeof inner === 'object' && inner !== null && 'data' in inner) {
    const nested = (inner as { data?: unknown }).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }
  return [];
}

export const photographersApi = {
  /** 用户端展示列表 */
  getPublic: () =>
    httpClient
      .get<unknown>('/photographers/public')
      .then((res) => unwrapList<PhotographerPublic>(res)),

  getPublicOne: (id: number) =>
    httpClient
      .get<PhotographerPublic>(`/photographers/public/${id}`)
      .then((res) => unwrap<PhotographerPublic>(res)),

  listAdmin: () =>
    httpClient.get<unknown>('/photographers').then((res) => unwrapList<PhotographerAdmin>(res)),

  create: (body: {
    name: string;
    title?: string;
    avatar?: string;
    shootingStyle: string;
    yearsExperience?: number;
    bio?: string;
    portfolioImages?: string[];
    sortOrder?: number;
    enabled?: boolean;
  }) => httpClient.post<unknown>('/photographers', body).then((res) => unwrap(res)),

  update: (
    id: number,
    body: Partial<{
      name: string;
      title: string | null;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      portfolioImages: string[];
      sortOrder: number;
      enabled: boolean;
    }>
  ) => httpClient.patch<unknown>(`/photographers/${id}`, body).then((res) => unwrap(res)),

  remove: (id: number) => httpClient.delete(`/photographers/${id}`).then((res) => unwrap(res)),
};
