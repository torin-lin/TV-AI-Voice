/**
 * 客户问题/QA问题 REST API 路由
 * 服务端数据存储，支持局域网多人共享
 */

import {
  initCustomerProblemStorage,
  getAllRecords,
  findById,
  create,
  update,
  remove,
} from '../storage/customerProblemStorage';

export function setupCustomerProblemRoutes(app: any): void {
  initCustomerProblemStorage();

  /** GET /api/customer-problems - 查询列表 */
  app.get('/api/customer-problems', (req: any, res: any) => {
    try {
      const {
        page = '1',
        pageSize = '20',
        problemType,
        classification,
        status,
        projectGroup,
        keyword,
        startDate,
        endDate,
      } = req.query;

      let filtered = [...getAllRecords()];

      if (problemType) filtered = filtered.filter((r) => r.problemType === problemType);
      if (classification) filtered = filtered.filter((r) => r.classification === classification);
      if (status) filtered = filtered.filter((r) => r.status === status);
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
          (r.description || '').toLowerCase().includes(kw) ||
          (r.classification || '').toLowerCase().includes(kw) ||
          (r.issueId || '').toLowerCase().includes(kw) ||
          (r.firmwareVersion || '').toLowerCase().includes(kw) ||
          (r.notes || '').toLowerCase().includes(kw)
        );
      }
      if (startDate && endDate) {
        const s = Number(startDate), e = Number(endDate);
        filtered = filtered.filter((r) => r.createdAt >= s && r.createdAt <= e);
      }

      filtered.sort((a, b) => b.createdAt - a.createdAt);

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

  /** GET /api/customer-problems/:id */
  app.get('/api/customer-problems/:id', (req: any, res: any) => {
    const record = findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    res.json({ success: true, data: record });
  });

  /** POST /api/customer-problems */
  app.post('/api/customer-problems', (req: any, res: any) => {
    try {
      const data = { ...req.body };
      // 如果没有 issueCreatedAt（没同步 PR），以当前时间为准
      if (!data.issueCreatedAt) {
        data.issueCreatedAt = new Date().toISOString();
      }
      const id = create(data);
      res.json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/customer-problems/:id */
  app.put('/api/customer-problems/:id', (req: any, res: any) => {
    if (!update(req.params.id, req.body)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '更新成功' });
  });

  /** DELETE /api/customer-problems/:id */
  app.delete('/api/customer-problems/:id', (req: any, res: any) => {
    if (!remove(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  });
}
