import { AI_VOICE_EXTENSION_MODULES, ProjectModuleDefinition } from './projectModules';

export interface ProjectWorkspace {
  id: string;
  name: string;
  extensionModuleIds: string[];
  builtin?: boolean;
}

const CUSTOM_PROJECTS_STORAGE_KEY = 'custom_project_workspaces';
const ALL_EXTENSION_IDS = AI_VOICE_EXTENSION_MODULES.map((module) => module.id);

export const BUILTIN_PROJECT_WORKSPACES: ProjectWorkspace[] = [
  { id: 'AI Voice', name: 'AI Voice', extensionModuleIds: ALL_EXTENSION_IDS, builtin: true },
];

function readCustomProjects(): ProjectWorkspace[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_PROJECTS_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((project) => ({
        id: String(project.id || project.name || '').trim(),
        name: String(project.name || project.id || '').trim(),
        extensionModuleIds: Array.isArray(project.extensionModuleIds)
          ? project.extensionModuleIds.map((id: unknown) => String(id)).filter(Boolean)
          : [],
      }))
      .filter((project) => project.id && project.name);
  } catch {
    return [];
  }
}

function writeCustomProjects(projects: ProjectWorkspace[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function getProjectWorkspaces(): ProjectWorkspace[] {
  const customProjects = readCustomProjects();
  const builtinIds = new Set(BUILTIN_PROJECT_WORKSPACES.map((project) => project.id));
  return [
    ...BUILTIN_PROJECT_WORKSPACES,
    ...customProjects.filter((project) => !builtinIds.has(project.id)),
  ];
}

export function addCustomProject(name: string, extensionModuleIds: string[]): ProjectWorkspace {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('请输入项目名称');
  const existing = getProjectWorkspaces().find((project) => project.id === trimmedName || project.name === trimmedName);
  if (existing) throw new Error('项目已存在');

  const allowedIds = new Set(ALL_EXTENSION_IDS);
  const project: ProjectWorkspace = {
    id: trimmedName,
    name: trimmedName,
    extensionModuleIds: extensionModuleIds.filter((id) => allowedIds.has(id)),
  };
  writeCustomProjects([...readCustomProjects(), project]);
  return project;
}

export function getProjectExtensionModules(projectId: string): ProjectModuleDefinition[] {
  const project = getProjectWorkspaces().find((item) => item.id === projectId);
  if (!project) return AI_VOICE_EXTENSION_MODULES;
  const enabledIds = new Set(project.extensionModuleIds);
  return AI_VOICE_EXTENSION_MODULES.filter((module) => enabledIds.has(module.id));
}
