import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { CustomerProblem } from '../../../types/database';
import { createProblem, updateProblem } from '../store/customerProblemsSlice';
import CustomerProblemForm from './CustomerProblemForm';

interface CustomerProblemModalProps {
  problem?: CustomerProblem | null;
  problemType: 'customer' | 'qa';
  onClose: () => void;
}

const CustomerProblemModal: React.FC<CustomerProblemModalProps> = ({
  problem,
  problemType,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Partial<CustomerProblem>) => {
    setLoading(true);
    try {
      if (problem?.id) {
        await dispatch(updateProblem({ id: problem.id, data })).unwrap();
      } else {
        await dispatch(createProblem({ ...data, problemType })).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const title = problemType === 'customer'
    ? (problem ? '编辑客户问题' : '添加客户问题')
    : (problem ? '编辑QA问题' : '添加QA问题');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none" disabled={loading}>×</button>
        </div>
        <div className="p-6">
          <CustomerProblemForm
            problem={problem}
            problemType={problemType}
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
