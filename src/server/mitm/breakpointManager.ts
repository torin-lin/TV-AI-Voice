/**
 * 断点拦截管理器
 * - 暂停匹配断点规则的请求/响应
 * - 等待前端通过 WebSocket 发送操作指令（编辑后发送 / 直接通行）
 */

export interface BreakpointEntry {
  id: string;
  ownerId?: string | null;
  ruleId: string;
  ruleName: string;
  phase: 'request' | 'response';
  timestamp: number;
  // 请求信息
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  // 响应信息（仅 response 阶段有）
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface BreakpointResolution {
  action: 'forward' | 'passthrough';
  // forward: 使用修改后的内容继续
  modifiedRequestHeaders?: Record<string, string>;
  modifiedRequestBody?: string;
  modifiedResponseStatus?: number;
  modifiedResponseHeaders?: Record<string, string>;
  modifiedResponseBody?: string;
}

type ResolveCallback = (resolution: BreakpointResolution) => void;

const pendingBreakpoints = new Map<string, { entry: BreakpointEntry; resolve: ResolveCallback }>();
const listeners = new Set<(entry: BreakpointEntry) => void>();
const removeListeners = new Set<(id: string) => void>();

/**
 * 注册新断点通知监听器（WebSocket 推送用）
 */
export function onBreakpointAdded(listener: (entry: BreakpointEntry) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 注册断点移除通知监听器
 */
export function onBreakpointRemoved(listener: (id: string) => void): () => void {
  removeListeners.add(listener);
  return () => removeListeners.delete(listener);
}

/**
 * 创建断点并等待前端操作
 * 返回 Promise，在前端发送操作指令后 resolve
 */
export function waitForBreakpoint(entry: BreakpointEntry): Promise<BreakpointResolution> {
  return new Promise((resolve) => {
    pendingBreakpoints.set(entry.id, { entry, resolve });
    // 通知前端
    for (const listener of listeners) {
      try { listener(entry); } catch {}
    }
  });
}

/**
 * 前端发送操作指令，解除断点
 */
export function resolveBreakpoint(id: string, resolution: BreakpointResolution, ownerId?: string): boolean {
  const pending = pendingBreakpoints.get(id);
  if (!pending) return false;
  if (ownerId && pending.entry.ownerId !== ownerId) return false;
  pendingBreakpoints.delete(id);
  pending.resolve(resolution);
  // 通知前端移除
  for (const listener of removeListeners) {
    try { listener(id); } catch {}
  }
  return true;
}

/**
 * 获取所有待处理的断点
 */
export function getPendingBreakpoints(ownerId?: string): BreakpointEntry[] {
  return Array.from(pendingBreakpoints.values())
    .map(p => p.entry)
    .filter(entry => !ownerId || entry.ownerId === ownerId);
}

/**
 * 超时自动放行（防止请求永远挂起）
 */
export function autoPassthrough(id: string): void {
  const pending = pendingBreakpoints.get(id);
  if (pending) {
    pendingBreakpoints.delete(id);
    pending.resolve({ action: 'passthrough' });
    for (const listener of removeListeners) {
      try { listener(id); } catch {}
    }
  }
}
