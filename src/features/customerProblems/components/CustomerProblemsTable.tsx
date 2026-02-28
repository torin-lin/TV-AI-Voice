import React from 'react';
import { CustomerProblem } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';

interface CustomerProblemsTableProps {
  problems: CustomerProblem[];
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
  onEdit: (problem: CustomerProblem) => void;
  onDelete: (id: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSortingChange: (field: string, order: 'asc' | 'desc') => void;
}

/**
 * 客户问题表格组件
 * 显示客户问题列表，支持排序和分页
 */
const CustomerProblemsTable: React.FC<CustomerProblemsTableProps> = ({
  problems,
  loading,
  pagination,
  sorting,
  onEdit,
  onDelete,
  onPaginationChange,
  onSortingChange,
}) => {
  // 获取分类的颜色
  const getClassificationColor = (classification?: string) => {
    const colors: Record<string, string> = {
      '录音': 'bg-blue-100 text-blue-800',
      '蓝牙': 'bg-purple-100 text-purple-800',
      'ASR': 'bg-green-100 text-green-800',
      'NLU': 'bg-yellow-100 text-yellow-800',
      '服务端': 'bg-red-100 text-red-800',
      '网络': 'bg-orange-100 text-orange-800',
      'Android': 'bg-indigo-100 text-indigo-800',
    };
    return colors[classification || ''] || 'bg-gray-100 text-gray-800';
  };

  // 获取状态的颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '开放':
        return 'bg-red-100 text-red-800';
      case '进行中':
        return 'bg-yellow-100 text-yellow-800';
      case '已解决':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 处理列头点击排序
  const handleHeaderClick = (field: string) => {
    const newOrder =
      sorting.field === field && sorting.order === 'asc' ? 'desc' : 'asc';
    onSortingChange(field, newOrder);
  };

  // 获取排序指示符
  const getSortIndicator = (field: string) => {
    if (sorting.field !== field) return '';
    return sorting.order === 'asc' ? ' ↑' : ' ↓';
  };

  // 计算总页数
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading && problems.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">暂无问题记录</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('description')}
              >
                问题描述{getSortIndicator('description')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                分类
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                置信度
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('status')}
              >
                状态{getSortIndicator('status')}
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('createdAt')}
              >
                创建时间{getSortIndicator('createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {problems.map((problem) => (
              <tr key={problem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {problem.description}
                </td>
                <td className="px-6 py-4 text-sm">
                  {problem.classification ? (
                    <Tag
                      variant="primary"
                      className={getClassificationColor(problem.classification)}
                    >
                      {problem.classification}
                    </Tag>
                  ) : (
                    <span className="text-gray-500">未分类</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {problem.confidence ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${problem.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {(problem.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Tag
                    variant="primary"
                    className={getStatusColor(problem.status)}
                  >
                    {problem.status}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(problem.createdAt).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onEdit(problem)}
                      variant="secondary"
                      size="sm"
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={() => onDelete(problem.id!)}
                      variant="danger"
                      size="sm"
                    >
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          第 {pagination.page} 页，共 {totalPages} 页（总计 {pagination.total} 条）
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              onPaginationChange(
                Math.max(1, pagination.page - 1),
                pagination.pageSize
              )
            }
            variant="secondary"
            disabled={pagination.page === 1}
            size="sm"
          >
            上一页
          </Button>
          <Button
            onClick={() =>
              onPaginationChange(
                Math.min(totalPages, pagination.page + 1),
                pagination.pageSize
              )
            }
            variant="secondary"
            disabled={pagination.page === totalPages}
            size="sm"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerProblemsTable;
