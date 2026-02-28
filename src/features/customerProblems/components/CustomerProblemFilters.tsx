import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';

interface CustomerProblemFiltersProps {
  filters: {
    keyword?: string;
    classification?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
  };
  onFiltersChange: (filters: any) => void;
}

/**
 * 客户问题筛选器组件
 * 提供搜索和筛选功能
 */
const CustomerProblemFilters: React.FC<CustomerProblemFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLocalFilters((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  // 应用筛选
  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  // 重置筛选
  const handleResetFilters = () => {
    const resetFilters = {
      keyword: undefined,
      classification: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      {/* 简单搜索 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-3">
          <Input
            type="text"
            name="keyword"
            value={localFilters.keyword || ''}
            onChange={handleInputChange}
            placeholder="搜索问题描述或分类..."
            className="flex-1"
          />
          <Button onClick={handleApplyFilters} variant="primary">
            搜索
          </Button>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="secondary"
          >
            {isExpanded ? '隐藏' : '显示'}高级筛选
          </Button>
        </div>
      </div>

      {/* 高级筛选 */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 问题分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                问题分类
              </label>
              <Select
                name="classification"
                value={localFilters.classification || ''}
                onChange={handleInputChange}
                options={[
                  { value: '', label: '全部' },
                  { value: '录音', label: '录音' },
                  { value: '蓝牙', label: '蓝牙' },
                  { value: 'ASR', label: 'ASR' },
                  { value: 'NLU', label: 'NLU' },
                  { value: '服务端', label: '服务端' },
                  { value: '网络', label: '网络' },
                  { value: 'Android', label: 'Android' },
                ]}
              />
            </div>

            {/* 问题状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                问题状态
              </label>
              <Select
                name="status"
                value={localFilters.status || ''}
                onChange={handleInputChange}
                options={[
                  { value: '', label: '全部' },
                  { value: '开放', label: '开放' },
                  { value: '进行中', label: '进行中' },
                  { value: '已解决', label: '已解决' },
                ]}
              />
            </div>

            {/* 开始日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <Input
                type="date"
                name="startDate"
                value={
                  localFilters.startDate
                    ? new Date(localFilters.startDate).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value).getTime()
                    : undefined;
                  setLocalFilters((prev) => ({
                    ...prev,
                    startDate: date,
                  }));
                }}
              />
            </div>

            {/* 结束日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <Input
                type="date"
                name="endDate"
                value={
                  localFilters.endDate
                    ? new Date(localFilters.endDate).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value).getTime()
                    : undefined;
                  setLocalFilters((prev) => ({
                    ...prev,
                    endDate: date,
                  }));
                }}
              />
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 mt-4 justify-end">
            <Button onClick={handleResetFilters} variant="secondary">
              重置
            </Button>
            <Button onClick={handleApplyFilters} variant="primary">
              应用筛选
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProblemFilters;
