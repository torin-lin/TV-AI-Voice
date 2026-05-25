/**
 * 认证与授权中间件
 * 
 * 策略：
 * - 所有业务 API 均要求登录
 * - 特定路由可通过 requireRole() 进一步限制
 */

import { Request, Response, NextFunction } from 'express';
import { getDb } from '../storage/sqlite';

export type SystemRole = 'admin' | 'member';
export type ProjectRole = 'owner' | 'qa' | 'rd' | 'pm' | 'viewer';
export type ProjectCapability =
  | 'workspace.manage'
  | 'releaseNote.write'
  | 'versionRecord.write'
  | 'problem.write'
  | 'knowledgeBase.write'
  | 'apk.write'
  | 'automation.write'
  | 'proxy.write'
  | 'integration.write';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  systemRole: SystemRole;
  status?: 'active' | 'disabled';
}

const CAPABILITY_ROLES: Record<ProjectCapability, ProjectRole[]> = {
  'workspace.manage': ['owner'],
  'releaseNote.write': ['rd'],
  'versionRecord.write': ['owner', 'qa'],
  'problem.write': ['owner', 'qa', 'pm'],
  'knowledgeBase.write': ['owner', 'qa'],
  'apk.write': ['owner', 'qa', 'rd'],
  'automation.write': ['owner', 'qa'],
  'proxy.write': ['owner', 'qa'],
  'integration.write': ['owner', 'qa', 'rd', 'pm'],
};

function getWorkspaceIdFromRequest(req: Request): string {
  return String(
    req.query?.workspaceId ||
    req.body?.workspaceId ||
    req.headers['x-workspace-id'] ||
    'AI Voice'
  );
}

export function getProjectRoleForUser(userId: string, workspaceId: string): ProjectRole | null {
  const membership = getDb().prepare(
    `SELECT projectRole FROM project_members WHERE workspaceId = ? AND userId = ?`
  ).get(workspaceId, userId) as any;
  return membership?.projectRole || null;
}

export function userHasProjectRole(req: Request, workspaceId: string, roles: ProjectRole[]): boolean {
  if (!req.user) return false;
  if (req.user.systemRole === 'admin') return true;
  const role = getProjectRoleForUser(req.user.id, workspaceId);
  if (!role) return false;
  if (role === 'owner') return true;
  return roles.includes(role);
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * 从请求头中提取 token 并解析用户信息
 * 尝试识别用户。强制登录由 requireAuth / requireWriteAccess 等中间件完成。
 */
export function identifyUser(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  if ((!authHeader || !authHeader.startsWith('Bearer ')) && !queryToken) {
    next();
    return;
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;
  try {
    const db = getDb();
    const session = db.prepare(
      `SELECT s.userId, s.expiresAt, u.id, u.username, u.displayName, u.systemRole, COALESCE(u.status, 'active') as status
       FROM sessions s JOIN users u ON s.userId = u.id
       WHERE s.token = ?`
    ).get(token) as any;

    if (session && session.expiresAt > Date.now() && session.status === 'active') {
      req.user = {
        id: session.userId,
        username: session.username,
        displayName: session.displayName,
        systemRole: session.systemRole as SystemRole,
        status: session.status,
      };
    } else if (session && session.status !== 'active') {
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    }
  } catch (e) {
    console.error('Token 解析失败:', e);
  }

  next();
}

/**
 * 要求已登录
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '请先登录' });
    return;
  }
  next();
}

export function requireWorkspaceRead(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '请先登录' });
    return;
  }
  if (req.user.systemRole === 'admin') {
    next();
    return;
  }
  const workspaceId = getWorkspaceIdFromRequest(req);
  const role = getProjectRoleForUser(req.user.id, workspaceId);
  if (!role) {
    res.status(403).json({ success: false, message: '您不是该项目成员，无法访问项目数据' });
    return;
  }
  next();
}

export function requireProjectCapability(capability: ProjectCapability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '请先登录' });
      return;
    }

    if (req.user.systemRole === 'admin') {
      next();
      return;
    }

    const workspaceId = getWorkspaceIdFromRequest(req);
    const roles = CAPABILITY_ROLES[capability];
    const role = getProjectRoleForUser(req.user.id, workspaceId);
    if (!role) {
      res.status(403).json({ success: false, message: '您不是该项目成员，无法操作项目数据' });
      return;
    }
    if (roles.includes(role)) {
      next();
      return;
    }

    res.status(403).json({ success: false, message: '权限不足，请联系项目负责人或管理员' });
  };
}

export function requireBusinessApiAccess(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/auth/')) {
    next();
    return;
  }

  const loginOnlyExtensionApiPrefixes = [
    '/api/knowledge-base',
    '/api/alias-test',
    '/api/voice-automation',
    '/api/mitm',
  ];
  if (loginOnlyExtensionApiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
    requireAuth(req, res, next);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    requireWorkspaceRead(req, res, next);
    return;
  }

  const capabilityByPrefix: Array<[string, ProjectCapability]> = [
    ['/api/release-notes', 'releaseNote.write'],
    ['/api/version-records', 'versionRecord.write'],
    ['/api/version-issues', 'versionRecord.write'],
    ['/api/customer-problems', 'problem.write'],
    ['/api/apk', 'apk.write'],
    ['/api/docs', 'integration.write'],
    ['/api/zmind', 'integration.write'],
  ];

  const matched = capabilityByPrefix.find(([prefix]) => req.path.startsWith(prefix));
  if (!matched) {
    requireAuth(req, res, next);
    return;
  }
  requireProjectCapability(matched[1])(req, res, next);
}

/**
 * 要求特定系统角色
 */
export function requireSystemRole(...roles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '请先登录' });
      return;
    }
    if (!roles.includes(req.user.systemRole)) {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }
    next();
  };
}

/**
 * 要求特定项目角色（或系统管理员）
 * workspaceId 从 query 或 body 中获取
 */
export function requireProjectRole(...roles: ProjectRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '请先登录' });
      return;
    }

    // 系统管理员拥有所有权限
    if (req.user.systemRole === 'admin') {
      next();
      return;
    }

    const workspaceId = getWorkspaceIdFromRequest(req);
    const role = getProjectRoleForUser(req.user.id, String(workspaceId));

    if (!role) {
      res.status(403).json({ success: false, message: '您不是该项目的成员' });
      return;
    }

    // owner 拥有项目内全部权限
    if (role === 'owner') {
      next();
      return;
    }

    if (!roles.includes(role as ProjectRole)) {
      res.status(403).json({ success: false, message: '权限不足，需要角色: ' + roles.join('/') });
      return;
    }

    next();
  };
}

/**
 * 写操作守卫：要求登录 + 至少是项目成员
 * 用于通用的 POST/PUT/DELETE 路由保护
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '请先登录后才能执行此操作' });
    return;
  }

  const workspaceId = getWorkspaceIdFromRequest(req);
  const role = getProjectRoleForUser(req.user.id, String(workspaceId));

  if (!role || role === 'viewer') {
    res.status(403).json({ success: false, message: '您没有写入权限' });
    return;
  }

  next();
}
