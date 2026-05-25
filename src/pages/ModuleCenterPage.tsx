import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import AddProjectDialog from '../components/layout/AddProjectDialog';
import { AppDispatch, RootState } from '../store';
import { setCurrentProject, setCurrentWorkspace } from '../store/projectSlice';
import {
  AI_VOICE_EXTENSION_MODULES,
  COMMON_PROJECT_MODULES,
  PLATFORM_MODULES,
  ProjectModuleDefinition,
} from '../config/projectModules';
import {
  createProjectGroup,
  loadProjectWorkspaces,
  removeCustomProject,
  removeProjectGroup,
  getProjectWorkspaces,
  ProjectWorkspace,
  saveProjectModules,
} from '../config/projectRegistry';
import { useToast } from '../components/common/ToastProvider';
import { usePermission } from '../auth/usePermission';
import ProjectMembersPanel from '../auth/ProjectMembersPanel';

const ModuleCard: React.FC<{ module: ProjectModuleDefinition; muted?: boolean }> = ({ module, muted }) => (
  <Link
    to={module.path}
    className={`block rounded-lg border p-4 transition hover:border-blue-200 hover:shadow-sm ${
      muted ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'
    }`}
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

const ModuleCenterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const permission = usePermission();
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);
  const [workspaces, setWorkspaces] = useState<ProjectWorkspace[]>(() => getProjectWorkspaces());
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(currentWorkspace);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  React.useEffect(() => {
    loadProjectWorkspaces().then((items) => {
      setWorkspaces(items);
      if (!items.some((workspace) => workspace.id === selectedWorkspaceId)) {
        setSelectedWorkspaceId(items[0]?.id || 'AI Voice');
      }
    }).catch(() => {});
  }, []);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || workspaces[0],
    [selectedWorkspaceId, workspaces],
  );
  const enabledExtensionIds = new Set(selectedWorkspace?.extensionModuleIds || []);

  const refresh = async (nextWorkspaceId = selectedWorkspaceId) => {
    const nextWorkspaces = await loadProjectWorkspaces().catch(() => getProjectWorkspaces());
    setWorkspaces(nextWorkspaces);
    if (nextWorkspaces.some((workspace) => workspace.id === nextWorkspaceId)) {
      setSelectedWorkspaceId(nextWorkspaceId);
    }
  };

  const handleProjectCreated = (project: ProjectWorkspace) => {
    refresh(project.id);
    dispatch(setCurrentWorkspace(project.id));
    dispatch(setCurrentProject('全部'));
    setProjectDialogOpen(false);
    showToast('独立项目已创建', 'success');
  };

  const handleModuleToggle = async (moduleId: string) => {
    if (!selectedWorkspace) return;
    const nextIds = enabledExtensionIds.has(moduleId)
      ? selectedWorkspace.extensionModuleIds.filter((id) => id !== moduleId)
      : [...selectedWorkspace.extensionModuleIds, moduleId];
    try {
      await saveProjectModules(selectedWorkspace.id, nextIds);
      await refresh(selectedWorkspace.id);
      showToast('模块配置已更新', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '模块配置更新失败', 'error');
    }
  };

  const handleAddGroup = async () => {
    if (!selectedWorkspace) return;
    try {
      await createProjectGroup(selectedWorkspace.id, groupName);
      setGroupName('');
      await refresh(selectedWorkspace.id);
      if (selectedWorkspace.id === currentWorkspace) dispatch(setCurrentProject('全部'));
      showToast('项目组已创建', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '创建项目组失败', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedWorkspace) return;
    if (selectedWorkspace.builtin) {
      showToast('内置项目不能删除', 'error');
      return;
    }
    if (!confirm(`确定删除独立项目 "${selectedWorkspace.name}"？\n\n注意：这只会删除项目配置（项目组、模块启用状态），不会删除已有的业务数据（版本记录、Release Note、问题等）。`)) return;
    try {
      await removeCustomProject(selectedWorkspace.id);
      if (selectedWorkspace.id === currentWorkspace) {
        dispatch(setCurrentWorkspace('AI Voice'));
        dispatch(setCurrentProject('全部'));
      }
      const nextWorkspaces = await loadProjectWorkspaces().catch(() => getProjectWorkspaces());
      setWorkspaces(nextWorkspaces);
      setSelectedWorkspaceId(nextWorkspaces[0]?.id || 'AI Voice');
      showToast(`已删除项目 "${selectedWorkspace.name}"`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!selectedWorkspace) return;
    if (!confirm(`确定删除项目组 "${groupName}"？\n\n注意：已有数据中标记为该项目组的记录不会被删除，但筛选时将不再显示该选项。`)) return;
    try {
      await removeProjectGroup(selectedWorkspace.id, groupId);
      await refresh(selectedWorkspace.id);
      if (selectedWorkspace.id === currentWorkspace) dispatch(setCurrentProject('全部'));
      showToast(`已删除项目组 "${groupName}"`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-blue-100 bg-white p-6">
          <div className="text-sm font-semibold text-blue-600">Project Administration</div>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">模块中心</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                独立项目、项目组和扩展模块在这里统一管理。公共模块默认保留，扩展模块按独立项目启用，项目组也只在当前独立项目内生效。
              </p>
            </div>
            <Button variant="primary" onClick={() => setProjectDialogOpen(true)}
              disabled={!permission.canCreateProject}
              title={!permission.canCreateProject ? '仅管理员可新增独立项目' : undefined}>新增独立项目</Button>
          </div>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">独立项目配置</h2>
              <p className="mt-1 text-sm text-gray-500">选择一个独立项目后，可以维护它自己的项目组和扩展模块。</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedWorkspace?.id || ''}
                onChange={(event) => setSelectedWorkspaceId(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
              {selectedWorkspace && !selectedWorkspace.builtin && permission.canCreateProject && (
                <button
                  onClick={handleDeleteProject}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                  title="删除此独立项目"
                >
                  删除项目
                </button>
              )}
            </div>
          </div>

          {selectedWorkspace && (
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-900">项目组</div>
                <p className="mt-1 text-sm text-gray-500">用于公共模块里的数据筛选和新建记录的项目类型。</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedWorkspace.projectGroups.length === 0 ? (
                    <span className="text-sm text-gray-400">暂未创建项目组</span>
                  ) : selectedWorkspace.projectGroups.map((group) => (
                    <span key={group.id} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                      {group.name}
                      {permission.canManageProject && (
                        <button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="text-gray-400 hover:text-red-500 ml-0.5 transition"
                          title={`删除项目组 "${group.name}"`}
                        >✕</button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="新增项目组名称"
                  />
                  <Button variant="secondary" onClick={handleAddGroup} disabled={!permission.canManageProject}
                    title={!permission.canManageProject ? '仅项目负责人或管理员可操作' : undefined}>创建项目组</Button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-900">当前使用</div>
                <p className="mt-1 text-sm text-gray-500">切换到这个独立项目后，顶部项目组下拉只展示这里配置的项目组。</p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      dispatch(setCurrentWorkspace(selectedWorkspace.id));
                      dispatch(setCurrentProject('全部'));
                      showToast('已切换独立项目', 'success');
                    }}
                  >
                    切换到 {selectedWorkspace.name}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 项目成员管理 */}
          {selectedWorkspace && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <ProjectMembersPanel
                workspaceId={selectedWorkspace.id}
                workspaceName={selectedWorkspace.name}
              />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">公共模块</h2>
            <p className="mt-1 text-sm text-gray-500">所有独立项目默认启用，作为项目管理系统的公共能力。</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {COMMON_PROJECT_MODULES.map((module) => <ModuleCard key={module.id} module={module} />)}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">扩展模块显示控制</h2>
            <p className="mt-1 text-sm text-gray-500">勾选后会出现在所选独立项目的侧边栏中；取消后不影响历史数据。</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {AI_VOICE_EXTENSION_MODULES.map((module) => (
              <label key={module.id} className={`flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-200 ${permission.canManageProject ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                <input
                  type="checkbox"
                  checked={enabledExtensionIds.has(module.id)}
                  onChange={() => handleModuleToggle(module.id)}
                  className="mt-1"
                  disabled={!permission.canManageProject}
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900">{module.icon} {module.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-gray-500">{module.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">平台配置</h2>
            <p className="mt-1 text-sm text-gray-500">系统级配置和数据维护入口。</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {PLATFORM_MODULES.filter((module) => module.id !== 'module-center').map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
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

export default ModuleCenterPage;
