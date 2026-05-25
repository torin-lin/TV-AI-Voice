/**
 * MITM 代理管理 REST API 路由
 * - 设备管理
 * - 代理控制
 * - 请求实时推送
 * - 规则 CRUD
 * - 证书管理
 */

import { WebSocketServer, WebSocket } from 'ws';
import { getDb } from '../storage/sqlite';
import { listDevices, connectDevice, disconnectDevice, enableProxy, disableProxy, installCert, getLocalIP } from '../mitm/adbManager';
import { initCA, getCACertPem, getCACertFingerprint, getCACertHashOld, regenerateCA } from '../mitm/certManager';
import { startProxy, stopProxy, isProxyRunning, onNewRequest, getFullResponseBody } from '../mitm/proxyServer';
import { initMitmStorage, getAllRules, getPublicRules, createRule, copyPublicRuleToOwner, updateRule, deleteRule, toggleRule, bindRuleOwnerToDevice } from '../mitm/requestStore';
import { MitmRequestRecord } from '../mitm/requestStore';
import { onBreakpointAdded, onBreakpointRemoved, resolveBreakpoint, getPendingBreakpoints } from '../mitm/breakpointManager';

export function setupMitmRoutes(app: any, server: any): void {
  // 初始化
  initCA();
  initMitmStorage();

  // 只启动抓包监听服务，不会改任何设备代理设置。
  // 这样设备若保留了上次的系统代理，服务重启后也不会断网。
  startProxy(8888).then(() => {
    console.log('[MITM] 代理监听服务已启动 (端口 8888)');
  }).catch((err) => {
    console.error('[MITM] 代理监听服务启动失败:', err.message);
  });

  // WebSocket 服务
  const wss = new WebSocketServer({ server, path: '/ws/mitm' });
  const wsClients = new Map<WebSocket, string | null>();

  const getUserIdFromToken = (token: string | undefined): string | null => {
    if (!token) return null;
    try {
      const session = getDb().prepare(
        `SELECT s.userId, s.expiresAt
         FROM sessions s
         JOIN users u ON u.id = s.userId
         WHERE s.token = ? AND COALESCE(u.status, 'active') = 'active'`
      ).get(token) as any;
      return session && session.expiresAt > Date.now() ? session.userId : null;
    } catch {
      return null;
    }
  };

  // 监听新请求，推送到 WebSocket 客户端
  onNewRequest((record: MitmRequestRecord) => {
    const msg = JSON.stringify({ type: 'newRequest', data: record });
    for (const [ws, ownerId] of wsClients) {
      if (!ownerId || record.ownerId !== ownerId) continue;
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(msg); } catch {}
      }
    }
  });

  // 监听断点事件，推送到 WebSocket 客户端
  onBreakpointAdded((entry) => {
    const msg = JSON.stringify({ type: 'breakpointHit', data: entry });
    for (const [ws, ownerId] of wsClients) {
      if (!ownerId || entry.ownerId !== ownerId) continue;
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(msg); } catch {}
      }
    }
  });

  onBreakpointRemoved((id) => {
    const msg = JSON.stringify({ type: 'breakpointResolved', data: { id } });
    for (const [ws] of wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(msg); } catch {}
      }
    }
  });

  // WebSocket 接收前端断点操作指令
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const ownerId = getUserIdFromToken(url.searchParams.get('token') || undefined);
    if (!ownerId) {
      ws.close(1008, 'Unauthorized');
      return;
    }
    wsClients.set(ws, ownerId);
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'resolveBreakpoint' && msg.id) {
          const clientOwnerId = wsClients.get(ws);
          if (!clientOwnerId) return;
          resolveBreakpoint(msg.id, {
            action: msg.action || 'passthrough',
            modifiedRequestHeaders: msg.modifiedRequestHeaders,
            modifiedRequestBody: msg.modifiedRequestBody,
            modifiedResponseStatus: msg.modifiedResponseStatus,
            modifiedResponseHeaders: msg.modifiedResponseHeaders,
            modifiedResponseBody: msg.modifiedResponseBody,
          }, clientOwnerId);
        }
      } catch {}
    });
    ws.on('close', () => wsClients.delete(ws));
    ws.on('error', () => wsClients.delete(ws));
  });

  // ==================== 设备管理 ====================

  /** GET /api/mitm/devices */
  app.get('/api/mitm/devices', async (req: any, res: any) => {
    try {
      const devices = await listDevices(req.query.force === '1');
      res.json({ success: true, data: devices });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/devices/connect */
  app.post('/api/mitm/devices/connect', (req: any, res: any) => {
    try {
      const { ip, port } = req.body;
      if (!ip) return res.status(400).json({ success: false, message: '缺少 IP 地址' });
      const result = connectDevice(ip, port || 5555);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/devices/:id/disconnect */
  app.post('/api/mitm/devices/:id/disconnect', (req: any, res: any) => {
    try {
      const result = disconnectDevice(req.params.id);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/devices/:id/proxy/enable */
  app.post('/api/mitm/devices/:id/proxy/enable', (req: any, res: any) => {
    try {
      const result = enableProxy(req.params.id);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/devices/:id/proxy/disable */
  app.post('/api/mitm/devices/:id/proxy/disable', (req: any, res: any) => {
    try {
      const result = disableProxy(req.params.id);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/devices/:id/cert/install */
  app.post('/api/mitm/devices/:id/cert/install', async (req: any, res: any) => {
    try {
      const result = await installCert(req.params.id);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // ==================== 代理控制 ====================

  /** GET /api/mitm/proxy/status */
  app.get('/api/mitm/proxy/status', (_req: any, res: any) => {
    res.json({ success: true, data: { running: isProxyRunning(), localIp: getLocalIP(), port: 8888 } });
  });

  /** POST /api/mitm/proxy/start */
  app.post('/api/mitm/proxy/start', async (_req: any, res: any) => {
    try {
      await startProxy(8888);
      res.json({ success: true, message: '代理已启动' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/proxy/stop */
  app.post('/api/mitm/proxy/stop', async (_req: any, res: any) => {
    try {
      await stopProxy();
      res.json({ success: true, message: '代理已停止' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // ==================== 请求实时推送兼容接口 ====================

  /** GET /api/mitm/requests */
  app.get('/api/mitm/requests', (_req: any, res: any) => {
    res.json({ success: true, data: [] });
  });

  /** GET /api/mitm/requests/:id */
  app.get('/api/mitm/requests/:id', (_req: any, res: any) => {
    res.status(404).json({ success: false, message: '请求记录已改为浏览器本地保存' });
  });

  /** GET /api/mitm/requests/:id/full-response-body */
  app.get('/api/mitm/requests/:id/full-response-body', (req: any, res: any) => {
    try {
      const result = getFullResponseBody(req.params.id, req.user?.id || null);
      if (!result) {
        return res.status(404).json({ success: false, message: '完整 Body 缓存已过期、过大或不存在，请重新抓取后再试' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: `完整 Body 解压失败: ${(error as Error).message}` });
    }
  });

  /** DELETE /api/mitm/requests */
  app.delete('/api/mitm/requests', (_req: any, res: any) => {
    res.json({ success: true });
  });

  // ==================== 规则管理 ====================

  /** GET /api/mitm/rules */
  app.get('/api/mitm/rules', (req: any, res: any) => {
    try {
      const rules = req.user?.id ? getAllRules(req.user.id) : [];
      res.json({ success: true, data: rules });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/mitm/rules/public */
  app.get('/api/mitm/rules/public', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.json({ success: true, data: [] });
      res.json({ success: true, data: getPublicRules(req.user.id) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/rules */
  app.post('/api/mitm/rules', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const { name, enabled, priority, deviceScope, isPublic, conditions, action, description } = req.body;
      if (!name || !conditions || !action) {
        return res.status(400).json({ success: false, message: '缺少必填字段 (name, conditions, action)' });
      }
      const rule = createRule({
        ownerId: req.user.id,
        name,
        enabled: enabled !== false,
        priority: priority || 100,
        deviceScope: deviceScope || 'all',
        isPublic: Boolean(isPublic),
        conditions,
        action,
        description,
      });
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/rules/public/:id/copy */
  app.post('/api/mitm/rules/public/:id/copy', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const rule = copyPublicRuleToOwner(req.params.id, req.user.id);
      if (!rule) return res.status(404).json({ success: false, message: '公共规则不存在' });
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/mitm/rules/:id */
  app.put('/api/mitm/rules/:id', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const ok = updateRule(req.params.id, req.body, req.user.id);
      if (!ok) return res.status(404).json({ success: false, message: '规则不存在' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/mitm/rules/:id */
  app.delete('/api/mitm/rules/:id', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const ok = deleteRule(req.params.id, req.user.id);
      if (!ok) return res.status(404).json({ success: false, message: '规则不存在' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/rules/:id/toggle */
  app.post('/api/mitm/rules/:id/toggle', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const ok = toggleRule(req.params.id, req.user.id);
      if (!ok) return res.status(404).json({ success: false, message: '规则不存在' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/rule-scope/bind - 将设备上的规则生效范围绑定到当前账号 */
  app.post('/api/mitm/rule-scope/bind', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ success: false, message: '缺少 deviceId' });
      bindRuleOwnerToDevice(String(deviceId), req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // ==================== 证书管理 ====================

  /** GET /api/mitm/breakpoints - 获取待处理断点 */
  app.get('/api/mitm/breakpoints', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.json({ success: true, data: [] });
      res.json({ success: true, data: getPendingBreakpoints(req.user.id) });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/breakpoints/:id/resolve - 解除断点 */
  app.post('/api/mitm/breakpoints/:id/resolve', (req: any, res: any) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: '请先登录' });
      const ok = resolveBreakpoint(req.params.id, {
        action: req.body.action || 'passthrough',
        modifiedRequestHeaders: req.body.modifiedRequestHeaders,
        modifiedRequestBody: req.body.modifiedRequestBody,
        modifiedResponseStatus: req.body.modifiedResponseStatus,
        modifiedResponseHeaders: req.body.modifiedResponseHeaders,
        modifiedResponseBody: req.body.modifiedResponseBody,
      }, req.user.id);
      if (!ok) return res.status(404).json({ success: false, message: '断点不存在或已处理' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // ==================== 证书管理（原有） ====================

  /** GET /api/mitm/cert/download */
  app.get('/api/mitm/cert/download', (_req: any, res: any) => {
    try {
      const pem = getCACertPem();
      res.setHeader('Content-Type', 'application/x-x509-ca-cert');
      res.setHeader('Content-Disposition', 'attachment; filename="mitm-ca.crt"');
      res.send(pem);
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/mitm/cert/info */
  app.get('/api/mitm/cert/info', (_req: any, res: any) => {
    try {
      res.json({ success: true, data: { fingerprint: getCACertFingerprint(), hash: getCACertHashOld() } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/mitm/cert/regenerate */
  app.post('/api/mitm/cert/regenerate', (_req: any, res: any) => {
    try {
      regenerateCA();
      res.json({ success: true, message: 'CA 证书已重新生成，需要重新安装到设备' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}
