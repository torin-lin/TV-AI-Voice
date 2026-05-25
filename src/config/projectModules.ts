export type ProjectModuleScope = 'common' | 'extension' | 'platform';

export interface ProjectModuleDefinition {
  id: string;
  path: string;
  label: string;
  icon: string;
  scope: ProjectModuleScope;
  description: string;
  activePaths?: string[];
}

export const COMMON_PROJECT_MODULES: ProjectModuleDefinition[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: '仪表板',
    icon: '📊',
    scope: 'common',
    description: '跨项目的质量总览、风险提醒、阻塞项和待办聚合入口。',
  },
  {
    id: 'version-records',
    path: '/version-records',
    label: 'QA版本记录',
    icon: '📝',
    scope: 'common',
    description: '版本测试状态、风险等级、测试结论和发布决策的统一台账。',
    activePaths: ['/version-workbench'],
  },
  {
    id: 'release-notes',
    path: '/release-notes',
    label: 'Release Note',
    icon: '📋',
    scope: 'common',
    description: '研发提测、变更说明、影响模块、RD 冒烟和发布记录管理。',
  },
  {
    id: 'apk-management',
    path: '/apk-management',
    label: '项目APK管理',
    icon: '📦',
    scope: 'common',
    description: '项目安装包上传、签名、下载和版本附件管理。',
  },
  {
    id: 'customer-problems',
    path: '/customer-problems',
    label: '问题追踪',
    icon: '⚠️',
    scope: 'common',
    description: '客户问题、QA 问题、处理状态和版本关联的闭环追踪。',
  },
];

export const AI_VOICE_EXTENSION_MODULES: ProjectModuleDefinition[] = [
  {
    id: 'voice-records',
    path: '/voice-records',
    label: '语音自动化',
    icon: '🎤',
    scope: 'extension',
    description: 'AI Voice 项目的自动化脚本执行、语音结果比对和执行记录。',
  },
  {
    id: 'recommendations',
    path: '/recommendations',
    label: '知识库',
    icon: '📚',
    scope: 'extension',
    description: 'AI Voice 测试用例知识库、推荐生成和版本辅助分析。',
  },
  {
    id: 'alias-test',
    path: '/alias-test',
    label: '别名管理测试',
    icon: '🏷️',
    scope: 'extension',
    description: 'AI Voice Planner、别名匹配、影片搜索和多语言技能分发验证。',
  },
  {
    id: 'mitm-proxy',
    path: '/mitm-proxy',
    label: '抓包代理',
    icon: '🔒',
    scope: 'extension',
    description: 'MITM HTTPS 代理，抓取 TV 设备请求并支持按规则修改响应内容。',
  },
];

export const PLATFORM_MODULES: ProjectModuleDefinition[] = [
  {
    id: 'module-center',
    path: '/module-center',
    label: '模块中心',
    icon: '🧩',
    scope: 'platform',
    description: '查看公共模块和项目扩展模块，为其它独立项目复用当前系统做准备。',
  },
  {
    id: 'settings',
    path: '/settings',
    label: '设置',
    icon: '⚙️',
    scope: 'platform',
    description: '系统配置、AI 服务配置和数据管理。',
  },
];

export const NAVIGATION_SECTIONS = [
  { title: '公共模块', modules: COMMON_PROJECT_MODULES },
  { title: 'AI Voice 扩展', modules: AI_VOICE_EXTENSION_MODULES },
  { title: '平台配置', modules: PLATFORM_MODULES },
] as const;

export const ALL_PROJECT_MODULES = [
  ...COMMON_PROJECT_MODULES,
  ...AI_VOICE_EXTENSION_MODULES,
  ...PLATFORM_MODULES,
];

export function findModuleByPath(pathname: string): ProjectModuleDefinition | undefined {
  return ALL_PROJECT_MODULES.find((module) => (
    pathname === module.path || module.activePaths?.some((activePath) => pathname.startsWith(activePath))
  ));
}
