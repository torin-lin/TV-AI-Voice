/**
 * zmind API 服务
 * 通过服务端代理调用 zmind 接口，获取 issue 信息和固件版本号
 */

import { authFetch } from './authFetch';

function getApiBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

export interface ZmindIssueInfo {
  issueId: string;
  subject: string;
  firmwareVersion: string;
  description: string;
  issueCreatedAt: string;
}

export interface ZmindProject {
  id: number;
  name: string;
  identifier?: string;
  parent?: {
    id: number;
    name: string;
  };
}

export interface ZmindOption {
  id: number;
  name: string;
}

export interface ZmindCustomField {
  id: number;
  name: string;
  fieldFormat: string;
  required: boolean;
  possibleValues: ZmindOption[];
  trackerIds: number[];
}

export interface ZmindProjectConfig {
  project: ZmindProject;
  currentUser?: ZmindOption;
  trackers: ZmindOption[];
  statuses: ZmindOption[];
  priorities: ZmindOption[];
  assignees: ZmindOption[];
  categories: ZmindOption[];
  versions: ZmindOption[];
  customFields: ZmindCustomField[];
}

export async function fetchZmindProjects(query = ''): Promise<ZmindProject[]> {
  const baseUrl = getApiBaseUrl();
  const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const res = await authFetch(`${baseUrl}/api/zmind/projects${qs}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || '获取 zmind 项目失败');
  }

  return json.data;
}

export async function fetchZmindProjectConfig(projectId: number | string): Promise<ZmindProjectConfig> {
  const baseUrl = getApiBaseUrl();
  const res = await authFetch(`${baseUrl}/api/zmind/projects/${encodeURIComponent(String(projectId))}/config`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || '获取 zmind 配置失败');
  }

  return json.data;
}

/**
 * 获取 zmind issue 的固件版本号
 */
export async function fetchFirmwareVersion(issueId: string): Promise<ZmindIssueInfo> {
  const baseUrl = getApiBaseUrl();
  const res = await authFetch(`${baseUrl}/api/zmind/issues/${encodeURIComponent(issueId)}/firmware`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || '获取固件版本失败');
  }

  return json.data;
}

/**
 * 获取 zmind issue 完整信息
 */
export async function fetchIssueDetail(issueId: string): Promise<any> {
  const baseUrl = getApiBaseUrl();
  const res = await authFetch(`${baseUrl}/api/zmind/issues/${encodeURIComponent(issueId)}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || '获取 issue 信息失败');
  }

  return json.data;
}

export interface ZmindUploadToken {
  token: string;
  filename: string;
  content_type: string;
}

/**
 * 上传文件到 zmind（通过后端代理 Redmine uploads API）
 * 返回 upload token，用于创建 issue 时关联附件
 */
export async function uploadFileToZmind(file: File): Promise<ZmindUploadToken> {
  const baseUrl = getApiBaseUrl();
  const res = await authFetch(`${baseUrl}/api/zmind/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || `上传文件失败: ${file.name}`);
  }

  return {
    token: json.data.token,
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
  };
}
