/**
 * 版本记录 API 客户端
 */

import { VersionRecord, QueryFilter, PaginationOptions, PaginationResult } from '../types/database';
import { appendWorkspaceParam, withWorkspaceBody } from './WorkspaceContext';

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

export async function apiQueryVersionRecords(
  filters: QueryFilter = {},
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<VersionRecord>> {
  const params = new URLSearchParams();
  params.set('page', String(pagination.page));
  params.set('pageSize', String(pagination.pageSize));
  if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
  if (filters.versionStatus) params.set('versionStatus', filters.versionStatus);
  if (filters.projectGroup) params.set('projectGroup', filters.projectGroup);
  if (filters.keyword) params.set('keyword', filters.keyword);
  appendWorkspaceParam(params);
  return apiFetch<PaginationResult<VersionRecord>>(`/api/version-records?${params.toString()}`);
}

export async function apiSearchVersionRecords(
  keyword: string,
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<VersionRecord>> {
  const params = new URLSearchParams();
  params.set('keyword', keyword);
  params.set('page', String(pagination.page));
  params.set('pageSize', String(pagination.pageSize));
  appendWorkspaceParam(params);
  return apiFetch<PaginationResult<VersionRecord>>(`/api/version-records/search?${params.toString()}`);
}

export async function apiCreateVersionRecord(
  data: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const result = await apiFetch<{ id: string }>('/api/version-records', {
    method: 'POST',
    body: JSON.stringify(withWorkspaceBody(data)),
  });
  return result.id;
}

export async function apiUpdateVersionRecord(id: string, data: Partial<VersionRecord>): Promise<void> {
  await apiFetch(`/api/version-records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(withWorkspaceBody(data)),
  });
}

export async function apiDeleteVersionRecord(id: string): Promise<void> {
  await apiFetch(`/api/version-records/${id}`, { method: 'DELETE' });
}

export interface ParentVersionInfo {
  id: string;
  versionNumber: string;
  projectType?: string;
}

export async function apiGetVersionRecordParentVersions(): Promise<ParentVersionInfo[]> {
  const params = new URLSearchParams();
  appendWorkspaceParam(params);
  return apiFetch<ParentVersionInfo[]>(`/api/version-records/parent-versions?${params.toString()}`);
}
