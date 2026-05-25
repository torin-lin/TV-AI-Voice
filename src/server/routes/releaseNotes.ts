/**
 * Release Note REST API 路由
 * 服务端数据存储，支持局域网多人共享
 */

import {
  initReleaseNoteStorage,
  getAllRecords,
  findById,
  getEligibleQaReleaseNotes,
  create,
  update,
  remove,
} from '../storage/releaseNoteStorage';
import { getWorkspaceId, recordInProjectGroup, recordInWorkspace } from '../workspace';
import { getDb } from '../storage/sqlite';
import { getProjectRoleForUser } from '../middleware/auth';

function getProjectImpactTags(workspaceId: string): string[] {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(`release_note_impact_tags:${workspaceId}`) as any;
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveProjectImpactTags(workspaceId: string, tags: string[]): string[] {
  const normalized = tags.map((tag) => String(tag).trim()).filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
  getDb().prepare(`
    INSERT INTO app_settings (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(`release_note_impact_tags:${workspaceId}`, JSON.stringify(normalized), Date.now());
  return normalized;
}

function assertCurrentUserIsReleaseNoteRd(req: any, workspaceId: string): true | { status: number; message: string } {
  if (!req.user?.id) return { status: 401, message: '请先登录' };
  if (req.user.systemRole === 'admin') return true;
  if (getProjectRoleForUser(req.user.id, workspaceId) !== 'rd') {
    return { status: 403, message: '只有管理员或当前项目 RD 可以提交 Release Note' };
  }
  return true;
}

function assertAuthorMatchesCurrentUser(req: any, author: string): true | { status: number; message: string } {
  const row = getDb().prepare('SELECT displayName, username FROM users WHERE id = ?').get(req.user.id) as any;
  const allowed = [row?.displayName, row?.username].map((value) => String(value || '').trim()).filter(Boolean);
  if (!allowed.includes(author)) {
    return { status: 403, message: '提交人必须是当前登录 RD' };
  }
  return true;
}

/**
 * 设置 Release Note API 路由
 */
export function setupReleaseNoteRoutes(app: any): void {
  initReleaseNoteStorage();

  /**
   * GET /api/release-notes
   * 查询列表（支持筛选和分页）
   * 返回树形结构：大版本（parentVersion 为空）+ 子版本
   */
  app.get('/api/release-notes', (req: any, res: any) => {
    try {
      const {
        page = '1',
        pageSize = '20',
        changeType,
        severity,
        branch,
        projectGroup,
        startDate,
        endDate,
        flat,
        keyword,
        rdSmokeStatus,
        author,
      } = req.query;

      const workspaceId = getWorkspaceId(req);
      let filtered = [...getAllRecords()].filter((record: any) => recordInWorkspace(record, workspaceId));

      if (changeType) filtered = filtered.filter((r: any) => r.changeType === changeType);
      if (severity) filtered = filtered.filter((r: any) => r.severity === severity);
      if (branch) filtered = filtered.filter((r: any) => r.branch === branch);
      if (rdSmokeStatus) filtered = filtered.filter((r: any) => (r.rdSmokeStatus || '未测试') === rdSmokeStatus);
      if (author) filtered = filtered.filter((r: any) => (r.author || '') === author);
      filtered = filtered.filter((record: any) => recordInProjectGroup(record, projectGroup));
      if (startDate && endDate) {
        const s = Number(startDate), e = Number(endDate);
        filtered = filtered.filter((r: any) => r.createdAt >= s && r.createdAt <= e);
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter((r: any) =>
          (r.version || '').toLowerCase().includes(kw) ||
          (r.branch || '').toLowerCase().includes(kw) ||
          (r.author || '').toLowerCase().includes(kw) ||
          (r.changeDescription || '').toLowerCase().includes(kw) ||
          (r.commitMessage || '').toLowerCase().includes(kw)
        );
      }

      filtered.sort((a: any, b: any) => b.createdAt - a.createdAt);

      // 如果请求 flat 模式，返回扁平列表（兼容旧逻辑）
      if (flat === 'true') {
        const p = Math.max(1, Number(page));
        const ps = Math.max(1, Number(pageSize));
        const total = filtered.length;
        const totalPages = Math.ceil(total / ps);
        const offset = (p - 1) * ps;
        const data = filtered.slice(offset, offset + ps);
        return res.json({ success: true, data: { data, total, page: p, pageSize: ps, totalPages } });
      }

      // 树形模式：大版本在前，子版本挂在大版本下
      // 大版本 = parentVersion 为空或不存在的记录
      const parentRecords = filtered.filter((r: any) => !r.parentVersion);
      const childRecords = filtered.filter((r: any) => !!r.parentVersion);

      // 按大版本号分组子版本
      const childMap = new Map<string, any[]>();
      for (const c of childRecords) {
        const pv = String(c.parentVersion);
        if (!childMap.has(pv)) childMap.set(pv, []);
        childMap.get(pv)!.push(c);
      }

      // 构建树形数据：大版本 + children
      const treeData = parentRecords.map((p: any) => ({
        ...p,
        children: (childMap.get(p.version) || []).sort((a: any, b: any) => b.createdAt - a.createdAt),
      }));

      // 处理孤儿子版本（parentVersion 指向的大版本不存在）
      const parentVersionSet = new Set(parentRecords.map((p: any) => p.version));
      for (const [pv, children] of childMap.entries()) {
        if (!parentVersionSet.has(pv)) {
          // 把孤儿子版本当作独立记录
          for (const c of children) treeData.push({ ...c, children: [] });
        }
      }

      treeData.sort((a: any, b: any) => b.createdAt - a.createdAt);

      const p = Math.max(1, Number(page));
      const ps = Math.max(1, Number(pageSize));
      const total = treeData.length;
      const totalPages = Math.ceil(total / ps);
      const offset = (p - 1) * ps;
      const data = treeData.slice(offset, offset + ps);

      res.json({ success: true, data: { data, total, page: p, pageSize: ps, totalPages } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * GET /api/release-notes/parent-versions
   * 获取所有大版本号列表（供子版本选择父版本用）
   */
  app.get('/api/release-notes/parent-versions', (req: any, res: any) => {
    try {
      const { projectType } = req.query;
      const workspaceId = getWorkspaceId(req);
      let all = getAllRecords().filter((r: any) => !r.parentVersion && recordInWorkspace(r, workspaceId));
      if (projectType) all = all.filter((r: any) => r.projectType === projectType);
      const versions = all
        .sort((a: any, b: any) => b.createdAt - a.createdAt)
        .map((r: any) => ({ version: r.version, projectType: r.projectType, id: r.id }));
      res.json({ success: true, data: versions });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * GET /api/release-notes/eligible-for-qa
   * 获取允许创建 QA 版本记录的 RD 版本（仅 RD 冒烟通过）
   */
  app.get('/api/release-notes/eligible-for-qa', (req: any, res: any) => {
    try {
      const { projectType } = req.query;
      const workspaceId = getWorkspaceId(req);
      const data = getEligibleQaReleaseNotes(projectType)
        .filter((record: any) => recordInWorkspace(record, workspaceId))
        .map((record: any) => ({
        id: record.id,
        version: record.version,
        parentVersion: record.parentVersion,
        projectType: record.projectType,
        changeDescription: record.changeDescription,
        affectedModules: record.affectedModules || [],
        regressionRisk: record.regressionRisk,
        rdSmokeStatus: record.rdSmokeStatus || '未测试',
        severity: record.severity,
        qaEntryMode: record.rdSmokeStatus === '通过' ? 'rd_smoke_passed' : 'urgent_override',
        author: record.author,
        branch: record.branch,
      }));
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * GET /api/release-notes/search
   */
  app.get('/api/release-notes/search', (req: any, res: any) => {
    try {
      const { keyword = '', page = '1', pageSize = '20' } = req.query;
      const workspaceId = getWorkspaceId(req);
      const kw = keyword.toLowerCase();

      let filtered = getAllRecords().filter((record: any) => recordInWorkspace(record, workspaceId));
      if (kw) {
        filtered = filtered.filter(
          (r: any) =>
            (r.version || '').toLowerCase().includes(kw) ||
            (r.branch || '').toLowerCase().includes(kw) ||
            (r.commitMessage || '').toLowerCase().includes(kw) ||
            (r.author || '').toLowerCase().includes(kw) ||
            (r.changeDescription || '').toLowerCase().includes(kw)
        );
      }
      filtered = [...filtered].sort((a: any, b: any) => b.createdAt - a.createdAt);

      const p = Math.max(1, Number(page));
      const ps = Math.max(1, Number(pageSize));
      const total = filtered.length;
      const totalPages = Math.ceil(total / ps);
      const offset = (p - 1) * ps;
      const data = filtered.slice(offset, offset + ps);

      res.json({ success: true, data: { data, total, page: p, pageSize: ps, totalPages } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  app.get('/api/release-notes/impact-tags', (req: any, res: any) => {
    res.json({ success: true, data: getProjectImpactTags(getWorkspaceId(req)) });
  });

  app.put('/api/release-notes/impact-tags', (req: any, res: any) => {
    const workspaceId = getWorkspaceId(req);
    const rdAllowed = assertCurrentUserIsReleaseNoteRd(req, workspaceId);
    if (rdAllowed !== true) return res.status(rdAllowed.status).json({ success: false, message: rdAllowed.message });
    res.json({ success: true, data: saveProjectImpactTags(workspaceId, Array.isArray(req.body.tags) ? req.body.tags : []) });
  });

  /** GET /api/release-notes/stats/summary */
  app.get('/api/release-notes/stats/summary', (req: any, res: any) => {
    const workspaceId = getWorkspaceId(req);
    const all = getAllRecords().filter((record: any) => recordInWorkspace(record, workspaceId));
    const byProject: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const r of all) {
      byProject[r.projectType || 'unknown'] = (byProject[r.projectType || 'unknown'] || 0) + 1;
      byType[r.changeType || 'unknown'] = (byType[r.changeType || 'unknown'] || 0) + 1;
    }
    res.json({ success: true, data: { total: all.length, byProject, byType } });
  });

  /** GET /api/release-notes/:id */
  app.get('/api/release-notes/:id', (req: any, res: any) => {
    const record = findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    if (!recordInWorkspace(record, getWorkspaceId(req))) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, data: record });
  });

  /** POST /api/release-notes */
  app.post('/api/release-notes', (req: any, res: any) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const rdAllowed = assertCurrentUserIsReleaseNoteRd(req, workspaceId);
      if (rdAllowed !== true) return res.status(rdAllowed.status).json({ success: false, message: rdAllowed.message });
      const author = String(req.body.author || '').trim();
      if (!author) {
        return res.status(400).json({ success: false, message: '提交人不能为空' });
      }
      const authorAllowed = assertAuthorMatchesCurrentUser(req, author);
      if (authorAllowed !== true) return res.status(authorAllowed.status).json({ success: false, message: authorAllowed.message });
      const id = create({ ...req.body, author, workspaceId });
      res.json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/release-notes/:id */
  app.put('/api/release-notes/:id', (req: any, res: any) => {
    const workspaceId = getWorkspaceId(req);
    const rdAllowed = assertCurrentUserIsReleaseNoteRd(req, workspaceId);
    if (rdAllowed !== true) return res.status(rdAllowed.status).json({ success: false, message: rdAllowed.message });
    const record = findById(req.params.id);
    if (!record || !recordInWorkspace(record, workspaceId)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const data = { ...req.body };
    delete data.workspaceId;
    delete data.author;
    if (!update(req.params.id, data)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '更新成功' });
  });

  /** DELETE /api/release-notes/:id */
  app.delete('/api/release-notes/:id', (req: any, res: any) => {
    const workspaceId = getWorkspaceId(req);
    const rdAllowed = assertCurrentUserIsReleaseNoteRd(req, workspaceId);
    if (rdAllowed !== true) return res.status(rdAllowed.status).json({ success: false, message: rdAllowed.message });
    const record = findById(req.params.id);
    if (!record || !recordInWorkspace(record, workspaceId)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    if (!remove(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  });

}
