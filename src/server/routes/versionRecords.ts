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
import { VersionStatus } from '../../types/database';
import { findById as findReleaseNoteById } from '../storage/releaseNoteStorage';

const VERSION_STATUS_FLOW: Record<VersionStatus, VersionStatus[]> = {
  '待测试': ['待测试', '测试中', '阻塞'],
  '测试中': ['测试中', '阻塞', '待结论'],
  '阻塞': ['阻塞', '测试中', '待结论'],
  '待结论': ['待结论', '阻塞', '可发布'],
  '可发布': ['可发布', '已发布', '阻塞'],
  '已发布': ['已发布'],
};

const isValidVersionStatus = (value: unknown): value is VersionStatus => {
  return typeof value === 'string' && value in VERSION_STATUS_FLOW;
};

const canCreateQaRecordFromReleaseNote = (releaseNote: any) => {
  return releaseNote?.rdSmokeStatus === '通过' || releaseNote?.severity === '紧急';
};

const requiresEarlyInterventionReason = (releaseNote: any) => {
  return releaseNote?.severity === '紧急' && releaseNote?.rdSmokeStatus !== '通过';
};

const getWorkspaceId = (req: any) => String(req.query?.workspaceId || req.body?.workspaceId || 'AI Voice').trim() || 'AI Voice';

export function setupVersionRecordRoutes(app: any): void {

  /** GET /api/version-records/parent-versions */
  app.get('/api/version-records/parent-versions', (req: any, res: any) => {
    try {
      const workspaceId = getWorkspaceId(req);
      res.json({ success: true, data: getParentVersions().filter((record: any) => (record.workspaceId || 'AI Voice') === workspaceId) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/version-records - 查询列表 */
  app.get('/api/version-records', (req: any, res: any) => {
    try {
      const { page = '1', pageSize = '20', riskLevel, projectGroup, keyword, versionStatus } = req.query;
      const workspaceId = getWorkspaceId(req);
      let filtered = [...getAllRecords()];
      filtered = filtered.filter((r: any) => (r.workspaceId || 'AI Voice') === workspaceId);

      if (riskLevel) filtered = filtered.filter((r) => r.riskLevel === riskLevel);
      if (versionStatus) filtered = filtered.filter((r) => (r.versionStatus || '待测试') === versionStatus);
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
      const workspaceId = getWorkspaceId(req);
      const kw = keyword.toLowerCase();
      let filtered = getAllRecords().filter((r) => (
        ((r as any).workspaceId || 'AI Voice') === workspaceId &&
        (
          (r.versionNumber || '').toLowerCase().includes(kw) ||
          (r.changeDescription || '').toLowerCase().includes(kw) ||
          (r.firmwareVersion || '').toLowerCase().includes(kw)
        )
      ));
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
      if (req.body.versionStatus && !isValidVersionStatus(req.body.versionStatus)) {
        return res.status(400).json({ success: false, message: '无效的版本状态' });
      }
      if (!req.body.releaseNoteId) {
        return res.status(400).json({ success: false, message: '创建 QA 版本记录前必须先关联 RD 版本' });
      }

      const releaseNote = findReleaseNoteById(req.body.releaseNoteId);
      if (!releaseNote) {
        return res.status(400).json({ success: false, message: '关联的 RD 版本不存在' });
      }
      if (!canCreateQaRecordFromReleaseNote(releaseNote)) {
        return res.status(400).json({ success: false, message: '只有 RD 冒烟通过或紧急版本才能创建 QA 版本记录' });
      }
      if (requiresEarlyInterventionReason(releaseNote) && !String(req.body.qaEarlyInterventionReason || '').trim()) {
        return res.status(400).json({ success: false, message: '紧急版本提前介入时必须填写介入原因' });
      }
      if (requiresEarlyInterventionReason(releaseNote) && !String(req.body.qaEarlyInterventionOwner || '').trim()) {
        return res.status(400).json({ success: false, message: '紧急版本提前介入时必须填写介入责任人' });
      }
      const payload = {
        ...req.body,
        workspaceId: req.body.workspaceId || releaseNote.workspaceId || 'AI Voice',
        versionNumber: releaseNote.version,
        parentVersion: releaseNote.parentVersion || '',
        projectType: releaseNote.projectType || req.body.projectType,
      };
      const id = create(payload);
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/version-records/:id */
  app.put('/api/version-records/:id', (req: any, res: any) => {
    try {
      const current = findById(req.params.id);
      if (!current) return res.status(404).json({ success: false, message: '未找到' });

      if (req.body.releaseNoteId) {
        const releaseNote = findReleaseNoteById(req.body.releaseNoteId);
        if (!releaseNote) {
          return res.status(400).json({ success: false, message: '关联的 RD 版本不存在' });
        }
        if (!canCreateQaRecordFromReleaseNote(releaseNote)) {
          return res.status(400).json({ success: false, message: '只有 RD 冒烟通过或紧急版本才能关联到 QA 版本记录' });
        }
        if (requiresEarlyInterventionReason(releaseNote) && !String(req.body.qaEarlyInterventionReason || current.qaEarlyInterventionReason || '').trim()) {
          return res.status(400).json({ success: false, message: '紧急版本提前介入时必须填写介入原因' });
        }
        if (requiresEarlyInterventionReason(releaseNote) && !String(req.body.qaEarlyInterventionOwner || current.qaEarlyInterventionOwner || '').trim()) {
          return res.status(400).json({ success: false, message: '紧急版本提前介入时必须填写介入责任人' });
        }
        req.body.versionNumber = releaseNote.version;
        req.body.parentVersion = releaseNote.parentVersion || '';
        req.body.projectType = releaseNote.projectType || req.body.projectType;
      }

      if (req.body.versionStatus) {
        if (!isValidVersionStatus(req.body.versionStatus)) {
          return res.status(400).json({ success: false, message: '无效的版本状态' });
        }

        const currentStatus = current.versionStatus || '待测试';
        const allowedStatuses = VERSION_STATUS_FLOW[currentStatus];
        if (!allowedStatuses.includes(req.body.versionStatus)) {
          return res.status(400).json({
            success: false,
            message: `版本状态不允许从 ${currentStatus} 直接流转到 ${req.body.versionStatus}`,
          });
        }
      }

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
