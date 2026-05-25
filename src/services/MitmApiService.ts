/**
 * MITM 代理前端 API 服务
 */

import { authFetch } from './authFetch';
import { getCurrentWorkspaceId } from './WorkspaceContext';

export type MitmApiSource = 'server' | 'local';

const MITM_API_SOURCE_KEY = 'mitm_api_source';
const MITM_LOCAL_HELPER_BASE_KEY = 'mitm_local_helper_base';
const DEFAULT_LOCAL_HELPER_BASE = 'http://127.0.0.1:3131';

function isLocalWebAccess(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
}

export function getMitmApiSource(): MitmApiSource {
  const saved = localStorage.getItem(MITM_API_SOURCE_KEY);
  if (saved === 'server' || saved === 'local') return saved;
  return isLocalWebAccess() ? 'server' : 'local';
}

export function setMitmApiSource(source: MitmApiSource): void {
  localStorage.setItem(MITM_API_SOURCE_KEY, source);
}

export function getLocalHelperBaseUrl(): string {
  return localStorage.getItem(MITM_LOCAL_HELPER_BASE_KEY) || DEFAULT_LOCAL_HELPER_BASE;
}

export function setLocalHelperBaseUrl(baseUrl: string): void {
  localStorage.setItem(MITM_LOCAL_HELPER_BASE_KEY, baseUrl.replace(/\/+$/, ''));
}

function getServerBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

function getDeviceBaseUrl(): string {
  return getMitmApiSource() === 'local' ? getLocalHelperBaseUrl() : getServerBaseUrl();
}

function getAuthQuery(): string {
  const params = new URLSearchParams();
  params.set('workspaceId', getCurrentWorkspaceId());
  const token = localStorage.getItem('auth_token');
  if (token) params.set('token', token);
  return params.toString();
}

function deviceFetch(input: string, init: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  return getMitmApiSource() === 'local' ? fetchWithTimeout(input, init, timeoutMs) : authFetch(input, init);
}

function serverFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return authFetch(input, init);
}

function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => window.clearTimeout(timer));
}

// ==================== 设备管理 ====================

export interface MitmDevice {
  id: string;
  model: string;
  androidVersion: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'unauthorized';
  proxyEnabled: boolean;
  certInstalled: boolean;
}

export async function fetchDevices(options?: { force?: boolean }): Promise<MitmDevice[]> {
  const params = new URLSearchParams();
  if (options?.force) params.set('force', '1');
  if (getMitmApiSource() === 'local') {
    const certInfoRes = await serverFetch(`${getServerBaseUrl()}/api/mitm/cert/info`);
    const certInfoJson = await certInfoRes.json();
    if (certInfoJson.success && certInfoJson.data?.hash) {
      params.set('certHash', certInfoJson.data.hash);
    }
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await deviceFetch(`${getDeviceBaseUrl()}/api/mitm/devices${qs}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function connectDevice(ip: string, port = 5555): Promise<string> {
  const res = await deviceFetch(`${getDeviceBaseUrl()}/api/mitm/devices/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, port }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.message;
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  const res = await deviceFetch(`${getDeviceBaseUrl()}/api/mitm/devices/${encodeURIComponent(deviceId)}/disconnect`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

export async function enableDeviceProxy(deviceId: string): Promise<string> {
  const proxyStatus = await fetchProxyStatus();
  const res = await deviceFetch(`${getDeviceBaseUrl()}/api/mitm/devices/${encodeURIComponent(deviceId)}/proxy/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proxyHost: proxyStatus.localIp, proxyPort: proxyStatus.port }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.message;
}

export async function disableDeviceProxy(deviceId: string): Promise<string> {
  const res = await deviceFetch(`${getDeviceBaseUrl()}/api/mitm/devices/${encodeURIComponent(deviceId)}/proxy/disable`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.message;
}

export async function installDeviceCert(deviceId: string): Promise<string> {
  const certInfoRes = await serverFetch(`${getServerBaseUrl()}/api/mitm/cert/info`);
  const certInfoJson = await certInfoRes.json();
  if (!certInfoJson.success) throw new Error(certInfoJson.message);
  const res = await deviceFetch(`${getDeviceBaseUrl()}/api/mitm/devices/${encodeURIComponent(deviceId)}/cert/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      certUrl: `${getServerBaseUrl()}/api/mitm/cert/download?${getAuthQuery()}`,
      certHash: certInfoJson.data.hash,
    }),
  }, 60000);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.message;
}

// ==================== 代理控制 ====================

export interface ProxyStatus {
  running: boolean;
  localIp: string;
  port: number;
}

export async function fetchProxyStatus(): Promise<ProxyStatus> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/proxy/status`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function startProxy(): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/proxy/start`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

export async function stopProxy(): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/proxy/stop`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

// ==================== 请求历史 ====================

export interface MitmRequest {
  id: string;
  ownerId?: string | null;
  deviceId: string;
  timestamp: number;
  method: string;
  url: string;
  host: string;
  path: string;
  requestHeaders: string;
  requestBody: string | null;
  responseStatus: number;
  responseHeaders: string;
  responseBody: string | null;
  packageName: string | null;
  duration: number;
  size: number;
  matched: boolean;
  matchedRuleId: string | null;
  modified: boolean;
}

const MITM_REQUEST_DB_NAME = 'mitm-proxy-request-history';
const MITM_REQUEST_DB_VERSION = 1;
const MITM_REQUEST_STORE = 'requests';
const MITM_REQUEST_HISTORY_LIMIT = 500;
const MITM_REQUEST_PRUNE_INTERVAL = 20;

let mitmRequestDbPromise: Promise<IDBDatabase> | null = null;
let mitmRequestSaveCountSincePrune = 0;

function openMitmRequestDb(): Promise<IDBDatabase> {
  if (mitmRequestDbPromise) return mitmRequestDbPromise;
  mitmRequestDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(MITM_REQUEST_DB_NAME, MITM_REQUEST_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(MITM_REQUEST_STORE)
        ? request.transaction!.objectStore(MITM_REQUEST_STORE)
        : db.createObjectStore(MITM_REQUEST_STORE, { keyPath: 'id' });
      if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
      if (!store.indexNames.contains('deviceId')) store.createIndex('deviceId', 'deviceId');
      if (!store.indexNames.contains('host')) store.createIndex('host', 'host');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开抓包记录本地库失败'));
  });
  return mitmRequestDbPromise;
}

function runMitmRequestTx<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  return openMitmRequestDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(MITM_REQUEST_STORE, mode);
    const store = tx.objectStore(MITM_REQUEST_STORE);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('抓包记录本地库操作失败'));
    tx.onabort = () => reject(tx.error || new Error('抓包记录本地库操作已中止'));
    Promise.resolve(handler(store))
      .then((value) => { result = value; })
      .catch((error) => {
        tx.abort();
        reject(error);
      });
  }));
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('抓包记录本地库请求失败'));
  });
}

function normalizeMitmRequest(record: MitmRequest): MitmRequest {
  return {
    ...record,
    ownerId: record.ownerId ?? null,
    requestHeaders: record.requestHeaders || '{}',
    requestBody: record.requestBody ?? null,
    responseHeaders: record.responseHeaders || '{}',
    responseBody: record.responseBody ?? null,
    packageName: record.packageName ?? null,
    matched: Boolean(record.matched),
    modified: Boolean(record.modified),
  };
}

async function pruneMitmRequestHistory(store: IDBObjectStore): Promise<void> {
  let count = await requestToPromise<number>(store.count());
  if (count <= MITM_REQUEST_HISTORY_LIMIT) return;

  const index = store.index('timestamp');
  await new Promise<void>((resolve, reject) => {
    const cursorReq = index.openCursor();
    cursorReq.onerror = () => reject(cursorReq.error || new Error('清理抓包记录失败'));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || count <= MITM_REQUEST_HISTORY_LIMIT) {
        resolve();
        return;
      }
      cursor.delete();
      count -= 1;
      cursor.continue();
    };
  });
}

export async function saveCapturedRequest(record: MitmRequest): Promise<void> {
  const normalized = normalizeMitmRequest(record);
  await runMitmRequestTx('readwrite', async (store) => {
    store.put(normalized);
    mitmRequestSaveCountSincePrune += 1;
    if (mitmRequestSaveCountSincePrune >= MITM_REQUEST_PRUNE_INTERVAL) {
      mitmRequestSaveCountSincePrune = 0;
      await pruneMitmRequestHistory(store);
    }
  });
}

export async function fetchRequests(options?: { deviceId?: string; host?: string; limit?: number; offset?: number }): Promise<MitmRequest[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  return runMitmRequestTx('readonly', (store) => new Promise<MitmRequest[]>((resolve, reject) => {
    const rows: MitmRequest[] = [];
    let skipped = 0;
    const cursorReq = store.index('timestamp').openCursor(null, 'prev');
    cursorReq.onerror = () => reject(cursorReq.error || new Error('读取抓包记录失败'));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || rows.length >= limit) {
        resolve(rows);
        return;
      }

      const row = normalizeMitmRequest(cursor.value as MitmRequest);
      const hostMatched = !options?.host || row.host.toLowerCase().includes(options.host.toLowerCase());
      const deviceMatched = !options?.deviceId || row.deviceId === options.deviceId;
      if (hostMatched && deviceMatched) {
        if (skipped < offset) {
          skipped += 1;
        } else {
          rows.push(row);
        }
      }
      cursor.continue();
    };
  }));
}

export async function fetchRequestDetail(id: string): Promise<MitmRequest> {
  const record = await runMitmRequestTx('readonly', (store) => requestToPromise<MitmRequest | undefined>(store.get(id)));
  if (!record) throw new Error('未找到请求记录');
  return normalizeMitmRequest(record);
}

export async function fetchFullResponseBody(id: string): Promise<string> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/requests/${encodeURIComponent(id)}/full-response-body`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.body;
}

export async function clearAllRequests(deviceId?: string): Promise<void> {
  await runMitmRequestTx('readwrite', (store) => new Promise<void>((resolve, reject) => {
    if (!deviceId) {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error || new Error('清空抓包记录失败'));
      return;
    }

    const cursorReq = store.index('deviceId').openCursor(IDBKeyRange.only(deviceId));
    cursorReq.onerror = () => reject(cursorReq.error || new Error('清空设备抓包记录失败'));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
  }));
}

// ==================== 规则管理 ====================

export interface MitmRule {
  id: string;
  ownerId?: string | null;
  name: string;
  enabled: boolean;
  priority: number;
  deviceScope: string;
  isPublic: boolean;
  conditions: {
    urlContains?: string;
    urlRegex?: string;
    packageName?: string;
    method?: string;
  };
  action: {
    type: 'replaceBody' | 'modifyJson' | 'modifyStatus' | 'delay' | 'breakpoint';
    replaceBody?: string;
    jsonModifications?: Array<{ path: string; value: any }>;
    statusCode?: number;
    delayMs?: number;
    breakpointOn?: 'request' | 'response' | 'both';
  };
  description?: string;
  createdAt: number;
  updatedAt: number;
  hitCount: number;
}

export async function fetchRules(): Promise<MitmRule[]> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function fetchPublicRules(): Promise<MitmRule[]> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules/public`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function createRule(data: Partial<MitmRule>): Promise<MitmRule> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function updateRule(id: string, data: Partial<MitmRule>): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

export async function deleteRule(id: string): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

export async function toggleRule(id: string): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules/${encodeURIComponent(id)}/toggle`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

export async function copyPublicRule(id: string): Promise<MitmRule> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rules/public/${encodeURIComponent(id)}/copy`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function bindRuleScopeToDevice(deviceId: string): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/rule-scope/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

// ==================== 证书 ====================

export function getCertDownloadUrl(): string {
  return `${getServerBaseUrl()}/api/mitm/cert/download?${getAuthQuery()}`;
}

export async function regenerateCert(): Promise<void> {
  const res = await serverFetch(`${getServerBaseUrl()}/api/mitm/cert/regenerate`, { method: 'POST' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

// ==================== WebSocket ====================

export function createMitmWebSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('auth_token');
  const params = new URLSearchParams();
  params.set('workspaceId', getCurrentWorkspaceId());
  if (token) params.set('token', token);
  const qs = `?${params.toString()}`;
  return new WebSocket(`${protocol}//${window.location.host}/ws/mitm${qs}`);
}
