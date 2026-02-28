import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';

interface RecommendationFormProps {
  onSubmit: (data: {
    versionNumber: string;
    changeDescription: string;
    riskLevel: '低' | '中' | '高';
  }) => void;
  loading?: boolean;
}

/**
 * 推荐表单组件
 * 用于输入版本信息和生成推荐
 */
const RecommendationForm: React.FC<RecommendationFormProps> = ({
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    versionNumber: '',
    changeDescription: '',
    riskLevel: '中' as '低' | '中' | '高',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.versionNumber.trim()) {
      newErrors.versionNumber = '版本号不能为空';
    }

    if (!formData.changeDescription.trim()) {
      newErrors.changeDescription = '修改内容不能为空';
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
          value={formData.versionNumber}
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
          value={formData.changeDescription}
          onChange={handleInputChange}
          placeholder="详细描述本次版本的主要修改内容"
          rows={4}
          error={errors.changeDescription}
        />
      </div>

      {/* 风险等级 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          风险等级
        </label>
        <Select
          name="riskLevel"
          value={formData.riskLevel}
          onChange={handleInputChange}
          options={[
            { value: '低', label: '低' },
            { value: '中', label: '中' },
            { value: '高', label: '高' },
          ]}
        />
        <p className="text-gray-500 text-xs mt-2">
          低: 冒烟 + 定向测试 | 中: 冒烟 + 语音回归 | 高: 全链路回归
        </p>
      </div>

      {/* 提交按钮 */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full"
        >
          {loading ? '生成中...' : '生成推荐'}
        </Button>
      </div>
    </form>
  );
};

export default RecommendationForm;
