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
import { VersionIssue, VersionRecord } from '../../types/database';
import { getZmindApiKey, getZmindCurrentUserName, ZMIND_BASE_URL } from '../utils/zmind';
import { getWorkspaceId, recordInWorkspace } from '../workspace';

async function createZmindIssueFromVersionIssue(apiKey: string, data: {
  projectId: number;
  trackerId?: number;
  statusId?: number;
  priorityId?: number;
  assignedToId?: number;
  categoryId?: number;
  fixedVersionId?: number;
  fixedVersionName?: string;
  customFields?: Record<string, string>;
  uploads?: Array<{ token: string; filename: string; content_type?: string }>;
  title: string;
  description?: string;
  precondition?: string;
  testEnvironment?: string;
  severity?: string;
  versionNumber?: string;
  firmwareVersion?: string;
}): Promise<{ id: number; createdOn: string }> {
  const description = [
    data.description || '',
    data.precondition ? `\n\n【前提条件】\n${data.precondition}` : '',
    data.testEnvironment ? `\n\n【测试环境】\n${data.testEnvironment}` : '',
    data.versionNumber ? `\n\nQA Version:\n${data.versionNumber}` : '',
    data.fixedVersionName ? `\nTarget Version:\n${data.fixedVersionName}` : '',
    data.firmwareVersion ? `\nFirmware Version:\n${data.firmwareVersion}` : '',
    data.severity ? `\nSeverity:\n${data.severity}` : '',
  ].join('');

  const issue: Record<string, any> = {
    project_id: Number(data.projectId),
    subject: data.title,
    description,
  };
  if (data.trackerId) issue.tracker_id = Number(data.trackerId);
  if (data.statusId) issue.status_id = Number(data.statusId);
  if (data.priorityId) issue.priority_id = Number(data.priorityId);
  if (data.assignedToId) issue.assigned_to_id = Number(data.assignedToId);
  if (data.categoryId) issue.category_id = Number(data.categoryId);
  if (data.fixedVersionId) issue.fixed_version_id = Number(data.fixedVersionId);
  if (data.customFields) {
    issue.custom_fields = Object.entries(data.customFields)
      .filter(([, value]) => String(value || '').trim())
      .map(([id, value]) => ({ id: Number(id), value }));
  }
  if (data.uploads && data.uploads.length > 0) {
    issue.uploads = data.uploads.map(u => ({
      token: u.token,
      filename: u.filename,
      content_type: u.content_type || 'application/octet-stream',
    }));
  }

  const response = await fetch(`${ZMIND_BASE_URL}/issues.json`, {
    method: 'POST',
    headers: {
      'X-Redmine-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ issue }),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(json?.errors?.join('；') || `zmind API 返回错误: ${response.status}`);
  }
  return {
    id: Number(json.issue?.id),
    createdOn: json.issue?.created_on || new Date().toISOString(),
  };
}

function mapVersionIssueStatus(status: VersionIssue['status']): '开放' | '进行中' | '已解决' {
  const statusMap: Record<VersionIssue['status'], '开放' | '进行中' | '已解决'> = {
    '待处理': '开放',
    '处理中': '进行中',
    '已解决': '已解决',
    '已关闭': '已解决',
  };
  return statusMap[status] || '开放';
}

function buildSyncedProblemDescription(issue: Pick<VersionIssue, 'title' | 'description'>): string {
  return [issue.title, issue.description].filter(Boolean).join(' - ');
}

function buildSyncedProblemNotes(issue: VersionIssue, versionRecord?: VersionRecord): string {
  return [
    '来源: QA 版本问题',
    issue.reporter ? `提交人: ${issue.reporter}` : '',
    issue.assignee ? `处理人: ${issue.assignee}` : '',
    versionRecord?.versionNumber ? `QA版本: ${versionRecord.versionNumber}` : '',
    versionRecord?.firmwareVersion ? `固件版本: ${versionRecord.firmwareVersion}` : '',
    issue.precondition ? `前提条件: ${issue.precondition}` : '',
    issue.testEnvironment ? `测试环境: ${issue.testEnvironment}` : '',
    issue.resolution ? `解决备注: ${issue.resolution}` : '',
    issue.linkedPR ? `zmind: ${ZMIND_BASE_URL}/issues/${issue.linkedPR}` : '',
  ].filter(Boolean).join('\n');
}

function buildCustomerProblemSyncPayload(issue: VersionIssue, versionRecord?: VersionRecord, issueCreatedAt?: string): Record<string, any> {
  return {
    problemType: 'qa',
    description: buildSyncedProblemDescription(issue),
    status: mapVersionIssueStatus(issue.status),
    issueId: issue.linkedPR || '',
    firmwareVersion: versionRecord?.firmwareVersion || versionRecord?.versionNumber || '',
    classification: issue.severity || '中',
    workspaceId: (versionRecord as any)?.workspaceId || 'AI Voice',
    projectType: versionRecord?.projectType as any,
    issueCreatedAt: issueCreatedAt || new Date(issue.createdAt || Date.now()).toISOString(),
    notes: buildSyncedProblemNotes(issue, versionRecord),
  };
}

function issueInRequestWorkspace(issue: VersionIssue, req: any): boolean {
  const versionRecord = findVersionRecord(issue.versionRecordId);
  return !!versionRecord && recordInWorkspace(versionRecord, getWorkspaceId(req));
}

export function setupVersionIssueRoutes(app: any): void {
  initVersionIssueStorage();

  /** GET /api/version-issues?versionRecordId=xxx - 查询某版本的问题列表 */
  app.get('/api/version-issues', (req: any, res: any) => {
    try {
      const { versionRecordId } = req.query;
      if (!versionRecordId) {
        return res.status(400).json({ success: false, message: '缺少 versionRecordId' });
      }
      const versionRecord = findVersionRecord(String(versionRecordId));
      if (!versionRecord || !recordInWorkspace(versionRecord, getWorkspaceId(req))) {
        return res.status(404).json({ success: false, message: '版本记录不存在' });
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
      if (!issueInRequestWorkspace(record, req)) {
        return res.status(404).json({ success: false, message: '未找到' });
      }
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/version-issues - 创建问题，同时同步到问题追踪 QA 处 */
  app.post('/api/version-issues', async (req: any, res: any) => {
    try {
      const { versionRecordId, title, description, precondition, testEnvironment, severity, linkedPR, reporter, zmindSync } = req.body;
      if (!versionRecordId || !title) {
        return res.status(400).json({ success: false, message: '缺少必填字段' });
      }
      const vr = findVersionRecord(versionRecordId);
      if (!vr || !recordInWorkspace(vr, getWorkspaceId(req))) {
        return res.status(404).json({ success: false, message: '版本记录不存在' });
      }
      let finalLinkedPR = linkedPR || '';
      let finalReporter = reporter || 'zmind API 用户';
      let finalIssueCreatedAt = new Date().toISOString();

      if (zmindSync?.enabled) {
        if (!zmindSync.projectId) {
          return res.status(400).json({ success: false, message: '请选择要同步的 zmind 项目' });
        }
        const zmindApiKey = getZmindApiKey(req);
        if (!zmindApiKey) {
          return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置后再同步' });
        }
        if (!reporter) finalReporter = await getZmindCurrentUserName(zmindApiKey);
        const zmindIssue = await createZmindIssueFromVersionIssue(zmindApiKey, {
          projectId: zmindSync.projectId,
          trackerId: zmindSync.trackerId,
          statusId: zmindSync.statusId,
          priorityId: zmindSync.priorityId,
          assignedToId: zmindSync.assignedToId,
          categoryId: zmindSync.categoryId,
          fixedVersionId: zmindSync.fixedVersionId,
          fixedVersionName: zmindSync.fixedVersionName,
          customFields: zmindSync.customFields,
          uploads: zmindSync.uploads,
          title,
          description,
          precondition,
          testEnvironment,
          severity,
          versionNumber: vr?.versionNumber,
          firmwareVersion: vr?.firmwareVersion,
        });
        finalLinkedPR = String(zmindIssue.id);
        finalIssueCreatedAt = zmindIssue.createdOn || finalIssueCreatedAt;
      }

      const id = create({
        versionRecordId,
        title,
        description: description || '',
        precondition: precondition || '',
        testEnvironment: testEnvironment || '',
        status: '待处理',
        severity: severity || '中',
        linkedPR: finalLinkedPR,
        reporter: finalReporter,
        assignee: '',
        resolution: '',
      });
      // 同步到问题追踪 QA 处
      try {
        const createdIssue = findById(id);
        if (!createdIssue) throw new Error('创建后未找到版本问题');
        const cpId = createCustomerProblem(buildCustomerProblemSyncPayload(createdIssue, vr, finalIssueCreatedAt) as any);
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
      const existing = findById(req.params.id);
      if (!existing || !issueInRequestWorkspace(existing, req)) {
        return res.status(404).json({ success: false, message: '未找到' });
      }
      const data = { ...req.body };
      delete data.versionRecordId;
      const ok = update(req.params.id, data);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      // 同步变更到关联的问题追踪
      try {
        const issue = findById(req.params.id);
        if (issue?.syncedProblemId) {
          const vr = findVersionRecord(issue.versionRecordId);
          const cpUpdate = buildCustomerProblemSyncPayload(issue, vr);
          delete cpUpdate.problemType;
          delete cpUpdate.issueCreatedAt;
          updateCustomerProblem(issue.syncedProblemId, cpUpdate as any);
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
      if (!issue || !issueInRequestWorkspace(issue, req)) {
        return res.status(404).json({ success: false, message: '未找到' });
      }
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
