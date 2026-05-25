/**
 * 独立项目配置 API
 * - 工作区、项目组、扩展模块持久化到 SQLite
 */

import { getDb, generateId } from '../storage/sqlite';
import { requireAuth } from '../middleware/auth';

const BUILTIN_WORKSPACE_ID = 'AI Voice';
const ALL_EXTENSION_IDS = [
  'apk-management',
  'recommendations',
  'knowledge-base',
  'voice-records',
  'alias-test',
  'mitm-proxy',
];
const DEFAULT_GROUPS = [
  { id: 'TV AI Voice', name: 'TV AI Voice', projectType: 'TV' },
  { id: 'Projector AI Voice', name: 'Projector AI Voice', projectType: 'Projector' },
  { id: 'STB AI Voice', name: 'STB AI Voice', projectType: 'STB' },
];

function ensureBuiltinWorkspace(): void {
  const db = getDb();
  const now = Date.now();
  const existing = db.prepare('SELECT id FROM project_workspaces WHERE id = ?').get(BUILTIN_WORKSPACE_ID);
  if (!existing) {
    db.prepare(`
      INSERT INTO project_workspaces (id, name, builtin, createdBy, createdAt, updatedAt)
      VALUES (?, ?, 1, NULL, ?, ?)
    `).run(BUILTIN_WORKSPACE_ID, BUILTIN_WORKSPACE_ID, now, now);
    const insertModule = db.prepare(`
      INSERT OR IGNORE INTO project_workspace_modules (workspaceId, moduleId, createdAt)
      VALUES (?, ?, ?)
    `);
    for (const moduleId of ALL_EXTENSION_IDS) insertModule.run(BUILTIN_WORKSPACE_ID, moduleId, now);
    const insertGroup = db.prepare(`
      INSERT OR IGNORE INTO project_workspace_groups (id, workspaceId, name, projectType, builtin, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `);
    for (const group of DEFAULT_GROUPS) {
      insertGroup.run(group.id, BUILTIN_WORKSPACE_ID, group.name, group.projectType, now, now);
    }
  }
}

function rowToWorkspace(row: any) {
  const db = getDb();
  const modules = db.prepare(`
    SELECT moduleId FROM project_workspace_modules WHERE workspaceId = ? ORDER BY moduleId ASC
  `).all(row.id) as any[];
  const groups = db.prepare(`
    SELECT id, name, projectType, builtin FROM project_workspace_groups WHERE workspaceId = ? ORDER BY createdAt ASC
  `).all(row.id) as any[];

  return {
    id: row.id,
    name: row.name,
    builtin: Boolean(row.builtin),
    extensionModuleIds: modules.map((item) => item.moduleId),
    projectGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      projectType: group.projectType,
      builtin: Boolean(group.builtin),
    })),
  };
}

function listWorkspaces(req?: any) {
  ensureBuiltinWorkspace();
  const db = getDb();
  let rows: any[];
  if (!req?.user || req.user.systemRole === 'admin') {
    rows = db.prepare('SELECT * FROM project_workspaces ORDER BY builtin DESC, createdAt ASC').all() as any[];
  } else {
    rows = db.prepare(`
      SELECT pw.*
      FROM project_workspaces pw
      JOIN project_members pm ON pm.workspaceId = pw.id
      WHERE pm.userId = ?
      ORDER BY pw.builtin DESC, pw.createdAt ASC
    `).all(req.user.id) as any[];
  }
  return rows.map(rowToWorkspace);
}

function assertCanManage(req: any, workspaceId: string): true | { status: number; message: string } {
  if (!req.user) return { status: 401, message: '请先登录' };
  if (req.user.systemRole === 'admin') return true;
  const membership = getDb().prepare(
    'SELECT projectRole FROM project_members WHERE workspaceId = ? AND userId = ?'
  ).get(workspaceId, req.user.id) as any;
  if (membership?.projectRole === 'owner') return true;
  return { status: 403, message: '权限不足，仅项目负责人或管理员可操作' };
}

function upsertWorkspace(project: any, userId?: string): void {
  const db = getDb();
  const now = Date.now();
  const id = String(project.id || project.name || '').trim();
  const name = String(project.name || project.id || '').trim();
  if (!id || !name) return;
  db.prepare(`
    INSERT INTO project_workspaces (id, name, builtin, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updatedAt = excluded.updatedAt
  `).run(id, name, project.builtin ? 1 : 0, userId || null, now, now);

  const allowedIds = new Set(ALL_EXTENSION_IDS);
  const moduleIds = Array.isArray(project.extensionModuleIds)
    ? project.extensionModuleIds.map((moduleId: unknown) => String(moduleId)).filter((moduleId: string) => allowedIds.has(moduleId))
    : [];
  db.prepare('DELETE FROM project_workspace_modules WHERE workspaceId = ?').run(id);
  const insertModule = db.prepare('INSERT OR IGNORE INTO project_workspace_modules (workspaceId, moduleId, createdAt) VALUES (?, ?, ?)');
  for (const moduleId of moduleIds) insertModule.run(id, moduleId, now);

  const groups = Array.isArray(project.projectGroups) ? project.projectGroups : [];
  db.prepare('DELETE FROM project_workspace_groups WHERE workspaceId = ?').run(id);
  const insertGroup = db.prepare(`
    INSERT OR IGNORE INTO project_workspace_groups (id, workspaceId, name, projectType, builtin, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const group of groups) {
    const groupName = String(group.name || group.id || '').trim();
    const groupId = String(group.id || groupName).trim();
    const projectType = String(group.projectType || groupId || groupName).trim();
    if (groupId && groupName && projectType) {
      insertGroup.run(groupId, id, groupName, projectType, group.builtin ? 1 : 0, now, now);
    }
  }
}

export function setupProjectWorkspaceRoutes(app: any): void {
  ensureBuiltinWorkspace();

  app.get('/api/project-workspaces', requireAuth, (req: any, res: any) => {
    try {
      res.json({ success: true, data: listWorkspaces(req) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.post('/api/project-workspaces', requireAuth, (req: any, res: any) => {
    try {
      if (req.user.systemRole !== 'admin') {
        return res.status(403).json({ success: false, message: '仅管理员可新增独立项目' });
      }
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ success: false, message: '请输入项目名称' });
      const db = getDb();
      const existing = db.prepare('SELECT id FROM project_workspaces WHERE id = ? OR name = ?').get(name, name);
      if (existing) return res.status(400).json({ success: false, message: '项目已存在' });

      upsertWorkspace({
        id: name,
        name,
        extensionModuleIds: req.body.extensionModuleIds || [],
        projectGroups: [],
      }, req.user.id);
      db.prepare(`
        INSERT OR IGNORE INTO project_members (id, workspaceId, userId, projectRole, createdAt)
        VALUES (?, ?, ?, 'owner', ?)
      `).run(generateId('pm'), name, req.user.id, Date.now());
      res.status(201).json({ success: true, data: rowToWorkspace(db.prepare('SELECT * FROM project_workspaces WHERE id = ?').get(name)) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.post('/api/project-workspaces/import-local', requireAuth, (req: any, res: any) => {
    try {
      if (req.user.systemRole !== 'admin') {
        return res.status(403).json({ success: false, message: '仅管理员可导入本地项目配置' });
      }
      const projects = Array.isArray(req.body.projects) ? req.body.projects : [];
      const db = getDb();
      for (const project of projects) {
        upsertWorkspace(project, req.user.id);
        const id = String(project.id || project.name || '').trim();
        if (id) {
          db.prepare(`
            INSERT OR IGNORE INTO project_members (id, workspaceId, userId, projectRole, createdAt)
            VALUES (?, ?, ?, 'owner', ?)
          `).run(generateId('pm'), id, req.user.id, Date.now());
        }
      }
      res.json({ success: true, data: listWorkspaces(req) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.put('/api/project-workspaces/:id/modules', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.params.id;
      const allowed = assertCanManage(req, workspaceId);
      if (allowed !== true) return res.status(allowed.status).json({ success: false, message: allowed.message });
      const db = getDb();
      const workspace = db.prepare('SELECT * FROM project_workspaces WHERE id = ?').get(workspaceId);
      if (!workspace) return res.status(404).json({ success: false, message: '独立项目不存在' });
      const now = Date.now();
      const allowedIds = new Set(ALL_EXTENSION_IDS);
      const moduleIds = Array.isArray(req.body.extensionModuleIds)
        ? req.body.extensionModuleIds.map((id: unknown) => String(id)).filter((id: string) => allowedIds.has(id))
        : [];
      db.prepare('DELETE FROM project_workspace_modules WHERE workspaceId = ?').run(workspaceId);
      const insert = db.prepare('INSERT OR IGNORE INTO project_workspace_modules (workspaceId, moduleId, createdAt) VALUES (?, ?, ?)');
      for (const moduleId of moduleIds) insert.run(workspaceId, moduleId, now);
      db.prepare('UPDATE project_workspaces SET updatedAt = ? WHERE id = ?').run(now, workspaceId);
      res.json({ success: true, data: rowToWorkspace(db.prepare('SELECT * FROM project_workspaces WHERE id = ?').get(workspaceId)) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.delete('/api/project-workspaces/:id', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.params.id;
      if (workspaceId === BUILTIN_WORKSPACE_ID) return res.status(400).json({ success: false, message: '内置项目不能删除' });
      if (req.user.systemRole !== 'admin') return res.status(403).json({ success: false, message: '仅管理员可删除独立项目' });
      const db = getDb();
      db.prepare('DELETE FROM project_workspace_groups WHERE workspaceId = ?').run(workspaceId);
      db.prepare('DELETE FROM project_workspace_modules WHERE workspaceId = ?').run(workspaceId);
      db.prepare('DELETE FROM project_members WHERE workspaceId = ?').run(workspaceId);
      const result = db.prepare('DELETE FROM project_workspaces WHERE id = ?').run(workspaceId);
      if (result.changes === 0) return res.status(404).json({ success: false, message: '独立项目不存在' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.post('/api/project-workspaces/:id/groups', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.params.id;
      const allowed = assertCanManage(req, workspaceId);
      if (allowed !== true) return res.status(allowed.status).json({ success: false, message: allowed.message });
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ success: false, message: '请输入项目组名称' });
      const db = getDb();
      const workspace = db.prepare('SELECT * FROM project_workspaces WHERE id = ?').get(workspaceId);
      if (!workspace) return res.status(404).json({ success: false, message: '独立项目不存在' });
      const existing = db.prepare('SELECT id FROM project_workspace_groups WHERE workspaceId = ? AND (id = ? OR name = ?)').get(workspaceId, name, name);
      if (existing) return res.status(400).json({ success: false, message: '项目组已存在' });
      const now = Date.now();
      db.prepare(`
        INSERT INTO project_workspace_groups (id, workspaceId, name, projectType, builtin, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).run(name, workspaceId, name, name, now, now);
      db.prepare('UPDATE project_workspaces SET updatedAt = ? WHERE id = ?').run(now, workspaceId);
      res.status(201).json({ success: true, data: rowToWorkspace(db.prepare('SELECT * FROM project_workspaces WHERE id = ?').get(workspaceId)) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.delete('/api/project-workspaces/:id/groups/:groupId', requireAuth, (req: any, res: any) => {
    try {
      const workspaceId = req.params.id;
      const allowed = assertCanManage(req, workspaceId);
      if (allowed !== true) return res.status(allowed.status).json({ success: false, message: allowed.message });
      const db = getDb();
      const result = db.prepare('DELETE FROM project_workspace_groups WHERE workspaceId = ? AND id = ?').run(workspaceId, req.params.groupId);
      if (result.changes === 0) return res.status(404).json({ success: false, message: '项目组不存在' });
      db.prepare('UPDATE project_workspaces SET updatedAt = ? WHERE id = ?').run(Date.now(), workspaceId);
      res.json({ success: true, data: rowToWorkspace(db.prepare('SELECT * FROM project_workspaces WHERE id = ?').get(workspaceId)) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
