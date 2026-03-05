/**
 * zmind API 服务
 * 通过服务端代理调用 zmind 接口，获取 issue 信息和固件版本号
 */

function getApiBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

export interface ZmindIssueInfo {
  issueId: string;
  subject: string;
  firmwareVersion: string;
  description: string;
}

/**
 * 获取 zmind issue 的固件版本号
 */
export async function fetchFirmwareVersion(issueId: string): Promise<ZmindIssueInfo> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/zmind/issues/${encodeURIComponent(issueId)}/firmware`);
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
  const res = await fetch(`${baseUrl}/api/zmind/issues/${encodeURIComponent(issueId)}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || '获取 issue 信息失败');
  }

  return json.data;
}
