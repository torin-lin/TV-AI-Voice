/**
 * 服务器设置示例
 * 
 * Express.js 服务器，提供 Release Note API 和 APK 上传功能
 * 
 * 安装依赖:
 * npm install express cors dotenv
 * 
 * 运行:
 * npx ts-node server.ts
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { setupApkUploadRoutes } from './src/server/routes/apkUpload';
import { setupDocUploadRoutes } from './src/server/routes/docUpload';
import { setupReleaseNoteRoutes } from './src/server/routes/releaseNotes';
import { setupCustomerProblemRoutes } from './src/server/routes/customerProblems';
import { setupZmindProxyRoutes } from './src/server/routes/zmindProxy';
import { setupVersionIssueRoutes } from './src/server/routes/versionIssues';
import { setupIssueAttachmentRoutes } from './src/server/routes/issueAttachments';
import { setupVersionRecordRoutes } from './src/server/routes/versionRecords';
import { setupKnowledgeBaseRoutes } from './src/server/routes/knowledgeBase';
import { setupAliasTestRoutes } from './src/server/routes/aliasTest';
import { setupMitmRoutes } from './src/server/routes/mitmProxy';
import { setupVoiceAutomationRoutes } from './src/server/routes/voiceAutomation';
import { setupAuthRoutes } from './src/server/routes/auth';
import { setupProjectWorkspaceRoutes } from './src/server/routes/projectWorkspaces';
import { identifyUser, requireBusinessApiAccess } from './src/server/middleware/auth';
import { auditLogMiddleware, queryAuditLogs } from './src/server/middleware/auditLog';
import { initSqlite, closeSqlite } from './src/server/storage/sqlite';

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app: Express = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DOWNLOAD_DIR = path.join(process.cwd(), 'public', 'downloads');

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use('/downloads', express.static(PUBLIC_DOWNLOAD_DIR));

// 请求日志
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 初始化 SQLite 数据库
initSqlite();

// 认证中间件：识别用户身份
app.use(identifyUser);

// 审计日志中间件：记录所有写操作（放在 identifyUser 之后，这样能获取到用户信息）
app.use(auditLogMiddleware);

// 认证路由（登录/注册/用户管理）—— 放在登录守卫之前，路由内部自行控制权限
setupAuthRoutes(app);
setupProjectWorkspaceRoutes(app);

// 上线模式：所有业务 API 均要求登录
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  if (req.path === '/health') {
    next();
    return;
  }
  if (req.path.startsWith('/api/auth/')) {
    next();
    return;
  }
  requireBusinessApiAccess(req, res, next);
});

// 审计日志查询 API（管理员）
app.get('/api/audit-logs', (req: Request, res: Response) => {
  if (!req.user || req.user.systemRole !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可查看审计日志' });
  }
  const { page, pageSize, userId, resource, action } = req.query;
  const result = queryAuditLogs({
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50,
    userId: userId as string | undefined,
    resource: resource as string | undefined,
    action: action as string | undefined,
  });
  res.json({ success: true, data: result.data, total: result.total });
});

// 设置 APK 上传路由
setupApkUploadRoutes(app);

// 设置文档上传路由
setupDocUploadRoutes(app);

// 设置 Release Note API 路由（多人共享数据）
setupReleaseNoteRoutes(app);

// 设置客户问题/QA问题 API 路由
setupCustomerProblemRoutes(app);

// 设置 zmind 代理路由
setupZmindProxyRoutes(app);

// 设置版本问题附件路由
setupIssueAttachmentRoutes(app);

// 设置版本问题路由
setupVersionIssueRoutes(app);

// 设置版本记录路由
setupVersionRecordRoutes(app);

// 设置知识库路由
setupKnowledgeBaseRoutes(app);

// 设置别名管理测试路由
setupAliasTestRoutes(app);

// 设置语音自动化代理路由
setupVoiceAutomationRoutes(app);

// 创建 HTTP server（用于 WebSocket 支持）
import http from 'http';
const httpServer = http.createServer(app);

// 设置 MITM 代理路由（需要在静态文件托管之前注册）
setupMitmRoutes(app, httpServer);

// 健康检查端点
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 托管前端静态文件（生产模式：npm run build 后）
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log('检测到 dist 目录，启用前端静态文件托管');
  app.use(express.static(distPath));

  // 所有非 API 路由返回 index.html（SPA 路由支持）
  app.get('/{*splat}', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // 开发模式：显示 API 信息
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Project Delivery Management Platform',
      version: '1.0.0',
      hint: '运行 npm run build 后重启服务器，即可通过 3000 端口直接访问前端页面',
      endpoints: {
        apkUpload: 'POST /api/apk/upload',
        apkDownload: 'GET /api/apk/download/:fileName',
        apkDelete: 'DELETE /api/apk/delete/:fileName',
        apkList: 'GET /api/apk/list',
        docUpload: 'POST /api/docs/upload',
        docDownload: 'GET /api/docs/download/:fileName',
        releaseNotes: 'GET /api/release-notes',
        releaseNoteCreate: 'POST /api/release-notes',
        releaseNoteSearch: 'GET /api/release-notes/search',
        releaseNoteStats: 'GET /api/release-notes/stats/summary',
        customerProblems: 'GET /api/customer-problems',
        customerProblemCreate: 'POST /api/customer-problems',
        zmindIssue: 'GET /api/zmind/issues/:id',
        zmindFirmware: 'GET /api/zmind/issues/:id/firmware',
        health: 'GET /health',
      },
    });
  });

  // 404 处理
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: '端点不存在',
      path: req.path,
    });
  });
}

// 启动服务器
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         项目交付管理平台服务已启动                         ║
╠════════════════════════════════════════════════════════════╣
║ 服务器地址: http://localhost:${PORT}                       ║
║ APK 上传: http://localhost:${PORT}/api/apk/upload          ║
║ Release Notes: http://localhost:${PORT}/api/release-notes  ║
║ 健康检查: http://localhost:${PORT}/health                  ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  closeSqlite();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  closeSqlite();
  process.exit(0);
});

export default app;
