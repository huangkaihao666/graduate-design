import axiosInstance, { httpClient } from './client';

export interface PhotographerPublic {
  id: number;
  name: string;
  title?: string;
  avatar?: string;
  shootingStyle: string;
  yearsExperience: number;
  bio?: string;
  /** 性别，如：男、女、其他 */
  gender?: string;
  /** 年龄（周岁） */
  age?: number;
  /** 擅长题材 */
  specialtyTopics?: string;
  /** 资质与获奖 */
  awards?: string;
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
    gender?: string;
    age?: number;
    specialtyTopics?: string;
    awards?: string;
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
      gender: string | null;
      age: number | null;
      specialtyTopics: string | null;
      awards: string | null;
      portfolioImages: string[];
      sortOrder: number;
      enabled: boolean;
    }>
  ) => httpClient.patch<unknown>(`/photographers/${id}`, body).then((res) => unwrap(res)),

  remove: (id: number) => httpClient.delete(`/photographers/${id}`).then((res) => unwrap(res)),

  /**
   * 管理员上传图片（multipart），返回 data URL；使用 fetch 避免 axios 默认 Content-Type 影响 boundary
   */
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    /** 与 axios 实例一致，避免 .env 与手写逻辑不一致导致请求到错误路径（缺 /api/v1 会 404） */
    const base = String(axiosInstance.defaults.baseURL || '/api/v1').replace(/\/$/, '');
    let token: string | null = null;
    try {
      token = localStorage.getItem('accessToken');
    } catch {
      /* ignore */
    }
    const res = await fetch(`${base}/photographers/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const json = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) {
      const err = json as { message?: string | string[] };
      const msg = Array.isArray(err.message)
        ? err.message.join('; ')
        : err.message || `上传失败 (${res.status})`;
      throw new Error(msg);
    }
    return unwrap<{ url: string }>(json);
  },
};
