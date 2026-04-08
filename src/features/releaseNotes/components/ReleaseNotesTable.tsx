import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { ReleaseNote } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { getApkDownloadUrl, formatFileSize } from '../../../services/ApkUploadService';
import { useI18n } from '../../../i18n/I18nProvider';

const ZMIND_PR_URL = 'https://zmind.whaletv.com/issues/';
const PT_LABEL: Record<string, string> = { TV: 'TV', Projector: 'Projector', STB: 'STB' };
const PT_COLOR: Record<string, string> = { TV: 'bg-yellow-100 text-yellow-800', Projector: 'bg-purple-100 text-purple-800', STB: 'bg-green-100 text-green-800' };

interface ReleaseNotesTableProps {
  records: (ReleaseNote & { children?: ReleaseNote[] })[];
  loading: boolean;
  pagination: { page: number; pageSize: number; total: number };
  sorting: { field: string; order: 'asc' | 'desc' };
  onEdit: (record: ReleaseNote) => void;
  onDelete: (id: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSortingChange: (field: string, order: 'asc' | 'desc') => void;
  onAddChild?: (parentVersion: string, projectType?: string) => void;
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
  records, loading, pagination, sorting, onEdit, onDelete, onPaginationChange, onSortingChange, onAddChild,
}) => {
  const { formatDateTime } = useI18n();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandedChildIds, setExpandedChildIds] = useState<Set<string>>(new Set());
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const showProjectCol = currentProject === '全部';

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
              {showProjectCol && <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">项目</th>}
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
              const hasChildren = r.children && r.children.length > 0;
              return (
                <React.Fragment key={r.id}>
                  {/* 大版本主行 */}
                  <tr className={`hover:bg-gray-50 cursor-pointer ${hasChildren ? 'font-medium' : ''}`} onClick={() => toggleExpand(r.id!)}>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </td>
                    {showProjectCol && <td className="px-3 py-3 text-sm"><Tag variant="primary" className={PT_COLOR[r.projectType || ''] || 'bg-gray-100 text-gray-600'}>{PT_LABEL[r.projectType || ''] || '-'}</Tag></td>}
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {r.version}
                        {hasChildren && <span className="text-xs text-gray-400 font-normal">({r.children!.length})</span>}
                        {r.parentVersion && <span className="text-xs text-orange-500 font-normal">← {r.parentVersion}</span>}
                        {!r.parentVersion && onAddChild && (
                          <button onClick={(e) => { e.stopPropagation(); onAddChild(r.version, r.projectType); }}
                            className="ml-1 px-1.5 py-0.5 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="添加子版本">
                            +
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{r.branch}</code></td>
                    <td className="px-3 py-3 text-sm text-gray-600">{r.author}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.changeDescription}>{r.changeDescription}</td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getChangeTypeColor(r.changeType)}>{r.changeType}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getSeverityColor(r.severity)}>{r.severity}</Tag></td>
                    <td className="px-3 py-3 text-sm text-gray-600">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button onClick={() => onEdit(r)} variant="secondary" size="sm">编辑</Button>
                        <Button onClick={() => onDelete(r.id!)} variant="danger" size="sm">删除</Button>
                      </div>
                    </td>
                  </tr>
                  {/* 展开详情行 */}
                  {isExpanded && (
                    <>
                      <tr className="bg-blue-100/30">
                        <td colSpan={showProjectCol ? 10 : 9} className="px-6 py-4">
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
                              <span className="text-gray-500">修复 PR：</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(r as any).fixedPRs?.length > 0
                                  ? (r as any).fixedPRs.map((pr: string) => <a key={pr} href={`${ZMIND_PR_URL}${pr}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 hover:underline">#{pr}</a>)
                                  : <span className="text-gray-400">-</span>}
                              </div>
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
                      {/* 子版本列表 */}
                      {hasChildren && r.children!.map((child) => {
                        const isChildExpanded = expandedChildIds.has(child.id!);
                        return (
                          <React.Fragment key={child.id}>
                            <tr className="bg-gray-50/50 hover:bg-blue-50/30 cursor-pointer border-l-4 border-blue-300"
                              onClick={() => {
                                setExpandedChildIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(child.id!)) next.delete(child.id!); else next.add(child.id!);
                                  return next;
                                });
                              }}>
                              <td className="px-3 py-2 text-sm text-gray-400 pl-8">
                                <span className={`inline-block transition-transform text-xs ${isChildExpanded ? 'rotate-90' : ''}`}>▶</span>
                              </td>
                              {showProjectCol && <td className="px-3 py-2 text-sm"><Tag variant="primary" className={PT_COLOR[child.projectType || ''] || 'bg-gray-100 text-gray-600'}>{PT_LABEL[child.projectType || ''] || '-'}</Tag></td>}
                              <td className="px-3 py-2 text-sm text-blue-700 font-medium pl-6">
                                ↳ {child.version}
                              </td>
                              <td className="px-3 py-2 text-sm"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{child.branch}</code></td>
                              <td className="px-3 py-2 text-sm text-gray-600">{child.author}</td>
                              <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate" title={child.changeDescription}>{child.changeDescription}</td>
                              <td className="px-3 py-2 text-sm"><Tag variant="primary" className={getChangeTypeColor(child.changeType)}>{child.changeType}</Tag></td>
                              <td className="px-3 py-2 text-sm"><Tag variant="primary" className={getSeverityColor(child.severity)}>{child.severity}</Tag></td>
                              <td className="px-3 py-2 text-sm text-gray-600">{formatDateTime(child.createdAt)}</td>
                              <td className="px-3 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  <Button onClick={() => onEdit(child)} variant="secondary" size="sm">编辑</Button>
                                  <Button onClick={() => onDelete(child.id!)} variant="danger" size="sm">删除</Button>
                                </div>
                              </td>
                            </tr>
                            {isChildExpanded && (
                              <tr className="bg-blue-50/20 border-l-4 border-blue-200">
                                <td colSpan={showProjectCol ? 10 : 9} className="px-8 py-3">
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                    <div className="min-w-0">
                                      <span className="text-gray-500">修改内容：</span>
                                      <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{child.changeDescription}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-gray-500">受影响模块：</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {child.affectedModules?.map((m) => <span key={m} className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">{m}</span>)}
                                        {(!child.affectedModules || child.affectedModules.length === 0) && <span className="text-gray-400">-</span>}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-gray-500">测试备注：</span>
                                      <p className="text-gray-900 mt-1 break-words">{child.testingNotes || '-'}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-gray-500">修复 PR：</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(child as any).fixedPRs?.length > 0
                                          ? (child as any).fixedPRs.map((pr: string) => <a key={pr} href={`${ZMIND_PR_URL}${pr}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 hover:underline">#{pr}</a>)
                                          : <span className="text-gray-400">-</span>}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-gray-500">APK：</span>
                                      {child.apkFileName && child.apkFilePath ? (
                                        <a href={getApkDownloadUrl(child.apkFilePath)} target="_blank" rel="noopener noreferrer"
                                          className="text-blue-700 hover:underline text-sm mt-1 inline-flex items-center gap-1 break-all">
                                          📦 {child.apkFileName} ({child.apkFileSize ? formatFileSize(child.apkFileSize) : ''})
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
                    </>
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
