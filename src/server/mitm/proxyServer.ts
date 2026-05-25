/**
 * MITM HTTPS 代理服务器核心
 * - 处理 CONNECT 隧道
 * - 动态 TLS 证书
 * - 请求/响应拦截
 * - 规则引擎集成
 */

import net from 'net';
import tls from 'tls';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import zlib from 'zlib';
import { v4 as uuid } from 'uuid';
import { getCertForHost } from './certManager';
import { matchRule, applyAction, getDelay, MatchResult, MitmRule } from './ruleEngine';
import { getRuleOwnerForDevice, getRulesForOwner, incrementHitCount, MitmRequestRecord } from './requestStore';
import { waitForBreakpoint, BreakpointEntry } from './breakpointManager';

type RequestListener = (record: MitmRequestRecord) => void;

let proxyServer: http.Server | null = null;
let running = false;
const listeners: Set<RequestListener> = new Set();
const activeSockets = new Set<net.Socket>();
const MAX_CAPTURE_BODY_BYTES = 256 * 1024;
const MAX_RULE_RESPONSE_BODY_BYTES = 5 * 1024 * 1024;
const MAX_FULL_BODY_CACHE_BYTES = 50 * 1024 * 1024;
const FULL_BODY_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_FULL_BODY_CACHE_ITEMS = 50;
const SYNTHETIC_RESPONSE_DELAY_MS = 250;
const upstreamHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 30000,
});
const fullBodyCache = new Map<string, {
  ownerId: string | null;
  body: Buffer;
  encodingHeader?: string | string[] | number;
  expiresAt: number;
}>();

export function isProxyRunning(): boolean {
  return running;
}

export function onNewRequest(listener: RequestListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(record: MitmRequestRecord): void {
  for (const listener of listeners) {
    try { listener(record); } catch {}
  }
}

export function getFullResponseBody(requestId: string, ownerId?: string | null): { body: string } | null {
  pruneFullBodyCache();
  const cached = fullBodyCache.get(requestId);
  if (!cached) return null;
  if (cached.ownerId && ownerId && cached.ownerId !== ownerId) return null;

  const decoded = decompressResponseBuffer(cached.body, cached.encodingHeader);
  return { body: decoded.toString('utf-8') };
}

/**
 * 启动 MITM 代理服务器
 */
export function startProxy(port = 8888): Promise<void> {
  if (running) return Promise.resolve();

  return new Promise((resolve, reject) => {
    proxyServer = http.createServer();

    // 处理普通 HTTP 请求（透传）
    proxyServer.on('request', (req, res) => {
      handleHttpRequest(req, res);
    });

    // 处理 CONNECT 隧道（HTTPS MITM）
    proxyServer.on('connect', (req, clientSocket, head) => {
      handleConnect(req, clientSocket as net.Socket, head);
    });

    proxyServer.on('error', (err) => {
      console.error('[MITM Proxy] 服务器错误:', err.message);
    });

    // 跟踪活跃连接，以便停止时强制关闭
    proxyServer.on('connection', (socket) => {
      activeSockets.add(socket);
      socket.on('close', () => activeSockets.delete(socket));
    });

    proxyServer.listen(port, '0.0.0.0', () => {
      running = true;
      console.log(`[MITM Proxy] 已启动，监听端口 ${port}`);
      resolve();
    });

    proxyServer.on('error', reject);
  });
}

/**
 * 停止代理服务器
 */
export function stopProxy(): Promise<void> {
  return new Promise((resolve) => {
    if (!proxyServer || !running) {
      running = false;
      resolve();
      return;
    }
    // 强制关闭所有活跃连接
    for (const socket of activeSockets) {
      socket.destroy();
    }
    activeSockets.clear();

    proxyServer.close(() => {
      running = false;
      proxyServer = null;
      console.log('[MITM Proxy] 已停止');
      resolve();
    });
  });
}

/**
 * 处理 HTTP 请求（透传，不做 MITM）
 */
function handleHttpRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
  const url = clientReq.url || '/';
  const parsedUrl = new URL(url.startsWith('http') ? url : `http://${clientReq.headers.host}${url}`);

  const options: http.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    path: parsedUrl.pathname + parsedUrl.search,
    method: clientReq.method,
    headers: { ...clientReq.headers },
  };
  delete (options.headers as Record<string, unknown>)['proxy-connection'];

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', () => {
    clientRes.writeHead(502);
    clientRes.end('Bad Gateway');
  });

  clientReq.pipe(proxyReq);
}

/**
 * 处理 CONNECT 隧道（HTTPS MITM 核心）
 */
function handleConnect(req: http.IncomingMessage, clientSocket: net.Socket, _head: Buffer): void {
  const [hostname, portStr] = (req.url || '').split(':');
  const port = parseInt(portStr) || 443;
  const clientIp = normalizeRemoteAddress(clientSocket.remoteAddress || '');

  // 告诉客户端隧道已建立
  clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

  // 获取该域名的动态证书
  const { cert, key } = getCertForHost(hostname);

  // 创建 TLS 服务端（伪装目标服务器）
  const tlsServer = new tls.TLSSocket(clientSocket, {
    isServer: true,
    cert,
    key,
  });

  // 缓冲请求数据
  let requestData = Buffer.alloc(0);
  let bodyChunks: Buffer[] = [];
  let bodyReceived = 0;
  let headersParsed = false;
  let requestHeaders: Record<string, string> = {};
  let requestMethod = '';
  let requestPath = '';
  let contentLength = 0;
  let headerEndIndex = -1;
  let requestSent = false;

  tlsServer.on('data', (chunk: Buffer) => {
    if (requestSent) return; // 已经发送过，忽略后续数据

    if (!headersParsed) {
      requestData = Buffer.concat([requestData, chunk]);
      const headerEnd = requestData.indexOf('\r\n\r\n');
      if (headerEnd === -1) return; // 等待更多数据

      headersParsed = true;
      headerEndIndex = headerEnd + 4;

      const headerStr = requestData.subarray(0, headerEnd).toString();
      const lines = headerStr.split('\r\n');
      const [method, path] = (lines[0] || '').split(' ');
      requestMethod = method || 'GET';
      requestPath = path || '/';

      for (let i = 1; i < lines.length; i++) {
        const colonIdx = lines[i].indexOf(':');
        if (colonIdx > 0) {
          const key = lines[i].substring(0, colonIdx).trim().toLowerCase();
          const value = lines[i].substring(colonIdx + 1).trim();
          requestHeaders[key] = value;
        }
      }

      contentLength = parseInt(requestHeaders['content-length'] || '0');
      const existingBody = requestData.subarray(headerEndIndex);
      if (existingBody.length > 0) {
        bodyChunks.push(existingBody);
        bodyReceived += existingBody.length;
      }

      // 检查是否已收到完整请求体
      if (bodyReceived >= contentLength) {
        requestSent = true;
        const body = Buffer.concat(bodyChunks, bodyReceived).subarray(0, contentLength);
        processRequest(tlsServer, hostname, port, requestMethod, requestPath, requestHeaders, body, clientIp);
        bodyChunks = [];
        requestData = Buffer.alloc(0);
      }
    } else {
      // 继续接收请求体
      bodyChunks.push(chunk);
      bodyReceived += chunk.length;
      if (bodyReceived >= contentLength) {
        requestSent = true;
        const body = Buffer.concat(bodyChunks, bodyReceived).subarray(0, contentLength);
        processRequest(tlsServer, hostname, port, requestMethod, requestPath, requestHeaders, body, clientIp);
        bodyChunks = [];
        requestData = Buffer.alloc(0);
      }
    }
  });

  tlsServer.on('error', () => { /* 忽略 TLS 错误 */ });
  clientSocket.on('error', () => { /* 忽略 socket 错误 */ });
}

/**
 * 处理解密后的请求：转发到真实服务器，应用规则，返回响应
 */
async function processRequest(
  clientTls: tls.TLSSocket,
  hostname: string,
  port: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: Buffer,
  clientIp: string
): Promise<void> {
  const startTime = Date.now();
  const fullUrl = `https://${hostname}${path}`;
  const ruleOwnerId = getRuleOwnerForDevice(clientIp);
  const rules = ruleOwnerId ? getRulesForOwner(ruleOwnerId) : [];

  // 规则匹配
  const matchResult = matchRule(rules, { url: fullUrl, method, packageName: undefined, deviceId: undefined });

  // 断点拦截 - 请求阶段
  let finalHeaders = headers;
  let finalBody = body;
  if (matchResult.matched && matchResult.rule && matchResult.rule.action.type === 'breakpoint') {
    const bpOn = matchResult.rule.action.breakpointOn || 'response';
    if (bpOn === 'request' || bpOn === 'both') {
      const bpEntry: BreakpointEntry = {
        id: uuid(),
        ownerId: ruleOwnerId,
        ruleId: matchResult.rule.id,
        ruleName: matchResult.rule.name,
        phase: 'request',
        timestamp: startTime,
        method,
        url: fullUrl,
        requestHeaders: { ...headers },
        requestBody: body.toString('utf-8'),
      };
      const resolution = await waitForBreakpoint(bpEntry);
      if (resolution.action === 'forward') {
        if (resolution.modifiedRequestHeaders) finalHeaders = resolution.modifiedRequestHeaders;
        if (resolution.modifiedRequestBody !== undefined) finalBody = Buffer.from(resolution.modifiedRequestBody, 'utf-8');
      }
      // passthrough: 使用原始内容继续
    }
    incrementHitCount(matchResult.rule.id);
  }

  // 延迟处理（非断点规则）
  if (matchResult.matched && matchResult.rule && matchResult.rule.action.type === 'delay') {
    const delay = getDelay(matchResult.rule);
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  if (matchResult.matched && matchResult.rule?.action.type === 'replaceBody') {
    const matchedRule = matchResult.rule;
    setTimeout(() => sendSyntheticResponse({
      clientTls,
      ruleOwnerId,
      clientIp,
      startTime,
      method,
      fullUrl,
      hostname,
      path,
      headers,
      body,
      ruleId: matchedRule.id,
      responseBody: matchedRule.action.replaceBody || '',
      statusCode: 200,
    }), SYNTHETIC_RESPONSE_DELAY_MS);
    return;
  }

  // 转发到真实服务器
  const reqOptions: https.RequestOptions = {
    hostname,
    port,
    path,
    method,
    headers: { ...finalHeaders, host: hostname },
    rejectUnauthorized: false,
    agent: upstreamHttpsAgent,
  };

  const proxyReq = https.request(reqOptions, (proxyRes) => {
    const needsBufferedResponse = matchResult.matched && matchResult.rule
      ? shouldBufferResponse(matchResult.rule)
      : false;

    if (!needsBufferedResponse) {
      streamProxyResponse({
        proxyRes,
        clientTls,
        ruleOwnerId,
        clientIp,
        startTime,
        method,
        fullUrl,
        hostname,
        path,
        headers,
        body,
        matchResult,
      });
      return;
    }

    const declaredResponseSize = getContentLength(proxyRes.headers['content-length']);
    if (declaredResponseSize !== null && declaredResponseSize > MAX_RULE_RESPONSE_BODY_BYTES) {
      streamProxyResponse({
        proxyRes,
        clientTls,
        ruleOwnerId,
        clientIp,
        startTime,
        method,
        fullUrl,
        hostname,
        path,
        headers,
        body,
        matchResult: { matched: false },
        captureNote: largeBodyBypassMessage(declaredResponseSize),
      });
      return;
    }

    const chunks: Buffer[] = [];
    let bufferedSize = 0;

    proxyRes.on('data', (chunk: Buffer) => {
      bufferedSize += chunk.length;
      chunks.push(chunk);
    });
    proxyRes.on('end', async () => {
      let responseBuffer = Buffer.concat(chunks, bufferedSize);
      let responseBody = '';
      let statusCode = proxyRes.statusCode || 200;
      const responseHeaders = { ...proxyRes.headers } as Record<string, string | string[] | number | undefined>;

      // 解压响应体
      try {
        const decodedBuffer = decompressResponseBuffer(responseBuffer, proxyRes.headers['content-encoding']);
        delete responseHeaders['content-encoding'];
        responseBody = decodedBuffer.toString('utf-8');
      } catch {
        responseBody = responseBuffer.toString('utf-8');
      }

      // 应用规则修改
      let modified = false;
      if (matchResult.matched && matchResult.rule) {
        if (matchResult.rule.action.type === 'breakpoint') {
          // 断点拦截 - 响应阶段
          const bpOn = matchResult.rule.action.breakpointOn || 'response';
          if (bpOn === 'response' || bpOn === 'both') {
            const bpEntry: BreakpointEntry = {
              id: uuid(),
              ownerId: ruleOwnerId,
              ruleId: matchResult.rule.id,
              ruleName: matchResult.rule.name,
              phase: 'response',
              timestamp: Date.now(),
              method,
              url: fullUrl,
              requestHeaders: headers,
              requestBody: body.toString('utf-8'),
              responseStatus: statusCode,
              responseHeaders: stringifyHeaderValues(responseHeaders),
              responseBody: responseBody,
            };
            const resolution = await waitForBreakpoint(bpEntry);
            if (resolution.action === 'forward') {
              if (resolution.modifiedResponseBody !== undefined) {
                responseBody = resolution.modifiedResponseBody;
                modified = true;
              }
              if (resolution.modifiedResponseStatus !== undefined) {
                statusCode = resolution.modifiedResponseStatus;
                modified = true;
              }
            }
            // passthrough: 使用原始响应
          }
          incrementHitCount(matchResult.rule.id);
        } else if (matchResult.rule.action.type !== 'delay') {
          // 非断点、非延迟规则：自动修改
          const result = applyAction(matchResult.rule, responseBody, statusCode);
          if (result.body !== responseBody || result.status !== statusCode) {
            responseBody = result.body;
            statusCode = result.status;
            modified = true;
          }
          incrementHitCount(matchResult.rule.id);
        }
      }

      // 构建响应发回客户端
      const finalBody = Buffer.from(responseBody, 'utf-8');
      const resHeaders = { ...responseHeaders };
      delete resHeaders['content-encoding']; // 已解压
      delete resHeaders['transfer-encoding'];
      resHeaders['content-length'] = String(finalBody.length);

      const statusLine = `HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode] || 'OK'}\r\n`;
      const headerLines = Object.entries(resHeaders)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n');

      try {
        clientTls.write(statusLine + headerLines + '\r\n\r\n');
        clientTls.write(finalBody);
        clientTls.end();
      } catch { /* 客户端可能已断开 */ }

      // 记录请求
      const recordId = uuid();
      const record: MitmRequestRecord = {
        id: recordId,
        ownerId: ruleOwnerId,
        deviceId: clientIp,
        timestamp: startTime,
        method,
        url: fullUrl,
        host: hostname,
        path,
        requestHeaders: JSON.stringify(headers),
        requestBody: body.length > 0 ? captureBufferBody(body) : null,
        responseStatus: statusCode,
        responseHeaders: JSON.stringify(responseHeaders),
        responseBody: captureTextBody(responseBody),
        packageName: null,
        duration: Date.now() - startTime,
        size: finalBody.length,
        matched: matchResult.matched,
        matchedRuleId: matchResult.rule?.id || null,
        modified,
      };
      rememberFullResponseBody(recordId, ruleOwnerId, finalBody);

      notifyListeners(record);
    });
  });

  proxyReq.on('error', () => {
    try {
      clientTls.write(`HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n`);
      clientTls.end();
    } catch {}
  });

  if (finalBody.length > 0) {
    proxyReq.write(finalBody);
  }
  proxyReq.end();
}

function normalizeRemoteAddress(address: string): string {
  if (address.startsWith('::ffff:')) return address.substring(7);
  if (address === '::1') return '127.0.0.1';
  return address;
}

function getContentLength(value: string | string[] | number | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function shouldBufferResponse(rule: MitmRule): boolean {
  if (rule.action.type === 'replaceBody' || rule.action.type === 'modifyJson') return true;
  if (rule.action.type !== 'breakpoint') return false;
  const bpOn = rule.action.breakpointOn || 'response';
  return bpOn === 'response' || bpOn === 'both';
}

function sendSyntheticResponse(args: {
  clientTls: tls.TLSSocket;
  ruleOwnerId: string | null;
  clientIp: string;
  startTime: number;
  method: string;
  fullUrl: string;
  hostname: string;
  path: string;
  headers: Record<string, string>;
  body: Buffer;
  ruleId: string;
  responseBody: string;
  statusCode: number;
}): void {
  const {
    clientTls,
    ruleOwnerId,
    clientIp,
    startTime,
    method,
    fullUrl,
    hostname,
    path,
    headers,
    body,
    ruleId,
    responseBody,
    statusCode,
  } = args;
  const finalBody = Buffer.from(responseBody, 'utf-8');
  const responseHeaders: Record<string, string> = {
    'access-control-allow-methods': 'POST, GET, PUT, OPTIONS, DELETE',
    'access-control-allow-origin': '*',
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(finalBody.length),
    date: new Date().toUTCString(),
    connection: 'close',
  };
  const statusLine = `HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode] || 'OK'}\r\n`;
  const headerLines = Object.entries(responseHeaders).map(([k, v]) => `${k}: ${v}`).join('\r\n');

  try {
    clientTls.write(statusLine + headerLines + '\r\n\r\n');
    clientTls.write(finalBody);
    clientTls.end();
  } catch {}

  incrementHitCount(ruleId);
  const recordId = uuid();
  const record: MitmRequestRecord = {
    id: recordId,
    ownerId: ruleOwnerId,
    deviceId: clientIp,
    timestamp: startTime,
    method,
    url: fullUrl,
    host: hostname,
    path,
    requestHeaders: JSON.stringify(headers),
    requestBody: body.length > 0 ? captureBufferBody(body) : null,
    responseStatus: statusCode,
    responseHeaders: JSON.stringify(responseHeaders),
    responseBody: captureTextBody(responseBody),
    packageName: null,
    duration: Date.now() - startTime,
    size: finalBody.length,
    matched: true,
    matchedRuleId: ruleId,
    modified: true,
  };
  rememberFullResponseBody(recordId, ruleOwnerId, finalBody);

  notifyListeners(record);
}

function captureTextBody(body: string): string | null {
  if (!body) return null;
  const buffer = Buffer.from(body, 'utf-8');
  if (buffer.length <= MAX_CAPTURE_BODY_BYTES) return body;
  return buffer.subarray(0, MAX_CAPTURE_BODY_BYTES).toString('utf-8') + truncatedSuffix(buffer.length);
}

function captureBufferBody(body: Buffer): string | null {
  if (body.length === 0) return null;
  const captured = body.subarray(0, MAX_CAPTURE_BODY_BYTES).toString('utf-8');
  return body.length > MAX_CAPTURE_BODY_BYTES ? captured + truncatedSuffix(body.length) : captured;
}

function largeBodyBypassMessage(totalBytes: number): string {
  return `响应 Body 过大（${formatBytes(totalBytes)}），已直接透传并跳过响应 Body 修改/断点缓存。`;
}

function rememberFullResponseBody(
  requestId: string,
  ownerId: string | null,
  body: Buffer,
  encodingHeader?: string | string[] | number
): void {
  if (body.length === 0 || body.length > MAX_FULL_BODY_CACHE_BYTES) return;
  pruneFullBodyCache();
  fullBodyCache.set(requestId, {
    ownerId,
    body,
    encodingHeader,
    expiresAt: Date.now() + FULL_BODY_CACHE_TTL_MS,
  });
  while (fullBodyCache.size > MAX_FULL_BODY_CACHE_ITEMS) {
    const oldestKey = fullBodyCache.keys().next().value;
    if (!oldestKey) break;
    fullBodyCache.delete(oldestKey);
  }
}

function pruneFullBodyCache(): void {
  const now = Date.now();
  for (const [key, value] of fullBodyCache) {
    if (value.expiresAt <= now) fullBodyCache.delete(key);
  }
}

function decodeCapturedResponseBody(
  body: Buffer,
  encodingHeader: string | string[] | number | undefined,
  truncated: boolean
): { body: string; decoded: boolean } {
  if (truncated && hasCompressionEncoding(encodingHeader)) {
    return { body: compressedPreviewUnavailableMessage(), decoded: false };
  }

  let decoded = body;
  let didDecode = false;
  if (!truncated) {
    try {
      decoded = decompressResponseBuffer(body, encodingHeader);
      didDecode = decoded !== body;
    } catch {
      decoded = body;
    }
  }

  return { body: decoded.toString('utf-8') + (truncated ? truncatedSuffix() : ''), decoded: didDecode };
}

function hasCompressionEncoding(encodingHeader: string | string[] | number | undefined): boolean {
  const encoding = Array.isArray(encodingHeader)
    ? encodingHeader.join(',').toLowerCase()
    : String(encodingHeader || '').toLowerCase();
  return encoding.includes('gzip') || encoding.includes('br') || encoding.includes('deflate');
}

function compressedPreviewUnavailableMessage(): string {
  return `响应 Body 为压缩内容且超过预览上限，已跳过解压预览以保证抓包速度。${truncatedSuffix()}`;
}

function decompressResponseBuffer(body: Buffer, encodingHeader: string | string[] | number | undefined): Buffer {
  const encoding = Array.isArray(encodingHeader)
    ? encodingHeader.join(',').toLowerCase()
    : String(encodingHeader || '').toLowerCase();

  if (encoding.includes('gzip')) return zlib.gunzipSync(body);
  if (encoding.includes('br')) return zlib.brotliDecompressSync(body);
  if (encoding.includes('deflate')) return zlib.inflateSync(body);

  if (body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b) return zlib.gunzipSync(body);

  for (const decompress of [zlib.brotliDecompressSync, zlib.inflateSync] as Array<(buffer: Buffer) => Buffer>) {
    try { return decompress(body); } catch {}
  }
  return body;
}

function stringifyHeaderValues(headers: Record<string, string | string[] | number | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return result;
}

function truncatedSuffix(totalBytes?: number): string {
  const totalText = totalBytes ? `，原始大小约 ${formatBytes(totalBytes)}` : '';
  return `\n\n...[已截断：仅保存前 ${formatBytes(MAX_CAPTURE_BODY_BYTES)}${totalText}]`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

function streamProxyResponse(args: {
  proxyRes: http.IncomingMessage;
  clientTls: tls.TLSSocket;
  ruleOwnerId: string | null;
  clientIp: string;
  startTime: number;
  method: string;
  fullUrl: string;
  hostname: string;
  path: string;
  headers: Record<string, string>;
  body: Buffer;
  matchResult: MatchResult;
  captureNote?: string;
}): void {
  const {
    proxyRes,
    clientTls,
    ruleOwnerId,
    clientIp,
    startTime,
    method,
    fullUrl,
    hostname,
    path,
    headers,
    body,
    matchResult,
    captureNote,
  } = args;

  const responseHeaders = { ...proxyRes.headers } as Record<string, string | string[] | number | undefined>;
  delete responseHeaders['transfer-encoding'];
  delete responseHeaders['content-length'];
  responseHeaders['connection'] = 'close';

  let statusCode = proxyRes.statusCode || 200;
  let modified = false;

  if (matchResult.matched && matchResult.rule) {
    if (matchResult.rule.action.type === 'modifyStatus' && matchResult.rule.action.statusCode) {
      statusCode = matchResult.rule.action.statusCode;
      modified = true;
    }
    incrementHitCount(matchResult.rule.id);
  }

  const statusLine = `HTTP/1.1 ${statusCode} ${http.STATUS_CODES[statusCode] || 'OK'}\r\n`;
  const headerLines = Object.entries(responseHeaders)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\r\n');
  let size = 0;
  const responsePreviewChunks: Buffer[] = [];
  const responseFullChunks: Buffer[] = [];
  let responsePreviewSize = 0;
  let responseFullSize = 0;
  let fullBodyCacheable = true;
  let previewTruncated = false;
  let finished = false;

  try {
    clientTls.write(statusLine + headerLines + '\r\n\r\n');
  } catch {}

  const finishResponse = () => {
    if (finished) return;
    finished = true;
    try { clientTls.end(); } catch {}
    const duration = Date.now() - startTime;
    setImmediate(() => {
      const capturedResponse = responsePreviewSize > 0
        ? decodeCapturedResponseBody(Buffer.concat(responsePreviewChunks, responsePreviewSize), responseHeaders['content-encoding'], previewTruncated)
        : null;
      const storedResponseHeaders = { ...responseHeaders };
      if (capturedResponse?.decoded) {
        delete storedResponseHeaders['content-encoding'];
      }
      const recordId = uuid();
      if (fullBodyCacheable && responseFullSize > 0) {
        rememberFullResponseBody(
          recordId,
          ruleOwnerId,
          Buffer.concat(responseFullChunks, responseFullSize),
          responseHeaders['content-encoding']
        );
      }
      const record: MitmRequestRecord = {
        id: recordId,
        ownerId: ruleOwnerId,
        deviceId: clientIp,
        timestamp: startTime,
        method,
        url: fullUrl,
        host: hostname,
        path,
        requestHeaders: JSON.stringify(headers),
        requestBody: body.length > 0 ? captureBufferBody(body) : null,
        responseStatus: statusCode,
        responseHeaders: JSON.stringify(storedResponseHeaders),
        responseBody: captureNote || capturedResponse?.body || null,
        packageName: null,
        duration,
        size,
        matched: matchResult.matched,
        matchedRuleId: matchResult.rule?.id || null,
        modified,
      };

      notifyListeners(record);
    });
  };

  proxyRes.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (fullBodyCacheable) {
      if (responseFullSize + chunk.length <= MAX_FULL_BODY_CACHE_BYTES) {
        responseFullChunks.push(chunk);
        responseFullSize += chunk.length;
      } else {
        fullBodyCacheable = false;
        responseFullChunks.length = 0;
        responseFullSize = 0;
      }
    }
    if (!captureNote && responsePreviewSize < MAX_CAPTURE_BODY_BYTES) {
      const remaining = MAX_CAPTURE_BODY_BYTES - responsePreviewSize;
      const capturedChunk = chunk.subarray(0, remaining);
      responsePreviewChunks.push(capturedChunk);
      responsePreviewSize += capturedChunk.length;
      if (capturedChunk.length < chunk.length) previewTruncated = true;
    } else if (!captureNote) {
      previewTruncated = true;
    }
    try { clientTls.write(chunk); } catch {}
  });

  proxyRes.on('end', () => {
    finishResponse();
  });

  proxyRes.on('aborted', () => {
    finishResponse();
  });

  proxyRes.on('error', () => {
    finishResponse();
  });
}
