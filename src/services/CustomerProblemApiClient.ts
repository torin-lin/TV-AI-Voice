/**
 * 客户问题/QA问题 API 客户端
 * 通过 HTTP API 读写数据（多人共享，SQLite 存储）
 */

import { CustomerProblem } from '../types/database';
import { appendWorkspaceParam, withWorkspaceBody } from './WorkspaceContext';

function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
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

export interface ProblemQueryParams {
  page?: number;
  pageSize?: number;
  problemType?: 'customer' | 'qa';
  classification?: string;
  status?: string;
  projectGroup?: string;
  keyword?: string;
  startDate?: number;
  endDate?: number;
}

export interface ProblemPaginationResult {
  data: CustomerProblem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function apiQueryProblems(params: ProblemQueryParams = {}): Promise<ProblemPaginationResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.problemType) qs.set('problemType', params.problemType);
  if (params.classification) qs.set('classification', params.classification);
  if (params.status) qs.set('status', params.status);
  if (params.projectGroup) qs.set('projectGroup', params.projectGroup);
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.startDate) qs.set('startDate', String(params.startDate));
  if (params.endDate) qs.set('endDate', String(params.endDate));
  appendWorkspaceParam(qs);
  return apiFetch<ProblemPaginationResult>(`/api/customer-problems?${qs.toString()}`);
}

export async function apiCreateProblem(data: Partial<CustomerProblem>): Promise<string> {
  const result = await apiFetch<{ id: string }>('/api/customer-problems', {
    method: 'POST',
    body: JSON.stringify(withWorkspaceBody(data)),
  });
  return result.id;
}

export async function apiUpdateProblem(id: string, data: Partial<CustomerProblem>): Promise<void> {
  await apiFetch(`/api/customer-problems/${id}`, {
    method: 'PUT',
    body: JSON.stringify(withWorkspaceBody(data)),
  });
}

export async function apiDeleteProblem(id: string): Promise<void> {
  await apiFetch(`/api/customer-problems/${id}`, { method: 'DELETE' });
}

export async function apiGetProblem(id: string): Promise<CustomerProblem | null> {
  try {
    return await apiFetch<CustomerProblem>(`/api/customer-problems/${id}`);
  } catch {
    return null;
  }
}
