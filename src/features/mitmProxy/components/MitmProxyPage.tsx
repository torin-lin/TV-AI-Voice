/**
 * MITM 代理主页面
 * 集成设备管理、请求列表、请求详情、规则管理
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  fetchDevices, connectDevice, disconnectDevice, enableDeviceProxy, disableDeviceProxy, installDeviceCert,
  fetchProxyStatus, startProxy, stopProxy,
  fetchRequests, fetchRequestDetail, fetchFullResponseBody, clearAllRequests, fetchRules, fetchPublicRules, createRule, deleteRule, toggleRule, updateRule, copyPublicRule,
  createMitmWebSocket, saveCapturedRequest,
  getLocalHelperBaseUrl, setLocalHelperBaseUrl, setMitmApiSource,
  getCertDownloadUrl,
  bindRuleScopeToDevice,
  MitmDevice, MitmRequest, MitmRule, ProxyStatus,
} from '../../../services/MitmApiService';
import { useToast } from '../../../components/common/ToastProvider';

const JSON_FORMAT_BODY_LIMIT = 200 * 1024;
const CAPTURE_TRUNCATED_MARKER = '...[已截断';

const toRequestListItem = (request: MitmRequest): MitmRequest => ({
  ...request,
  requestBody: null,
  responseBody: null,
});

const MitmProxyPage: React.FC = () => {
  const ADB_AGENT_DOWNLOAD_URL = '/downloads/adb-agent-windows.exe';
  const { showToast } = useToast();
  const [devices, setDevices] = useState<MitmDevice[]>([]);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [requests, setRequests] = useState<MitmRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MitmRequest | null>(null);
  const [rules, setRules] = useState<MitmRule[]>([]);
  const [publicRules, setPublicRules] = useState<MitmRule[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [ruleSearchFilter, setRuleSearchFilter] = useState('');
  const [ruleView, setRuleView] = useState<'mine' | 'public'>('mine');
  const [connectIp, setConnectIp] = useState('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showRulesDrawer, setShowRulesDrawer] = useState(false);
  const [localHelperBase, setLocalHelperBase] = useState(() => getLocalHelperBaseUrl());
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [showCertGuide, setShowCertGuide] = useState(false);
  const [agentAvailable, setAgentAvailable] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [installingCertIds, setInstallingCertIds] = useState<Set<string>>(() => new Set());
  const [breakpoints, setBreakpoints] = useState<any[]>([]);
  const [editingBp, setEditingBp] = useState<any | null>(null);
  const [bpEditBody, setBpEditBody] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  // 加载初始数据
  useEffect(() => {
    setMitmApiSource('local');
    loadProxyStatus();
    loadRequests();
    loadRules();
  }, [localHelperBase]);

  useEffect(() => {
    let stopped = false;
    let wasAvailable = false;
    let timeoutId: number | undefined;
    let retryDelay = 3000;

    const checkAgent = async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 800);
      try {
        const res = await fetch(`${localHelperBase.replace(/\/+$/, '')}/health`, { signal: controller.signal });
        const json = res.ok ? await res.json() : null;
        const available = Boolean(json?.success);
        setAgentAvailable(available);
        retryDelay = available ? 3000 : Math.min(retryDelay * 2, 30000);
        if (available && !wasAvailable) {
          loadDevices();
          loadProxyStatus();
          loadRequests();
          loadRules();
        }
        wasAvailable = available;
      } catch {
        setAgentAvailable(false);
        wasAvailable = false;
        retryDelay = Math.min(retryDelay * 2, 30000);
      } finally {
        window.clearTimeout(timer);
        if (!stopped) {
          timeoutId = window.setTimeout(checkAgent, retryDelay);
        }
      }
    };

    checkAgent();
    return () => {
      stopped = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [localHelperBase]);

  useEffect(() => {
    if (selectedDeviceId && !devices.some(d => d.id === selectedDeviceId)) {
      setSelectedDeviceId('');
    }
  }, [devices, selectedDeviceId]);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const selectedDeviceRequestKey = selectedDevice?.ipAddress || selectedDevice?.id || '';
  const knownDeviceRequestKeys = new Set(devices.flatMap(d => [d.id, d.ipAddress]).filter(Boolean));
  const isRequestInSelectedScope = (deviceId: string) => {
    if (!selectedDeviceRequestKey) return true;
    if (deviceId === selectedDeviceRequestKey || deviceId === selectedDevice?.id || deviceId === selectedDevice?.ipAddress) return true;
    if (deviceId === '127.0.0.1' || deviceId === '::1') return true;
    return !knownDeviceRequestKeys.has(deviceId);
  };

  // WebSocket 实时请求
  useEffect(() => {
    const ws = createMitmWebSocket();
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'newRequest') {
          if (msg.data) saveCapturedRequest(msg.data).catch(() => {});
          if (msg.data?.deviceId && !isRequestInSelectedScope(msg.data.deviceId)) return;
          setRequests(prev => [toRequestListItem(msg.data), ...prev].slice(0, 500));
        } else if (msg.type === 'breakpointHit') {
          setBreakpoints(prev => [...prev, msg.data]);
        } else if (msg.type === 'breakpointResolved') {
          setBreakpoints(prev => prev.filter(bp => bp.id !== msg.data.id));
          if (editingBp?.id === msg.data.id) setEditingBp(null);
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
    return () => { ws.close(); };
  }, [localHelperBase, selectedDeviceRequestKey, devices]);

  const loadDevices = async (force = false) => { try { setDevices(await fetchDevices({ force })); } catch {} };
  const loadProxyStatus = async () => { try { setProxyStatus(await fetchProxyStatus()); } catch {} };
  const loadRequests = async () => {
    try {
      const rows = await fetchRequests({ limit: 200 });
      setRequests(rows.filter(r => isRequestInSelectedScope(r.deviceId)).map(toRequestListItem));
    } catch {}
  };
  const loadRules = async () => {
    try {
      const [myRows, publicRows] = await Promise.all([fetchRules(), fetchPublicRules()]);
      setRules(myRows);
      setPublicRules(publicRows);
    } catch {}
  };
  const handleSelectRequest = async (request: MitmRequest) => {
    setSelectedRequest(request);
    try {
      setSelectedRequest(await fetchRequestDetail(request.id));
    } catch {}
  };

  useEffect(() => {
    loadRequests();
    setSelectedRequest(null);
  }, [selectedDeviceRequestKey]);

  const handleStartProxy = async () => {
    try { await startProxy(); showToast('代理已启动', 'success'); loadProxyStatus(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleStopProxy = async () => {
    try { await stopProxy(); showToast('代理已停止', 'success'); loadProxyStatus(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleConnect = async () => {
    if (!connectIp.trim()) return;
    try { const msg = await connectDevice(connectIp.trim()); showToast(msg, 'success'); setConnectIp(''); loadDevices(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleEnableProxy = async (id: string) => {
    try {
      if (!proxyStatus?.running) {
        await startProxy();
        showToast('抓包服务已启动', 'success');
        await loadProxyStatus();
      }
      const msg = await enableDeviceProxy(id);
      const device = devices.find(d => d.id === id);
      await bindRuleScopeToDevice(device?.ipAddress || id);
      await bindRuleScopeToDevice('127.0.0.1');
      showToast(msg, 'success');
      loadDevices();
    }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleDisableProxy = async (id: string) => {
    try { const msg = await disableDeviceProxy(id); showToast(msg, 'success'); loadDevices(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleInstallCert = async (id: string) => {
    setInstallingCertIds(prev => new Set(prev).add(id));
    try {
      showToast('正在安装证书，请稍候...', 'success');
      const msg = await installDeviceCert(id);
      showToast(msg, 'success');
      loadDevices(true);
    }
    catch (e) { showToast((e as Error).message, 'error'); }
    finally {
      setInstallingCertIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  const handleClearRequests = async () => {
    try { await clearAllRequests(selectedDeviceRequestKey || undefined); setRequests([]); setSelectedRequest(null); showToast('已清空', 'success'); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleToggleRule = async (id: string) => {
    try { await toggleRule(id); loadRules(); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleDeleteRule = async (id: string) => {
    if (!confirm('确定删除此规则？')) return;
    try { await deleteRule(id); loadRules(); showToast('已删除', 'success'); }
    catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleToggleRulePublic = async (rule: MitmRule) => {
    try {
      await updateRule(rule.id, { isPublic: !rule.isPublic });
      loadRules();
      showToast(!rule.isPublic ? '已发布到公共规则库' : '已取消公开', 'success');
    } catch (e) { showToast((e as Error).message, 'error'); }
  };
  const handleCopyPublicRule = async (id: string) => {
    try {
      await copyPublicRule(id);
      setRuleView('mine');
      loadRules();
      showToast('已添加到我的规则，默认未启用', 'success');
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  const handleSaveLocalHelperBase = () => {
    const base = localHelperBase.trim().replace(/\/+$/, '');
    if (!base) return;
    setLocalHelperBaseUrl(base);
    setLocalHelperBase(base);
    setMitmApiSource('local');
    showToast('ADB 代理地址已保存', 'success');
  };

  const handleResolveBp = (id: string, action: 'forward' | 'passthrough', modifiedBody?: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const msg: any = { type: 'resolveBreakpoint', id, action };
    if (action === 'forward' && modifiedBody !== undefined) {
      const bp = breakpoints.find(b => b.id === id);
      if (bp?.phase === 'request') {
        msg.modifiedRequestBody = modifiedBody;
      } else {
        msg.modifiedResponseBody = modifiedBody;
      }
    }
    ws.send(JSON.stringify(msg));
    setBreakpoints(prev => prev.filter(bp => bp.id !== id));
    setEditingBp(null);
  };

  const filteredRequests = requests.filter(r => {
    if (!searchFilter.trim()) return true;
    const kw = searchFilter.toLowerCase();
    return r.url.toLowerCase().includes(kw) || (r.packageName || '').toLowerCase().includes(kw) || r.host.toLowerCase().includes(kw);
  });
  const requestScopeLabel = selectedDevice
    ? `${selectedDevice.model || selectedDevice.id}${selectedDevice.ipAddress ? ` (${selectedDevice.ipAddress})` : ''}`
    : '全部设备';
  const matchRuleFilter = (rule: MitmRule) => {
    const kw = ruleSearchFilter.trim().toLowerCase();
    if (!kw) return true;
    return [
      rule.name,
      rule.description || '',
      rule.conditions.urlContains || '',
      rule.conditions.urlRegex || '',
      rule.conditions.packageName || '',
      rule.action.type,
    ].some(value => value.toLowerCase().includes(kw));
  };
  const visibleRules = rules.filter(matchRuleFilter);
  const visiblePublicRules = publicRules.filter(matchRuleFilter);

  const isLocalAccess = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 非本地访问提示 */}
      {!isLocalAccess && !agentAvailable && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-300 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="text-sm">
              <p className="font-medium text-amber-800">远程访问时需要安装 ADB 代理</p>
              <p className="text-amber-700 mt-1">
                网页通过内网穿透打开时，服务器无法直接读取访问者电脑上的 ADB。请在访问者自己的电脑上下载安装 ADB 代理：
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={ADB_AGENT_DOWNLOAD_URL}
                  download
                  className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                >
                  下载 ADB 代理
                </a>
                <span className="font-mono text-xs text-amber-700">{window.location.origin}{ADB_AGENT_DOWNLOAD_URL}</span>
              </div>
              <div className="mt-2 bg-white border border-amber-200 rounded px-3 py-2 text-xs text-gray-800">
                <p>1. 下载并双击运行 <code>adb-agent-windows.exe</code></p>
                <p>2. 允许管理员权限，代理会安装为后台服务</p>
                <p>3. 当前页面选择「本机 ADB」并点击刷新</p>
              </div>
              <p className="text-amber-600 mt-2 text-xs">确保 TV 已通过 USB/WiFi ADB 连接到访问者自己的电脑。</p>
            </div>
          </div>
        </div>
      )}

      {/* 顶部：代理状态 + 设备/规则切换 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">🔒 抓包代理</h1>
            <span className={`px-2 py-0.5 rounded text-xs ${proxyStatus?.running ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {proxyStatus?.running ? `运行中 (${proxyStatus.localIp}:${proxyStatus.port})` : '已停止'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 border rounded text-xs ${agentAvailable ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
              本机 ADB · {agentAvailable ? '已连接' : '未连接'}
            </span>
            <button onClick={() => { loadDevices(true); loadProxyStatus(); loadRequests(); loadRules(); }} className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded">刷新</button>
            <button onClick={() => setShowAgentSettings(prev => !prev)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">设置</button>
            {proxyStatus?.running ? (
              <button onClick={handleStopProxy} className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600">停止抓包服务</button>
            ) : (
              <button onClick={handleStartProxy} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">启动抓包服务</button>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => setShowRulesDrawer(true)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200">
            ⚙️ 拦截规则 ({rules.filter(r => r.enabled).length}/{rules.length})
          </button>
          <button onClick={() => setShowCertGuide(prev => !prev)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200">
            手动安装证书
          </button>
        </div>
      </div>

      {showCertGuide && (
        <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-xs text-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-yellow-900">手动安装 CA 证书</p>
              <p>1. 下载证书：<a href={getCertDownloadUrl()} download className="text-blue-700 hover:underline">mitm-ca.crt</a></p>
              <p>2. 把证书传到 TV：可用浏览器下载、U 盘拷贝，或执行 <code className="px-1 bg-white border rounded">adb push mitm-ca.crt /sdcard/Download/</code></p>
              <p>3. 在 TV 设置里进入安全/加密与凭据/从存储安装，选择该证书并安装为 VPN 和应用证书。</p>
              <p>4. 装完后重启 App 或重启设备，再回到本页刷新设备状态。</p>
              <p className="text-yellow-700">如果 App 做了证书固定，即使安装证书也可能拒绝代理，需要额外关闭 pinning。</p>
            </div>
            <button onClick={() => setShowCertGuide(false)} className="px-2 py-1 text-gray-500 hover:bg-yellow-100 rounded">✕</button>
          </div>
        </div>
      )}

      {showAgentSettings && (
        <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-700">ADB 代理地址</span>
            <input
              type="text"
              value={localHelperBase}
              onChange={e => setLocalHelperBase(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveLocalHelperBase()}
              className="w-64 px-2 py-1 border border-blue-200 rounded font-mono"
              placeholder="http://127.0.0.1:3131"
            />
            <button onClick={handleSaveLocalHelperBase} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <input type="text" value={connectIp} onChange={e => setConnectIp(e.target.value)} placeholder="IP:PORT 连接设备" className="px-2 py-1 border border-gray-300 rounded text-sm w-48" onKeyDown={e => e.key === 'Enter' && handleConnect()} />
          <button onClick={handleConnect} className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">连接</button>
          <button onClick={() => loadDevices(true)} className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded text-sm">🔄 刷新</button>
          <select value={selectedDeviceId} onChange={e => { setSelectedDeviceId(e.target.value); setSelectedRequest(null); }} className="px-2 py-1 border border-gray-300 rounded text-sm">
            <option value="">全部请求</option>
            {devices.filter(d => d.status === 'online').map(device => (
              <option key={device.id} value={device.id}>{device.model || device.id}{device.ipAddress ? ` (${device.ipAddress})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {devices.map(device => {
            const certInstalling = installingCertIds.has(device.id);
            return (
              <div
                key={device.id}
                onClick={() => device.status === 'online' && setSelectedDeviceId(device.id === selectedDeviceId ? '' : device.id)}
                className={`flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs ${device.status === 'online' ? 'cursor-pointer hover:border-blue-300' : ''} ${selectedDeviceId === device.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}
              >
                <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-medium">{device.model || device.id}</span>
                <span className="text-gray-400">Android {device.androidVersion || '-'}</span>
                {device.status === 'online' && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); device.proxyEnabled ? handleDisableProxy(device.id) : handleEnableProxy(device.id); }} className={`px-1.5 py-0.5 rounded ${device.proxyEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'}`}>
                      {device.proxyEnabled ? '✅代理' : '⬜代理'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!certInstalling) handleInstallCert(device.id); }}
                      disabled={certInstalling}
                      className={`px-1.5 py-0.5 rounded ${certInstalling ? 'bg-blue-100 text-blue-700 cursor-wait animate-pulse' : device.certInstalled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                    >
                      {certInstalling ? '安装中...' : device.certInstalled ? '✅证书' : '⚠️装证书'}
                    </button>
                    {device.id.includes(':') && (
                      <button onClick={(e) => { e.stopPropagation(); disconnectDevice(device.id).then(() => loadDevices(true)); }} className="text-gray-400 hover:text-red-500">✕</button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {devices.length === 0 && <span className="text-xs text-gray-400">未检测到设备，请通过 USB 或 WiFi 连接 TV</span>}
        </div>
      </div>

      {/* 断点拦截面板 */}
      {breakpoints.length > 0 && (
        <div className="flex-shrink-0 bg-yellow-50 border-b-2 border-yellow-400 px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-yellow-800">⏸ 断点拦截中 ({breakpoints.length})</span>
          </div>
          {!editingBp ? (
            <div className="space-y-1">
              {breakpoints.map(bp => (
                <div key={bp.id} className="flex items-center gap-2 px-2 py-1.5 bg-white border border-yellow-300 rounded text-xs">
                  <span className={`px-1.5 py-0.5 rounded ${bp.phase === 'request' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {bp.phase === 'request' ? '请求' : '响应'}
                  </span>
                  <span className="font-mono text-gray-700 flex-1 truncate">{bp.method} {bp.url}</span>
                  <span className="text-gray-400">{bp.ruleName}</span>
                  <button onClick={() => { setEditingBp(bp); setBpEditBody(bp.phase === 'request' ? bp.requestBody : bp.responseBody || ''); }} className="px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600">编辑</button>
                  <button onClick={() => handleResolveBp(bp.id, 'passthrough')} className="px-2 py-0.5 bg-green-500 text-white rounded hover:bg-green-600">通行</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-yellow-300 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  {editingBp.phase === 'request' ? '编辑请求 Body' : '编辑响应 Body'} — <span className="font-mono">{editingBp.method} {editingBp.url}</span>
                </span>
                {editingBp.responseStatus && <span className="text-xs text-gray-500">Status: {editingBp.responseStatus}</span>}
              </div>
              <textarea
                value={bpEditBody}
                onChange={e => setBpEditBody(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <div className="flex gap-2">
                <button onClick={() => handleResolveBp(editingBp.id, 'forward', bpEditBody)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">📤 发送（使用修改内容）</button>
                <button onClick={() => handleResolveBp(editingBp.id, 'passthrough')} className="px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">✅ 通行（使用原始内容）</button>
                <button onClick={() => setEditingBp(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">返回列表</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 主体：请求列表 + 详情 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：请求列表 */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white">
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">请求记录 · {requestScopeLabel}</span>
            <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="搜索 URL / 包名 / 域名" className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
            <button onClick={handleClearRequests} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">清空</button>
            <span className="text-xs text-gray-400">{filteredRequests.length} 条</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredRequests.map(req => (
              <div
                key={req.id}
                onClick={() => handleSelectRequest(req)}
                className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 cursor-pointer hover:bg-blue-50 text-xs ${selectedRequest?.id === req.id ? 'bg-blue-100' : ''} ${req.modified ? 'bg-orange-50' : ''}`}
              >
                <span className={`font-mono w-10 ${req.method === 'POST' ? 'text-orange-600' : 'text-blue-600'}`}>{req.method}</span>
                <span className={`w-8 text-center rounded px-1 ${req.responseStatus >= 400 ? 'bg-red-100 text-red-700' : req.responseStatus >= 300 ? 'bg-yellow-100 text-yellow-700' : 'text-green-700'}`}>{req.responseStatus}</span>
                <span className="flex-1 truncate text-gray-700">{req.host}{req.path}</span>
                {req.modified && <span className="text-orange-500" title="已被规则修改">🔴</span>}
                <span className="text-gray-400 w-12 text-right">{req.duration}ms</span>
              </div>
            ))}
            {filteredRequests.length === 0 && <p className="text-center text-gray-400 text-sm py-8">暂无请求记录</p>}
          </div>
        </div>

        {/* 右侧：请求详情 */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {selectedRequest ? (
            <RequestDetailPanel request={selectedRequest} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">点击左侧请求查看详情</div>
          )}
        </div>
      </div>

      {showRulesDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={() => setShowRulesDrawer(false)}>
          <div className="w-full max-w-3xl h-full bg-white shadow-xl border-l border-gray-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">拦截规则</h2>
                <p className="text-xs text-gray-500">管理个人规则，或从公共规则库复制一份到当前账号</p>
              </div>
              <button onClick={() => setShowRulesDrawer(false)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">✕</button>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <button onClick={() => setRuleView('mine')} className={`px-3 py-1.5 rounded text-xs border ${ruleView === 'mine' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'}`}>
                我的规则 {rules.filter(r => r.enabled).length}/{rules.length}
              </button>
              <button onClick={() => setRuleView('public')} className={`px-3 py-1.5 rounded text-xs border ${ruleView === 'public' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'}`}>
                公共规则 {publicRules.length}
              </button>
              <input
                value={ruleSearchFilter}
                onChange={e => setRuleSearchFilter(e.target.value)}
                placeholder="搜索规则名 / URL / 包名 / 动作"
                className="ml-auto w-64 px-2 py-1.5 border border-gray-200 rounded text-xs"
              />
              <button onClick={loadRules} className="px-2 py-1.5 text-xs text-gray-600 hover:bg-white rounded border border-gray-200">刷新</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {ruleView === 'mine' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>优先级数字越小越先命中</span>
                      <span className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">公开 {rules.filter(r => r.isPublic).length}</span>
                    </div>
                    <button onClick={() => setShowRuleForm(!showRuleForm)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">{showRuleForm ? '收起表单' : '+ 新建规则'}</button>
                  </div>
                  {showRuleForm && <RuleForm onCreated={() => { loadRules(); setShowRuleForm(false); }} onCancel={() => setShowRuleForm(false)} />}
                  <div className="space-y-2">
                    {visibleRules.map(rule => (
                      <RuleItem
                        key={rule.id}
                        rule={rule}
                        onToggle={handleToggleRule}
                        onDelete={handleDeleteRule}
                        onTogglePublic={handleToggleRulePublic}
                        onUpdated={loadRules}
                      />
                    ))}
                    {visibleRules.length === 0 && <p className="text-center text-gray-400 text-sm py-8">暂无匹配规则</p>}
                  </div>
                </>
              )}
              {ruleView === 'public' && (
                <div className="space-y-2">
                  {visiblePublicRules.map(rule => (
                    <PublicRuleItem key={rule.id} rule={rule} onCopy={handleCopyPublicRule} />
                  ))}
                  {visiblePublicRules.length === 0 && <p className="text-center text-gray-400 text-sm py-8">暂无可添加的公共规则</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** 请求详情面板 */
const RequestDetailPanel: React.FC<{ request: MitmRequest }> = ({ request }) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'request' | 'response'>('response');
  const [fullResponseBody, setFullResponseBody] = useState<string | null>(null);
  const [loadingFullBody, setLoadingFullBody] = useState(false);

  useEffect(() => {
    setFullResponseBody(null);
    setLoadingFullBody(false);
  }, [request.id]);

  let reqHeaders: Record<string, string> = {};
  let resHeaders: Record<string, string> = {};
  try { reqHeaders = JSON.parse(request.requestHeaders || '{}'); } catch {}
  try { resHeaders = JSON.parse(request.responseHeaders || '{}'); } catch {}

  const responseBody = fullResponseBody ?? request.responseBody ?? '';
  const requestBody = request.requestBody || '';
  const requestBodyTruncated = requestBody.includes(CAPTURE_TRUNCATED_MARKER);
  const requestBodyLarge = requestBody.length > JSON_FORMAT_BODY_LIMIT;
  const responseBodyTruncated = responseBody.includes(CAPTURE_TRUNCATED_MARKER);
  const responseBodyLarge = responseBody.length > JSON_FORMAT_BODY_LIMIT;
  const formattedRequestBody = useMemo(() => {
    if (!requestBody || requestBodyLarge || requestBodyTruncated) return requestBody;
    try { return JSON.stringify(JSON.parse(requestBody), null, 2); } catch { return requestBody; }
  }, [requestBody, requestBodyLarge, requestBodyTruncated]);
  const formattedResponseBody = useMemo(() => {
    if (!responseBody || responseBodyLarge || responseBodyTruncated) return responseBody;
    try { return JSON.stringify(JSON.parse(responseBody), null, 2); } catch { return responseBody; }
  }, [responseBody, responseBodyLarge, responseBodyTruncated]);
  const responsePreviewBody = request.responseBody || '';
  const canShowFullResponse = !fullResponseBody && Boolean(responsePreviewBody) && (
    responseBodyTruncated ||
    responsePreviewBody.includes('已跳过解压预览') ||
    responsePreviewBody.includes('已直接透传')
  );

  const handleShowFullResponse = async () => {
    setLoadingFullBody(true);
    try {
      const body = await fetchFullResponseBody(request.id);
      setFullResponseBody(body);
      showToast('完整响应 Body 已加载', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoadingFullBody(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-mono ${request.method === 'POST' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{request.method}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${request.responseStatus >= 400 ? 'bg-red-100 text-red-700' : request.responseStatus >= 300 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{request.responseStatus}</span>
          <span className="text-xs text-gray-700 flex-1 truncate">{request.host}</span>
          <span className="text-xs text-gray-400">{request.duration}ms</span>
          {request.modified && <span className="text-xs text-orange-600">已修改</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('request')} className={`px-2 py-1 rounded text-xs ${tab === 'request' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Request</button>
          <button onClick={() => setTab('response')} className={`px-2 py-1 rounded text-xs ${tab === 'response' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Response</button>
          <span className="text-xs text-gray-400 truncate ml-auto">{request.path}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-xs font-mono bg-gray-50">
        {tab === 'request' && (
          <div className="space-y-2">
            <p className="font-bold text-gray-800">{request.method} {request.url}</p>
            <div>
              <p className="text-gray-500 mb-1">Headers:</p>
              {Object.entries(reqHeaders).map(([k, v]) => <p key={k} className="text-gray-700"><span className="text-blue-600">{k}:</span> {v}</p>)}
            </div>
            <div>
              <p className="text-gray-500 mb-1">
                Body:
                {requestBodyLarge && <span className="ml-2 text-yellow-600">内容较大，已跳过自动格式化</span>}
                {requestBodyTruncated && <span className="ml-2 text-orange-600">已截断保存</span>}
              </p>
              <pre className="whitespace-pre-wrap break-all text-gray-800 bg-white p-2 rounded border min-h-10">
                {formattedRequestBody || '无请求 Body 或未捕获到请求 Body'}
              </pre>
            </div>
          </div>
        )}
        {tab === 'response' && (
          <div className="space-y-2">
            <p className="font-bold text-gray-800">Status: {request.responseStatus} | Size: {request.size}B | Duration: {request.duration}ms</p>
            <div>
              <p className="text-gray-500 mb-1">Headers:</p>
              {Object.entries(resHeaders).map(([k, v]) => <p key={k} className="text-gray-700"><span className="text-blue-600">{k}:</span> {v}</p>)}
            </div>
            <div>
              <p className="text-gray-500 mb-1">
                Body:
                {fullResponseBody && <span className="ml-2 text-green-600">已展示完整 Body</span>}
                {responseBodyLarge && <span className="ml-2 text-yellow-600">内容较大，已跳过自动格式化</span>}
                {responseBodyTruncated && <span className="ml-2 text-orange-600">已截断保存</span>}
              </p>
              <pre className="whitespace-pre-wrap break-all text-gray-800 bg-white p-2 rounded border max-h-96 overflow-y-auto min-h-10">
                {formattedResponseBody || '无响应 Body 或未捕获到响应 Body'}
              </pre>
              {canShowFullResponse && (
                <div className="bg-white border border-t-0 border-gray-200 rounded-b px-2 py-2">
                  <button
                    onClick={handleShowFullResponse}
                    disabled={loadingFullBody}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loadingFullBody ? '正在解压完整 Body...' : '展示全部'}
                  </button>
                  <span className="ml-2 text-xs text-gray-500">点击后再解压完整响应，不影响设备请求</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** 规则创建表单 */
const RuleForm: React.FC<{ onCreated: () => void; onCancel: () => void }> = ({ onCreated, onCancel }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [urlContains, setUrlContains] = useState('');
  const [packageName, setPackageName] = useState('');
  const [actionType, setActionType] = useState<'replaceBody' | 'modifyJson' | 'modifyStatus' | 'delay' | 'breakpoint'>('replaceBody');
  const [replaceBody, setReplaceBody] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [delayMs, setDelayMs] = useState('');
  const [breakpointOn, setBreakpointOn] = useState<'request' | 'response' | 'both'>('response');
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { showToast('请填写规则名称', 'error'); return; }
    if (!urlContains.trim() && !packageName.trim()) { showToast('请至少填写一个匹配条件', 'error'); return; }

    const conditions: any = {};
    if (urlContains.trim()) conditions.urlContains = urlContains.trim();
    if (packageName.trim()) conditions.packageName = packageName.trim();

    const action: any = { type: actionType };
    if (actionType === 'replaceBody') action.replaceBody = replaceBody;
    if (actionType === 'modifyStatus') action.statusCode = Number(statusCode) || 500;
    if (actionType === 'delay') action.delayMs = Number(delayMs) || 1000;
    if (actionType === 'breakpoint') action.breakpointOn = breakpointOn;

    try {
      await createRule({ name: name.trim(), enabled: true, priority: 100, deviceScope: 'all', isPublic, conditions, action });
      showToast('规则已创建', 'success');
      onCreated();
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3 space-y-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="规则名称 *" className="px-2 py-1 border border-gray-300 rounded text-xs" />
        <input type="text" value={urlContains} onChange={e => setUrlContains(e.target.value)} placeholder="URL 包含（匹配条件）" className="px-2 py-1 border border-gray-300 rounded text-xs" />
        <input type="text" value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="包名（可选）" className="px-2 py-1 border border-gray-300 rounded text-xs" />
        <select value={actionType} onChange={e => setActionType(e.target.value as any)} className="px-2 py-1 border border-gray-300 rounded text-xs">
          <option value="replaceBody">替换响应 Body</option>
          <option value="modifyStatus">修改状态码</option>
          <option value="delay">添加延迟</option>
          <option value="breakpoint">⏸ 断点拦截</option>
        </select>
      </div>
      {actionType === 'replaceBody' && (
        <textarea value={replaceBody} onChange={e => setReplaceBody(e.target.value)} placeholder='替换为的 JSON，如 {"errorCode":2,"errorMsg":"123"}' rows={3} className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
      )}
      {actionType === 'modifyStatus' && (
        <input type="number" value={statusCode} onChange={e => setStatusCode(e.target.value)} placeholder="状态码，如 500" className="px-2 py-1 border border-gray-300 rounded text-xs w-32" />
      )}
      {actionType === 'delay' && (
        <input type="number" value={delayMs} onChange={e => setDelayMs(e.target.value)} placeholder="延迟毫秒，如 3000" className="px-2 py-1 border border-gray-300 rounded text-xs w-32" />
      )}
      {actionType === 'breakpoint' && (
        <select value={breakpointOn} onChange={e => setBreakpointOn(e.target.value as any)} className="px-2 py-1 border border-gray-300 rounded text-xs">
          <option value="request">拦截请求（发送前编辑）</option>
          <option value="response">拦截响应（返回前编辑）</option>
          <option value="both">两者都拦截</option>
        </select>
      )}
      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded border-gray-300" />
        公开到公共规则库
      </label>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">创建</button>
        <button onClick={onCancel} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">取消</button>
      </div>
    </div>
  );
};

const getRuleConditionLabel = (rule: MitmRule) => {
  const labels = [
    rule.conditions.method && `Method: ${rule.conditions.method}`,
    rule.conditions.urlContains && `URL: ${rule.conditions.urlContains}`,
    rule.conditions.urlRegex && `Regex: ${rule.conditions.urlRegex}`,
    rule.conditions.packageName && `包名: ${rule.conditions.packageName}`,
  ].filter(Boolean);
  return labels.join(' · ') || '未设置匹配条件';
};

const getRuleActionLabel = (rule: MitmRule) => {
  const map: Record<string, string> = {
    replaceBody: '替换响应',
    modifyJson: '修改 JSON',
    modifyStatus: `状态码 ${rule.action.statusCode || 500}`,
    delay: `延迟 ${rule.action.delayMs || 1000}ms`,
    breakpoint: `断点 ${rule.action.breakpointOn || 'response'}`,
  };
  return map[rule.action.type] || rule.action.type;
};

/** 单条规则项（支持展开编辑） */
const RuleItem: React.FC<{
  rule: MitmRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (rule: MitmRule) => void;
  onUpdated: () => void;
}> = ({ rule, onToggle, onDelete, onTogglePublic, onUpdated }) => {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rule.name);
  const [urlContains, setUrlContains] = useState(rule.conditions.urlContains || '');
  const [urlRegex, setUrlRegex] = useState(rule.conditions.urlRegex || '');
  const [packageName, setPackageName] = useState(rule.conditions.packageName || '');
  const [actionType, setActionType] = useState(rule.action.type);
  const [replaceBody, setReplaceBody] = useState(rule.action.replaceBody || '');
  const [statusCode, setStatusCode] = useState(String(rule.action.statusCode || ''));
  const [delayMs, setDelayMs] = useState(String(rule.action.delayMs || ''));
  const [breakpointOn, setBreakpointOn] = useState<'request' | 'response' | 'both'>(rule.action.breakpointOn || 'response');

  const handleSave = async () => {
    const conditions: any = {};
    if (urlContains.trim()) conditions.urlContains = urlContains.trim();
    if (urlRegex.trim()) conditions.urlRegex = urlRegex.trim();
    if (packageName.trim()) conditions.packageName = packageName.trim();

    const action: any = { type: actionType };
    if (actionType === 'replaceBody') action.replaceBody = replaceBody;
    if (actionType === 'modifyStatus') action.statusCode = Number(statusCode) || 500;
    if (actionType === 'delay') action.delayMs = Number(delayMs) || 1000;
    if (actionType === 'breakpoint') action.breakpointOn = breakpointOn;

    try {
      await updateRule(rule.id, { name: name.trim(), conditions, action });
      showToast('规则已更新', 'success');
      setEditing(false);
      onUpdated();
    } catch (e) { showToast((e as Error).message, 'error'); }
  };

  return (
    <div className={`bg-white border rounded text-xs shadow-sm ${rule.enabled ? 'border-blue-200' : 'border-gray-200 opacity-80'}`}>
      <div className="flex items-start gap-3 px-3 py-2">
        <button
          onClick={() => onToggle(rule.id)}
          className={`mt-0.5 w-9 h-5 rounded-full border flex-shrink-0 transition-colors ${rule.enabled ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300'}`}
          title={rule.enabled ? '停用规则' : '启用规则'}
        >
          <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate" title={rule.name}>{rule.name}</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{getRuleActionLabel(rule)}</span>
            {rule.isPublic && <span className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded">公开</span>}
          </div>
          <p className="mt-1 text-gray-500 truncate" title={getRuleConditionLabel(rule)}>{getRuleConditionLabel(rule)}</p>
        </div>
        <span className="mt-0.5 text-gray-400 flex-shrink-0">命中 {rule.hitCount}</span>
        <button onClick={() => onTogglePublic(rule)} className={`px-2 py-1 rounded flex-shrink-0 ${rule.isPublic ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'text-gray-500 hover:bg-gray-100'}`} title={rule.isPublic ? '取消公开' : '公开规则'}>{rule.isPublic ? '取消公开' : '公开'}</button>
        <button onClick={() => setEditing(!editing)} className="px-2 py-1 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded flex-shrink-0" title="编辑">{editing ? '收起' : '编辑'}</button>
        <button onClick={() => onDelete(rule.id)} className="px-2 py-1 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded flex-shrink-0" title="删除">删除</button>
      </div>
      {editing && (
        <div className="border-t border-gray-100 px-2 py-2 space-y-2 bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="规则名称" className="px-2 py-1 border border-gray-300 rounded text-xs" />
            <input type="text" value={urlContains} onChange={e => setUrlContains(e.target.value)} placeholder="URL 包含" className="px-2 py-1 border border-gray-300 rounded text-xs" />
            <input type="text" value={urlRegex} onChange={e => setUrlRegex(e.target.value)} placeholder="URL 正则（可选）" className="px-2 py-1 border border-gray-300 rounded text-xs" />
            <input type="text" value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="包名（可选）" className="px-2 py-1 border border-gray-300 rounded text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <select value={actionType} onChange={e => setActionType(e.target.value as any)} className="px-2 py-1 border border-gray-300 rounded text-xs">
              <option value="replaceBody">替换响应 Body</option>
              <option value="modifyStatus">修改状态码</option>
              <option value="delay">添加延迟</option>
              <option value="breakpoint">断点拦截</option>
            </select>
            {actionType === 'modifyStatus' && <input type="number" value={statusCode} onChange={e => setStatusCode(e.target.value)} placeholder="状态码" className="px-2 py-1 border border-gray-300 rounded text-xs w-20" />}
            {actionType === 'delay' && <input type="number" value={delayMs} onChange={e => setDelayMs(e.target.value)} placeholder="延迟ms" className="px-2 py-1 border border-gray-300 rounded text-xs w-20" />}
            {actionType === 'breakpoint' && (
              <select value={breakpointOn} onChange={e => setBreakpointOn(e.target.value as any)} className="px-2 py-1 border border-gray-300 rounded text-xs">
                <option value="request">请求</option>
                <option value="response">响应</option>
                <option value="both">请求和响应</option>
              </select>
            )}
          </div>
          {actionType === 'replaceBody' && (
            <textarea value={replaceBody} onChange={e => setReplaceBody(e.target.value)} placeholder='替换为的 JSON' rows={3} className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono" />
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">保存</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

const PublicRuleItem: React.FC<{ rule: MitmRule; onCopy: (id: string) => void }> = ({ rule, onCopy }) => {
  return (
    <div className="bg-white border border-gray-200 rounded text-xs shadow-sm px-3 py-2">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate" title={rule.name}>{rule.name}</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{getRuleActionLabel(rule)}</span>
          </div>
          <p className="mt-1 text-gray-500 truncate" title={getRuleConditionLabel(rule)}>{getRuleConditionLabel(rule)}</p>
          {rule.description && <p className="mt-1 text-gray-400 truncate" title={rule.description}>{rule.description}</p>}
        </div>
        <span className="text-gray-400 flex-shrink-0">命中 {rule.hitCount}</span>
        <button onClick={() => onCopy(rule.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0">
          添加到我的规则
        </button>
      </div>
    </div>
  );
};

export default MitmProxyPage;
