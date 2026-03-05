import React, { useState } from 'react';
import { ReleaseNote } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { getApkDownloadUrl, formatFileSize } from '../../../services/ApkUploadService';

interface ReleaseNotesTableProps {
  records: ReleaseNote[];
  loading: boolean;
  pagination: { page: number; pageSize: number; total: number };
  sorting: { field: string; order: 'asc' | 'desc' };
  onEdit: (record: ReleaseNote) => void;
  onDelete: (id: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSortingChange: (field: string, order: 'asc' | 'desc') => void;
}

const getChangeTypeColor = (type: string) => {
  const m: Record<string, string> = {
    '功能': 'bg-blue-200 text-blue-700', '修复': 'bg-green-100 text-green-800',
    '优化': 'bg-purple-100 text-purple-800', '重构': 'bg-orange-100 text-orange-800',
    '文档': 'bg-gray-100 text-gray-800',
  };
  return m[type] || 'bg-gray-100 text-gray-800';
};

const getSeverityColor = (s: string) => {
  const m: Record<string, string> = {
    '低': 'bg-green-100 text-green-800', '中': 'bg-yellow-100 text-yellow-800',
    '高': 'bg-red-100 text-red-800', '紧急': 'bg-red-200 text-red-900',
  };
  return m[s] || 'bg-gray-100 text-gray-800';
};

const getRiskColor = (r?: string) => {
  const m: Record<string, string> = {
    '低': 'bg-green-100 text-green-800', '中': 'bg-yellow-100 text-yellow-800', '高': 'bg-red-100 text-red-800',
  };
  return m[r || ''] || 'bg-gray-100 text-gray-800';
};

const ReleaseNotesTable: React.FC<ReleaseNotesTableProps> = ({
  records, loading, pagination, sorting, onEdit, onDelete, onPaginationChange, onSortingChange,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleHeaderClick = (field: string) => {
    const newOrder = sorting.field === field && sorting.order === 'asc' ? 'desc' : 'asc';
    onSortingChange(field, newOrder);
  };
  const getSortIndicator = (field: string) => {
    if (sorting.field !== field) return '';
    return sorting.order === 'asc' ? ' ↑' : ' ↓';
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading && records.length === 0) {
    return <div className="flex justify-center items-center py-12"><LoadingSpinner /></div>;
  }
  if (records.length === 0) {
    return <div className="bg-white rounded-lg shadow p-8 text-center"><p className="text-gray-500">暂无 Release Note 记录</p></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('version')}>版本号{getSortIndicator('version')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">分支</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">作者</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">修改内容</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">类型</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">严重程度</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('createdAt')}>创建时间{getSortIndicator('createdAt')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((r) => {
              const isExpanded = expandedIds.has(r.id!);
              return (
                <React.Fragment key={r.id}>
                  {/* 主行 */}
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(r.id!)}>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{r.version}</td>
                    <td className="px-3 py-3 text-sm"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{r.branch}</code></td>
                    <td className="px-3 py-3 text-sm text-gray-600">{r.author}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.changeDescription}>{r.changeDescription}</td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getChangeTypeColor(r.changeType)}>{r.changeType}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getSeverityColor(r.severity)}>{r.severity}</Tag></td>
                    <td className="px-3 py-3 text-sm text-gray-600">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="px-3 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button onClick={() => onEdit(r)} variant="secondary" size="sm">编辑</Button>
                        <Button onClick={() => onDelete(r.id!)} variant="danger" size="sm">删除</Button>
                      </div>
                    </td>
                  </tr>
                  {/* 展开详情行 */}
                  {isExpanded && (
                    <tr className="bg-blue-100/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm overflow-hidden">
                          <div className="min-w-0">
                            <span className="text-gray-500">修改内容：</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{r.changeDescription}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">受影响模块：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.affectedModules?.map((m) => (
                                <span key={m} className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">{m}</span>
                              ))}
                              {(!r.affectedModules || r.affectedModules.length === 0) && <span className="text-gray-400">-</span>}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">受影响功能：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.affectedFeatures?.map((f) => (
                                <span key={f} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{f}</span>
                              ))}
                              {(!r.affectedFeatures || r.affectedFeatures.length === 0) && <span className="text-gray-400">-</span>}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">回归风险：</span>
                            <span className="ml-1"><Tag variant="primary" className={getRiskColor(r.regressionRisk)}>{r.regressionRisk || '-'}</Tag></span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">破坏性变更：</span>
                            <span className="ml-1">{r.breakingChanges ? <Tag variant="primary" className="bg-red-100 text-red-800">是</Tag> : <Tag variant="primary" className="bg-gray-100 text-gray-600">否</Tag>}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">迁移类型：</span>
                            <span className="ml-1 text-gray-900">{r.migrationType || '无'}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">测试备注：</span>
                            <p className="text-gray-900 mt-1 break-words">{r.testingNotes || '-'}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">APK：</span>
                            {r.apkFileName && r.apkFilePath ? (
                              <a href={getApkDownloadUrl(r.apkFilePath)} target="_blank" rel="noopener noreferrer"
                                className="text-blue-700 hover:underline text-sm mt-1 inline-flex items-center gap-1 break-all">
                                📦 {r.apkFileName} ({r.apkFileSize ? formatFileSize(r.apkFileSize) : ''})
                              </a>
                            ) : <span className="text-gray-400 ml-1">-</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          第 {pagination.page} 页，共 {totalPages} 页（{pagination.total} 条）
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onPaginationChange(Math.max(1, pagination.page - 1), pagination.pageSize)}
            variant="secondary" disabled={pagination.page === 1} size="sm">上一页</Button>
          <Button onClick={() => onPaginationChange(Math.min(totalPages, pagination.page + 1), pagination.pageSize)}
            variant="secondary" disabled={pagination.page === totalPages} size="sm">下一页</Button>
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotesTable;
