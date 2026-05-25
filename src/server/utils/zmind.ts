/**
 * zmind (Redmine) 统一工具模块
 * 所有与 zmind 的交互都通过这里，确保：
 * - API Key 获取逻辑统一（用户级 > 环境变量）
 * - 请求超时和错误处理统一
 * - URL 不硬编码在各路由文件中
 */

import { getDb } from '../storage/sqlite';

export const ZMIND_BASE_URL = 'https://zmind.whaletv.com';
const GLOBAL_ZMIND_API_KEY = process.env.ZMIND_API_KEY || '';

/**
 * 从请求中获取当前用户的 zmind API Key
 * 优先用户个人 Key → fallback 环境变量
 */
export function getZmindApiKey(req: any): string {
  if (req.user?.id) {
    const row = getDb().prepare('SELECT zmindApiKey FROM users WHERE id = ?').get(req.user.id) as any;
    if (row?.zmindApiKey) return row.zmindApiKey;
  }
  return GLOBAL_ZMIND_API_KEY;
}

/**
 * 检查 zmind API Key 是否可用，不可用则返回错误响应
 * 返回 apiKey 或 null（已发送错误响应）
 */
export function requireZmindApiKey(req: any, res: any): string | null {
  const apiKey = getZmindApiKey(req);
  if (!apiKey) {
    res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
    return null;
  }
  return apiKey;
}

/**
 * 统一的 zmind fetch 封装
 */
export function zmindFetch(path: string, apiKey: string, init: RequestInit = {}, timeoutMs = 120000): Promise<Response> {
  return fetch(`${ZMIND_BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'X-Redmine-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/**
 * 安全的 zmind JSON 请求（失败返回 fallback）
 */
export function safeZmindJson(path: string, apiKey: string, fallback: any, timeoutMs = 10000): Promise<any> {
  return zmindFetch(path, apiKey, {}, timeoutMs)
    .then((r) => r.ok ? r.json() : fallback)
    .catch(() => fallback);
}

/**
 * 创建 zmind issue
 */
export async function createZmindIssue(apiKey: string, issueData: Record<string, any>): Promise<{ id: number; createdOn: string }> {
  const response = await zmindFetch('/issues.json', apiKey, {
    method: 'POST',
    body: JSON.stringify({ issue: issueData }),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(json?.errors?.join('；') || `zmind API 返回错误: ${response.status}`);
  }
  return {
    id: Number(json.issue?.id),
    createdOn: json.issue?.created_on || new Date().toISOString(),
  };
}

/**
 * 上传文件到 zmind（Redmine uploads API）
 * 返回 upload token，用于创建 issue 时关联附件
 */
export async function uploadToZmindServer(apiKey: string, fileBuffer: Buffer, fileName: string): Promise<string> {
  const response = await fetch(`${ZMIND_BASE_URL}/uploads.json?filename=${encodeURIComponent(fileName)}`, {
    method: 'POST',
    signal: AbortSignal.timeout(300000), // 5 分钟超时（大文件）
    headers: {
      'X-Redmine-API-Key': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(fileBuffer),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(json?.errors?.join('；') || `zmind 附件上传失败: ${response.status}`);
  }
  const token = json?.upload?.token;
  if (!token) {
    throw new Error('zmind 附件上传成功但未返回 token');
  }
  return token;
}

/**
 * 获取当前 zmind 用户名
 */
export async function getZmindCurrentUserName(apiKey: string): Promise<string> {
  try {
    const response = await zmindFetch('/users/current.json', apiKey, {}, 15000);
    if (!response.ok) return 'zmind API 用户';
    const data = await response.json();
    const user = data.user || {};
    return [user.firstname, user.lastname].filter(Boolean).join(' ') || user.login || user.mail || 'zmind API 用户';
  } catch {
    return 'zmind API 用户';
  }
}
