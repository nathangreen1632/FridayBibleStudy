import { api } from '../http.helper';

export type RosterRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  spouseName: string | null;
  emailPaused: boolean;
};

type ListResp<T> = { ok?: boolean; data: T; total?: number; page?: number; pageSize?: number };

export async function fetchRoster(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<ListResp<RosterRow[]>> {
  const qs: string[] = [];
  if (params?.q) qs.push(`q=${encodeURIComponent(params.q)}`);
  if (typeof params?.page === 'number') qs.push(`page=${params.page}`);
  if (typeof params?.pageSize === 'number') qs.push(`pageSize=${params.pageSize}`);
  if (params?.sortBy) qs.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
  if (params?.sortDir) qs.push(`sortDir=${params.sortDir}`);
  const suffix = qs.length ? `?${qs.join('&')}` : '';

  try {
    return await api<ListResp<RosterRow[]>>(`/api/roster${suffix}`, { method: 'GET', credentials: 'include' });
  } catch {
    return { ok: false, data: [] };
  }
}
