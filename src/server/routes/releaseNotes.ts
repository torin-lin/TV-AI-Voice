/**
 * Release Note REST API 路由
 * 服务端数据存储，支持局域网多人共享
 */

import {
  initReleaseNoteStorage,
  getAllRecords,
  findById,
  create,
  update,
  remove,
} from '../storage/releaseNoteStorage';

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
      } = req.query;

      let filtered = [...getAllRecords()];

      if (changeType) filtered = filtered.filter((r: any) => r.changeType === changeType);
      if (severity) filtered = filtered.filter((r: any) => r.severity === severity);
      if (branch) filtered = filtered.filter((r: any) => r.branch === branch);
      if (projectGroup && projectGroup !== '全部') {
        const map: Record<string, string> = {
          'TV AI Voice': 'TV', 'Projector AI Voice': 'Projector', 'STB AI Voice': 'STB',
        };
        const pt = map[projectGroup];
        if (pt) filtered = filtered.filter((r: any) => r.projectType === pt);
      }
      if (startDate && endDate) {
        const s = Number(startDate), e = Number(endDate);
        filtered = filtered.filter((r: any) => r.createdAt >= s && r.createdAt <= e);
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
      let all = getAllRecords().filter((r: any) => !r.parentVersion);
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
   * GET /api/release-notes/search
   */
  app.get('/api/release-notes/search', (req: any, res: any) => {
    try {
      const { keyword = '', page = '1', pageSize = '20' } = req.query;
      const kw = keyword.toLowerCase();

      let filtered = getAllRecords();
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

  /** GET /api/release-notes/:id */
  app.get('/api/release-notes/:id', (req: any, res: any) => {
    const record = findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    res.json({ success: true, data: record });
  });

  /** POST /api/release-notes */
  app.post('/api/release-notes', (req: any, res: any) => {
    try {
      const id = create(req.body);
      res.json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/release-notes/:id */
  app.put('/api/release-notes/:id', (req: any, res: any) => {
    if (!update(req.params.id, req.body)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '更新成功' });
  });

  /** DELETE /api/release-notes/:id */
  app.delete('/api/release-notes/:id', (req: any, res: any) => {
    if (!remove(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  });

  /** GET /api/release-notes/stats/summary */
  app.get('/api/release-notes/stats/summary', (_req: any, res: any) => {
    const all = getAllRecords();
    const byProject: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const r of all) {
      byProject[r.projectType || 'unknown'] = (byProject[r.projectType || 'unknown'] || 0) + 1;
      byType[r.changeType || 'unknown'] = (byType[r.changeType || 'unknown'] || 0) + 1;
    }
    res.json({ success: true, data: { total: all.length, byProject, byType } });
  });
}
