import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setCurrentProject, ProjectType } from '../../store/projectSlice';
import { useI18n } from '../../i18n/I18nProvider';
import { getWorkspaceGroupOptions } from '../../config/projectRegistry';

/**
 * 项目组切换器组件
 * 显示在左上角，用于切换不同的项目组
 */
const ProjectSwitcher: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);
  const { t } = useI18n();
  const projectGroups = getWorkspaceGroupOptions(currentWorkspace);

  const handleProjectChange = (project: ProjectType) => {
    dispatch(setCurrentProject(project));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-600">{t('项目组:')}</span>
      <select
        value={currentProject}
        onChange={(e) => handleProjectChange(e.target.value as ProjectType)}
        className="h-9 cursor-pointer rounded-lg border border-transparent bg-transparent px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
      >
        {projectGroups.map((project) => (
          <option key={project.value} value={project.value}>
            {t(project.label)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSwitcher;
