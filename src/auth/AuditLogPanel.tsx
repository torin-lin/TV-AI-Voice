/**
 * 审计日志面板
 * 管理员在设置页中查看操作记录
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../components/common/Button';

interface AuditLog {
  id: number;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: number;
}

const ACTION_LABELS: Record<string, { text: string; color: string }> = {
  create: { text: '新增', color: 'bg-green-100 text-green-700' },
  update: { text: '修改', color: 'bg-blue-100 text-blue-700' },
  delete: { text: '删除', color: 'bg-red-100 text-red-700' },
  login: { text: '登录', color: 'bg-indigo-100 text-indigo-700' },
  upload: { text: '上传', color: 'bg-purple-100 text-purple-700' },
};

const RESOURCE_LABELS: Record<string, string> = {
  'release-notes': 'Release Note',
  'version-records': '版本记录',
  'customer-problems': '问题追踪',
  'version-issues': '版本问题',
  'knowledge-base': '知识库',
  'apk': 'APK',
  'docs': '文档',
  'auth': '认证',
  'users': '用户',
  'project-members': '项目成员',
  'issue-attachments': '附件',
};

const AuditLogPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterResource, setFilterResource] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const pageSize = 20;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, pageSize };
      if (filterResource) params.resource = filterResource;
      if (filterAction) params.action = filterAction;
      const res = await axios.get('/api/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data);
        setTotal(res.data.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, filterResource, filterAction]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">操作审计日志</h2>
          <p className="text-sm text-gray-500 mt-0.5">记录所有写操作，共 {total} 条</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterResource}
            onChange={(e) => { setFilterResource(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部资源</option>
            {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部操作</option>
            <option value="create">新增</option>
            <option value="update">修改</option>
            <option value="delete">删除</option>
            <option value="login">登录</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">暂无审计记录</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">时间</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">操作人</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">操作</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">资源</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">详情</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] || { text: log.action, color: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className="text-gray-900 text-xs font-medium">{log.username || '未知用户'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${actionInfo.color}`}>{actionInfo.text}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {RESOURCE_LABELS[log.resource] || log.resource}
                      {log.resourceId && <span className="text-gray-400 ml-1">#{log.resourceId.slice(0, 12)}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate" title={log.detail || ''}>
                      {log.detail || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{log.ip || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">第 {page}/{totalPages} 页</span>
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;
