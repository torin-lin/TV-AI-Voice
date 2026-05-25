/**
 * APK 文件上传路由
 * 处理 APK 文件的上传、下载和管理
 * 文件保存到服务端本地磁盘
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  APK_SIGNING_BRANDS,
  getApkSigningBrandConfig,
} from '../config/apkSigningBrands';
import { getDb } from '../storage/sqlite';
import { getWorkspaceId } from '../workspace';

/** APK 存储根目录 */
const APK_STORAGE_DIR = process.env.APK_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'apk');
const APK_SIGNED_STORAGE_DIR =
  process.env.APK_SIGNED_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'apk-signed');

/** 单文件最大大小: 500MB */
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const execFileAsync = promisify(execFile);

/**
 * 确保上传目录存在
 */
function ensureUploadDir(): void {
  if (!fs.existsSync(APK_STORAGE_DIR)) {
    fs.mkdirSync(APK_STORAGE_DIR, { recursive: true });
    console.log(`APK 存储目录已创建: ${APK_STORAGE_DIR}`);
  }

  if (!fs.existsSync(APK_SIGNED_STORAGE_DIR)) {
    fs.mkdirSync(APK_SIGNED_STORAGE_DIR, { recursive: true });
    console.log(`签名 APK 缓存目录已创建: ${APK_SIGNED_STORAGE_DIR}`);
  }
}

/**
 * 生成唯一文件名，避免冲突
 */
function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const timestamp = Date.now();
  const hash = crypto.randomBytes(4).toString('hex');
  return `${baseName}_${timestamp}_${hash}${ext}`;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assertFileExists(filePath: string, message: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(message);
  }
}

function getStoredApkPath(fileName: string): string {
  return path.join(APK_STORAGE_DIR, path.basename(fileName));
}

function buildSignedApkName(sourceFileName: string, brandKey: string): string {
  const ext = path.extname(sourceFileName) || '.apk';
  const baseName = path.basename(sourceFileName, ext);
  return `${baseName}_${brandKey}_signed${ext}`;
}

function cleanDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const entry of fs.readdirSync(dirPath)) {
    const entryPath = path.join(dirPath, entry);
    const stat = fs.statSync(entryPath);
    if (stat.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(entryPath);
    }
  }
}

async function ensureSignedApk(sourceFileName: string, brandKey: string): Promise<string> {
  const brandConfig = getApkSigningBrandConfig(brandKey);
  if (!brandConfig) {
    throw new Error(`不支持的品牌: ${brandKey}`);
  }

  const sourceFilePath = getStoredApkPath(sourceFileName);
  assertFileExists(sourceFilePath, '原始 APK 不存在');

  const signerJarPath = path.join(brandConfig.signerDir, brandConfig.signerJarFileName);
  const certPath = path.join(brandConfig.signerDir, brandConfig.certFileName);
  const keyPath = path.join(brandConfig.signerDir, brandConfig.keyFileName);

  assertFileExists(signerJarPath, `品牌 ${brandConfig.label} 的 apksigner.jar 不存在`);
  assertFileExists(certPath, `品牌 ${brandConfig.label} 的签名证书不存在`);
  assertFileExists(keyPath, `品牌 ${brandConfig.label} 的签名私钥不存在`);

  const brandCacheDir = path.join(APK_SIGNED_STORAGE_DIR, brandConfig.key);
  if (!fs.existsSync(brandCacheDir)) {
    fs.mkdirSync(brandCacheDir, { recursive: true });
  }

  const signedFileName = buildSignedApkName(sourceFileName, brandConfig.key);
  const signedFilePath = path.join(brandCacheDir, signedFileName);

  if (fs.existsSync(signedFilePath)) {
    const signedStat = fs.statSync(signedFilePath);
    const sourceStat = fs.statSync(sourceFilePath);
    if (signedStat.mtimeMs >= sourceStat.mtimeMs) {
      return signedFilePath;
    }
  }

  const signerTempDir = path.join(os.tmpdir(), 'tv-ai-voice-apk-sign', brandConfig.key);
  if (!fs.existsSync(signerTempDir)) {
    fs.mkdirSync(signerTempDir, { recursive: true });
  }
  cleanDirectory(signerTempDir);

  const stagedSourceFileName = `source${path.extname(sourceFileName) || '.apk'}`;
  const stagedOutputFileName = `signed${path.extname(sourceFileName) || '.apk'}`;
  const stagedSourcePath = path.join(signerTempDir, stagedSourceFileName);
  const stagedOutputPath = path.join(signerTempDir, stagedOutputFileName);

  fs.copyFileSync(sourceFilePath, stagedSourcePath);

  try {
    await execFileAsync(
      'java',
      [
        '-jar',
        brandConfig.signerJarFileName,
        'sign',
        '--v1-signing-enabled',
        'true',
        '--v2-signing-enabled',
        'true',
        '--cert',
        brandConfig.certFileName,
        '--key',
        brandConfig.keyFileName,
        '--out',
        stagedOutputPath,
        stagedSourcePath,
      ],
      {
        cwd: brandConfig.signerDir,
        windowsHide: true,
      }
    );
  } finally {
    if (fs.existsSync(stagedSourcePath)) {
      fs.unlinkSync(stagedSourcePath);
    }
  }

  assertFileExists(stagedOutputPath, `品牌 ${brandConfig.label} 的签名 APK 生成失败`);
  fs.copyFileSync(stagedOutputPath, signedFilePath);
  fs.unlinkSync(stagedOutputPath);

  assertFileExists(signedFilePath, `品牌 ${brandConfig.label} 的签名 APK 生成失败`);
  return signedFilePath;
}

function apkBelongsToWorkspace(fileName: string, req: any): boolean {
  const safeName = path.basename(fileName);
  const filePath = `/api/apk/download/${safeName}`;
  const workspaceId = getWorkspaceId(req);
  const row = getDb().prepare(
    `SELECT id FROM release_notes
     WHERE workspaceId = ?
       AND (apkFilePath = ? OR apkFileName = ?)
     LIMIT 1`
  ).get(workspaceId, filePath, safeName);
  return Boolean(row);
}

/**
 * 设置 APK 上传路由
 * @param app Express 应用实例
 */
export function setupApkUploadRoutes(app: any): void {
  ensureUploadDir();

  app.get('/api/apk/sign-brands', (_req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: APK_SIGNING_BRANDS.map((brand) => ({
        key: brand.key,
        label: brand.label,
      })),
    });
  });

  /**
   * POST /api/apk/upload
   * 上传 APK 文件（使用 raw body）
   *
   * Headers:
   *   x-file-name: 原始文件名
   *   content-type: application/octet-stream
   *
   * Body: 二进制文件数据
   */
  app.post('/api/apk/upload', async (req: any, res: any) => {
    try {
      const originalName = decodeURIComponent(req.headers['x-file-name'] || 'unknown.apk');

      // 验证文件扩展名
      if (!originalName.toLowerCase().endsWith('.apk')) {
        return res.status(400).json({
          success: false,
          message: '只允许上传 .apk 文件',
        });
      }

      // 收集请求体数据
      const chunks: Buffer[] = [];
      let totalSize = 0;

      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE) {
            reject(new Error(`文件大小超过限制 (最大 ${formatFileSize(MAX_FILE_SIZE)})`));
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', resolve);
        req.on('error', reject);
      });

      const fileBuffer = Buffer.concat(chunks);

      if (fileBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: '上传文件为空',
        });
      }

      // 生成唯一文件名并保存
      const savedFileName = generateUniqueFileName(originalName);
      const savedFilePath = path.join(APK_STORAGE_DIR, savedFileName);

      fs.writeFileSync(savedFilePath, fileBuffer);

      console.log(`APK 已保存: ${savedFileName} (${formatFileSize(fileBuffer.length)})`);

      res.status(200).json({
        success: true,
        message: 'APK 上传成功',
        data: {
          fileName: originalName,
          savedFileName,
          filePath: `/api/apk/download/${savedFileName}`,
          fileSize: fileBuffer.length,
          fileSizeFormatted: formatFileSize(fileBuffer.length),
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('APK 上传失败:', error);
      res.status(500).json({
        success: false,
        message: 'APK 上传失败',
        error: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/apk/download/:fileName
   * 下载 APK 文件
   */
  app.get('/api/apk/download/:fileName', (req: any, res: any) => {
    try {
      const { fileName } = req.params;

      // 防止路径遍历攻击
      const safeName = path.basename(fileName);
      if (!apkBelongsToWorkspace(safeName, req)) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }
      const filePath = path.join(APK_STORAGE_DIR, safeName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      const stat = fs.statSync(filePath);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (error) {
      console.error('APK 下载失败:', error);
      res.status(500).json({
        success: false,
        message: '下载失败',
        error: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/apk/download-signed/:brand/:fileName
   * 按品牌动态签名并下载 APK
   */
  app.get('/api/apk/download-signed/:brand/:fileName', async (req: any, res: any) => {
    try {
      const safeName = path.basename(req.params.fileName);
      const brandKey = String(req.params.brand || '').toLowerCase();
      const brandConfig = getApkSigningBrandConfig(brandKey);
      if (!apkBelongsToWorkspace(safeName, req)) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      if (!brandConfig) {
        return res.status(400).json({
          success: false,
          message: '不支持的品牌签名',
        });
      }

      const signedFilePath = await ensureSignedApk(safeName, brandKey);
      const signedFileName = path.basename(signedFilePath);
      const stat = fs.statSync(signedFilePath);

      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(signedFileName)}"`
      );
      res.setHeader('X-Apk-Sign-Brand', brandConfig.key);

      const readStream = fs.createReadStream(signedFilePath);
      readStream.pipe(res);
    } catch (error) {
      console.error('品牌签名 APK 下载失败:', error);
      res.status(500).json({
        success: false,
        message: '品牌签名下载失败',
        error: (error as Error).message,
      });
    }
  });

  /**
   * DELETE /api/apk/delete/:fileName
   * 删除 APK 文件
   */
  app.delete('/api/apk/delete/:fileName', (req: any, res: any) => {
    try {
      const { fileName } = req.params;
      const safeName = path.basename(fileName);
      if (!apkBelongsToWorkspace(safeName, req)) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }
      const filePath = path.join(APK_STORAGE_DIR, safeName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      fs.unlinkSync(filePath);
      console.log(`APK 已删除: ${safeName}`);

      res.status(200).json({
        success: true,
        message: 'APK 已删除',
      });
    } catch (error) {
      console.error('APK 删除失败:', error);
      res.status(500).json({
        success: false,
        message: '删除失败',
        error: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/apk/list
   * 列出所有已上传的 APK 文件
   */
  app.get('/api/apk/list', (req: any, res: any) => {
    try {
      ensureUploadDir();
      const workspaceId = getWorkspaceId(req);
      const referenced = new Set(
        (getDb().prepare(
          `SELECT apkFilePath, apkFileName FROM release_notes WHERE workspaceId = ?`
        ).all(workspaceId) as any[])
          .flatMap((row) => [
            row.apkFilePath ? path.basename(row.apkFilePath) : '',
            row.apkFileName ? path.basename(row.apkFileName) : '',
          ])
          .filter(Boolean)
      );
      const files = fs.readdirSync(APK_STORAGE_DIR)
        .filter((f: string) => f.endsWith('.apk'))
        .filter((f: string) => referenced.has(f))
        .map((f: string) => {
          const stat = fs.statSync(path.join(APK_STORAGE_DIR, f));
          return {
            fileName: f,
            fileSize: stat.size,
            fileSizeFormatted: formatFileSize(stat.size),
            downloadUrl: `/api/apk/download/${f}`,
            uploadedAt: stat.mtime.toISOString(),
          };
        })
        .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      res.status(200).json({
        success: true,
        data: { files, total: files.length },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取文件列表失败',
        error: (error as Error).message,
      });
    }
  });
}
