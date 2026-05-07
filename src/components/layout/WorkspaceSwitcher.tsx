import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setCurrentWorkspace } from '../../store/projectSlice';
import { ProjectWorkspace } from '../../config/projectRegistry';

interface WorkspaceSwitcherProps {
  projects: ProjectWorkspace[];
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ projects }) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);

  const handleChange = (workspaceId: string) => {
    dispatch(setCurrentWorkspace(workspaceId));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">独立项目:</span>
      <select
        value={currentWorkspace}
        onChange={(event) => handleChange(event.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
    </div>
  );
};

export default WorkspaceSwitcher;
