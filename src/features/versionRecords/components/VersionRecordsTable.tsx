import React, { useState } from 'react';
import { VersionRecord } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { getDocDownloadUrl } from '../../../services/DocUploadService';
import { formatFileSize } from '../../../services/ApkUploadService';
import VersionIssueList from './VersionIssueList';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';

interface VersionRecordsTableProps {
  records: VersionRecord[];
  loading: boolean;
  pagination: { page: number; pageSize: number; total: number };
  sorting: { field: string; order: 'asc' | 'desc' };
  onEdit: (record: VersionRecord) => void;
  onDelete: (id: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSortingChange: (field: string, order: 'asc' | 'desc') => void;
}

const getRiskColor = (l: string) => {
  const m: Record<string, string> = { '低': 'bg-green-100 text-green-800', '中': 'bg-yellow-100 text-yellow-800', '高': 'bg-red-100 text-red-800' };
  return m[l] || 'bg-gray-100 text-gray-800';
};
const getStatusColor = (s: string) => {
  const m: Record<string, string> = { '通过': 'bg-green-100 text-green-800', '失败': 'bg-red-100 text-red-800', '未测试': 'bg-gray-100 text-gray-800' };
  return m[s] || 'bg-blue-200 text-blue-700';
};

const VersionRecordsTable: React.FC<VersionRecordsTableProps> = ({
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
  const getSortIndicator = (field: string) => sorting.field !== field ? '' : sorting.order === 'asc' ? ' ↑' : ' ↓';
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading && records.length === 0) return <div className="flex justify-center items-center py-12"><LoadingSpinner /></div>;
  if (records.length === 0) return <div className="bg-white rounded-lg shadow p-8 text-center"><p className="text-gray-500">暂无版本记录</p></div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('versionNumber')}>版本号{getSortIndicator('versionNumber')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">固件版本</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">修改内容</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('riskLevel')}>风险等级{getSortIndicator('riskLevel')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">冒烟</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">语音回归</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">系统回归</th>
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
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(r.id!)}>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{r.versionNumber}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[120px] truncate" title={r.firmwareVersion}>{r.firmwareVersion || '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.changeDescription}>{r.changeDescription}</td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getRiskColor(r.riskLevel)}>{r.riskLevel}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(r.smokeTestResult)}>{r.smokeTestResult}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(r.voiceRegressionResult)}>{r.voiceRegressionResult}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(r.systemRegressionResult)}>{r.systemRegressionResult}</Tag></td>
                    <td className="px-3 py-3 text-sm text-gray-600">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="px-3 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button onClick={() => onEdit(r)} variant="secondary" size="sm">编辑</Button>
                        <Button onClick={() => onDelete(r.id!)} variant="danger" size="sm">删除</Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-blue-100/30">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm overflow-hidden">
                          <div className="min-w-0">
                            <span className="text-gray-500">修改内容：</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{r.changeDescription}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">修改模块：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.modifiedModules?.map((m) => (
                                <span key={m} className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">{m}</span>
                              ))}
                              {(!r.modifiedModules || r.modifiedModules.length === 0) && <span className="text-gray-400">-</span>}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">关联 PR/CR：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.linkedIssues?.map((issue) => (
                                <a key={issue} href={`${ZMIND_BASE_URL}${issue}`} target="_blank" rel="noopener noreferrer"
                                  className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs hover:underline">#{issue}</a>
                              ))}
                              {(!r.linkedIssues || r.linkedIssues.length === 0) && <span className="text-gray-400">-</span>}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">固件版本：</span>
                            <p className="text-gray-900 mt-1 break-words">{r.firmwareVersion || '-'}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">测试周期：</span>
                            <p className="text-gray-900 mt-1">{r.testCycle || '-'}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">语言模型：</span>
                            <p className="text-gray-900 mt-1">{r.languageModel || '-'}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">原型来源：</span>
                            <div className="mt-1">
                              {r.prototypeSource && (r.prototypeSource.startsWith('http://') || r.prototypeSource.startsWith('https://')) ? (
                                <a href={r.prototypeSource} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline text-xs break-all">🔗 {r.prototypeSource}</a>
                              ) : r.prototypeSource ? <span className="text-gray-900 break-words">{r.prototypeSource}</span> : null}
                              {r.prototypeFileName && r.prototypeFilePath && (
                                <a href={getDocDownloadUrl(r.prototypeFilePath)} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-700 hover:underline text-xs block mt-1 break-all">
                                  📄 {r.prototypeFileName} {r.prototypeFileSize ? `(${formatFileSize(r.prototypeFileSize)})` : ''}
                                </a>
                              )}
                              {!r.prototypeSource && !r.prototypeFileName && <span className="text-gray-400">-</span>}
                            </div>
                          </div>
                          <div className="col-span-2 min-w-0">
                            <span className="text-gray-500">备注：</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{r.notes || '-'}</p>
                          </div>
                        </div>
                        {/* 版本问题列表 */}
                        <VersionIssueList versionRecordId={r.id!} versionNumber={r.versionNumber} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">第 {pagination.page} 页，共 {totalPages} 页（{pagination.total} 条）</div>
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

export default VersionRecordsTable;
