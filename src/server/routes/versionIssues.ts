/**
 * 版本问题 REST API 路由
 * QA 提问题，RD 解决问题
 */

import {
  initVersionIssueStorage,
  findByVersionId,
  findById,
  create,
  update,
  remove,
} from '../storage/versionIssueStorage';

export function setupVersionIssueRoutes(app: any): void {
  initVersionIssueStorage();

  /** GET /api/version-issues?versionRecordId=xxx - 查询某版本的问题列表 */
  app.get('/api/version-issues', (req: any, res: any) => {
    try {
      const { versionRecordId } = req.query;
      if (!versionRecordId) {
        return res.status(400).json({ success: false, message: '缺少 versionRecordId' });
      }
      const issues = findByVersionId(versionRecordId);
      issues.sort((a: any, b: any) => b.createdAt - a.createdAt);
      res.json({ success: true, data: issues });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/version-issues/:id */
  app.get('/api/version-issues/:id', (req: any, res: any) => {
    try {
      const record = findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/version-issues - 创建问题 */
  app.post('/api/version-issues', (req: any, res: any) => {
    try {
      const { versionRecordId, title, description, severity, linkedPR, reporter } = req.body;
      if (!versionRecordId || !title || !reporter) {
        return res.status(400).json({ success: false, message: '缺少必填字段' });
      }
      const id = create({
        versionRecordId,
        title,
        description: description || '',
        status: '待处理',
        severity: severity || '中',
        linkedPR: linkedPR || '',
        reporter,
        assignee: '',
        resolution: '',
      });
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/version-issues/:id - 更新问题（改状态、指派、解决备注等） */
  app.put('/api/version-issues/:id', (req: any, res: any) => {
    try {
      const ok = update(req.params.id, req.body);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/version-issues/:id */
  app.delete('/api/version-issues/:id', (req: any, res: any) => {
    try {
      const ok = remove(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
