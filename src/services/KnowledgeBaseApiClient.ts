/**
 * 知识库 API 客户端
 */

import { TestCase, KBRecommendation } from '../types/database';
import { authFetch } from './authFetch';
import { appendWorkspaceParam, withWorkspaceBody } from './WorkspaceContext';

function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(`${getBaseUrl()}${path}`, {
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

/** 获取测试用例列表 */
export async function apiGetTestCases(params?: { keyword?: string; category?: string; projectType?: string }): Promise<TestCase[]> {
  const qs = new URLSearchParams();
  if (params?.keyword) qs.set('keyword', params.keyword);
  if (params?.category) qs.set('category', params.category);
  if (params?.projectType) qs.set('projectType', params.projectType);
  appendWorkspaceParam(qs);
  return apiFetch<TestCase[]>(`/api/knowledge-base/test-cases?${qs.toString()}`);
}

/** 获取分类列表 */
export async function apiGetCategories(): Promise<string[]> {
  const qs = new URLSearchParams();
  appendWorkspaceParam(qs);
  return apiFetch<string[]>(`/api/knowledge-base/categories?${qs.toString()}`);
}

/** Release Note 版本信息 */
export interface ReleaseVersion {
  version: string;
  projectType?: string;
  changeDescription: string;
  modules: string[];
  severity: string;
  regressionRisk?: string;
  latestDate: number;
  noteIds: string[];
}

/** 获取 Release Note 版本列表 */
export async function apiGetReleaseVersions(projectType?: string): Promise<ReleaseVersion[]> {
  const qs = new URLSearchParams();
  if (projectType) qs.set('projectType', projectType);
  appendWorkspaceParam(qs);
  return apiFetch<ReleaseVersion[]>(`/api/knowledge-base/release-versions?${qs.toString()}`);
}

/** 获取知识库统计 */
export async function apiGetKBStats(): Promise<{ totalCases: number; totalCategories: number; categories: string[]; totalIssues: number; totalProblems: number; totalReleaseNotes: number; totalVersions: number }> {
  const qs = new URLSearchParams();
  appendWorkspaceParam(qs);
  return apiFetch(`/api/knowledge-base/stats?${qs.toString()}`);
}

/** 创建测试用例 */
export async function apiCreateTestCase(data: Partial<TestCase>): Promise<string> {
  const result = await apiFetch<{ id: string }>('/api/knowledge-base/test-cases', {
    method: 'POST',
    body: JSON.stringify(withWorkspaceBody(data)),
  });
  return result.id;
}

/** 批量导入测试用例 */
export async function apiBulkImportTestCases(cases: Partial<TestCase>[]): Promise<number> {
  const result = await apiFetch<{ imported: number }>('/api/knowledge-base/test-cases/bulk', {
    method: 'POST',
    body: JSON.stringify(withWorkspaceBody({ cases })),
  });
  return result.imported;
}

/** 更新测试用例 */
export async function apiUpdateTestCase(id: string, data: Partial<TestCase>): Promise<void> {
  await apiFetch(`/api/knowledge-base/test-cases/${id}`, { method: 'PUT', body: JSON.stringify(withWorkspaceBody(data)) });
}

/** 删除测试用例 */
export async function apiDeleteTestCase(id: string): Promise<void> {
  const qs = new URLSearchParams();
  appendWorkspaceParam(qs);
  await apiFetch(`/api/knowledge-base/test-cases/${id}?${qs.toString()}`, { method: 'DELETE' });
}

/** 智能推荐 */
export async function apiGetRecommendation(params: {
  versionRecordId?: string;
  versionNumber: string;
  changeDescription: string;
  modules?: string[];
  riskLevel?: string;
  projectType?: string;
  useAI?: boolean;
  apiKey?: string;
  endpoint?: string;
  modelName?: string;
}): Promise<KBRecommendation> {
  return apiFetch<KBRecommendation>('/api/knowledge-base/recommend', {
    method: 'POST',
    body: JSON.stringify(withWorkspaceBody(params)),
  });
}

/** AI 测试助手 */
export async function apiAIAssist(params: {
  query: string;
  apiKey: string;
  endpoint: string;
  modelName?: string;
  projectType?: string;
}): Promise<{ response: string; createdAt: number }> {
  return apiFetch('/api/knowledge-base/ai-assist', {
    method: 'POST',
    body: JSON.stringify(withWorkspaceBody(params)),
  });
}
