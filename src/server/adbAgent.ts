/**
 * 轻量 ADB Agent
 *
 * 打包成 Windows exe 后运行在访问者电脑上，只提供本机 ADB 操作接口。
 * 抓包代理、规则和请求历史仍由主服务器提供。
 */

import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

type DeviceStatus = 'online' | 'offline' | 'unauthorized';

interface JsonResponse {
  success: boolean;
  data?: unknown;
  message?: string;
}

const PORT = Number(process.env.ADB_AGENT_PORT || 3131);
const execAsync = promisify(exec);
const DEVICE_CACHE_TTL_MS = 3000;
let deviceCache: { key: string; createdAt: number; data: unknown[] } | null = null;

function clearDeviceCache(): void {
  deviceCache = null;
}

function sendJson(res: http.ServerResponse, status: number, body: JsonResponse): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true',
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf-8').trim();
      if (!text) return resolve({});
      try { resolve(JSON.parse(text)); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function adbExec(args: string, deviceId?: string): string {
  const prefix = deviceId ? `adb -s ${deviceId}` : 'adb';
  try {
    return execSync(`${prefix} ${args}`, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch (err: any) {
    return err.stdout?.toString().trim() || err.stderr?.toString().trim() || '';
  }
}

async function adbExecAsync(args: string, deviceId?: string, timeout = 5000): Promise<string> {
  const prefix = deviceId ? `adb -s ${deviceId}` : 'adb';
  try {
    const result = await execAsync(`${prefix} ${args}`, { encoding: 'utf-8', timeout });
    return String(result.stdout || '').trim();
  } catch (err: any) {
    return err.stdout?.toString().trim() || err.stderr?.toString().trim() || '';
  }
}

async function checkProxyEnabled(deviceId: string): Promise<boolean> {
  const proxy = await adbExecAsync('shell settings get global http_proxy', deviceId, 3000);
  const enabled = Boolean(proxy && proxy !== ':0' && proxy !== 'null' && proxy !== '');
  if (enabled && proxy.startsWith('127.0.0.1:')) {
    const port = Number(proxy.split(':')[1]) || 8888;
    await adbExecAsync(`reverse tcp:${port} tcp:${port}`, deviceId, 3000);
  }
  return enabled;
}

async function checkCertInstalled(deviceId: string, certHash?: string): Promise<boolean> {
  if (!certHash) return false;
  const paths = [
    `/system/etc/security/cacerts/${certHash}.0`,
    `/data/misc/user/*/cacerts-added/${certHash}.0`,
    `/data/misc/keychain/certs-added/${certHash}.0`,
  ];
  for (const certPath of paths) {
    const output = await adbExecAsync(`shell ls ${certPath}`, deviceId, 3000);
    if (output.includes(certHash) && !output.toLowerCase().includes('no such file')) return true;
  }
  return false;
}

async function listDevices(certHash = '', force = false) {
  const cacheKey = certHash || '';
  if (!force && deviceCache?.key === cacheKey && Date.now() - deviceCache.createdAt < DEVICE_CACHE_TTL_MS) {
    return deviceCache.data;
  }

  const output = await adbExecAsync('devices -l', undefined, 3000);
  const lines = output.split('\n').slice(1);
  const devices = await Promise.all(lines.map(async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    const id = parts[0];
    const statusStr = parts[1];
    let status: DeviceStatus = 'offline';
    if (statusStr === 'device') status = 'online';
    else if (statusStr === 'unauthorized') status = 'unauthorized';

    let model = '';
    let ipAddress = '';
    let androidVersion = '';
    let proxyEnabled = false;
    let certInstalled = false;

    if (status === 'online') {
      const ipTask = id.includes(':')
        ? Promise.resolve(id.split(':')[0])
        : adbExecAsync('shell ip -4 addr show wlan0', id, 3000).then((ipOutput) => {
            const match = ipOutput.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
            return match ? match[1] : '';
          });

      [model, androidVersion, proxyEnabled, certInstalled, ipAddress] = await Promise.all([
        adbExecAsync('shell getprop ro.product.model', id, 3000),
        adbExecAsync('shell getprop ro.build.version.release', id, 3000),
        checkProxyEnabled(id),
        checkCertInstalled(id, certHash),
        ipTask,
      ]);
    }

    return { id, model, androidVersion, ipAddress, status, proxyEnabled, certInstalled };
  }));

  const result = devices.filter(Boolean) as unknown[];
  deviceCache = { key: cacheKey, createdAt: Date.now(), data: result };
  return result;
}

function connectDevice(ip: string, port = 5555): JsonResponse {
  const output = adbExec(`connect ${ip}:${port}`);
  clearDeviceCache();
  return { success: output.includes('connected') || output.includes('already'), message: output };
}

function disconnectDevice(deviceId: string): JsonResponse {
  const output = adbExec(`disconnect ${deviceId}`);
  clearDeviceCache();
  return { success: true, message: output };
}

function enableProxy(deviceId: string, proxyHost: string, proxyPort = 8888): JsonResponse {
  if (!proxyHost) return { success: false, message: '缺少 proxyHost' };
  const reverseResult = adbExec(`reverse tcp:${proxyPort} tcp:${proxyPort}`, deviceId);
  const target = reverseResult.toLowerCase().includes('error') || reverseResult.toLowerCase().includes('failed')
    ? `${proxyHost}:${proxyPort}`
    : `127.0.0.1:${proxyPort}`;
  const result = adbExec(`shell settings put global http_proxy ${target}`, deviceId);
  const proxy = adbExec('shell settings get global http_proxy', deviceId);
  const verify = Boolean(proxy && proxy !== ':0' && proxy !== 'null');
  clearDeviceCache();
  return { success: verify, message: verify ? `代理已设置: ${proxy}` : `设置失败: ${result}` };
}

function disableProxy(deviceId: string): JsonResponse {
  adbExec('shell settings put global http_proxy :0', deviceId);
  adbExec('reverse --remove tcp:8888', deviceId);
  adbExec('shell settings delete global http_proxy', deviceId);
  adbExec('shell settings delete global global_http_proxy_host', deviceId);
  adbExec('shell settings delete global global_http_proxy_port', deviceId);
  const proxy = adbExec('shell settings get global http_proxy', deviceId);
  const verify = !proxy || proxy === ':0' || proxy === 'null';
  clearDeviceCache();
  return { success: verify, message: verify ? '代理已清除' : '清除可能未完全生效，建议重启设备' };
}

async function installCert(deviceId: string, certUrl: string, certHash: string): Promise<JsonResponse> {
  if (!certUrl || !certHash) return { success: false, message: '缺少 certUrl 或 certHash' };
  const response = await fetch(certUrl);
  if (!response.ok) return { success: false, message: `下载证书失败: ${response.status}` };

  const certPath = path.join(os.tmpdir(), `mitm-ca-${Date.now()}.crt`);
  const remotePath = `/system/etc/security/cacerts/${certHash}.0`;
  fs.writeFileSync(certPath, Buffer.from(await response.arrayBuffer()));

  adbExec('root', deviceId);
  await new Promise(resolve => setTimeout(resolve, 2000));
  adbExec('remount', deviceId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  adbExec(`push "${certPath}" ${remotePath}`, deviceId);
  adbExec(`shell chmod 644 ${remotePath}`, deviceId);

  try { fs.unlinkSync(certPath); } catch {}
  const ok = await checkCertInstalled(deviceId, certHash);
  clearDeviceCache();
  return { success: ok, message: ok ? `证书已安装到 ${remotePath}，建议重启设备生效` : '证书推送后验证失败' };
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') return sendJson(res, 204, { success: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathName = url.pathname;

  if (req.method === 'GET' && pathName === '/health') {
    return sendJson(res, 200, { success: true, data: { mode: 'adb-agent', port: PORT } });
  }

  if (req.method === 'GET' && pathName === '/api/mitm/devices') {
    return sendJson(res, 200, { success: true, data: await listDevices(url.searchParams.get('certHash') || '', url.searchParams.get('force') === '1') });
  }

  if (req.method === 'POST' && pathName === '/api/mitm/devices/connect') {
    const body = await readBody(req);
    if (!body.ip) return sendJson(res, 400, { success: false, message: '缺少 IP 地址' });
    return sendJson(res, 200, connectDevice(body.ip, body.port || 5555));
  }

  const match = pathName.match(/^\/api\/mitm\/devices\/(.+)\/(disconnect|proxy\/enable|proxy\/disable|cert\/install)$/);
  if (req.method === 'POST' && match) {
    const deviceId = decodeURIComponent(match[1]);
    const action = match[2];
    const body = await readBody(req);
    if (action === 'disconnect') return sendJson(res, 200, disconnectDevice(deviceId));
    if (action === 'proxy/enable') return sendJson(res, 200, enableProxy(deviceId, body.proxyHost, body.proxyPort || 8888));
    if (action === 'proxy/disable') return sendJson(res, 200, disableProxy(deviceId));
    if (action === 'cert/install') return sendJson(res, 200, await installCert(deviceId, body.certUrl, body.certHash));
  }

  return sendJson(res, 404, { success: false, message: '端点不存在' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(err => sendJson(res, 500, { success: false, message: err instanceof Error ? err.message : String(err) }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                 ADB Agent 已启动                          ║
╠════════════════════════════════════════════════════════════╣
║  本机代理地址: http://127.0.0.1:${PORT}                    ║
║  请保持此窗口运行，然后在网页选择「本机 ADB」              ║
╚════════════════════════════════════════════════════════════╝
  `);
});
