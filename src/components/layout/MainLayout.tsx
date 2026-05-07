import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setCurrentProject } from '../../store/projectSlice';
import { Button } from '../common/Button';
import ProjectSwitcher from './ProjectSwitcher';
import { useI18n } from '../../i18n/I18nProvider';
import {
  AI_VOICE_EXTENSION_MODULES,
  COMMON_PROJECT_MODULES,
  findModuleByPath,
  PLATFORM_MODULES,
} from '../../config/projectModules';
import { addCustomProject, getProjectExtensionModules, getProjectWorkspaces, ProjectWorkspace } from '../../config/projectRegistry';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * 主应用布局组件
 * 包含导航栏和侧边栏
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectWorkspace[]>(() => getProjectWorkspaces());
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const { language, setLanguage, t } = useI18n();
  const sidebarTitle = currentProject === '全部' ? 'AI Voice' : currentProject;
  const currentModule = findModuleByPath(location.pathname);
  const navigationSections = useMemo(() => [
    { title: '公共模块', modules: COMMON_PROJECT_MODULES },
    { title: '扩展模块', modules: getProjectExtensionModules(currentProject) },
    { title: '平台配置', modules: PLATFORM_MODULES },
  ], [currentProject, projects]);

  const handleProjectCreated = (project: ProjectWorkspace) => {
    setProjects(getProjectWorkspaces());
    dispatch(setCurrentProject(project.id));
    setProjectDialogOpen(false);
  };

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
            <ProjectSwitcher projects={projects} />
            <Button variant="secondary" size="sm" onClick={() => setProjectDialogOpen(true)}>
              增加项目
            </Button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
      {projectDialogOpen && (
        <AddProjectDialog
          onClose={() => setProjectDialogOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
};

const AddProjectDialog: React.FC<{
  onClose: () => void;
  onCreated: (project: ProjectWorkspace) => void;
}> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleExtension = (id: string) => {
    setSelectedExtensions((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleCreate = () => {
    try {
      const project = addCustomProject(name, selectedExtensions);
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败');
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
          <Button variant="primary" size="sm" onClick={handleCreate}>创建并切换</Button>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
