/**
 * 权限判断 Hook
 * 用于前端 UI 控制（按钮禁用、隐藏等）
 * 
 * 注意：前端权限控制仅用于 UX，真正的安全由后端中间件保证
 */

import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAuth, ProjectRole } from './AuthProvider';

export interface PermissionInfo {
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 是否是系统管理员 */
  isAdmin: boolean;
  /** 当前项目中的角色 */
  currentProjectRole: ProjectRole | null;
  /** 是否可以执行写操作（新增/编辑/删除） */
  canWrite: boolean;
  /** 是否可以管理项目（成员管理、模块配置） */
  canManageProject: boolean;
  /** 是否可以新增独立项目 */
  canCreateProject: boolean;
  /** 是否可以编辑版本记录 */
  canEditVersionRecords: boolean;
  /** 是否可以编辑 Release Note */
  canEditReleaseNotes: boolean;
  /** 是否可以编辑问题 */
  canEditProblems: boolean;
}

/**
 * 获取当前用户在当前工作区的权限信息
 */
export function usePermission(): PermissionInfo {
  const { user, isLoggedIn, isAdmin, getProjectRole } = useAuth();
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);

  const currentProjectRole = isLoggedIn ? getProjectRole(currentWorkspace) : null;

  // 系统管理员拥有所有权限
  if (isAdmin) {
    return {
      isLoggedIn: true,
      isAdmin: true,
      currentProjectRole,
      canWrite: true,
      canManageProject: true,
      canCreateProject: true,
      canEditVersionRecords: true,
      canEditReleaseNotes: true,
      canEditProblems: true,
    };
  }

  // 未登录 → 无业务访问权限
  if (!isLoggedIn || !user) {
    return {
      isLoggedIn: false,
      isAdmin: false,
      currentProjectRole: null,
      canWrite: false,
      canManageProject: false,
      canCreateProject: false,
      canEditVersionRecords: false,
      canEditReleaseNotes: false,
      canEditProblems: false,
    };
  }

  // 根据项目角色判断
  const role = currentProjectRole;

  return {
    isLoggedIn: true,
    isAdmin: false,
    currentProjectRole: role,
    canWrite: !!role && role !== 'viewer',
    canManageProject: role === 'owner',
    canCreateProject: false, // 只有 admin 可以
    canEditVersionRecords: role === 'owner' || role === 'qa',
    canEditReleaseNotes: role === 'rd',
    canEditProblems: role === 'owner' || role === 'qa' || role === 'pm',
  };
}
