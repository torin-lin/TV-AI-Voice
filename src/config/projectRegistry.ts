import { AI_VOICE_EXTENSION_MODULES, ProjectModuleDefinition } from './projectModules';
import { PROJECT_OPTIONS } from './dictionaries';
import { authFetch } from '../services/authFetch';

export interface ProjectGroup {
  id: string;
  name: string;
  projectType: string;
  builtin?: boolean;
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  extensionModuleIds: string[];
  projectGroups: ProjectGroup[];
  builtin?: boolean;
}

const CUSTOM_PROJECTS_STORAGE_KEY = 'custom_project_workspaces';
const MIGRATED_PROJECTS_STORAGE_KEY = 'custom_project_workspaces_migrated_to_db';
export const PROJECT_REGISTRY_EVENT = 'project-workspace-registry-change';
const ALL_EXTENSION_IDS = AI_VOICE_EXTENSION_MODULES.map((module) => module.id);
const DEFAULT_PROJECT_GROUPS: ProjectGroup[] = PROJECT_OPTIONS.map((option) => ({
  id: option.groupLabel,
  name: option.groupLabel,
  projectType: option.value,
  builtin: true,
}));

export const BUILTIN_PROJECT_WORKSPACES: ProjectWorkspace[] = [
  {
    id: 'AI Voice',
    name: 'AI Voice',
    extensionModuleIds: ALL_EXTENSION_IDS,
    projectGroups: DEFAULT_PROJECT_GROUPS,
    builtin: true,
  },
];

let workspaceCache: ProjectWorkspace[] = [];

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
        projectGroups: normalizeProjectGroups(project.projectGroups),
      }))
      .filter((project) => project.id && project.name)
      .map((project) => ({
        ...project,
        projectGroups: project.projectGroups.length > 0
          ? project.projectGroups
          : fallbackProjectGroups(project.id, project.name),
      }));
  } catch {
    return [];
  }
}

function normalizeProjectGroups(groups: unknown): ProjectGroup[] {
  if (!Array.isArray(groups)) return [];
  const seen = new Set<string>();
  return groups
    .map((group) => {
      const source = group as Partial<ProjectGroup>;
      const name = String(source.name || source.id || '').trim();
      const id = String(source.id || name).trim();
      const projectType = String(source.projectType || id || name).trim();
      return { id, name, projectType };
    })
    .filter((group) => {
      if (!group.id || !group.name || seen.has(group.id)) return false;
      seen.add(group.id);
      return true;
    });
}

function fallbackProjectGroups(id: string, _name: string): ProjectGroup[] {
  if (id === 'AI Voice') return DEFAULT_PROJECT_GROUPS;
  return []; // 非内置项目默认无项目组
}

function writeCustomProjects(projects: ProjectWorkspace[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  window.dispatchEvent(new Event(PROJECT_REGISTRY_EVENT));
}

export function getProjectWorkspaces(): ProjectWorkspace[] {
  if (workspaceCache.length > 0) return workspaceCache;
  const customProjects = readCustomProjects();
  const customById = new Map(customProjects.map((project) => [project.id, project]));
  const builtinProjects = BUILTIN_PROJECT_WORKSPACES.map((project) => customById.get(project.id) || project);
  const builtinIds = new Set(BUILTIN_PROJECT_WORKSPACES.map((project) => project.id));
  return [...builtinProjects, ...customProjects.filter((project) => !builtinIds.has(project.id))];
}

function setWorkspaceCache(projects: ProjectWorkspace[]): void {
  workspaceCache = projects.length > 0 ? projects : BUILTIN_PROJECT_WORKSPACES;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROJECT_REGISTRY_EVENT));
  }
}

async function readApiJson<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.message || '项目配置请求失败');
  return json.data;
}

export async function loadProjectWorkspaces(): Promise<ProjectWorkspace[]> {
  const res = await authFetch('/api/project-workspaces');
  const projects = await readApiJson<ProjectWorkspace[]>(res);
  setWorkspaceCache(projects);
  return projects;
}

export async function migrateLocalProjectWorkspaces(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATED_PROJECTS_STORAGE_KEY) === '1') return;
  const projects = readCustomProjects();
  if (projects.length === 0) {
    localStorage.setItem(MIGRATED_PROJECTS_STORAGE_KEY, '1');
    return;
  }
  const res = await authFetch('/api/project-workspaces/import-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects }),
  });
  const nextProjects = await readApiJson<ProjectWorkspace[]>(res);
  setWorkspaceCache(nextProjects);
  localStorage.setItem(MIGRATED_PROJECTS_STORAGE_KEY, '1');
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
    projectGroups: [], // 新项目默认无项目组，只有"全部"
  };
  writeCustomProjects([...readCustomProjects(), project]);
  return project;
}

export async function createCustomProject(name: string, extensionModuleIds: string[]): Promise<ProjectWorkspace> {
  const res = await authFetch('/api/project-workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, extensionModuleIds }),
  });
  const project = await readApiJson<ProjectWorkspace>(res);
  await loadProjectWorkspaces();
  return project;
}

export function updateProjectModules(projectId: string, extensionModuleIds: string[]): ProjectWorkspace {
  const allowedIds = new Set(ALL_EXTENSION_IDS);
  const nextIds = extensionModuleIds.filter((id) => allowedIds.has(id));

  if (BUILTIN_PROJECT_WORKSPACES.some((project) => project.id === projectId)) {
    const overrides = readCustomProjects().filter((project) => project.id !== projectId);
    const builtin = BUILTIN_PROJECT_WORKSPACES.find((project) => project.id === projectId)!;
    const updated = { ...builtin, builtin: false, extensionModuleIds: nextIds };
    writeCustomProjects([...overrides, updated]);
    return updated;
  }

  const projects = readCustomProjects();
  const existing = projects.find((project) => project.id === projectId);
  if (!existing) throw new Error('独立项目不存在');
  const updated = { ...existing, extensionModuleIds: nextIds };
  writeCustomProjects(projects.map((project) => (project.id === projectId ? updated : project)));
  return updated;
}

export async function saveProjectModules(projectId: string, extensionModuleIds: string[]): Promise<ProjectWorkspace> {
  const res = await authFetch(`/api/project-workspaces/${encodeURIComponent(projectId)}/modules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ extensionModuleIds }),
  });
  const project = await readApiJson<ProjectWorkspace>(res);
  await loadProjectWorkspaces();
  return project;
}

export function deleteCustomProject(projectId: string): void {
  if (BUILTIN_PROJECT_WORKSPACES.some((p) => p.id === projectId)) {
    throw new Error('内置项目不能删除');
  }
  const projects = readCustomProjects().filter((p) => p.id !== projectId);
  writeCustomProjects(projects);
}

export async function removeCustomProject(projectId: string): Promise<void> {
  const res = await authFetch(`/api/project-workspaces/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  await readApiJson<void>(res);
  await loadProjectWorkspaces();
}

export function addProjectGroup(workspaceId: string, name: string): ProjectWorkspace {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('请输入项目组名称');

  const workspaces = getProjectWorkspaces();
  const workspace = workspaces.find((project) => project.id === workspaceId);
  if (!workspace) throw new Error('独立项目不存在');
  if (workspace.projectGroups.some((group) => group.id === trimmedName || group.name === trimmedName)) {
    throw new Error('项目组已存在');
  }

  const customProjects = readCustomProjects().filter((project) => project.id !== workspaceId);
  const updated: ProjectWorkspace = {
    ...workspace,
    builtin: workspace.builtin ? false : workspace.builtin,
    projectGroups: [
      ...workspace.projectGroups,
      { id: trimmedName, name: trimmedName, projectType: trimmedName },
    ],
  };
  writeCustomProjects([...customProjects, updated]);
  return updated;
}

export async function createProjectGroup(workspaceId: string, name: string): Promise<ProjectWorkspace> {
  const res = await authFetch(`/api/project-workspaces/${encodeURIComponent(workspaceId)}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const workspace = await readApiJson<ProjectWorkspace>(res);
  await loadProjectWorkspaces();
  return workspace;
}

export function deleteProjectGroup(workspaceId: string, groupId: string): ProjectWorkspace {
  const workspaces = getProjectWorkspaces();
  const workspace = workspaces.find((project) => project.id === workspaceId);
  if (!workspace) throw new Error('独立项目不存在');

  const group = workspace.projectGroups.find((g) => g.id === groupId);
  if (!group) throw new Error('项目组不存在');

  const customProjects = readCustomProjects().filter((project) => project.id !== workspaceId);
  const updated: ProjectWorkspace = {
    ...workspace,
    builtin: workspace.builtin ? false : workspace.builtin,
    projectGroups: workspace.projectGroups.filter((g) => g.id !== groupId),
  };
  writeCustomProjects([...customProjects, updated]);
  return updated;
}

export async function removeProjectGroup(workspaceId: string, groupId: string): Promise<ProjectWorkspace> {
  const res = await authFetch(`/api/project-workspaces/${encodeURIComponent(workspaceId)}/groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' });
  const workspace = await readApiJson<ProjectWorkspace>(res);
  await loadProjectWorkspaces();
  return workspace;
}

export function getWorkspaceProjectGroups(workspaceId: string): ProjectGroup[] {
  const workspace = getProjectWorkspaces().find((item) => item.id === workspaceId);
  return workspace?.projectGroups || [];
}

export function getWorkspaceProjectOptions(workspaceId: string) {
  return getWorkspaceProjectGroups(workspaceId).map((group) => ({
    value: group.projectType,
    label: group.name,
    groupValue: group.id,
  }));
}

export function getWorkspaceGroupOptions(workspaceId: string) {
  return [
    { value: '全部', label: '全部' },
    ...getWorkspaceProjectGroups(workspaceId).map((group) => ({ value: group.id, label: group.name })),
  ];
}

export function getProjectExtensionModules(projectId: string): ProjectModuleDefinition[] {
  const project = getProjectWorkspaces().find((item) => item.id === projectId);
  if (!project) return AI_VOICE_EXTENSION_MODULES;
  const enabledIds = new Set(project.extensionModuleIds);
  return AI_VOICE_EXTENSION_MODULES.filter((module) => enabledIds.has(module.id));
}
