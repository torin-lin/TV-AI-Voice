import React from 'react';
import { Link } from 'react-router-dom';
import {
  AI_VOICE_EXTENSION_MODULES,
  COMMON_PROJECT_MODULES,
  PLATFORM_MODULES,
  ProjectModuleDefinition,
} from '../config/projectModules';

const ModuleCard: React.FC<{ module: ProjectModuleDefinition }> = ({ module }) => (
  <Link
    to={module.path}
    className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xl">
        {module.icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-gray-900">{module.label}</div>
        <div className="mt-1 text-sm leading-6 text-gray-500">{module.description}</div>
      </div>
    </div>
  </Link>
);

const ModuleSection: React.FC<{
  title: string;
  subtitle: string;
  modules: ProjectModuleDefinition[];
}> = ({ title, subtitle, modules }) => (
  <section className="space-y-3">
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  </section>
);

const ModuleCenterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-blue-100 bg-white p-6">
          <div className="text-sm font-semibold text-blue-600">Project Module Baseline</div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">模块中心</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            当前系统已经按“公共质量模块 + 项目扩展模块”拆分。仪表板、QA版本记录、Release Note、项目APK管理、问题追踪作为公共能力保留；AI Voice 相关能力作为当前项目扩展模块挂载。
          </p>
        </div>

        <ModuleSection
          title="公共模块"
          subtitle="默认适用于任何独立项目，承载 QA 管理、版本流转、发布记录、安装包和问题闭环。"
          modules={COMMON_PROJECT_MODULES}
        />

        <ModuleSection
          title="AI Voice 扩展模块"
          subtitle="当前项目专属能力。后续其它项目可以替换或新增自己的扩展模块，不影响公共模块。"
          modules={AI_VOICE_EXTENSION_MODULES}
        />

        <ModuleSection
          title="平台配置"
          subtitle="面向系统配置、模块管理和本地服务设置。"
          modules={PLATFORM_MODULES.filter((module) => module.id !== 'module-center')}
        />

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">扩展方式</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">1. 保留公共模块</div>
              <p className="mt-2 leading-6">公共模块继续复用同一套数据模型和管理流程，作为所有项目的基线能力。</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">2. 替换扩展模块</div>
              <p className="mt-2 leading-6">在模块配置里新增项目专属页面、路由和说明，例如遥控器、Launcher、播放器或云服务项目。</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">3. 复用项目筛选</div>
              <p className="mt-2 leading-6">项目组切换继续作为全局上下文，公共模块可按项目过滤，扩展模块可读取同一上下文。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleCenterPage;
