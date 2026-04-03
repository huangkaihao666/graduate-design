import { httpClient } from './client';

export interface StyleTag {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sampleImages?: string[] | null;
  enabled: boolean;
  sortOrder: number;
}

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

export const styleTagsApi = {
  /** 用户端筛选：仅启用 */
  getPublic: () =>
    httpClient.get<StyleTag[]>('/style-tags/public').then((res) => unwrap<StyleTag[]>(res)),

  /** 管理端：全部 */
  listAdmin: () => httpClient.get<StyleTag[]>('/style-tags').then((res) => unwrap<StyleTag[]>(res)),

  /** 确保六种标准风格存在（名称/排序），不删除自定义标签 */
  syncCanonical: () =>
    httpClient
      .post<StyleTag[]>('/style-tags/sync-canonical')
      .then((res) => unwrap<StyleTag[]>(res)),

  create: (body: {
    key: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    images?: string[] | null;
    enabled?: boolean;
    sortOrder?: number;
  }) => httpClient.post<StyleTag>('/style-tags', body).then((res) => unwrap<StyleTag>(res)),

  update: (
    id: number,
    body: Partial<{
      key: string;
      name: string;
      enabled: boolean;
      sortOrder: number;
      description: string | null;
      icon: string | null;
      images: string[] | null;
    }>
  ) => httpClient.patch<StyleTag>(`/style-tags/${id}`, body).then((res) => unwrap<StyleTag>(res)),

  remove: (id: number) => httpClient.delete(`/style-tags/${id}`).then((res) => unwrap(res)),
};
