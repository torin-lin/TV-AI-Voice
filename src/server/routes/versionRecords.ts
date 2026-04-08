/**
 * 版本记录 REST API 路由
 */

import {
  getAllRecords,
  findById,
  create,
  update,
  remove,
  getParentVersions,
} from '../storage/versionRecordStorage';

export function setupVersionRecordRoutes(app: any): void {

  /** GET /api/version-records/parent-versions */
  app.get('/api/version-records/parent-versions', (_req: any, res: any) => {
    try {
      res.json({ success: true, data: getParentVersions() });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/version-records - 查询列表 */
  app.get('/api/version-records', (req: any, res: any) => {
    try {
      const { page = '1', pageSize = '20', riskLevel, projectGroup, keyword } = req.query;
      let filtered = [...getAllRecords()];

      if (riskLevel) filtered = filtered.filter((r) => r.riskLevel === riskLevel);
      if (projectGroup && projectGroup !== '全部') {
        const map: Record<string, string> = {
          'TV AI Voice': 'TV', 'Projector AI Voice': 'Projector', 'STB AI Voice': 'STB',
        };
        const pt = map[projectGroup];
        if (pt) filtered = filtered.filter((r) => r.projectType === pt);
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.versionNumber || '').toLowerCase().includes(kw) ||
          (r.changeDescription || '').toLowerCase().includes(kw) ||
          (r.firmwareVersion || '').toLowerCase().includes(kw) ||
          (r.notes || '').toLowerCase().includes(kw)
        );
      }

      filtered.sort((a, b) => b.createdAt - a.createdAt);
      const p = Math.max(1, Number(page));
      const ps = Math.max(1, Number(pageSize));
      const total = filtered.length;
      const totalPages = Math.ceil(total / ps);
      const data = filtered.slice((p - 1) * ps, p * ps);

      res.json({ success: true, data: { data, total, page: p, pageSize: ps, totalPages } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/version-records/search */
  app.get('/api/version-records/search', (req: any, res: any) => {
    try {
      const { keyword = '', page = '1', pageSize = '20' } = req.query;
      const kw = keyword.toLowerCase();
      let filtered = getAllRecords().filter((r) =>
        (r.versionNumber || '').toLowerCase().includes(kw) ||
        (r.changeDescription || '').toLowerCase().includes(kw) ||
        (r.firmwareVersion || '').toLowerCase().includes(kw)
      );
      const p = Math.max(1, Number(page));
      const ps = Math.max(1, Number(pageSize));
      const total = filtered.length;
      const data = filtered.slice((p - 1) * ps, p * ps);
      res.json({ success: true, data: { data, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/version-records/:id */
  app.get('/api/version-records/:id', (req: any, res: any) => {
    try {
      const record = findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/version-records */
  app.post('/api/version-records', (req: any, res: any) => {
    try {
      const id = create(req.body);
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/version-records/:id */
  app.put('/api/version-records/:id', (req: any, res: any) => {
    try {
      const ok = update(req.params.id, req.body);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/version-records/:id */
  app.delete('/api/version-records/:id', (req: any, res: any) => {
    try {
      const ok = remove(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
