import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { CustomerProblem } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';
import { Input } from '../../../components/common/Input';
import { fetchFirmwareVersion } from '../../../services/ZmindApiService';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';
const CLASSIFICATIONS = ['录音', '蓝牙', 'ASR', 'NLU', '服务端', '网络', 'Android'];

interface CustomerProblemFormProps {
  problem?: CustomerProblem | null;
  problemType: 'customer' | 'qa';
  onSubmit: (data: Partial<CustomerProblem>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CustomerProblemForm: React.FC<CustomerProblemFormProps> = ({
  problem,
  problemType,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const qaItems = useSelector((state: RootState) => state.customerProblems.qaItems);

  const [formData, setFormData] = useState<Partial<CustomerProblem>>({
    problemType,
    issueId: '',
    firmwareVersion: '',
    description: '',
    classification: undefined,
    status: '开放',
    linkedQaProblems: [],
    projectType: 'TV',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchingFirmware, setFetchingFirmware] = useState(false);
  const [firmwareError, setFirmwareError] = useState('');
  const [qaSearch, setQaSearch] = useState('');

  useEffect(() => {
    if (problem) {
      setFormData({ ...problem, problemType });
    }
  }, [problem, problemType]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.description?.trim()) newErrors.description = '问题描述不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  /** 输入PR号后自动获取固件版本 */
  const handleFetchFirmware = async () => {
    const issueId = formData.issueId?.trim();
    if (!issueId) return;
    setFetchingFirmware(true);
    setFirmwareError('');
    try {
      const info = await fetchFirmwareVersion(issueId);
      setFormData((prev) => ({
        ...prev,
        firmwareVersion: info.firmwareVersion || prev.firmwareVersion,
        description: info.subject || prev.description,
      }));
      if (!info.firmwareVersion) {
        setFirmwareError('未找到 Tested Environment 信息');
      }
    } catch (err) {
      setFirmwareError((err as Error).message);
    } finally {
      setFetchingFirmware(false);
    }
  };

  /** 关联/取消关联 QA 问题 */
  const toggleQaLink = (qaId: string) => {
    setFormData((prev) => {
      const linked = prev.linkedQaProblems || [];
      if (linked.includes(qaId)) {
        return { ...prev, linkedQaProblems: linked.filter((id) => id !== qaId) };
      }
      return { ...prev, linkedQaProblems: [...linked, qaId] };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* PR号 + 自动获取固件版本 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PR号（zmind Issue ID）</label>
        <div className="flex gap-2">
          <Input
            type="text"
            name="issueId"
            value={formData.issueId || ''}
            onChange={handleInputChange}
            placeholder="输入 PR 号，如 12345"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleFetchFirmware}
            disabled={fetchingFirmware || !formData.issueId?.trim()}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {fetchingFirmware ? '获取中...' : '获取固件版本'}
          </button>
        </div>
        {formData.issueId && (
          <a href={`${ZMIND_BASE_URL}${formData.issueId}`} target="_blank" rel="noopener noreferrer"
            className="text-blue-700 hover:underline text-xs mt-1 inline-block">
            🔗 查看 zmind #{formData.issueId}
          </a>
        )}
        {firmwareError && <p className="text-orange-500 text-xs mt-1">{firmwareError}</p>}
      </div>

      {/* 固件版本号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">固件版本号</label>
        <Input
          type="text"
          name="firmwareVersion"
          value={formData.firmwareVersion || ''}
          onChange={handleInputChange}
          placeholder="自动获取或手动输入"
        />
      </div>

      {/* 问题描述 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          问题描述 <span className="text-red-500">*</span>
        </label>
        <Textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          placeholder="详细描述问题"
          rows={3}
          error={errors.description}
        />
      </div>

      {/* 问题分类 - tag 风格 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题分类</label>
        <div className="flex flex-wrap gap-2">
          {CLASSIFICATIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, classification: prev.classification === c ? undefined : c }))}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                formData.classification === c
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-blue-100 hover:border-blue-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 项目类型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
        <Select
          name="projectType"
          value={formData.projectType || 'TV'}
          onChange={handleInputChange}
          options={[
            { value: 'TV', label: 'TV AI Voice' },
            { value: 'Projector', label: 'Projector AI Voice' },
            { value: 'STB', label: 'STB AI Voice' },
          ]}
        />
      </div>

      {/* 状态 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题状态</label>
        <Select
          name="status"
          value={formData.status || '开放'}
          onChange={handleInputChange}
          options={[
            { value: '开放', label: '开放' },
            { value: '进行中', label: '进行中' },
            { value: '已解决', label: '已解决' },
          ]}
        />
      </div>

      {/* 关联QA问题（仅客户问题显示） */}
      {problemType === 'customer' && qaItems.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">关联 QA 问题（追责时间轴）</label>
          <input
            type="text"
            value={qaSearch}
            onChange={(e) => setQaSearch(e.target.value)}
            placeholder="搜索 QA 问题（描述、PR号、分类）"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
            {qaItems
              .filter((qa) => {
                if (!qaSearch.trim()) return true;
                const kw = qaSearch.toLowerCase();
                return (
                  (qa.description || '').toLowerCase().includes(kw) ||
                  (qa.issueId || '').toLowerCase().includes(kw) ||
                  (qa.classification || '').toLowerCase().includes(kw) ||
                  (qa.firmwareVersion || '').toLowerCase().includes(kw)
                );
              })
              .map((qa) => {
              const isLinked = (formData.linkedQaProblems || []).includes(qa.id!);
              return (
                <div
                  key={qa.id}
                  onClick={() => toggleQaLink(qa.id!)}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    isLinked ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50'
                  }`}
                >
                  <input type="checkbox" checked={isLinked} readOnly className="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{qa.description}</p>
                    <p className="text-xs text-gray-500">
                      {qa.issueId && `PR#${qa.issueId} · `}
                      {qa.classification || '未分类'} · {qa.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <Textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleInputChange}
          placeholder="添加任何额外的备注信息"
          rows={2}
        />
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 justify-end pt-4">
        <Button onClick={onCancel} variant="secondary" disabled={loading}>取消</Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerProblemForm;
