import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';

interface ReleaseNoteFiltersProps {
  filters: {
    keyword?: string;
    changeType?: string;
    severity?: string;
    branch?: string;
    startDate?: number;
    endDate?: number;
  };
  onFiltersChange: (filters: any) => void;
}

const CHANGE_TYPES = ['功能', '修复', '优化', '重构', '文档'];
const SEVERITIES = ['低', '中', '高', '紧急'];

const ReleaseNoteFilters: React.FC<ReleaseNoteFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateAndApply = (patch: Record<string, any>) => {
    const next = { ...localFilters, ...patch };
    setLocalFilters(next);
    onFiltersChange(next);
  };

  const toggleFilter = (key: string, value: string) => {
    updateAndApply({ [key]: localFilters[key as keyof typeof localFilters] === value ? undefined : value });
  };

  const handleReset = () => {
    const empty = { keyword: undefined, changeType: undefined, severity: undefined, branch: undefined, startDate: undefined, endDate: undefined };
    setLocalFilters(empty);
    onFiltersChange(empty);
  };

  const hasActiveFilters = localFilters.changeType || localFilters.severity || localFilters.branch || localFilters.startDate || localFilters.endDate;

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4">
        <div className="flex gap-3">
          <Input
            type="text"
            name="keyword"
            value={localFilters.keyword || ''}
            onChange={(e) => setLocalFilters((prev) => ({ ...prev, keyword: e.target.value || undefined }))}
            onKeyDown={(e) => { if (e.key === 'Enter') onFiltersChange(localFilters); }}
            placeholder="搜索版本号、分支、作者..."
            className="flex-1"
          />
          <Button onClick={() => onFiltersChange(localFilters)} variant="primary">搜索</Button>
          <Button onClick={() => setIsExpanded(!isExpanded)} variant="secondary">
            {isExpanded ? '收起筛选' : '条件筛选'}
          </Button>
          {hasActiveFilters && (
            <Button onClick={handleReset} variant="secondary">重置</Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 mr-1">修改类型:</span>
            {CHANGE_TYPES.map((t) => (
              <button
                key={t} type="button" onClick={() => toggleFilter('changeType', t)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  localFilters.changeType === t ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                }`}
              >{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 mr-1">严重程度:</span>
            {SEVERITIES.map((s) => (
              <button
                key={s} type="button" onClick={() => toggleFilter('severity', s)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  localFilters.severity === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                }`}
              >{s}</button>
            ))}
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">分支</label>
              <Input type="text" name="branch" value={localFilters.branch || ''} onChange={(e) => updateAndApply({ branch: e.target.value || undefined })} placeholder="main, develop..." />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
              <Input type="date" name="startDate" value={localFilters.startDate ? new Date(localFilters.startDate).toISOString().split('T')[0] : ''} onChange={(e) => updateAndApply({ startDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
              <Input type="date" name="endDate" value={localFilters.endDate ? new Date(localFilters.endDate).toISOString().split('T')[0] : ''} onChange={(e) => updateAndApply({ endDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseNoteFilters;
