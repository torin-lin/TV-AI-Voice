import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  createReleaseNote,
  updateReleaseNote,
} from '../store/releaseNotesSlice';
import { ReleaseNote } from '../../../types/database';
import ReleaseNoteForm from './ReleaseNoteForm';

interface ReleaseNoteModalProps {
  record?: ReleaseNote | null;
  defaultParentVersion?: string;
  onClose: () => void;
}

/**
 * Release Note 模态框组件
 * 用于添加和编辑 Release Note
 */
const ReleaseNoteModal: React.FC<ReleaseNoteModalProps> = ({ record, defaultParentVersion, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.releaseNotes);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const projectTypeMap: Record<string, string> = { 'TV AI Voice': 'TV', 'Projector AI Voice': 'Projector', 'STB AI Voice': 'STB' };
  const defaultProjectType = projectTypeMap[currentProject] || 'TV';

  // 处理表单提交
  const handleSubmit = async (data: Partial<ReleaseNote>) => {
    try {
      if (record?.id) {
        // 编辑模式
        await dispatch(
          updateReleaseNote({
            id: record.id,
            data,
          })
        ).unwrap();
      } else {
        // 创建模式
        await dispatch(
          createReleaseNote(data as Omit<ReleaseNote, 'id' | 'createdAt' | 'updatedAt'>)
        ).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save Release Note:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 标题 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {record ? '编辑 Release Note' : defaultParentVersion ? `添加子版本（${defaultParentVersion}）` : '添加新 Release Note'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <ReleaseNoteForm
            record={record}
            defaultProjectType={defaultProjectType}
            defaultParentVersion={defaultParentVersion}
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default ReleaseNoteModal;
