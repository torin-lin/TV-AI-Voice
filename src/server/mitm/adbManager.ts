/**
 * ADB 设备管理模块
 * - 设备列表、连接、断开
 * - 代理设置/清除
 * - 证书安装
 * - 包名映射
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { getCACertPath, getCACertHashOld } from './certManager';
import os from 'os';

const execAsync = promisify(exec);
const DEVICE_CACHE_TTL_MS = 3000;
let deviceCache: { createdAt: number; data: MitmDevice[] } | null = null;

function clearDeviceCache(): void {
  deviceCache = null;
}

export interface MitmDevice {
  id: string;
  model: string;
  androidVersion: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'unauthorized';
  proxyEnabled: boolean;
  certInstalled: boolean;
}

function adbExec(args: string, deviceId?: string): string {
  const prefix = deviceId ? `adb -s ${deviceId}` : 'adb';
  try {
    return execSync(`${prefix} ${args}`, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch (err: any) {
    return err.stdout?.toString().trim() || '';
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

/**
 * 获取本机局域网 IP（用于设置 TV 代理目标）
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * 列出所有 ADB 设备
 */
export async function listDevices(force = false): Promise<MitmDevice[]> {
  if (!force && deviceCache && Date.now() - deviceCache.createdAt < DEVICE_CACHE_TTL_MS) {
    return deviceCache.data;
  }

  const output = await adbExecAsync('devices -l', undefined, 3000);
  const lines = output.split('\n').slice(1); // 跳过 "List of devices attached"
  const devices = await Promise.all(lines.map(async (line): Promise<MitmDevice | null> => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    const id = parts[0];
    const statusStr = parts[1];

    let status: MitmDevice['status'] = 'offline';
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
        checkCertInstalled(id),
        ipTask,
      ]);
    }

    return { id, model, androidVersion, ipAddress, status, proxyEnabled, certInstalled };
  }));

  const result = devices.filter((device): device is MitmDevice => Boolean(device));
  deviceCache = { createdAt: Date.now(), data: result };
  return result;
}

/**
 * 连接远程设备
 */
export function connectDevice(ip: string, port = 5555): { success: boolean; message: string } {
  const output = adbExec(`connect ${ip}:${port}`);
  clearDeviceCache();
  const success = output.includes('connected') || output.includes('already');
  return { success, message: output };
}

/**
 * 断开设备
 */
export function disconnectDevice(deviceId: string): { success: boolean; message: string } {
  const output = adbExec(`disconnect ${deviceId}`);
  clearDeviceCache();
  return { success: true, message: output };
}

/**
 * 检查代理是否已设置
 */
async function checkProxyEnabled(deviceId: string): Promise<boolean> {
  const proxy = await adbExecAsync('shell settings get global http_proxy', deviceId, 3000);
  const enabled = Boolean(proxy && proxy !== ':0' && proxy !== 'null' && proxy !== '');
  if (enabled && proxy.startsWith('127.0.0.1:')) {
    const port = Number(proxy.split(':')[1]) || 8888;
    await adbExecAsync(`reverse tcp:${port} tcp:${port}`, deviceId, 3000);
  }
  return enabled;
}

/**
 * 设置 HTTP 代理
 */
export function enableProxy(deviceId: string, proxyPort = 8888): { success: boolean; message: string } {
  const localIp = getLocalIP();
  const reverseResult = adbExec(`reverse tcp:${proxyPort} tcp:${proxyPort}`, deviceId);
  const target = reverseResult.toLowerCase().includes('error') || reverseResult.toLowerCase().includes('failed')
    ? `${localIp}:${proxyPort}`
    : `127.0.0.1:${proxyPort}`;
  const result = adbExec(`shell settings put global http_proxy ${target}`, deviceId);
  const proxy = adbExec('shell settings get global http_proxy', deviceId);
  const verify = Boolean(proxy && proxy !== ':0' && proxy !== 'null' && proxy !== '');
  clearDeviceCache();
  return { success: verify, message: verify ? `代理已设置: ${proxy}` : `设置失败: ${result}` };
}

/**
 * 清除 HTTP 代理
 */
export function disableProxy(deviceId: string): { success: boolean; message: string } {
  adbExec('shell settings put global http_proxy :0', deviceId);
  adbExec('reverse --remove tcp:8888', deviceId);
  // Android 某些版本需要额外清除
  adbExec('shell settings delete global http_proxy', deviceId);
  adbExec('shell settings delete global global_http_proxy_host', deviceId);
  adbExec('shell settings delete global global_http_proxy_port', deviceId);
  const proxy = adbExec('shell settings get global http_proxy', deviceId);
  const verify = !proxy || proxy === ':0' || proxy === 'null';
  clearDeviceCache();
  return { success: verify, message: verify ? '代理已清除' : '清除可能未完全生效，建议重启设备' };
}

/**
 * 检查证书是否已安装
 */
async function checkCertInstalled(deviceId: string): Promise<boolean> {
  const hash = getCACertHashOld();
  const paths = [
    `/system/etc/security/cacerts/${hash}.0`,
    `/data/misc/user/*/cacerts-added/${hash}.0`,
    `/data/misc/keychain/certs-added/${hash}.0`,
  ];
  for (const certPath of paths) {
    const output = await adbExecAsync(`shell ls ${certPath}`, deviceId, 3000);
    if (output.includes(hash) && !output.toLowerCase().includes('no such file')) return true;
  }
  return false;
}

/**
 * 安装 CA 证书到系统信任区
 */
export async function installCert(deviceId: string): Promise<{ success: boolean; message: string }> {
  try {
    const certPath = getCACertPath();
    const hash = getCACertHashOld();
    const remotePath = `/system/etc/security/cacerts/${hash}.0`;

    // adb root
    adbExec('root', deviceId);
    await new Promise(r => setTimeout(r, 2000));

    // adb remount
    adbExec('remount', deviceId);
    await new Promise(r => setTimeout(r, 1000));

    // push 证书
    adbExec(`push "${certPath}" ${remotePath}`, deviceId);

    // 设置权限
    adbExec(`shell chmod 644 ${remotePath}`, deviceId);

    // 验证
    const verify = adbExec(`shell ls ${remotePath}`, deviceId);
    clearDeviceCache();
    if (verify.includes(hash)) {
      return { success: true, message: `证书已安装到 ${remotePath}，建议重启设备生效` };
    }
    return { success: false, message: '证书推送后验证失败' };
  } catch (err) {
    return { success: false, message: `安装失败: ${(err as Error).message}` };
  }
}

/**
 * 获取设备上的 UID → 包名映射
 */
export function getPackageMap(deviceId: string): Map<number, string> {
  const map = new Map<number, string>();
  const output = adbExec('shell pm list packages -U', deviceId);
  for (const line of output.split('\n')) {
    // 格式: package:com.example.app uid:10123
    const match = line.match(/package:(\S+)\s+uid:(\d+)/);
    if (match) {
      map.set(Number(match[2]), match[1]);
    }
  }
  return map;
}

/**
 * 通过源端口查询 UID（从 /proc/net/tcp6）
 */
export function getUidByPort(deviceId: string, srcPort: number): number | null {
  const output = adbExec('shell cat /proc/net/tcp6', deviceId);
  const hexPort = srcPort.toString(16).toUpperCase().padStart(4, '0');
  for (const line of output.split('\n')) {
    if (line.includes(`:${hexPort} `)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 8) {
        return Number(parts[7]);
      }
    }
  }
  return null;
}
