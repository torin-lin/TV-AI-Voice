/**
 * Release Note API 客户端
 * 通过 HTTP API 读写数据（多人共享，SQLite 存储）
 */

import { ReleaseNote, QueryFilter, PaginationOptions, PaginationResult } from '../types/database';

function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `请求失败: ${res.status}`);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

// ==================== CRUD ====================

export async function apiCreateReleaseNote(
  data: Omit<ReleaseNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const result = await apiFetch<{ id: string }>('/api/release-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.id;
}

export async function apiGetReleaseNote(id: string): Promise<ReleaseNote | null> {
  try {
    return await apiFetch<ReleaseNote>(`/api/release-notes/${id}`);
  } catch {
    return null;
  }
}

export async function apiUpdateReleaseNote(id: string, data: Partial<ReleaseNote>): Promise<void> {
  await apiFetch(`/api/release-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteReleaseNote(id: string): Promise<void> {
  await apiFetch(`/api/release-notes/${id}`, { method: 'DELETE' });
}

// ==================== 查询 ====================

export async function apiQueryReleaseNotes(
  filters: QueryFilter = {},
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<ReleaseNote>> {
  const params = new URLSearchParams();
  params.set('page', String(pagination.page));
  params.set('pageSize', String(pagination.pageSize));

  if (filters.changeType) params.set('changeType', filters.changeType);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.branch) params.set('branch', filters.branch);
  if (filters.projectGroup) params.set('projectGroup', filters.projectGroup);
  if (filters.startDate) params.set('startDate', String(filters.startDate));
  if (filters.endDate) params.set('endDate', String(filters.endDate));

  return apiFetch<PaginationResult<ReleaseNote>>(`/api/release-notes?${params.toString()}`);
}

export async function apiSearchReleaseNotes(
  keyword: string,
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<ReleaseNote>> {
  const params = new URLSearchParams();
  params.set('keyword', keyword);
  params.set('page', String(pagination.page));
  params.set('pageSize', String(pagination.pageSize));

  return apiFetch<PaginationResult<ReleaseNote>>(`/api/release-notes/search?${params.toString()}`);
}
