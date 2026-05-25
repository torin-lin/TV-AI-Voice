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
import { getWorkspaceId, recordInProjectGroup, recordInWorkspace } from '../workspace';
import { getZmindApiKey, createZmindIssue } from '../utils/zmind';

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
        firmwareVersion,
        startDate,
        endDate,
      } = req.query;

      const workspaceId = getWorkspaceId(req);
      let filtered = [...getAllRecords()].filter((record: any) => recordInWorkspace(record, workspaceId));

      if (problemType) filtered = filtered.filter((r) => r.problemType === problemType);
      if (classification) filtered = filtered.filter((r) => r.classification === classification);
      if (status) filtered = filtered.filter((r) => r.status === status);
      if (firmwareVersion) {
        const fv = firmwareVersion.toLowerCase();
        filtered = filtered.filter((r) => (r.firmwareVersion || '').toLowerCase().includes(fv));
      }
      filtered = filtered.filter((record) => recordInProjectGroup(record, projectGroup));
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

      // 排序
      const sortField = req.query.sortField || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      filtered.sort((a: any, b: any) => {
        const av = a[sortField] ?? '';
        const bv = b[sortField] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') return (bv - av) * sortOrder;
        return String(av).localeCompare(String(bv)) * -sortOrder;
      });

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
    if (!recordInWorkspace(record, getWorkspaceId(req))) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, data: record });
  });

  /** POST /api/customer-problems */
  app.post('/api/customer-problems', async (req: any, res: any) => {
    try {
      const data = { ...req.body };
      data.workspaceId = getWorkspaceId(req);
      const zmindSync = data.zmindSync;
      delete data.zmindSync;

      // zmind 同步：创建新 issue
      if (zmindSync?.enabled && zmindSync.projectId && !data.issueId) {
        const zmindApiKey = getZmindApiKey(req);
        if (!zmindApiKey) {
          return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
        }

        const subject = zmindSync.subject || (data.description || '').slice(0, 100) || '问题追踪同步';
        const description = [
          data.description || '',
          data.firmwareVersion ? `\n\nFirmware Version: ${data.firmwareVersion}` : '',
          data.classification ? `\nClassification: ${data.classification}` : '',
          data.notes ? `\n\nNotes: ${data.notes}` : '',
        ].join('');

        const issue: Record<string, any> = {
          project_id: Number(zmindSync.projectId),
          subject,
          description,
        };
        if (zmindSync.trackerId) issue.tracker_id = Number(zmindSync.trackerId);
        if (zmindSync.statusId) issue.status_id = Number(zmindSync.statusId);
        if (zmindSync.priorityId) issue.priority_id = Number(zmindSync.priorityId);
        if (zmindSync.assignedToId) issue.assigned_to_id = Number(zmindSync.assignedToId);
        if (zmindSync.categoryId) issue.category_id = Number(zmindSync.categoryId);
        if (zmindSync.fixedVersionId) issue.fixed_version_id = Number(zmindSync.fixedVersionId);
        if (zmindSync.customFields && Object.keys(zmindSync.customFields).length > 0) {
          issue.custom_fields = Object.entries(zmindSync.customFields)
            .filter(([, value]) => String(value || '').trim())
            .map(([id, value]) => ({ id: Number(id), value }));
        }
        if (zmindSync.uploads && zmindSync.uploads.length > 0) {
          issue.uploads = zmindSync.uploads.map((u: any) => ({
            token: u.token,
            filename: u.filename,
            content_type: u.content_type || 'application/octet-stream',
          }));
        }

        try {
          const result = await createZmindIssue(zmindApiKey, issue);
          data.issueId = String(result.id);
          data.issueCreatedAt = result.createdOn;
        } catch (e) {
          console.warn('[customer-problems] zmind 同步失败:', e);
        }
      }

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
    const record = findById(req.params.id);
    if (!record || !recordInWorkspace(record, getWorkspaceId(req))) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const data = { ...req.body };
    delete data.workspaceId;
    if (!update(req.params.id, data)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '更新成功' });
  });

  /** DELETE /api/customer-problems/:id */
  app.delete('/api/customer-problems/:id', (req: any, res: any) => {
    const record = findById(req.params.id);
    if (!record || !recordInWorkspace(record, getWorkspaceId(req))) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    if (!remove(req.params.id)) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  });
}
