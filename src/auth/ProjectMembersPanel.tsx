/**
 * 项目成员管理面板
 * 展示当前选中项目的成员列表，支持添加/修改角色/移除成员
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/ToastProvider';
import { usePermission } from './usePermission';
import { useAuth } from './AuthProvider';

interface MemberItem {
  id: string;
  workspaceId: string;
  userId: string;
  projectRole: string;
  createdAt: number;
  username: string;
  displayName: string;
  systemRole: string;
  status?: 'active' | 'disabled';
}

interface UserOption {
  id: string;
  username: string;
  displayName: string;
  systemRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '负责人',
  qa: 'QA',
  rd: 'RD',
  pm: 'PM',
  viewer: '只读',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  qa: 'bg-blue-100 text-blue-700',
  rd: 'bg-green-100 text-green-700',
  pm: 'bg-amber-100 text-amber-700',
  viewer: 'bg-gray-100 text-gray-600',
};

interface ProjectMembersPanelProps {
  workspaceId: string;
  workspaceName: string;
}

const ProjectMembersPanel: React.FC<ProjectMembersPanelProps> = ({ workspaceId, workspaceName }) => {
  const { showToast } = useToast();
  const permission = usePermission();
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 添加成员
  const [showAddForm, setShowAddForm] = useState(false);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('qa');
  const [addLoading, setAddLoading] = useState(false);

  // 编辑角色
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  const canManage = permission.isAdmin || permission.canManageProject;

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/auth/project-members', { params: { workspaceId } });
      if (res.data.success) setMembers(res.data.data);
    } catch (err: any) {
      if (err.response?.status !== 403) {
        showToast(err.response?.data?.message || '加载项目成员失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast, workspaceId]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/users', { params: { workspaceId } });
      if (res.data.success) setAllUsers(res.data.data);
    } catch { /* ignore */ }
  }, [workspaceId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleOpenAdd = () => {
    setShowAddForm(true);
    loadUsers();
  };

  const handleAdd = async () => {
    if (!addUserId || !addRole) {
      showToast('请选择用户和角色', 'error');
      return;
    }
    setAddLoading(true);
    try {
      const res = await axios.post('/api/auth/project-members', {
        workspaceId,
        userId: addUserId,
        projectRole: addRole,
      });
      if (res.data.success) {
        showToast('成员已添加', 'success');
        setShowAddForm(false);
        setAddUserId('');
        setAddRole('qa');
        loadMembers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '添加失败', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string) => {
    if (!editRole) return;
    try {
      await axios.put(`/api/auth/project-members/${memberId}`, {
        projectRole: editRole,
        workspaceId,
      });
      showToast('角色已更新', 'success');
      setEditingId(null);
      loadMembers();
    } catch (err: any) {
      showToast(err.response?.data?.message || '更新失败', 'error');
    }
  };

  const handleRemove = async (member: MemberItem) => {
    if (!confirm(`确定移除 "${member.displayName}" 的项目成员身份？`)) return;
    try {
      await axios.delete(`/api/auth/project-members/${member.id}`, {
        params: { workspaceId },
      });
      showToast('已移除', 'success');
      loadMembers();
    } catch (err: any) {
      showToast(err.response?.data?.message || '移除失败', 'error');
    }
  };

  // 过滤掉已经是成员的用户
  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.userId === u.id)
  );

  if (!permission.isLoggedIn) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        登录后可查看项目成员
      </div>
    );
  }

  return (
    <div>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">项目成员</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            管理 "{workspaceName}" 的团队成员和角色分配
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} disabled={showAddForm}>
            + 添加成员
          </Button>
        )}
      </div>

      {/* 添加成员表单 */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-blue-800">添加项目成员</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">选择用户</label>
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- 请选择 --</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} ({u.username})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && allUsers.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">所有用户都已是成员</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">项目角色</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={addLoading || !addUserId}>
              {addLoading ? '添加中...' : '确认添加'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {/* 成员列表 */}
      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">加载中...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          暂无成员，点击"添加成员"开始配置团队
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition ${m.status === 'disabled' ? 'opacity-60' : ''}`}
            >
              {/* 左侧：头像 + 信息 */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {m.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{m.displayName}</span>
                    {m.userId === currentUser?.id && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex-shrink-0">我</span>
                    )}
                    {m.status === 'disabled' && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded flex-shrink-0">已停用</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{m.username}</span>
                </div>
              </div>

              {/* 右侧：角色 + 操作 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {editingId === m.id ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRoleChange(m.id)}
                      className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[m.projectRole] || ROLE_COLORS.viewer}`}>
                      {ROLE_LABELS[m.projectRole] || m.projectRole}
                    </span>
                    {canManage && (
                      <div className="flex items-center gap-0.5 ml-2">
                        <button
                          onClick={() => { setEditingId(m.id); setEditRole(m.projectRole); }}
                          className="px-1.5 py-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="修改角色"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemove(m)}
                          className="px-1.5 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="移除成员"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 角色说明 */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs font-medium text-gray-600 mb-2">角色权限说明</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-gray-500">
          <div><span className="font-medium text-purple-700">负责人</span>：全部权限 + 成员管理</div>
          <div><span className="font-medium text-blue-700">QA</span>：版本/问题/RN 增删改</div>
          <div><span className="font-medium text-green-700">RD</span>：Release Note 增删改</div>
          <div><span className="font-medium text-amber-700">PM</span>：问题增删改</div>
          <div><span className="font-medium text-gray-600">只读</span>：仅查看</div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMembersPanel;
