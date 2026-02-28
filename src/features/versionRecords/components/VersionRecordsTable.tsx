import React from 'react';
import { VersionRecord } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Tag } from '../../../components/common/Tag';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';

interface VersionRecordsTableProps {
  records: VersionRecord[];
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
  onEdit: (record: VersionRecord) => void;
  onDelete: (id: string) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSortingChange: (field: string, order: 'asc' | 'desc') => void;
}

/**
 * 版本记录表格组件
 * 显示版本记录列表，支持排序和分页
 */
const VersionRecordsTable: React.FC<VersionRecordsTableProps> = ({
  records,
  loading,
  pagination,
  sorting,
  onEdit,
  onDelete,
  onPaginationChange,
  onSortingChange,
}) => {
  // 获取风险等级的颜色
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case '低':
        return 'bg-green-100 text-green-800';
      case '中':
        return 'bg-yellow-100 text-yellow-800';
      case '高':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取测试状态的颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '通过':
        return 'bg-green-100 text-green-800';
      case '失败':
        return 'bg-red-100 text-red-800';
      case '未测试':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
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

  if (loading && records.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">暂无版本记录</p>
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
                onClick={() => handleHeaderClick('versionNumber')}
              >
                版本号{getSortIndicator('versionNumber')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                修改内容
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                修改模块
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('riskLevel')}
              >
                风险等级{getSortIndicator('riskLevel')}
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('smokeTestResult')}
              >
                冒烟测试{getSortIndicator('smokeTestResult')}
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('voiceRegressionResult')}
              >
                语音回归{getSortIndicator('voiceRegressionResult')}
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleHeaderClick('systemRegressionResult')}
              >
                系统回归{getSortIndicator('systemRegressionResult')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {record.versionNumber}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {record.changeDescription}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-1 flex-wrap">
                    {record.modifiedModules?.map((module) => (
                      <Tag key={module} variant="secondary">
                        {module}
                      </Tag>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Tag variant="primary" className={getRiskLevelColor(record.riskLevel)}>
                    {record.riskLevel}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Tag
                    variant="primary"
                    className={getStatusColor(record.smokeTestResult)}
                  >
                    {record.smokeTestResult}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Tag
                    variant="primary"
                    className={getStatusColor(record.voiceRegressionResult)}
                  >
                    {record.voiceRegressionResult}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Tag
                    variant="primary"
                    className={getStatusColor(record.systemRegressionResult)}
                  >
                    {record.systemRegressionResult}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onEdit(record)}
                      variant="secondary"
                      size="sm"
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={() => onDelete(record.id!)}
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

export default VersionRecordsTable;
