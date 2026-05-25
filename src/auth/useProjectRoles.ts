/**
 * Hook: 获取当前项目的各角色成员
 * 用于表单自动带出负责人
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import axios from 'axios';

interface RoleMember {
  userId: string;
  displayName: string;
  username: string;
}

interface ProjectRoles {
  owner: RoleMember[];
  qa: RoleMember[];
  rd: RoleMember[];
  pm: RoleMember[];
  viewer: RoleMember[];
}

const EMPTY_ROLES: ProjectRoles = { owner: [], qa: [], rd: [], pm: [], viewer: [] };

/**
 * 获取当前工作区的项目角色成员
 * 返回各角色的成员列表，以及便捷的默认负责人
 */
export function useProjectRoles() {
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);
  const [roles, setRoles] = useState<ProjectRoles>(EMPTY_ROLES);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/auth/project-roles', { params: { workspaceId: currentWorkspace } });
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch {
      // 未登录或网络错误，静默
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => { load(); }, [load]);

  // 便捷方法：获取默认 QA 负责人名称
  const defaultQaOwner = roles.qa[0]?.displayName || roles.owner[0]?.displayName || '';

  // 便捷方法：获取默认 RD 作者名称
  const defaultRdAuthor = roles.rd[0]?.displayName || '';

  // 便捷方法：获取默认 PM 名称
  const defaultPmOwner = roles.pm[0]?.displayName || roles.owner[0]?.displayName || '';

  // 所有 QA 成员名称列表（用于下拉选择）
  const qaNames = roles.qa.map((m) => m.displayName);
  const rdNames = roles.rd.map((m) => m.displayName);
  const pmNames = roles.pm.map((m) => m.displayName);
  const allMemberNames = [
    ...roles.owner.map((m) => m.displayName),
    ...roles.qa.map((m) => m.displayName),
    ...roles.rd.map((m) => m.displayName),
    ...roles.pm.map((m) => m.displayName),
  ].filter((v, i, a) => a.indexOf(v) === i); // 去重

  return {
    roles,
    loading,
    reload: load,
    defaultQaOwner,
    defaultRdAuthor,
    defaultPmOwner,
    qaNames,
    rdNames,
    pmNames,
    allMemberNames,
  };
}
