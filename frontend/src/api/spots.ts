import { httpClient } from './client';

/** 城市所属区域（景点管理国内/国外分区） */
export type CityRegion = 'domestic' | 'international';

export interface City {
  id: number;
  name: string;
  region?: CityRegion;
  createdAt?: string;
  updatedAt?: string;
  _count?: { spots: number };
}

export interface Spot {
  id: number;
  cityId: number;
  city: City;
  name: string;
  description?: string | null;
  images?: string[] | null;
  category: string;
  recommended: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function unwrap<T>(res: unknown): T {
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

export const citiesApi = {
  list: () => httpClient.get<City[]>('/cities').then((res) => unwrap<City[]>(res)),

  create: (body: { name: string; region?: CityRegion }) =>
    httpClient.post<City>('/cities', body).then((res) => unwrap<City>(res)),

  update: (id: number, body: { name: string; region?: CityRegion }) =>
    httpClient.patch<City>(`/cities/${id}`, body).then((res) => unwrap<City>(res)),

  remove: (id: number) => httpClient.delete(`/cities/${id}`).then((res) => unwrap(res)),
};

export const spotsApi = {
  /** 用户端 / 无需登录 */
  getPublic: () => httpClient.get<Spot[]>('/spots/public').then((res) => unwrap<Spot[]>(res)),

  list: () => httpClient.get<Spot[]>('/spots').then((res) => unwrap<Spot[]>(res)),

  create: (body: {
    name: string;
    cityId: number;
    category: string;
    description?: string | null;
    images?: string[] | null;
    recommended?: boolean;
  }) => httpClient.post<Spot>('/spots', body).then((res) => unwrap<Spot>(res)),

  update: (
    id: number,
    body: Partial<{
      name: string;
      cityId: number;
      category: string;
      description: string | null;
      images: string[] | null;
      recommended: boolean;
    }>
  ) => httpClient.patch<Spot>(`/spots/${id}`, body).then((res) => unwrap<Spot>(res)),

  remove: (id: number) => httpClient.delete(`/spots/${id}`).then((res) => unwrap(res)),
};
