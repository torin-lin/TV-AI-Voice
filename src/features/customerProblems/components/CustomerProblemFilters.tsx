import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/common/Input';
import { CUSTOMER_PROBLEM_STATUS_OPTIONS, DEFAULT_PROBLEM_CLASSIFICATIONS } from '../../../config/dictionaries';

interface CustomerProblemFiltersProps {
  filters: {
    keyword?: string;
    classification?: string;
    status?: string;
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
    onFiltersChange({
      ...filters,
      classification: filters.classification === c ? undefined : c,
    });
  };

  const toggleStatus = (s: string) => {
    onFiltersChange({
      ...filters,
      status: filters.status === s ? undefined : s,
    });
  };

  const hasActiveFilters = filters.classification || filters.status;

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      <div className="p-3 flex gap-3 items-center">
        <Input
          type="text"
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="搜索问题描述、分类、PR号..."
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
          条件筛选 {hasActiveFilters ? '●' : ''}
        </button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
          {/* 分类筛选 */}
          <div>
            <span className="text-xs text-gray-500 mr-2">分类:</span>
            <div className="inline-flex flex-wrap gap-1.5">
              {DEFAULT_PROBLEM_CLASSIFICATIONS.map((c) => (
                <button key={c} onClick={() => toggleClassification(c)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    filters.classification === c
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                  }`}>{c}</button>
              ))}
            </div>
          </div>
          {/* 状态筛选 */}
          <div>
            <span className="text-xs text-gray-500 mr-2">状态:</span>
            <div className="inline-flex flex-wrap gap-1.5">
              {CUSTOMER_PROBLEM_STATUS_OPTIONS.map((s) => (
                <button key={s.value} onClick={() => toggleStatus(s.value)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    filters.status === s.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                  }`}>{s.label}</button>
              ))}
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
