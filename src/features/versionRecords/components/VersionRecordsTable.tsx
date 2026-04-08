import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { VersionRecord } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { getDocDownloadUrl } from '../../../services/DocUploadService';
import { formatFileSize } from '../../../services/ApkUploadService';
import VersionIssueList from './VersionIssueList';
import { useI18n } from '../../../i18n/I18nProvider';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';
const PT_LABEL: Record<string, string> = { TV: 'TV', Projector: 'Projector', STB: 'STB' };
const PT_COLOR: Record<string, string> = { TV: 'bg-yellow-100 text-yellow-800', Projector: 'bg-purple-100 text-purple-800', STB: 'bg-green-100 text-green-800' };

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
  const { formatDateTime } = useI18n();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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
  const getSortIndicator = (field: string) => sorting.field !== field ? '' : sorting.order === 'asc' ? ' ↑' : ' ↓';
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const groupedRecords = Object.values(records.reduce<Record<string, { versionKey: string; rootVersion: string; projectType?: string; records: VersionRecord[] }>>((acc, record) => {
    const rootVersion = record.parentVersion || record.versionNumber;
    if (!acc[rootVersion]) {
      acc[rootVersion] = {
        versionKey: rootVersion,
        rootVersion,
        projectType: record.projectType,
        records: [],
      };
    }
    acc[rootVersion].records.push(record);
    return acc;
  }, {})).map((group) => ({
    ...group,
    records: [...group.records].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
  }));

  if (loading && records.length === 0) return <div className="flex justify-center items-center py-12"><LoadingSpinner /></div>;
  if (records.length === 0) return <div className="bg-white rounded-lg shadow p-8 text-center"><p className="text-gray-500">暂无版本记录</p></div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
              {showProjectCol && <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">项目</th>}
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('versionNumber')}>关联版本号{getSortIndicator('versionNumber')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">固件覆盖</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">修改内容</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('riskLevel')}>风险等级{getSortIndicator('riskLevel')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">记录数</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">冒烟概览</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">语音回归概览</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">系统回归概览</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('createdAt')}>创建时间{getSortIndicator('createdAt')}</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groupedRecords.map((group) => {
              const isExpanded = expandedIds.has(group.versionKey);
              const firmwareList = Array.from(new Set(group.records.map((r) => r.firmwareVersion).filter(Boolean)));
              const latestRecord = group.records[0];
              const summarizeResult = (key: 'smokeTestResult' | 'voiceRegressionResult' | 'systemRegressionResult') => {
                const values = group.records.map((r) => r[key]);
                if (values.includes('失败')) return '失败';
                if (values.includes('未测试')) return '未测试';
                return '通过';
              };
              return (
                <React.Fragment key={group.versionKey}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(group.versionKey)}>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </td>
                    {showProjectCol && <td className="px-3 py-3 text-sm"><Tag variant="primary" className={PT_COLOR[group.projectType || ''] || 'bg-gray-100 text-gray-600'}>{PT_LABEL[group.projectType || ''] || '-'}</Tag></td>}
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{group.rootVersion}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={firmwareList.join('、') || '-'}>
                      {firmwareList.length > 0 ? firmwareList.join('、') : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate" title={latestRecord?.changeDescription}>{latestRecord?.changeDescription || '-'}</td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getRiskColor(latestRecord?.riskLevel || '')}>{latestRecord?.riskLevel || '-'}</Tag></td>
                    <td className="px-3 py-3 text-sm text-gray-700">{group.records.length}</td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(summarizeResult('smokeTestResult'))}>{summarizeResult('smokeTestResult')}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(summarizeResult('voiceRegressionResult'))}>{summarizeResult('voiceRegressionResult')}</Tag></td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(summarizeResult('systemRegressionResult'))}>{summarizeResult('systemRegressionResult')}</Tag></td>
                    <td className="px-3 py-3 text-sm text-gray-600">{latestRecord?.createdAt ? formatDateTime(latestRecord.createdAt) : '-'}</td>
                    <td className="px-3 py-3 text-sm text-gray-500">{group.records.length > 1 ? '同版本多固件' : '单记录'}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-blue-100/30">
                      <td colSpan={showProjectCol ? 12 : 11} className="px-6 py-4">
                        <div className="space-y-4">
                          {group.records.map((r) => (
                            <div key={r.id} className="rounded-lg border border-blue-200 bg-white p-4">
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{r.versionNumber}</div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                    <span>固件: {r.firmwareVersion || '-'}</span>
                                    <span>测试周期: {r.testCycle || '-'}</span>
                                    <span>创建时间: {formatDateTime(r.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button onClick={() => onEdit(r)} variant="secondary" size="sm">编辑</Button>
                                  <Button onClick={() => onDelete(r.id!)} variant="danger" size="sm">删除</Button>
                                </div>
                              </div>

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
                                <div className="min-w-0">
                                  <span className="text-gray-500">测试结果：</span>
                                  <div className="mt-1">
                                    {r.testResultFileName && r.testResultFilePath ? (
                                      <a href={getDocDownloadUrl(r.testResultFilePath)} target="_blank" rel="noopener noreferrer"
                                        className="text-emerald-700 hover:underline text-xs break-all">
                                        📊 {r.testResultFileName} {r.testResultFileSize ? `(${formatFileSize(r.testResultFileSize)})` : ''}
                                      </a>
                                    ) : <span className="text-gray-400">-</span>}
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-gray-500">测试结果概览：</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <Tag variant="primary" className={getStatusColor(r.smokeTestResult)}>{`冒烟 ${r.smokeTestResult}`}</Tag>
                                    <Tag variant="primary" className={getStatusColor(r.voiceRegressionResult)}>{`语音 ${r.voiceRegressionResult}`}</Tag>
                                    <Tag variant="primary" className={getStatusColor(r.systemRegressionResult)}>{`系统 ${r.systemRegressionResult}`}</Tag>
                                  </div>
                                </div>
                                <div className="col-span-2 min-w-0">
                                  <span className="text-gray-500">备注：</span>
                                  <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{r.notes || '-'}</p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <VersionIssueList versionRecordId={r.id!} versionNumber={r.versionNumber} />
                              </div>
                            </div>
                          ))}
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
