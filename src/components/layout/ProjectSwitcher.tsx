import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setCurrentProject, ProjectType } from '../../store/projectSlice';

/**
 * 项目组切换器组件
 * 显示在左上角，用于切换不同的项目组
 */
const ProjectSwitcher: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const projects: ProjectType[] = ['全部', 'TV AI Voice', 'Projector AI Voice', 'STB AI Voice'];

  const handleProjectChange = (project: ProjectType) => {
    dispatch(setCurrentProject(project));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">项目组:</span>
      <select
        value={currentProject}
        onChange={(e) => handleProjectChange(e.target.value as ProjectType)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {projects.map((project) => (
          <option key={project} value={project}>
            {project}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSwitcher;
