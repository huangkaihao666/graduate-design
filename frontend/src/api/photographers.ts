import axiosInstance, { httpClient } from './client';

export interface PhotographerPublic {
  id: number;
  name: string;
  title?: string;
  avatar?: string;
  shootingStyle: string;
  yearsExperience: number;
  bio?: string;
  gender?: string;
  age?: number;
  specialtyTopics?: string;
  awards?: string;
  portfolioImages: string[];
  portfolioItems?: Array<{
    url: string;
    category?: 'wedding' | 'makeup' | 'styling' | string;
    desc?: string;
  }>;
  availableDates?: string[];
  restDates?: string[];
  scheduleNote?: string;
  sortOrder: number;
}

/** 摄影师端：与妆造师的一条合作记录（含对方公开档案便于展示风格/作品/档期） */
export interface PhotographerMakeupCooperationMine {
  id: number;
  makeupArtistId: number;
  status: 'pending' | 'confirmed' | 'rejected';
  inviteNote?: string;
  cooperationRejectReason?: string;
  cooperationRejectAt?: string;
  dissolvePending?: boolean;
  dissolveInitiator?: 'photographer' | 'makeup';
  dissolveRequestedAt?: string;
  dissolveNote?: string;
  dissolveRejectReason?: string;
  dissolveRejectAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  makeupArtist: PhotographerPublic;
}

/** 妆造师端：摄影师发来的固定合作邀请 */
export interface FixedCooperationInvite {
  cooperationId: number;
  photographerId: number;
  name: string;
  avatar?: string;
  title?: string;
  shootingStyle: string;
  /** 摄影师填写的合作邀请说明 */
  inviteNote?: string;
  requestedAt: string;
}

/** 妆造师端：已确认将你设为固定合作的摄影师 */
export interface FixedCooperationBoundPhotographer {
  cooperationId: number;
  photographerId: number;
  name: string;
  avatar?: string;
  title?: string;
  shootingStyle: string;
  /** 档案最近更新时间（绑定变更会更新） */
  boundAt: string;
  dissolvePending?: boolean;
  dissolveInitiator?: 'photographer' | 'makeup';
  dissolveRequestedAt?: string;
  dissolveNote?: string;
  dissolveRejectReason?: string;
  dissolveRejectAt?: string;
}

export interface MakeupArtistPublic extends PhotographerPublic {
  rating?: number;
}

export interface PhotographerAdmin extends PhotographerPublic {
  enabled: boolean;
  /** draft | pending | approved | rejected */
  approvalStatus: string;
  approvalReviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PhotographerMine = PhotographerAdmin & {
  makeupCooperations?: PhotographerMakeupCooperationMine[];
};

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

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
  getPublic: () =>
    httpClient
      .get<unknown>('/photographers/public')
      .then((res) => unwrapList<PhotographerPublic>(res)),

  getPublicOne: (id: number) =>
    httpClient
      .get<PhotographerPublic>(`/photographers/public/${id}`)
      .then((res) => unwrap<PhotographerPublic>(res)),

  getPublicMakeupArtists: (params?: { style?: string; specialty?: string; minRating?: number }) =>
    httpClient
      .get<unknown>('/photographers/public-makeup', {
        params: {
          style: params?.style || undefined,
          specialty: params?.specialty || undefined,
          minRating: params?.minRating || undefined,
        },
      })
      .then((res) => unwrapList<MakeupArtistPublic>(res)),

  /** 摄影师：新增一位固定合作妆造师邀请 */
  addMakeupCooperation: (makeupArtistId: number, inviteNote?: string | null) =>
    httpClient
      .post<unknown>('/photographers/me/makeup-cooperations', {
        makeupArtistId,
        inviteNote: inviteNote ?? undefined,
      })
      .then((res) => unwrap<PhotographerMine>(res)),

  /** 摄影师：撤销待确认的邀请 */
  revokeMakeupCooperation: (cooperationId: number) =>
    httpClient
      .delete<unknown>(`/photographers/me/makeup-cooperations/${cooperationId}`)
      .then((res) => unwrap<PhotographerMine>(res)),

  /** 妆造师：待确认的固定合作邀请 */
  getIncomingFixedCooperation: () =>
    httpClient
      .get<unknown>('/photographers/me/fixed-cooperation/incoming')
      .then((res) => unwrapList<FixedCooperationInvite>(res)),

  /** 妆造师：已确认将你设为固定合作的摄影师 */
  getBoundPhotographersAsMakeup: () =>
    httpClient
      .get<unknown>('/photographers/me/fixed-cooperation/bound-photographers')
      .then((res) => unwrapList<FixedCooperationBoundPhotographer>(res)),

  /** 妆造师：同意/拒绝固定合作（优先传 cooperationId） */
  respondFixedCooperation: (params: {
    accept: boolean;
    cooperationId?: number;
    photographerId?: number;
    rejectReason?: string | null;
  }) =>
    httpClient
      .post<unknown>('/photographers/me/fixed-cooperation/respond', {
        accept: params.accept,
        cooperationId: params.cooperationId,
        photographerId: params.photographerId,
        rejectReason: params.rejectReason ?? undefined,
      })
      .then((res) => unwrap(res)),

  /** 申请解除已确认的固定合作（传 cooperationId） */
  requestFixedCooperationDissolve: (reason: string, cooperationId: number) =>
    httpClient
      .post<unknown>('/photographers/me/fixed-cooperation/dissolve/request', {
        reason,
        cooperationId,
      })
      .then((res) => unwrap(res)),

  /** 回应解除申请 */
  respondFixedCooperationDissolve: (params: {
    cooperationId: number;
    accept: boolean;
    rejectReason?: string | null;
  }) =>
    httpClient
      .post<unknown>('/photographers/me/fixed-cooperation/dissolve/respond', {
        cooperationId: params.cooperationId,
        accept: params.accept,
        rejectReason: params.rejectReason ?? undefined,
      })
      .then((res) => unwrap(res)),

  /** 当前登录摄影师档案（工作人员 JWT） */
  getMine: () =>
    httpClient.get<unknown>('/photographers/me').then((res) => unwrap<PhotographerMine>(res)),

  updateMine: (
    body: Partial<{
      name: string;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      gender: string | null;
      age: number | null;
      specialtyTopics: string | null;
      awards: string | null;
      portfolioImages: string[];
      portfolioItems: Array<{
        url: string;
        category?: 'wedding' | 'makeup' | 'styling' | string;
        desc?: string;
      }>;
      availableDates: string[];
      restDates: string[];
      scheduleNote: string | null;
    }>
  ) =>
    httpClient
      .patch<unknown>('/photographers/me', body)
      .then((res) => unwrap<PhotographerMine>(res)),

  submitApproval: () =>
    httpClient.post<unknown>('/photographers/me/submit-approval', {}).then((res) => unwrap(res)),

  /** 管理员演示 Token */
  listAdmin: () =>
    httpClient.get<unknown>('/photographers').then((res) => unwrapList<PhotographerAdmin>(res)),

  setApproval: (id: number, body: { approved: boolean; reviewNote?: string | null }) =>
    httpClient.patch<unknown>(`/photographers/${id}/approval`, body).then((res) => unwrap(res)),

  setEnabled: (id: number, enabled: boolean) =>
    httpClient
      .patch<unknown>(`/photographers/${id}/enabled`, { enabled })
      .then((res) => unwrap(res)),

  /** 管理员：设置头衔 */
  setAdminTitle: (id: number, body: { title: string | null }) =>
    httpClient
      .patch<unknown>(`/photographers/${id}/title`, body)
      .then((res) => unwrap<PhotographerAdmin>(res)),

  removeAdmin: (id: number) =>
    httpClient.delete<unknown>(`/photographers/${id}`).then((res) => unwrap(res)),

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append('file', file);
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
