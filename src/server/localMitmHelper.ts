/**
 * 本机 MITM/ADB 助手
 *
 * 用于远程/内网穿透页面调用访问者自己电脑上的 ADB 和代理端口。
 * 只监听 127.0.0.1，避免把本机 ADB 控制接口暴露到局域网。
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { initSqlite, closeSqlite } from './storage/sqlite';
import { setupMitmRoutes } from './routes/mitmProxy';

const app = express();
const port = Number(process.env.MITM_HELPER_PORT || 3131);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});
app.use(cors());

initSqlite();

const server = http.createServer(app);
setupMitmRoutes(app, server);

app.get('/health', (_req, res) => {
  res.json({ success: true, mode: 'local-mitm-helper' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              本机 MITM/ADB 助手已启动                     ║
╠════════════════════════════════════════════════════════════╣
║  本机助手地址: http://127.0.0.1:${port}                    ║
║  网页端可通过该地址读取当前电脑连接的 ADB 设备             ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  closeSqlite();
  process.exit(0);
});

process.on('SIGINT', () => {
  closeSqlite();
  process.exit(0);
});
