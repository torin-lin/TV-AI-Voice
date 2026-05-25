/**
 * 版本问题 API 客户端
 */

import { VersionIssue, IssueAttachment } from '../types/database';
import { authFetch } from './authFetch';
import { appendWorkspaceParam, getCurrentWorkspaceId, withWorkspaceBody } from './WorkspaceContext';

function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

/** 获取某版本的问题列表 */
export async function fetchVersionIssues(versionRecordId: string): Promise<VersionIssue[]> {
  const params = new URLSearchParams();
  params.set('versionRecordId', versionRecordId);
  appendWorkspaceParam(params);
  const res = await authFetch(`${getBaseUrl()}/api/version-issues?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

/** 创建问题 */
export async function createVersionIssue(data: {
  versionRecordId: string;
  title: string;
  description?: string;
  precondition?: string;
  testEnvironment?: string;
  severity?: string;
  linkedPR?: string;
  reporter?: string;
  zmindSync?: {
    enabled: boolean;
    projectId?: number;
    trackerId?: number;
    statusId?: number;
    priorityId?: number;
    assignedToId?: number;
    categoryId?: number;
    fixedVersionId?: number;
    fixedVersionName?: string;
    customFields?: Record<string, string>;
  };
}): Promise<string> {
  const res = await authFetch(`${getBaseUrl()}/api/version-issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withWorkspaceBody(data)),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.id;
}

/** 更新问题 */
export async function updateVersionIssue(id: string, data: Partial<VersionIssue>): Promise<void> {
  const res = await authFetch(`${getBaseUrl()}/api/version-issues/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(withWorkspaceBody(data)),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

/** 删除问题 */
export async function deleteVersionIssue(id: string): Promise<void> {
  const params = new URLSearchParams();
  appendWorkspaceParam(params);
  const res = await authFetch(`${getBaseUrl()}/api/version-issues/${id}?${params.toString()}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}


/** 上传附件到问题 */
export async function uploadIssueAttachment(
  issueId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<IssueAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const params = new URLSearchParams();
    appendWorkspaceParam(params);
    xhr.open('POST', `${getBaseUrl()}/api/version-issues/${issueId}/attachments?${params.toString()}`);
    const token = localStorage.getItem('auth_token');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-workspace-id', getCurrentWorkspaceId());
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (json.success) resolve(json.data);
        else reject(new Error(json.message || '上传失败'));
      } catch { reject(new Error('解析响应失败')); }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(file);
  });
}

/** 删除附件 */
export async function deleteIssueAttachment(issueId: string, savedFileName: string): Promise<void> {
  const params = new URLSearchParams();
  appendWorkspaceParam(params);
  const res = await authFetch(`${getBaseUrl()}/api/version-issues/${issueId}/attachments/${encodeURIComponent(savedFileName)}?${params.toString()}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

/** 获取附件下载/预览 URL */
export function getAttachmentUrl(filePath: string): string {
  const token = localStorage.getItem('auth_token');
  const params = new URLSearchParams();
  appendWorkspaceParam(params);
  if (token) params.set('token', token);
  return `${getBaseUrl()}${filePath}?${params.toString()}`;
}
