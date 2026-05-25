/**
 * 操作审计日志
 * 记录所有写操作（POST/PUT/DELETE）的操作人、动作、资源、时间
 */

import { Request, Response, NextFunction } from 'express';
import { getDb } from '../storage/sqlite';

export interface AuditEntry {
  userId: string | null;
  username: string | null;
  action: string;       // create / update / delete / login / logout / upload
  resource: string;     // release-notes / version-records / customer-problems / users / ...
  resourceId?: string;
  detail?: string;
  ip?: string;
}

/** 写入一条审计日志 */
export function writeAuditLog(entry: AuditEntry): void {
  try {
    getDb().prepare(
      `INSERT INTO audit_logs (userId, username, action, resource, resourceId, detail, ip, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.userId || null,
      entry.username || null,
      entry.action,
      entry.resource,
      entry.resourceId || null,
      entry.detail || null,
      entry.ip || null,
      Date.now()
    );
  } catch (e) {
    console.error('[audit] 写入审计日志失败:', e);
  }
}

/** 从请求中提取客户端 IP */
function getClientIp(req: Request): string {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

/** 从 URL 路径推断资源类型 */
function inferResource(path: string): string {
  const segments = path.replace(/^\/api\//, '').split('/');
  // /api/release-notes/xxx → release-notes
  // /api/version-records/xxx → version-records
  // /api/auth/users/xxx → users
  if (segments[0] === 'auth') return segments[1] || 'auth';
  return segments[0] || 'unknown';
}

/** 从 URL 路径推断资源 ID */
function inferResourceId(path: string, method: string): string | undefined {
  const segments = path.replace(/^\/api\//, '').split('/');
  // PUT/DELETE /api/xxx/:id → id
  if (method === 'PUT' || method === 'DELETE') {
    if (segments[0] === 'auth' && segments.length >= 3) return segments[2];
    if (segments.length >= 2 && segments[1] && !segments[1].includes('?')) return segments[1];
  }
  return undefined;
}

/** 从 HTTP method 和路径推断动作 */
function inferAction(method: string, path: string): string {
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/password')) return 'change-password';
  if (path.includes('/upload') || path.includes('/pre-upload')) return 'upload';
  switch (method) {
    case 'POST': return 'create';
    case 'PUT': case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return method.toLowerCase();
  }
}

/**
 * 审计日志中间件
 * 自动记录所有写操作（POST/PUT/DELETE）
 * 放在路由之后、响应发送之前
 */
export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 只记录写操作
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  // 跳过不需要审计的路径
  const skipPaths = ['/api/auth/me', '/health', '/api/alias-test/status'];
  if (skipPaths.includes(req.path)) {
    next();
    return;
  }
  // 别名测试和语音自动化的 POST 是查询代理，不记录
  if (req.path.startsWith('/api/alias-test/ask') || req.path.startsWith('/api/voice-automation/jobs/') && req.method === 'GET') {
    next();
    return;
  }

  // 在响应完成后记录（这样可以知道是否成功）
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    // 只记录成功的操作
    if (body?.success !== false && res.statusCode < 400) {
      const resource = inferResource(req.path);
      const resourceId = inferResourceId(req.path, req.method) || body?.data?.id;
      const action = inferAction(req.method, req.path);

      // 构建详情摘要
      let detail = '';
      if (req.body?.title) detail = req.body.title;
      else if (req.body?.versionNumber) detail = req.body.versionNumber;
      else if (req.body?.version) detail = req.body.version;
      else if (req.body?.description) detail = req.body.description.slice(0, 80);
      else if (req.body?.displayName) detail = req.body.displayName;
      else if (req.body?.username) detail = req.body.username;

      writeAuditLog({
        userId: req.user?.id || null,
        username: req.user?.displayName || req.user?.username || null,
        action,
        resource,
        resourceId: resourceId ? String(resourceId) : undefined,
        detail: detail || undefined,
        ip: getClientIp(req),
      });
    }

    return originalJson(body);
  } as any;

  next();
}

/** 查询审计日志 */
export function queryAuditLogs(options: {
  page?: number;
  pageSize?: number;
  userId?: string;
  resource?: string;
  action?: string;
}): { data: any[]; total: number } {
  const { page = 1, pageSize = 50, userId, resource, action } = options;
  const conditions: string[] = [];
  const params: any[] = [];

  if (userId) { conditions.push('userId = ?'); params.push(userId); }
  if (resource) { conditions.push('resource = ?'); params.push(resource); }
  if (action) { conditions.push('action = ?'); params.push(action); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const db = getDb();

  const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs ${where}`).get(...params) as any).c;
  const offset = (Math.max(1, page) - 1) * pageSize;
  const data = db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

  return { data, total };
}
