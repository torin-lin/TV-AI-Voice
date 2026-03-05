/**
 * 文档上传路由
 * 处理原型文档等文件的上传、下载和管理
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DOC_STORAGE_DIR = process.env.DOC_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'docs');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function ensureDir(): void {
  if (!fs.existsSync(DOC_STORAGE_DIR)) {
    fs.mkdirSync(DOC_STORAGE_DIR, { recursive: true });
  }
}

function uniqueName(original: string): string {
  const ext = path.extname(original);
  const base = path.basename(original, ext);
  return `${base}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function setupDocUploadRoutes(app: any): void {
  ensureDir();

  /** POST /api/docs/upload */
  app.post('/api/docs/upload', async (req: any, res: any) => {
    try {
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
      fs.writeFileSync(path.join(DOC_STORAGE_DIR, saved), buf);

      res.json({
        success: true,
        message: '文档上传成功',
        data: {
          fileName: originalName,
          savedFileName: saved,
          filePath: `/api/docs/download/${saved}`,
          fileSize: buf.length,
          fileSizeFormatted: fmtSize(buf.length),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/docs/download/:fileName */
  app.get('/api/docs/download/:fileName', (req: any, res: any) => {
    const safe = path.basename(req.params.fileName);
    const fp = path.join(DOC_STORAGE_DIR, safe);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, message: '文件不存在' });

    const stat = fs.statSync(fp);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safe)}"`);
    fs.createReadStream(fp).pipe(res);
  });
}
