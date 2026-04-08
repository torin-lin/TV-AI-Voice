import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { CustomerProblem } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';
const PT_LABEL: Record<string, string> = { TV: 'TV', Projector: 'Projector', STB: 'STB' };
const PT_COLOR: Record<string, string> = { TV: 'bg-yellow-100 text-yellow-800', Projector: 'bg-purple-100 text-purple-800', STB: 'bg-green-100 text-green-800' };

interface CustomerProblemsTableProps {
  problems: CustomerProblem[];
  loading: boolean;
  pagination: { page: number; pageSize: number; total: number };
  onEdit: (problem: CustomerProblem) => void;
  onDelete: (id: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  qaItems?: CustomerProblem[];
  onViewTimeline?: (problem: CustomerProblem) => void;
}

const getClassificationColor = (c?: string) => {
  const m: Record<string, string> = {
    '录音': 'bg-blue-200 text-blue-700', '蓝牙': 'bg-purple-100 text-purple-800',
    'ASR': 'bg-green-100 text-green-800', 'NLU': 'bg-yellow-100 text-yellow-800',
    '服务端': 'bg-red-100 text-red-800', '网络': 'bg-orange-100 text-orange-800',
    'Android': 'bg-blue-100 text-blue-800',
  };
  return m[c || ''] || 'bg-gray-100 text-gray-800';
};
const getStatusColor = (s: string) => {
  const m: Record<string, string> = { '开放': 'bg-red-100 text-red-800', '进行中': 'bg-yellow-100 text-yellow-800', '已解决': 'bg-green-100 text-green-800' };
  return m[s] || 'bg-gray-100 text-gray-800';
};

const CustomerProblemsTable: React.FC<CustomerProblemsTableProps> = ({
  problems, loading, pagination, onEdit, onDelete, onPaginationChange, qaItems, onViewTimeline,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const showProjectCol = currentProject === '全部';

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyText = (text: string, id: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getQaDescription = (qaId: string) => {
    const qa = qaItems?.find((q) => q.id === qaId);
    return qa ? qa.description : qaId;
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const isCustomer = problems.length > 0 && problems[0]?.problemType === 'customer';

  if (loading && problems.length === 0) return <div className="flex justify-center items-center py-8"><LoadingSpinner /></div>;
  if (problems.length === 0) return <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-gray-500">暂无记录</p></div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
              {showProjectCol && <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">项目</th>}
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">PR号</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">固件版本</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">问题描述</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">分类</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">问题时间</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {problems.map((p) => {
              const isExpanded = expandedIds.has(p.id!);
              return (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(p.id!)}>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </td>
                    {showProjectCol && <td className="px-3 py-3 text-sm"><Tag variant="primary" className={PT_COLOR[p.projectType || ''] || 'bg-gray-100 text-gray-600'}>{PT_LABEL[p.projectType || ''] || '-'}</Tag></td>}
                    <td className="px-3 py-3 text-sm">
                      {p.issueId ? (
                        <a href={`${ZMIND_BASE_URL}${p.issueId}`} target="_blank" rel="noopener noreferrer"
                          className="text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>#{p.issueId}</a>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 max-w-[120px] relative">
                      {p.firmwareVersion ? (
                        <span className="block truncate cursor-pointer hover:text-blue-700 transition-colors"
                          title={p.firmwareVersion}
                          onClick={(e) => { e.stopPropagation(); copyText(p.firmwareVersion!, p.id!); }}>
                          {p.firmwareVersion}
                          {copiedId === p.id && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded whitespace-nowrap">已复制</span>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={p.description}>{p.description}</td>
                    <td className="px-3 py-3 text-sm">
                      {p.classification ? <Tag variant="primary" className={getClassificationColor(p.classification)}>{p.classification}</Tag> : <span className="text-gray-400">未分类</span>}
                    </td>
                    <td className="px-3 py-3 text-sm"><Tag variant="primary" className={getStatusColor(p.status)}>{p.status}</Tag></td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {p.issueCreatedAt
                        ? new Date(p.issueCreatedAt).toLocaleString('zh-CN')
                        : new Date(p.createdAt).toLocaleString('zh-CN')}
                      {p.issueCreatedAt && <span className="ml-1 text-xs text-cyan-600" title="来自 zmind PR 创建时间">PR</span>}
                    </td>
                    <td className="px-2 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 flex-nowrap">
                        {isCustomer && p.linkedQaProblems && p.linkedQaProblems.length > 0 && onViewTimeline && (
                          <Button onClick={() => onViewTimeline(p)} variant="secondary" size="sm" className={showProjectCol ? '!px-2 !py-1 !text-xs whitespace-nowrap' : ''}>时间轴</Button>
                        )}
                        <Button onClick={() => onEdit(p)} variant="secondary" size="sm" className={showProjectCol ? '!px-2 !py-1 !text-xs whitespace-nowrap' : ''}>编辑</Button>
                        <Button onClick={() => onDelete(p.id!)} variant="danger" size="sm" className={showProjectCol ? '!px-2 !py-1 !text-xs whitespace-nowrap' : ''}>删除</Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-blue-100/30">
                      <td colSpan={showProjectCol ? 9 : 8} className="px-6 py-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm overflow-hidden">
                          <div className="col-span-2 min-w-0">
                            <span className="text-gray-500">问题描述：</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{p.description}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">固件版本：</span>
                            <p className="text-gray-900 mt-1 break-words">{p.firmwareVersion || '-'}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">项目类型：</span>
                            <p className="text-gray-900 mt-1">{p.projectType || '-'}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-500">问题时间（追责依据）：</span>
                            <p className="text-gray-900 mt-1">
                              {p.issueCreatedAt
                                ? `${new Date(p.issueCreatedAt).toLocaleString('zh-CN')}（PR创建时间）`
                                : `${new Date(p.createdAt).toLocaleString('zh-CN')}（提交时间）`}
                            </p>
                          </div>
                          {isCustomer && (
                            <div className="col-span-2 min-w-0">
                              <span className="text-gray-500">关联 QA 问题：</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.linkedQaProblems && p.linkedQaProblems.length > 0 ? p.linkedQaProblems.map((qaId) => (
                                  <span key={qaId} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs break-words" title={getQaDescription(qaId)}>
                                    {getQaDescription(qaId).slice(0, 30)}{getQaDescription(qaId).length > 30 ? '...' : ''}
                                  </span>
                                )) : <span className="text-gray-400">-</span>}
                              </div>
                            </div>
                          )}
                          <div className="col-span-2 min-w-0">
                            <span className="text-gray-500">备注：</span>
                            <p className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{p.notes || '-'}</p>
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

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">第 {pagination.page} 页，共 {totalPages} 页（{pagination.total} 条）</div>
          <div className="flex gap-2">
            <Button onClick={() => onPaginationChange(Math.max(1, pagination.page - 1), pagination.pageSize)}
              variant="secondary" disabled={pagination.page === 1} size="sm">上一页</Button>
            <Button onClick={() => onPaginationChange(Math.min(totalPages, pagination.page + 1), pagination.pageSize)}
              variant="secondary" disabled={pagination.page === totalPages} size="sm">下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProblemsTable;
