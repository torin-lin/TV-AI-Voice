import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Button } from '../common/Button';
import ProjectSwitcher from './ProjectSwitcher';
import { useI18n } from '../../i18n/I18nProvider';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * 主应用布局组件
 * 包含导航栏和侧边栏
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const { language, setLanguage, t } = useI18n();
  const sidebarTitle = currentProject === '全部' ? 'AI Voice' : currentProject;

  // 导航菜单项
  const menuItems = [
    { path: '/dashboard', label: '仪表板', icon: '📊' },
    { path: '/version-records', label: 'QA版本记录', icon: '📝' },
    { path: '/release-notes', label: 'Release Note', icon: '📋' },
    { path: '/apk-management', label: '项目APK管理', icon: '📦' },
    { path: '/customer-problems', label: '问题追踪', icon: '🐛' },
    { path: '/voice-records', label: '语音自动化', icon: '🎤' },
    { path: '/recommendations', label: '知识库', icon: '📚' },
    { path: '/alias-test', label: '别名管理测试', icon: '🏷️' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ];

  // 检查当前路由是否活跃
  const isActive = (path: string) => location.pathname === path;

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
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive(item.path)
                  ? 'bg-white/15 text-white font-semibold shimmer-active glow-border backdrop-blur-sm'
                  : 'hover:bg-white/10 text-white/80 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
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
            <ProjectSwitcher />
            <h1 className="text-2xl font-bold text-gray-900">
              {t(menuItems.find((item) => isActive(item.path))?.label || 'TV AI Voice')}
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
            <Button variant="secondary" size="sm">
              帮助
            </Button>
            <Button variant="secondary" size="sm">
              关于
            </Button>
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
