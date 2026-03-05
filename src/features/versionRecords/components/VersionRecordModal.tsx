import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { VersionRecord } from '../../../types/database';
import { createVersionRecord, updateVersionRecord } from '../store/versionRecordsSlice';
import VersionRecordForm from './VersionRecordForm';

interface VersionRecordModalProps {
  record?: VersionRecord | null;
  onClose: () => void;
}

/**
 * 版本记录模态框组件
 * 用于添加和编辑版本记录的模态框
 */
const VersionRecordModal: React.FC<VersionRecordModalProps> = ({
  record,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);

  // 处理表单提交
  const handleSubmit = async (data: Partial<VersionRecord>) => {
    setLoading(true);
    try {
      // 确保 riskLevel 有值
      const submitData = {
        ...data,
        riskLevel: data.riskLevel || '中',
      } as Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>;

      if (record?.id) {
        // 编辑现有记录
        await dispatch(
          updateVersionRecord({
            id: record.id,
            data: submitData,
          })
        ).unwrap();
      } else {
        // 创建新记录
        await dispatch(createVersionRecord(submitData)).unwrap();
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
            {record ? '编辑QA版本记录' : '添加新QA版本记录'}
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
          <VersionRecordForm
            record={record}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default VersionRecordModal;
