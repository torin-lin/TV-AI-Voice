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
  loadProjectWorkspaces,
  migrateLocalProjectWorkspaces,
  PROJECT_REGISTRY_EVENT,
  ProjectWorkspace,
} from '../../config/projectRegistry';
import { setCurrentProject, setCurrentWorkspace } from '../../store/projectSlice';
import UserMenu from '../../auth/UserMenu';
import { useAuth } from '../../auth/AuthProvider';

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
  const { isLoggedIn, isAdmin } = useAuth();
  const sidebarTitle = currentWorkspace;
  const currentModule = findModuleByPath(location.pathname);
  const navigationSections = useMemo(() => [
    { title: '公共模块', modules: COMMON_PROJECT_MODULES },
    { title: '扩展模块', modules: getProjectExtensionModules(currentWorkspace) },
    ...(isAdmin ? [{ title: '平台配置', modules: PLATFORM_MODULES }] : []),
  ], [currentWorkspace, isAdmin, projects]);

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
    let active = true;
    const load = async () => {
      try {
        if (isLoggedIn && isAdmin) {
          await migrateLocalProjectWorkspaces().catch(() => {});
        }
        const nextProjects = await loadProjectWorkspaces();
        if (active) setProjects(nextProjects);
      } catch {
        if (active) setProjects(getProjectWorkspaces());
      }
    };
    load();
    return () => { active = false; };
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    if (projects.length > 0 && !projects.some((project) => project.id === currentWorkspace)) {
      dispatch(setCurrentWorkspace(projects[0]?.id || 'AI Voice'));
      dispatch(setCurrentProject('全部'));
      return;
    }
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
    <div className="flex h-screen bg-[#f8fafc] text-slate-900">
      {/* 侧边栏 */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col border-r border-slate-800 bg-slate-900 text-white shadow-sm transition-all duration-200`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <div className="flex w-full items-center justify-between gap-3">
            <div className={`${!sidebarOpen && 'hidden'} min-w-0`}>
              <div className="truncate text-base font-bold tracking-tight text-white">
                {sidebarTitle}
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                Project Delivery Management
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* 菜单 */}
        <nav className="demo-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-6">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {sidebarOpen && (
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {section.title}
                </div>
              )}
              {section.modules.length === 0 && sidebarOpen && (
                <div className="rounded-lg px-4 py-3 text-sm text-slate-500">
                  暂未启用扩展
                </div>
              )}
              {section.modules.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                    isActive(item.path, item.activePaths)
                      ? 'bg-indigo-500/10 font-medium text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* 底部 */}
        <div className="border-t border-slate-800 p-4">
          <div className={`text-xs font-medium text-slate-500 ${!sidebarOpen && 'hidden'}`}>
            v1.0.0
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 顶部栏 */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex min-w-0 items-center gap-6">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">
              {t(currentModule?.label || '项目交付管理平台')}
            </h1>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
              <button
                onClick={() => setLanguage('zh-CN')}
                className={`rounded-md px-3 py-1 font-medium transition ${language === 'zh-CN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en-US')}
                className={`rounded-md px-3 py-1 font-medium transition ${language === 'en-US' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                EN
              </button>
            </div>
            <WorkspaceSwitcher projects={projects} />
            <ProjectSwitcher />
            <div className="h-6 w-px bg-slate-200"></div>
            <UserMenu />
          </div>
        </div>

        {/* 内容区 */}
        <div key={currentWorkspace} className="demo-scrollbar flex-1 overflow-auto bg-[#f8fafc]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
