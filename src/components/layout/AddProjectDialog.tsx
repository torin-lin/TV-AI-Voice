import React, { useState } from 'react';
import { Button } from '../common/Button';
import { AI_VOICE_EXTENSION_MODULES, COMMON_PROJECT_MODULES } from '../../config/projectModules';
import { createCustomProject, ProjectWorkspace } from '../../config/projectRegistry';

interface AddProjectDialogProps {
  onClose: () => void;
  onCreated: (project: ProjectWorkspace) => void;
}

const AddProjectDialog: React.FC<AddProjectDialogProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleExtension = (id: string) => {
    setSelectedExtensions((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const project = await createCustomProject(name, selectedExtensions);
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">增加独立项目</h2>
          <p className="mt-1 text-sm text-gray-500">公共模块会自动启用，扩展模块可按项目自定义选择。</p>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">项目名称</label>
            <input
              value={name}
              onChange={(event) => { setName(event.target.value); setError(''); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：Launcher 项目、播放器项目、云服务项目"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">公共模块</div>
            <div className="flex flex-wrap gap-2">
              {COMMON_PROJECT_MODULES.map((module) => (
                <span key={module.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {module.icon} {module.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">扩展模块</div>
            <div className="grid grid-cols-1 gap-2">
              {AI_VOICE_EXTENSION_MODULES.map((module) => (
                <label key={module.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedExtensions.includes(module.id)}
                    onChange={() => toggleExtension(module.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{module.icon} {module.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">{module.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={submitting}>{submitting ? '创建中...' : '创建并切换'}</Button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectDialog;
