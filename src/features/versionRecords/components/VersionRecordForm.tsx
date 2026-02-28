import React, { useState, useEffect } from 'react';
import { VersionRecord } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';

interface VersionRecordFormProps {
  record?: VersionRecord | null;
  onSubmit: (data: Partial<VersionRecord>) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * 版本记录表单组件
 * 用于添加和编辑版本记录
 */
const VersionRecordForm: React.FC<VersionRecordFormProps> = ({
  record,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<VersionRecord>>({
    versionNumber: '',
    changeDescription: '',
    modifiedModules: [],
    riskLevel: '中',
    smokeTestResult: '未测试',
    voiceRegressionResult: '未测试',
    systemRegressionResult: '未测试',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record]);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.versionNumber?.trim()) {
      newErrors.versionNumber = '版本号不能为空';
    }

    if (!formData.changeDescription?.trim()) {
      newErrors.changeDescription = '修改内容不能为空';
    }

    if (!formData.modifiedModules || formData.modifiedModules.length === 0) {
      newErrors.modifiedModules = '至少选择一个修改模块';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 清除错误
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 处理模块选择变化
  const handleModulesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({
      ...prev,
      modifiedModules: selectedOptions,
    }));
    if (errors.modifiedModules) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.modifiedModules;
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 版本号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          版本号 <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          name="versionNumber"
          value={formData.versionNumber || ''}
          onChange={handleInputChange}
          placeholder="例如: v1.0.0"
          error={errors.versionNumber}
        />
      </div>

      {/* 修改内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          修改内容 <span className="text-red-500">*</span>
        </label>
        <Textarea
          name="changeDescription"
          value={formData.changeDescription || ''}
          onChange={handleInputChange}
          placeholder="描述本次版本的主要修改内容"
          rows={3}
          error={errors.changeDescription}
        />
      </div>

      {/* 修改模块 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          修改模块 <span className="text-red-500">*</span>
        </label>
        <select
          multiple
          name="modifiedModules"
          value={formData.modifiedModules || []}
          onChange={handleModulesChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="录音">录音</option>
          <option value="蓝牙">蓝牙</option>
          <option value="ASR">ASR</option>
          <option value="NLU">NLU</option>
          <option value="服务端">服务端</option>
          <option value="网络">网络</option>
          <option value="Android">Android</option>
        </select>
        {errors.modifiedModules && (
          <p className="text-red-500 text-sm mt-1">{errors.modifiedModules}</p>
        )}
        <p className="text-gray-500 text-xs mt-1">按住 Ctrl/Cmd 可多选</p>
      </div>

      {/* 风险等级 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          风险等级
        </label>
        <Select
          name="riskLevel"
          value={formData.riskLevel || '中'}
          onChange={handleInputChange}
          options={[
            { value: '低', label: '低' },
            { value: '中', label: '中' },
            { value: '高', label: '高' },
          ]}
        />
      </div>

      {/* 冒烟测试结果 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          冒烟测试结果
        </label>
        <Select
          name="smokeTestResult"
          value={formData.smokeTestResult || '未测试'}
          onChange={handleInputChange}
          options={[
            { value: '未测试', label: '未测试' },
            { value: '通过', label: '通过' },
            { value: '失败', label: '失败' },
          ]}
        />
      </div>

      {/* 语音回归结果 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          语音回归结果
        </label>
        <Select
          name="voiceRegressionResult"
          value={formData.voiceRegressionResult || '未测试'}
          onChange={handleInputChange}
          options={[
            { value: '未测试', label: '未测试' },
            { value: '通过', label: '通过' },
            { value: '失败', label: '失败' },
          ]}
        />
      </div>

      {/* 系统回归结果 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          系统回归结果
        </label>
        <Select
          name="systemRegressionResult"
          value={formData.systemRegressionResult || '未测试'}
          onChange={handleInputChange}
          options={[
            { value: '未测试', label: '未测试' },
            { value: '通过', label: '通过' },
            { value: '失败', label: '失败' },
          ]}
        />
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          备注
        </label>
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
        <Button onClick={onCancel} variant="secondary" disabled={loading}>
          取消
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
};

export default VersionRecordForm;
