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
