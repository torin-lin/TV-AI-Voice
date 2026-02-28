import React, { useState, useEffect } from 'react';
import { CustomerProblem } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';

interface CustomerProblemFormProps {
  problem?: CustomerProblem | null;
  onSubmit: (data: Partial<CustomerProblem>) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * 客户问题表单组件
 * 用于添加和编辑客户问题
 */
const CustomerProblemForm: React.FC<CustomerProblemFormProps> = ({
  problem,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<CustomerProblem>>({
    description: '',
    classification: undefined,
    confidence: 0,
    status: '开放',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (problem) {
      setFormData(problem);
    }
  }, [problem]);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description?.trim()) {
      newErrors.description = '问题描述不能为空';
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

  // 处理置信度变化
  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) / 100;
    setFormData((prev) => ({
      ...prev,
      confidence: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 问题描述 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          问题描述 <span className="text-red-500">*</span>
        </label>
        <Textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          placeholder="详细描述客户报告的问题"
          rows={4}
          error={errors.description}
        />
      </div>

      {/* 分类 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          问题分类
        </label>
        <Select
          name="classification"
          value={formData.classification || ''}
          onChange={handleInputChange}
          options={[
            { value: '', label: '未分类' },
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

      {/* 置信度 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          分类置信度
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={(formData.confidence || 0) * 100}
            onChange={handleConfidenceChange}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12">
            {((formData.confidence || 0) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 状态 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          问题状态
        </label>
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

export default CustomerProblemForm;
