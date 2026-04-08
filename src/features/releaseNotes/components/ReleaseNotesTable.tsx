import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { ReleaseNote, VersionRecord } from '../../../types/database';
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
  qaRecords: VersionRecord[];
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

const getTestResultColor = (result?: string) => {
  const m: Record<string, string> = {
    '通过': 'bg-green-100 text-green-800',
    '失败': 'bg-red-100 text-red-800',
    '未测试': 'bg-gray-100 text-gray-700',
  };
  return m[result || ''] || 'bg-gray-100 text-gray-800';
};

const ReleaseNoteDetailCard: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0 rounded-lg border border-blue-100 bg-white/80 p-3 shadow-sm">
    <span className="text-xs font-medium text-gray-500">{label}</span>
    <div className="mt-2 text-sm text-gray-900">{children}</div>
  </div>
);

const ReleaseNoteDetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="min-w-0 rounded-xl border border-blue-100 bg-white/90 p-4 shadow-sm">
    <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">{children}</div>
  </section>
);

const ReleaseNotesTable: React.FC<ReleaseNotesTableProps> = ({
  records, qaRecords, loading, pagination, sorting, onEdit, onDelete, onPaginationChange, onSortingChange, onAddChild,
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
  const detailColSpan = showProjectCol ? 9 : 8;

  const getQaStats = (note: ReleaseNote & { children?: ReleaseNote[] }) => {
    const relatedIds = new Set<string>([
      ...(note.id ? [note.id] : []),
      ...((note.children || []).map((child) => child.id).filter(Boolean) as string[]),
    ]);
    const relatedRecords = qaRecords.filter((record) => record.releaseNoteId && relatedIds.has(record.releaseNoteId));
    const firmwareCount = new Set(relatedRecords.map((record) => record.firmwareVersion).filter(Boolean)).size;
    return {
      recordCount: relatedRecords.length,
      firmwareCount,
    };
  };

  if (loading && records.length === 0) {
    return <div className="flex justify-center items-center py-12"><LoadingSpinner /></div>;
  }
  if (records.length === 0) {
    return <div className="bg-white rounded-lg shadow p-8 text-center"><p className="text-gray-500">暂无 Release Note 记录</p></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1160px] w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
              {showProjectCol && <th className="w-24 px-3 py-3 text-left text-sm font-semibold text-gray-900">项目</th>}
              <th className="w-32 px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('version')}>版本号{getSortIndicator('version')}</th>
              <th className="w-32 px-3 py-3 text-left text-sm font-semibold text-gray-900">提交信息</th>
              <th className="w-36 px-3 py-3 text-left text-sm font-semibold text-gray-900">修改内容</th>
              <th className="w-32 px-3 py-3 text-left text-sm font-semibold text-gray-900">研发概览</th>
              <th className="w-28 px-3 py-3 text-left text-sm font-semibold text-gray-900">QA 覆盖</th>
              <th className="w-36 px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('createdAt')}>创建时间{getSortIndicator('createdAt')}</th>
              <th className="w-28 px-3 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((r) => {
              const isExpanded = expandedIds.has(r.id!);
              const hasChildren = r.children && r.children.length > 0;
              const qaStats = getQaStats(r);
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
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <div className="min-w-0">
                        <p className="truncate" title={r.branch}>{r.branch}</p>
                        <p className="mt-1 text-xs text-gray-400 truncate" title={r.author}>{r.author}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <p className="line-clamp-2 break-words" title={r.changeDescription}>{r.changeDescription}</p>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <Tag variant="primary" className={getChangeTypeColor(r.changeType)}>{r.changeType}</Tag>
                        <Tag variant="primary" className={getSeverityColor(r.severity)}>{r.severity}</Tag>
                        <Tag variant="primary" className={getTestResultColor(r.rdSmokeStatus)}>{r.rdSmokeStatus || '未测试'}</Tag>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      <div className="min-w-0">
                        <p>{qaStats.recordCount} 条记录</p>
                        <p className="mt-1 text-xs text-gray-400">{qaStats.firmwareCount} 个固件</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            to={`/version-records?keyword=${encodeURIComponent(r.version)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            查看 QA
                          </Link>
                          <Link
                            to={`/version-workbench/${encodeURIComponent(r.parentVersion || r.version)}${r.projectType ? `?projectType=${encodeURIComponent(r.projectType)}` : ''}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-violet-700 hover:text-violet-900 hover:underline"
                          >
                            工作台
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-nowrap gap-1">
                        <Button onClick={() => onEdit(r)} variant="secondary" size="sm">编辑</Button>
                        <Button onClick={() => onDelete(r.id!)} variant="danger" size="sm">删除</Button>
                      </div>
                    </td>
                  </tr>
                  {/* 展开详情行 */}
                  {isExpanded && (
                    <>
                      <tr className="bg-blue-100/30">
                        <td colSpan={detailColSpan} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <ReleaseNoteDetailSection title="变更信息">
                              <ReleaseNoteDetailCard label="修改内容">
                                <p className="whitespace-pre-wrap break-words">{r.changeDescription}</p>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="受影响模块">
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {r.affectedModules?.map((m) => (
                                    <span key={m} className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">{m}</span>
                                  ))}
                                  {(!r.affectedModules || r.affectedModules.length === 0) && <span className="text-gray-400">-</span>}
                                </div>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="受影响功能">
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {r.affectedFeatures?.map((f) => (
                                    <span key={f} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{f}</span>
                                  ))}
                                  {(!r.affectedFeatures || r.affectedFeatures.length === 0) && <span className="text-gray-400">-</span>}
                                </div>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="修复 PR">
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(r as any).fixedPRs?.length > 0
                                    ? (r as any).fixedPRs.map((pr: string) => <a key={pr} href={`${ZMIND_PR_URL}${pr}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 hover:underline">#{pr}</a>)
                                    : <span className="text-gray-400">-</span>}
                                </div>
                              </ReleaseNoteDetailCard>
                            </ReleaseNoteDetailSection>
                            <ReleaseNoteDetailSection title="研发提测">
                              <ReleaseNoteDetailCard label="回归风险">
                                <Tag variant="primary" className={getRiskColor(r.regressionRisk)}>{r.regressionRisk || '-'}</Tag>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="破坏性变更">
                                {r.breakingChanges ? <Tag variant="primary" className="bg-red-100 text-red-800">是</Tag> : <Tag variant="primary" className="bg-gray-100 text-gray-600">否</Tag>}
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="迁移类型">
                                <span>{r.migrationType || '无'}</span>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="RD 冒烟测试">
                                <Tag variant="primary" className={getTestResultColor(r.rdSmokeStatus)}>{r.rdSmokeStatus || '未测试'}</Tag>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="测试备注">
                                <p className="break-words">{r.testingNotes || '-'}</p>
                              </ReleaseNoteDetailCard>
                            </ReleaseNoteDetailSection>
                            <ReleaseNoteDetailSection title="QA 覆盖">
                              <ReleaseNoteDetailCard label="QA 测试记录">
                                <div className="space-y-2">
                                  <span>{qaStats.recordCount}</span>
                                  <div>
                                    <Link
                                      to={`/version-records?keyword=${encodeURIComponent(r.version)}`}
                                      className="text-xs text-blue-700 hover:text-blue-900 hover:underline"
                                    >
                                      查看关联 QA 记录
                                    </Link>
                                  </div>
                                </div>
                              </ReleaseNoteDetailCard>
                              <ReleaseNoteDetailCard label="已测固件数">
                                <div className="space-y-2">
                                  <span>{qaStats.firmwareCount}</span>
                                  <div>
                                    <Link
                                      to={`/version-workbench/${encodeURIComponent(r.parentVersion || r.version)}${r.projectType ? `?projectType=${encodeURIComponent(r.projectType)}` : ''}`}
                                      className="text-xs text-violet-700 hover:text-violet-900 hover:underline"
                                    >
                                      打开版本工作台
                                    </Link>
                                  </div>
                                </div>
                              </ReleaseNoteDetailCard>
                            </ReleaseNoteDetailSection>
                            <ReleaseNoteDetailSection title="附件资源">
                              <ReleaseNoteDetailCard label="APK">
                                {r.apkFileName && r.apkFilePath ? (
                                  <a href={getApkDownloadUrl(r.apkFilePath)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 break-all text-blue-700 hover:underline">
                                    📦 {r.apkFileName} ({r.apkFileSize ? formatFileSize(r.apkFileSize) : ''})
                                  </a>
                                ) : <span className="text-gray-400 ml-1">-</span>}
                              </ReleaseNoteDetailCard>
                            </ReleaseNoteDetailSection>
                          </div>
                        </td>
                      </tr>
                      {/* 子版本列表 */}
                      {hasChildren && r.children!.map((child) => {
                        const isChildExpanded = expandedChildIds.has(child.id!);
                        const childQaStats = getQaStats(child);
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
                              <td className="px-3 py-2 text-sm text-gray-600">
                                <div className="min-w-0">
                                  <p className="truncate" title={child.branch}>{child.branch}</p>
                                  <p className="mt-1 text-xs text-gray-400 truncate" title={child.author}>{child.author}</p>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">
                                <p className="line-clamp-2 break-words" title={child.changeDescription}>{child.changeDescription}</p>
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <div className="flex flex-wrap gap-1">
                                  <Tag variant="primary" className={getChangeTypeColor(child.changeType)}>{child.changeType}</Tag>
                                  <Tag variant="primary" className={getSeverityColor(child.severity)}>{child.severity}</Tag>
                                  <Tag variant="primary" className={getTestResultColor(child.rdSmokeStatus)}>{child.rdSmokeStatus || '未测试'}</Tag>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">
                                <div className="min-w-0">
                                  <p>{childQaStats.recordCount} 条记录</p>
                                  <p className="mt-1 text-xs text-gray-400">{childQaStats.firmwareCount} 个固件</p>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">{formatDateTime(child.createdAt)}</td>
                              <td className="px-3 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-nowrap gap-1">
                                  <Button onClick={() => onEdit(child)} variant="secondary" size="sm">编辑</Button>
                                  <Button onClick={() => onDelete(child.id!)} variant="danger" size="sm">删除</Button>
                                </div>
                              </td>
                            </tr>
                            {isChildExpanded && (
                              <tr className="bg-blue-50/20 border-l-4 border-blue-200">
                                <td colSpan={detailColSpan} className="px-8 py-3">
                                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <ReleaseNoteDetailSection title="变更信息">
                                      <ReleaseNoteDetailCard label="修改内容">
                                        <p className="whitespace-pre-wrap break-words">{child.changeDescription}</p>
                                      </ReleaseNoteDetailCard>
                                      <ReleaseNoteDetailCard label="受影响模块">
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {child.affectedModules?.map((m) => <span key={m} className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">{m}</span>)}
                                          {(!child.affectedModules || child.affectedModules.length === 0) && <span className="text-gray-400">-</span>}
                                        </div>
                                      </ReleaseNoteDetailCard>
                                      <ReleaseNoteDetailCard label="修复 PR">
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(child as any).fixedPRs?.length > 0
                                            ? (child as any).fixedPRs.map((pr: string) => <a key={pr} href={`${ZMIND_PR_URL}${pr}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 hover:underline">#{pr}</a>)
                                            : <span className="text-gray-400">-</span>}
                                        </div>
                                      </ReleaseNoteDetailCard>
                                    </ReleaseNoteDetailSection>
                                    <ReleaseNoteDetailSection title="研发提测">
                                      <ReleaseNoteDetailCard label="RD 冒烟测试">
                                        <Tag variant="primary" className={getTestResultColor(child.rdSmokeStatus)}>{child.rdSmokeStatus || '未测试'}</Tag>
                                      </ReleaseNoteDetailCard>
                                      <ReleaseNoteDetailCard label="测试备注">
                                        <p className="break-words">{child.testingNotes || '-'}</p>
                                      </ReleaseNoteDetailCard>
                                    </ReleaseNoteDetailSection>
                                    <ReleaseNoteDetailSection title="QA 覆盖">
                                      <ReleaseNoteDetailCard label="QA 测试记录">
                                        <div className="space-y-2">
                                          <span>{childQaStats.recordCount}</span>
                                          <div>
                                            <Link
                                              to={`/version-records?keyword=${encodeURIComponent(child.version)}`}
                                              className="text-xs text-blue-700 hover:text-blue-900 hover:underline"
                                            >
                                              查看关联 QA 记录
                                            </Link>
                                          </div>
                                        </div>
                                      </ReleaseNoteDetailCard>
                                      <ReleaseNoteDetailCard label="已测固件数">
                                        <div className="space-y-2">
                                          <span>{childQaStats.firmwareCount}</span>
                                          <div>
                                            <Link
                                              to={`/version-workbench/${encodeURIComponent(child.parentVersion || child.version)}${child.projectType ? `?projectType=${encodeURIComponent(child.projectType)}` : ''}`}
                                              className="text-xs text-violet-700 hover:text-violet-900 hover:underline"
                                            >
                                              打开版本工作台
                                            </Link>
                                          </div>
                                        </div>
                                      </ReleaseNoteDetailCard>
                                    </ReleaseNoteDetailSection>
                                    <ReleaseNoteDetailSection title="附件资源">
                                      <ReleaseNoteDetailCard label="APK">
                                        {child.apkFileName && child.apkFilePath ? (
                                          <a href={getApkDownloadUrl(child.apkFilePath)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 break-all text-blue-700 hover:underline">
                                            📦 {child.apkFileName} ({child.apkFileSize ? formatFileSize(child.apkFileSize) : ''})
                                          </a>
                                        ) : <span className="text-gray-400 ml-1">-</span>}
                                      </ReleaseNoteDetailCard>
                                    </ReleaseNoteDetailSection>
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
