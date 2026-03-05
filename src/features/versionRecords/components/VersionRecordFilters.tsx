import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';

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

const RISK_LEVELS = ['低', '中', '高'];
const MODULES = ['录音', '蓝牙', 'ASR', 'NLU', '服务端', '网络', 'Android', 'UI', '数据库'];

const VersionRecordFilters: React.FC<VersionRecordFiltersProps> = ({
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

  const toggleRiskLevel = (value: string) => {
    updateAndApply({ riskLevel: localFilters.riskLevel === value ? undefined : value });
  };

  const toggleModule = (mod: string) => {
    const current = localFilters.modifiedModules || [];
    const next = current.includes(mod) ? current.filter((m) => m !== mod) : [...current, mod];
    updateAndApply({ modifiedModules: next.length > 0 ? next : undefined });
  };

  const handleReset = () => {
    const empty = { keyword: undefined, riskLevel: undefined, modifiedModules: undefined, startDate: undefined, endDate: undefined };
    setLocalFilters(empty);
    onFiltersChange(empty);
  };

  const hasActiveFilters = localFilters.riskLevel || (localFilters.modifiedModules && localFilters.modifiedModules.length > 0) || localFilters.startDate || localFilters.endDate;

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
            placeholder="搜索版本号或修改内容..."
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
            <span className="text-sm text-gray-500 mr-1">风险等级:</span>
            {RISK_LEVELS.map((level) => (
              <button
                key={level} type="button" onClick={() => toggleRiskLevel(level)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  localFilters.riskLevel === level ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                }`}
              >{level}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 mr-1">修改模块:</span>
            {MODULES.map((mod) => (
              <button
                key={mod} type="button" onClick={() => toggleModule(mod)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  (localFilters.modifiedModules || []).includes(mod) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                }`}
              >{mod}</button>
            ))}
          </div>
          <div className="flex gap-3 items-end flex-wrap">
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

export default VersionRecordFilters;
