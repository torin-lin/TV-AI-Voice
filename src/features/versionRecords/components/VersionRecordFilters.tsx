import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';

interface VersionRecordFiltersProps {
  filters: {
    keyword?: string;
    riskLevel?: string;
    modifiedModules?: string[];
    startDate?: number;
    endDate?: number;
  };
  onFiltersChange: (filters: any) => void;
}

/**
 * 版本记录筛选器组件
 * 提供搜索和筛选功能
 */
const VersionRecordFilters: React.FC<VersionRecordFiltersProps> = ({
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

  // 处理模块选择变化
  const handleModulesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setLocalFilters((prev) => ({
      ...prev,
      modifiedModules: selectedOptions.length > 0 ? selectedOptions : undefined,
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
      riskLevel: undefined,
      modifiedModules: undefined,
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
            placeholder="搜索版本号或修改内容..."
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
            {/* 风险等级 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                风险等级
              </label>
              <Select
                name="riskLevel"
                value={localFilters.riskLevel || ''}
                onChange={handleInputChange}
                options={[
                  { value: '', label: '全部' },
                  { value: '低', label: '低' },
                  { value: '中', label: '中' },
                  { value: '高', label: '高' },
                ]}
              />
            </div>

            {/* 修改模块 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                修改模块
              </label>
              <select
                multiple
                name="modifiedModules"
                value={localFilters.modifiedModules || []}
                onChange={handleModulesChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="录音">录音</option>
                <option value="蓝牙">蓝牙</option>
                <option value="ASR">ASR</option>
                <option value="NLU">NLU</option>
                <option value="服务端">服务端</option>
                <option value="网络">网络</option>
                <option value="Android">Android</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">按住 Ctrl/Cmd 可多选</p>
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

export default VersionRecordFilters;
