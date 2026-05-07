import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import ProjectSwitcher from './ProjectSwitcher';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useI18n } from '../../i18n/I18nProvider';
import {
  COMMON_PROJECT_MODULES,
  findModuleByPath,
  PLATFORM_MODULES,
} from '../../config/projectModules';
import {
  getProjectExtensionModules,
  getProjectWorkspaces,
  getWorkspaceGroupOptions,
  PROJECT_REGISTRY_EVENT,
  ProjectWorkspace,
} from '../../config/projectRegistry';
import { setCurrentProject } from '../../store/projectSlice';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * 主应用布局组件
 * 包含导航栏和侧边栏
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<ProjectWorkspace[]>(() => getProjectWorkspaces());
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const { language, setLanguage, t } = useI18n();
  const sidebarTitle = currentWorkspace;
  const currentModule = findModuleByPath(location.pathname);
  const navigationSections = useMemo(() => [
    { title: '公共模块', modules: COMMON_PROJECT_MODULES },
    { title: '扩展模块', modules: getProjectExtensionModules(currentWorkspace) },
    { title: '平台配置', modules: PLATFORM_MODULES },
  ], [currentWorkspace, projects]);

  useEffect(() => {
    const refreshProjects = () => setProjects(getProjectWorkspaces());
    window.addEventListener(PROJECT_REGISTRY_EVENT, refreshProjects);
    window.addEventListener('storage', refreshProjects);
    return () => {
      window.removeEventListener(PROJECT_REGISTRY_EVENT, refreshProjects);
      window.removeEventListener('storage', refreshProjects);
    };
  }, []);

  useEffect(() => {
    const availableGroups = getWorkspaceGroupOptions(currentWorkspace).map((group) => group.value);
    if (!availableGroups.includes(currentProject)) {
      dispatch(setCurrentProject('全部'));
    }
  }, [currentProject, currentWorkspace, dispatch, projects]);

  // 检查当前路由是否活跃
  const isActive = (path: string, activePaths: string[] = []) => (
    location.pathname === path || activePaths.some((activePath) => location.pathname.startsWith(activePath))
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-600 to-cyan-500 text-white transition-all duration-300 flex flex-col shadow-2xl shadow-blue-500/20`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-blue-400/30">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarOpen && 'hidden'} text-xl font-bold`}>
              {sidebarTitle}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-blue-500 rounded"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* 菜单 */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {sidebarOpen && (
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-blue-100/80">
                  {section.title}
                </div>
              )}
              {section.modules.length === 0 && sidebarOpen && (
                <div className="rounded-lg px-4 py-3 text-sm text-white/60">
                  暂未启用扩展
                </div>
              )}
              {section.modules.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive(item.path, item.activePaths)
                      ? 'bg-white/15 text-white font-semibold shimmer-active glow-border backdrop-blur-sm'
                      : 'hover:bg-white/10 text-white/80 hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-blue-400/30">
          <div className={`text-xs text-blue-200 ${!sidebarOpen && 'hidden'}`}>
            v1.0.0
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t(currentModule?.label || 'TV AI Voice')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
              <button
                onClick={() => setLanguage('zh-CN')}
                className={`rounded px-3 py-1 ${language === 'zh-CN' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en-US')}
                className={`rounded px-3 py-1 ${language === 'en-US' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
              >
                EN
              </button>
            </div>
            <WorkspaceSwitcher projects={projects} />
            <ProjectSwitcher />
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
