import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { CustomerProblem } from '../../../types/database';
import {
  createCustomerProblem,
  updateCustomerProblem,
} from '../store/customerProblemsSlice';
import CustomerProblemForm from './CustomerProblemForm';

interface CustomerProblemModalProps {
  problem?: CustomerProblem | null;
  onClose: () => void;
}

/**
 * 客户问题模态框组件
 * 用于添加和编辑客户问题的模态框
 */
const CustomerProblemModal: React.FC<CustomerProblemModalProps> = ({
  problem,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);

  // 处理表单提交
  const handleSubmit = async (data: Partial<CustomerProblem>) => {
    setLoading(true);
    try {
      if (problem?.id) {
        // 编辑现有问题
        await dispatch(
          updateCustomerProblem({
            id: problem.id,
            data,
          })
        ).unwrap();
      } else {
        // 创建新问题
        await dispatch(createCustomerProblem(data)).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 模态框头 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {problem ? '编辑问题' : '添加新问题'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* 模态框内容 */}
        <div className="p-6">
          <CustomerProblemForm
            problem={problem}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerProblemModal;
