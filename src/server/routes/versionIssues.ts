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
import { create as createCustomerProblem, update as updateCustomerProblem, remove as removeCustomerProblem } from '../storage/customerProblemStorage';
import { findById as findVersionRecord } from '../storage/versionRecordStorage';

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

  /** POST /api/version-issues - 创建问题，同时同步到问题追踪 QA 处 */
  app.post('/api/version-issues', (req: any, res: any) => {
    try {
      const { versionRecordId, title, description, precondition, testEnvironment, severity, linkedPR, reporter } = req.body;
      if (!versionRecordId || !title || !reporter) {
        return res.status(400).json({ success: false, message: '缺少必填字段' });
      }
      const id = create({
        versionRecordId,
        title,
        description: description || '',
        precondition: precondition || '',
        testEnvironment: testEnvironment || '',
        status: '待处理',
        severity: severity || '中',
        linkedPR: linkedPR || '',
        reporter,
        assignee: '',
        resolution: '',
      });
      // 同步到问题追踪 QA 处
      try {
        const syncDesc = [title, description].filter(Boolean).join(' - ');
        const vr = findVersionRecord(versionRecordId);
        const cpId = createCustomerProblem({
          problemType: 'qa',
          description: syncDesc,
          status: '开放',
          issueId: linkedPR || '',
          firmwareVersion: vr?.firmwareVersion || vr?.versionNumber || '',
          classification: severity || '中',
          projectType: vr?.projectType as any,
          notes: [
            reporter ? `提交人: ${reporter}` : '',
            precondition ? `前提条件: ${precondition}` : '',
            testEnvironment ? `测试环境: ${testEnvironment}` : '',
          ].filter(Boolean).join('\n') || '',
        });
        update(id, { syncedProblemId: cpId });
      } catch (syncErr) {
        console.error('同步到问题追踪失败:', syncErr);
      }
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/version-issues/:id - 更新问题（改状态、指派、解决备注等），同步到问题追踪 */
  app.put('/api/version-issues/:id', (req: any, res: any) => {
    try {
      const ok = update(req.params.id, req.body);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      // 同步变更到关联的问题追踪
      try {
        const issue = findById(req.params.id);
        if (issue?.syncedProblemId) {
          const cpUpdate: Record<string, any> = {};
          // 同步状态
          if (req.body.status) {
            const statusMap: Record<string, string> = { '待处理': '开放', '处理中': '进行中', '已解决': '已解决', '已关闭': '已解决' };
            const cpStatus = statusMap[req.body.status];
            if (cpStatus) cpUpdate.status = cpStatus;
          }
          // 同步描述（title + description）
          if (req.body.title !== undefined || req.body.description !== undefined) {
            const syncDesc = [issue.title, issue.description].filter(Boolean).join(' - ');
            cpUpdate.description = syncDesc;
          }
          // 同步关联 PR
          if (req.body.linkedPR !== undefined) {
            cpUpdate.issueId = req.body.linkedPR || '';
          }
          // 同步严重程度
          if (req.body.severity !== undefined) {
            cpUpdate.classification = req.body.severity;
          }
          // 同步解决备注 → notes
          if (req.body.resolution !== undefined || req.body.assignee !== undefined || req.body.reporter !== undefined) {
            const parts: string[] = [];
            if (issue.reporter) parts.push(`提交人: ${issue.reporter}`);
            if (issue.assignee) parts.push(`处理人: ${issue.assignee}`);
            if (issue.precondition) parts.push(`前提条件: ${issue.precondition}`);
            if (issue.testEnvironment) parts.push(`测试环境: ${issue.testEnvironment}`);
            if (issue.resolution) parts.push(`解决备注: ${issue.resolution}`);
            cpUpdate.notes = parts.join('\n');
          }
          if (Object.keys(cpUpdate).length > 0) {
            updateCustomerProblem(issue.syncedProblemId, cpUpdate as any);
          }
        }
      } catch (syncErr) {
        console.error('同步到问题追踪失败:', syncErr);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/version-issues/:id - 删除问题，同步删除问题追踪记录 */
  app.delete('/api/version-issues/:id', (req: any, res: any) => {
    try {
      // 先查出关联的 QA 问题 ID，再删除
      const issue = findById(req.params.id);
      const ok = remove(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      if (issue?.syncedProblemId) {
        try { removeCustomerProblem(issue.syncedProblemId); } catch (e) { console.error('同步删除问题追踪失败:', e); }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
