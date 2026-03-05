/**
 * 版本问题附件上传/下载/删除路由
 * 支持日志、视频、图片等文件
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { findById, update } from '../storage/versionIssueStorage';
import { IssueAttachment } from '../../types/database';

const ATTACHMENT_DIR = process.env.ATTACHMENT_DIR || path.join(process.cwd(), 'uploads', 'issue-attachments');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB（视频可能较大）

function ensureDir(): void {
  if (!fs.existsSync(ATTACHMENT_DIR)) fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
}

function uniqueName(original: string): string {
  const ext = path.extname(original);
  const base = path.basename(original, ext).substring(0, 50);
  return `${base}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** 根据文件扩展名判断文件类型 */
function detectFileType(fileName: string): IssueAttachment['fileType'] {
  const ext = path.extname(fileName).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];
  const logExts = ['.log', '.txt', '.csv', '.json', '.xml'];
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (logExts.includes(ext)) return 'log';
  return 'other';
}

export function setupIssueAttachmentRoutes(app: any): void {
  ensureDir();

  /** POST /api/version-issues/:id/attachments - 上传附件 */
  app.post('/api/version-issues/:id/attachments', async (req: any, res: any) => {
    try {
      const issue = findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false, message: '问题不存在' });

      const originalName = decodeURIComponent(req.headers['x-file-name'] || 'unknown');
      const chunks: Buffer[] = [];
      let total = 0;

      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_FILE_SIZE) { reject(new Error(`文件大小超过限制 (最大 ${fmtSize(MAX_FILE_SIZE)})`)); return; }
          chunks.push(chunk);
        });
        req.on('end', resolve);
        req.on('error', reject);
      });

      const buf = Buffer.concat(chunks);
      if (buf.length === 0) return res.status(400).json({ success: false, message: '上传文件为空' });

      const saved = uniqueName(originalName);
      fs.writeFileSync(path.join(ATTACHMENT_DIR, saved), buf);

      const attachment: IssueAttachment = {
        fileName: originalName,
        savedFileName: saved,
        filePath: `/api/version-issues/attachments/download/${saved}`,
        fileSize: buf.length,
        fileType: detectFileType(originalName),
        uploadedAt: Date.now(),
      };

      const attachments = [...(issue.attachments || []), attachment];
      update(issue.id!, { attachments });

      res.json({ success: true, data: attachment });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/version-issues/attachments/download/:fileName - 下载附件 */
  app.get('/api/version-issues/attachments/download/:fileName', (req: any, res: any) => {
    const safe = path.basename(req.params.fileName);
    const fp = path.join(ATTACHMENT_DIR, safe);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, message: '文件不存在' });

    const stat = fs.statSync(fp);
    const ext = path.extname(safe).toLowerCase();

    // 图片和视频直接在浏览器中预览
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
      '.log': 'text/plain', '.txt': 'text/plain', '.csv': 'text/csv',
      '.json': 'application/json', '.xml': 'application/xml',
    };
    const mime = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size);
    // 图片/视频 inline 预览，其他 attachment 下载
    if (ext.match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm)$/)) {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safe)}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safe)}"`);
    }
    fs.createReadStream(fp).pipe(res);
  });

  /** DELETE /api/version-issues/:id/attachments/:savedFileName - 删除附件 */
  app.delete('/api/version-issues/:id/attachments/:savedFileName', (req: any, res: any) => {
    try {
      const issue = findById(req.params.id);
      if (!issue) return res.status(404).json({ success: false, message: '问题不存在' });

      const { savedFileName } = req.params;
      const attachments = (issue.attachments || []).filter((a) => a.savedFileName !== savedFileName);

      // 删除物理文件
      const fp = path.join(ATTACHMENT_DIR, path.basename(savedFileName));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);

      update(issue.id!, { attachments });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
