import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setCurrentProject, setCurrentWorkspace } from '../../store/projectSlice';
import { ProjectWorkspace } from '../../config/projectRegistry';

interface WorkspaceSwitcherProps {
  projects: ProjectWorkspace[];
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ projects }) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);

  const handleChange = (workspaceId: string) => {
    dispatch(setCurrentWorkspace(workspaceId));
    dispatch(setCurrentProject('全部'));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-600">独立项目:</span>
      <select
        value={currentWorkspace}
        onChange={(event) => handleChange(event.target.value)}
        className="h-9 cursor-pointer rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
    </div>
  );
};

export default WorkspaceSwitcher;
