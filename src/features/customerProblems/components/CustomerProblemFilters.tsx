import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/common/Input';
import { CUSTOMER_PROBLEM_STATUS_OPTIONS, DEFAULT_PROBLEM_CLASSIFICATIONS } from '../../../config/dictionaries';

interface CustomerProblemFiltersProps {
  filters: {
    keyword?: string;
    classification?: string;
    status?: string;
    firmwareVersion?: string;
    startDate?: number;
    endDate?: number;
  };
  onFiltersChange: (filters: any) => void;
}

const CustomerProblemFilters: React.FC<CustomerProblemFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [keyword, setKeyword] = useState(filters.keyword || '');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { setKeyword(filters.keyword || ''); }, [filters.keyword]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    onFiltersChange({ ...filters, keyword: val || undefined });
  };

  const toggleClassification = (c: string) => {
    onFiltersChange({ ...filters, classification: filters.classification === c ? undefined : c });
  };

  const toggleStatus = (s: string) => {
    onFiltersChange({ ...filters, status: filters.status === s ? undefined : s });
  };

  const updateFilter = (patch: Record<string, any>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const hasActiveFilters = filters.classification || filters.status || filters.firmwareVersion || filters.startDate || filters.endDate;

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      <div className="p-3 flex gap-3 items-center">
        <Input
          type="text"
          value={keyword}
          onChange={handleKeywordChange}
          onKeyDown={(e) => { if (e.key === 'Enter') onFiltersChange({ ...filters, keyword: keyword || undefined }); }}
          placeholder="搜索问题描述、分类、PR号、固件版本..."
          className="flex-1"
        />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
            isExpanded || hasActiveFilters
              ? 'bg-blue-100 text-blue-600 border border-blue-300'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          筛选 {hasActiveFilters ? <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block"></span> : ''}
        </button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
          {/* 状态筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16">状态:</span>
            {CUSTOMER_PROBLEM_STATUS_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => toggleStatus(s.value)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  filters.status === s.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                }`}>{s.label}</button>
            ))}
          </div>
          {/* 分类筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16">分类:</span>
            {DEFAULT_PROBLEM_CLASSIFICATIONS.map((c) => (
              <button key={c} onClick={() => toggleClassification(c)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  filters.classification === c ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                }`}>{c}</button>
            ))}
          </div>
          {/* 固件版本 + 日期范围 */}
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">固件版本</label>
              <Input type="text" value={filters.firmwareVersion || ''} onChange={(e) => updateFilter({ firmwareVersion: e.target.value || undefined })} placeholder="按固件版本筛选" />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <Input type="date" value={filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : ''} onChange={(e) => updateFilter({ startDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <Input type="date" value={filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : ''} onChange={(e) => updateFilter({ endDate: e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined })} />
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={() => onFiltersChange({ keyword: filters.keyword })}
              className="text-xs text-gray-500 hover:text-red-500">清除筛选条件</button>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerProblemFilters;
