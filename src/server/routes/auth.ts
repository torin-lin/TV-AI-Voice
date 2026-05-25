/**
 * 认证与用户管理 API 路由
 * 
 * POST /api/auth/login          - 登录
 * POST /api/auth/logout         - 登出
 * GET  /api/auth/me             - 获取当前用户信息
 * POST /api/auth/register       - 注册新用户（管理员操作）
 * GET  /api/auth/users          - 获取用户列表
 * PUT  /api/auth/users/:id      - 更新用户信息
 * DELETE /api/auth/users/:id    - 删除用户
 * PUT  /api/auth/users/:id/password - 修改密码
 * 
 * GET  /api/auth/project-members?workspaceId=xxx  - 获取项目成员
 * POST /api/auth/project-members                  - 添加项目成员
 * PUT  /api/auth/project-members/:id              - 修改成员角色
 * DELETE /api/auth/project-members/:id            - 移除项目成员
 * GET  /api/auth/project-roles?workspaceId=xxx    - 获取当前项目各角色负责人
 */

import crypto from 'crypto';
import { getDb, generateId } from '../storage/sqlite';
import { requireAuth, requireSystemRole, requireProjectRole } from '../middleware/auth';

const SALT = 'aivoice_salt_';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 天

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(SALT + password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function isValidEmail(username: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
}

function countActiveAdmins(excludeUserId?: string): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as c FROM users
     WHERE systemRole = 'admin'
       AND COALESCE(status, 'active') = 'active'
       ${excludeUserId ? 'AND id != ?' : ''}`
  ).get(...(excludeUserId ? [excludeUserId] : [])) as any;
  return Number(row?.c || 0);
}

function countWorkspaceOwners(workspaceId: string, excludeMemberId?: string): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as c
     FROM project_members pm
     JOIN users u ON u.id = pm.userId
     WHERE pm.workspaceId = ?
       AND pm.projectRole = 'owner'
       AND COALESCE(u.status, 'active') = 'active'
       ${excludeMemberId ? 'AND pm.id != ?' : ''}`
  ).get(...(excludeMemberId ? [workspaceId, excludeMemberId] : [workspaceId])) as any;
  return Number(row?.c || 0);
}

function canManageWorkspace(user: any, workspaceId: string): boolean {
  if (!user) return false;
  if (user.systemRole === 'admin') return true;
  return !!getDb().prepare(
    `SELECT id FROM project_members WHERE workspaceId = ? AND userId = ? AND projectRole = 'owner'`
  ).get(workspaceId, user.id);
}

function canReadWorkspace(user: any, workspaceId: string): boolean {
  if (!user) return false;
  if (user.systemRole === 'admin') return true;
  return !!getDb().prepare(
    `SELECT id FROM project_members WHERE workspaceId = ? AND userId = ?`
  ).get(workspaceId, user.id);
}

export function setupAuthRoutes(app: any): void {
  const db = getDb();

  // ========== 认证 ==========

  /** POST /api/auth/login */
  app.post('/api/auth/login', (req: any, res: any) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '邮箱和密码不能为空' });
      }

      const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username) as any;
      if (!user) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }
      if ((user.status || 'active') !== 'active') {
        return res.status(403).json({ success: false, message: '账号已停用，请联系管理员' });
      }

      const hash = hashPassword(password);
      if (hash !== user.passwordHash) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 创建会话
      const token = generateToken();
      const expiresAt = Date.now() + SESSION_DURATION;
      db.prepare(`INSERT INTO sessions (token, userId, expiresAt) VALUES (?, ?, ?)`)
        .run(token, user.id, expiresAt);
      db.prepare(`UPDATE users SET lastLoginAt = ?, updatedAt = ? WHERE id = ?`)
        .run(Date.now(), Date.now(), user.id);

      // 清理过期会话
      db.prepare(`DELETE FROM sessions WHERE expiresAt < ?`).run(Date.now());

      res.json({
        success: true,
        data: {
          token,
          expiresAt,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            systemRole: user.systemRole,
            status: user.status || 'active',
            lastLoginAt: Date.now(),
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/auth/logout */
  app.post('/api/auth/logout', (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
      }
      res.json({ success: true, message: '已登出' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/auth/me */
  app.get('/api/auth/me', (req: any, res: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    // 获取用户的项目角色列表
    const memberships = db.prepare(
      `SELECT workspaceId, projectRole FROM project_members WHERE userId = ?`
    ).all(req.user.id) as any[];

    res.json({
      success: true,
      data: {
        ...req.user,
        projectRoles: memberships,
      },
    });
  });

  // ========== 个人中心 ==========

  /** GET /api/auth/profile - 获取个人详细信息 */
  app.get('/api/auth/profile', requireAuth, (req: any, res: any) => {
    try {
      const user = db.prepare(
        `SELECT id, username, displayName, systemRole, COALESCE(status, 'active') as status, phone, zmindApiKey, lastLoginAt, createdAt, updatedAt FROM users WHERE id = ?`
      ).get(req.user.id) as any;
      if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

      res.json({
        success: true,
        data: {
          ...user,
          zmindApiKey: user.zmindApiKey ? user.zmindApiKey.slice(0, 8) + '...' : '', // 脱敏
          hasZmindApiKey: !!user.zmindApiKey,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/auth/profile - 更新个人信息 */
  app.put('/api/auth/profile', requireAuth, (req: any, res: any) => {
    try {
      const { displayName, phone, zmindApiKey } = req.body;
      const now = Date.now();
      const updates: string[] = [];
      const values: any[] = [];

      if (displayName !== undefined && displayName.trim()) {
        updates.push('displayName = ?');
        values.push(displayName.trim());
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone.trim());
      }
      if (zmindApiKey !== undefined) {
        updates.push('zmindApiKey = ?');
        values.push(zmindApiKey.trim());
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: '没有需要更新的字段' });
      }

      updates.push('updatedAt = ?');
      values.push(now);
      values.push(req.user.id);

      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      res.json({ success: true, message: '个人信息已更新' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/auth/profile/password - 修改自己的密码 */
  app.put('/api/auth/profile/password', requireAuth, (req: any, res: any) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: '请填写旧密码和新密码' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: '新密码至少 6 位' });
      }

      const user = db.prepare(`SELECT passwordHash FROM users WHERE id = ?`).get(req.user.id) as any;
      if (!user || hashPassword(oldPassword) !== user.passwordHash) {
        return res.status(401).json({ success: false, message: '旧密码错误' });
      }

      const hash = hashPassword(newPassword);
      db.prepare(`UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?`).run(hash, Date.now(), req.user.id);

      // 清除其他会话（保留当前会话）
      const currentToken = req.headers.authorization?.slice(7) || '';
      db.prepare(`DELETE FROM sessions WHERE userId = ? AND token != ?`).run(req.user.id, currentToken);

      res.json({ success: true, message: '密码已修改' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/auth/profile/zmind-key - 获取完整 zmind API Key（不脱敏） */
  app.get('/api/auth/profile/zmind-key', requireAuth, (req: any, res: any) => {
    try {
      const user = db.prepare(`SELECT zmindApiKey FROM users WHERE id = ?`).get(req.user.id) as any;
      res.json({ success: true, data: { zmindApiKey: user?.zmindApiKey || '' } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // ========== 用户管理（管理员） ==========

  /** POST /api/auth/register - 管理员创建用户 */
  app.post('/api/auth/register', requireAuth, requireSystemRole('admin'), (req: any, res: any) => {
    try {
      const { username, displayName, password, systemRole = 'member' } = req.body;
      if (!username || !displayName || !password) {
        return res.status(400).json({ success: false, message: '邮箱、显示名和密码不能为空' });
      }

      const normalizedUsername = String(username).trim().toLowerCase();
      if (!isValidEmail(normalizedUsername)) {
        return res.status(400).json({ success: false, message: '登录账号必须是邮箱格式' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: '密码至少 6 位' });
      }

      // 检查邮箱是否已存在
      const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(normalizedUsername);
      if (existing) {
        return res.status(409).json({ success: false, message: '邮箱已存在' });
      }

      const id = generateId('usr');
      const now = Date.now();
      const hash = hashPassword(password);

      db.prepare(
        `INSERT INTO users (id, username, displayName, passwordHash, systemRole, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
      ).run(id, normalizedUsername, displayName.trim(), hash, systemRole === 'admin' ? 'admin' : 'member', now, now);

      res.json({
        success: true,
        data: { id, username: normalizedUsername, displayName: displayName.trim(), systemRole: systemRole === 'admin' ? 'admin' : 'member', status: 'active' },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/auth/users - 获取用户列表 */
  app.get('/api/auth/users', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : '';
      const isWorkspaceOwner = workspaceId
        ? !!db.prepare(
            `SELECT id FROM project_members WHERE workspaceId = ? AND userId = ? AND projectRole = 'owner'`
          ).get(workspaceId, req.user.id)
        : false;
      if (req.user.systemRole !== 'admin' && !isWorkspaceOwner) {
        return res.status(403).json({ success: false, message: '仅管理员或项目负责人可查看用户列表' });
      }
      const users = db.prepare(
        `SELECT id, username, displayName, systemRole, COALESCE(status, 'active') as status, lastLoginAt, createdAt, updatedAt FROM users ORDER BY createdAt ASC`
      ).all();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/auth/users/:id - 更新用户信息（管理员） */
  app.put('/api/auth/users/:id', requireAuth, requireSystemRole('admin'), (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { displayName, systemRole, status } = req.body;
      const now = Date.now();

      const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(id);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      const target = db.prepare(`SELECT id, systemRole, COALESCE(status, 'active') as status FROM users WHERE id = ?`).get(id) as any;
      if (!target) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      const nextRole = systemRole && ['admin', 'member'].includes(systemRole) ? systemRole : target.systemRole;
      const nextStatus = status && ['active', 'disabled'].includes(status) ? status : target.status;
      if (id === req.user!.id && nextStatus !== 'active') {
        return res.status(400).json({ success: false, message: '不能停用自己的账号' });
      }
      const willLoseActiveAdmin =
        target.systemRole === 'admin' &&
        (nextRole !== 'admin' || nextStatus !== 'active');
      if (willLoseActiveAdmin && countActiveAdmins(id) === 0) {
        return res.status(400).json({ success: false, message: '至少需要保留一个启用状态的管理员' });
      }

      if (displayName !== undefined && String(displayName).trim()) {
        db.prepare(`UPDATE users SET displayName = ?, updatedAt = ? WHERE id = ?`).run(String(displayName).trim(), now, id);
      }
      if (systemRole && ['admin', 'member'].includes(systemRole)) {
        db.prepare(`UPDATE users SET systemRole = ?, updatedAt = ? WHERE id = ?`).run(systemRole, now, id);
      }
      if (status && ['active', 'disabled'].includes(status)) {
        db.prepare(`UPDATE users SET status = ?, updatedAt = ? WHERE id = ?`).run(status, now, id);
        if (status === 'disabled') {
          db.prepare(`DELETE FROM sessions WHERE userId = ?`).run(id);
        }
      }

      res.json({ success: true, message: '已更新' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/auth/users/:id - 删除用户（管理员） */
  app.delete('/api/auth/users/:id', requireAuth, requireSystemRole('admin'), (req: any, res: any) => {
    try {
      const { id } = req.params;

      // 不能删除自己
      if (id === req.user!.id) {
        return res.status(400).json({ success: false, message: '不能删除自己' });
      }
      const target = db.prepare(`SELECT id, systemRole, COALESCE(status, 'active') as status FROM users WHERE id = ?`).get(id) as any;
      if (!target) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      if (target.systemRole === 'admin' && target.status === 'active' && countActiveAdmins(id) === 0) {
        return res.status(400).json({ success: false, message: '至少需要保留一个启用状态的管理员' });
      }

      db.prepare(`DELETE FROM sessions WHERE userId = ?`).run(id);
      db.prepare(`DELETE FROM project_members WHERE userId = ?`).run(id);
      db.prepare(`DELETE FROM users WHERE id = ?`).run(id);

      res.json({ success: true, message: '已删除' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/auth/users/:id/password - 修改密码 */
  app.put('/api/auth/users/:id/password', requireAuth, (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;

      // 只能改自己的密码，除非是管理员
      if (id !== req.user!.id && req.user!.systemRole !== 'admin') {
        return res.status(403).json({ success: false, message: '只能修改自己的密码' });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: '新密码至少 6 位' });
      }

      // 非管理员需要验证旧密码
      if (req.user!.systemRole !== 'admin') {
        const user = db.prepare(`SELECT passwordHash FROM users WHERE id = ?`).get(id) as any;
        if (!user || hashPassword(oldPassword) !== user.passwordHash) {
          return res.status(401).json({ success: false, message: '旧密码错误' });
        }
      }

      const hash = hashPassword(newPassword);
      db.prepare(`UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?`).run(hash, Date.now(), id);

      // 清除该用户所有会话（强制重新登录）
      db.prepare(`DELETE FROM sessions WHERE userId = ?`).run(id);

      res.json({ success: true, message: '密码已修改，请重新登录' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // ========== 项目成员管理 ==========

  /** GET /api/auth/project-members?workspaceId=xxx */
  app.get('/api/auth/project-members', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.query.workspaceId || 'AI Voice';
      if (req.user.systemRole !== 'admin') {
        const membership = db.prepare(
          `SELECT id FROM project_members WHERE workspaceId = ? AND userId = ?`
        ).get(workspaceId, req.user.id);
        if (!membership) return res.status(403).json({ success: false, message: '您不是该项目成员' });
      }
      const members = db.prepare(
        `SELECT pm.id, pm.workspaceId, pm.userId, pm.projectRole, pm.createdAt,
                u.username, u.displayName, u.systemRole, COALESCE(u.status, 'active') as status
         FROM project_members pm
         JOIN users u ON pm.userId = u.id
         WHERE pm.workspaceId = ?
         ORDER BY pm.createdAt ASC`
      ).all(workspaceId);
      res.json({ success: true, data: members });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/auth/project-members - 添加项目成员 */
  app.post('/api/auth/project-members', requireAuth, requireProjectRole('owner'), (req: any, res: any) => {
    try {
      const { workspaceId, userId, projectRole } = req.body;
      if (!workspaceId || !userId || !projectRole) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
      }

      const validRoles = ['owner', 'qa', 'rd', 'pm', 'viewer'];
      if (!validRoles.includes(projectRole)) {
        return res.status(400).json({ success: false, message: '无效的角色: ' + projectRole });
      }

      // 检查用户是否存在
      const user = db.prepare(`SELECT id, COALESCE(status, 'active') as status FROM users WHERE id = ?`).get(userId) as any;
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      if (user.status !== 'active') {
        return res.status(400).json({ success: false, message: '不能添加已停用用户为项目成员' });
      }

      // 检查是否已是成员
      const existing = db.prepare(
        `SELECT id FROM project_members WHERE workspaceId = ? AND userId = ?`
      ).get(workspaceId, userId);
      if (existing) {
        return res.status(409).json({ success: false, message: '该用户已是项目成员' });
      }

      const id = generateId('pm');
      db.prepare(
        `INSERT INTO project_members (id, workspaceId, userId, projectRole, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).run(id, workspaceId, userId, projectRole, Date.now());

      res.json({ success: true, data: { id, workspaceId, userId, projectRole } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/auth/project-members/:id - 修改成员角色 */
  app.put('/api/auth/project-members/:id', requireAuth, (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { projectRole } = req.body;

      const validRoles = ['owner', 'qa', 'rd', 'pm', 'viewer'];
      if (!projectRole || !validRoles.includes(projectRole)) {
        return res.status(400).json({ success: false, message: '无效的角色' });
      }

      const member = db.prepare(`SELECT id, workspaceId, projectRole FROM project_members WHERE id = ?`).get(id) as any;
      if (!member) {
        return res.status(404).json({ success: false, message: '成员记录不存在' });
      }
      if (!canManageWorkspace(req.user, member.workspaceId)) {
        return res.status(403).json({ success: false, message: '权限不足，仅项目负责人或管理员可操作' });
      }
      if (member.projectRole === 'owner' && projectRole !== 'owner' && countWorkspaceOwners(member.workspaceId, member.id) === 0) {
        return res.status(400).json({ success: false, message: '至少需要保留一个启用状态的项目负责人' });
      }

      db.prepare(`UPDATE project_members SET projectRole = ? WHERE id = ?`).run(projectRole, id);
      res.json({ success: true, message: '已更新' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/auth/project-members/:id - 移除项目成员 */
  app.delete('/api/auth/project-members/:id', requireAuth, (req: any, res: any) => {
    try {
      const { id } = req.params;
      const member = db.prepare(`SELECT id, workspaceId, projectRole FROM project_members WHERE id = ?`).get(id) as any;
      if (!member) return res.status(404).json({ success: false, message: '成员记录不存在' });
      if (!canManageWorkspace(req.user, member.workspaceId)) {
        return res.status(403).json({ success: false, message: '权限不足，仅项目负责人或管理员可操作' });
      }
      if (member.projectRole === 'owner' && countWorkspaceOwners(member.workspaceId, member.id) === 0) {
        return res.status(400).json({ success: false, message: '至少需要保留一个启用状态的项目负责人' });
      }
      db.prepare(`DELETE FROM project_members WHERE id = ?`).run(id);
      res.json({ success: true, message: '已移除' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/auth/project-roles?workspaceId=xxx - 获取项目各角色负责人（用于自动带出） */
  app.get('/api/auth/project-roles', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.query.workspaceId || 'AI Voice';
      if (!canReadWorkspace(req.user, String(workspaceId))) {
        return res.status(403).json({ success: false, message: '您不是该项目成员' });
      }
      const members = db.prepare(
        `SELECT pm.projectRole, u.id as userId, u.displayName, u.username
         FROM project_members pm
         JOIN users u ON pm.userId = u.id
         WHERE pm.workspaceId = ?`
      ).all(workspaceId) as any[];

      // 按角色分组
      const roles: Record<string, any[]> = { owner: [], qa: [], rd: [], pm: [], viewer: [] };
      for (const m of members) {
        if (roles[m.projectRole]) {
          roles[m.projectRole].push({ userId: m.userId, displayName: m.displayName, username: m.username });
        }
      }

      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
