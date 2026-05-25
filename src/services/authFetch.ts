/**
 * 带认证 token 的 fetch 封装
 * 自动从 localStorage 读取 auth_token 并附加到请求头
 * 收到 401 时触发会话过期事件
 */

import { SESSION_EXPIRED_EVENT } from '../auth/AuthProvider';
import { getCurrentWorkspaceId } from './WorkspaceContext';

const TOKEN_KEY = 'auth_token';

export function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  headers['x-workspace-id'] = getCurrentWorkspaceId();

  return fetch(input, {
    ...init,
    headers,
  }).then((response) => {
    // 检测会话过期
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return response;
  });
}
