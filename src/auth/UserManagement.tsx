/**
 * 用户管理组件
 * 管理员可在设置页中管理用户：新增、编辑角色、修改密码、删除
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/ToastProvider';
import { useAuth } from './AuthProvider';

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  systemRole: 'admin' | 'member';
  status: 'active' | 'disabled';
  lastLoginAt?: number | null;
  createdAt: number;
  updatedAt?: number;
}

const UserManagement: React.FC = () => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 新增用户表单
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', displayName: '', password: '', systemRole: 'member' });
  const [addLoading, setAddLoading] = useState(false);

  // 修改密码
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // 编辑角色
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');
  const [editDisplayName, setEditDisplayName] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/auth/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || '加载用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.username.trim() || !addForm.displayName.trim() || !addForm.password.trim()) {
      showToast('请填写完整信息', 'error');
      return;
    }
    setAddLoading(true);
    try {
      const res = await axios.post('/api/auth/register', addForm);
      if (res.data.success) {
        showToast(`用户 "${addForm.displayName}" 创建成功`, 'success');
        setAddForm({ username: '', displayName: '', password: '', systemRole: 'member' });
        setShowAddForm(false);
        loadUsers();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '创建失败', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (user.id === currentUser?.id) {
      showToast('不能删除自己', 'error');
      return;
    }
    if (!confirm(`确定删除用户 "${user.displayName}" (${user.username})？此操作不可恢复。`)) return;
    try {
      await axios.delete(`/api/auth/users/${user.id}`);
      showToast('已删除', 'success');
      loadUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || '删除失败', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      showToast('密码至少 6 位', 'error');
      return;
    }
    try {
      await axios.put(`/api/auth/users/${resetTarget.id}/password`, { newPassword });
      showToast(`已重置 "${resetTarget.displayName}" 的密码`, 'success');
      setResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.message || '重置失败', 'error');
    }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      await axios.put(`/api/auth/users/${editTarget.id}`, {
        displayName: editDisplayName.trim() || undefined,
        systemRole: editRole,
        status: editStatus,
      });
      showToast('已更新', 'success');
      setEditTarget(null);
      loadUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || '更新失败', 'error');
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">用户管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">管理系统用户账号和角色</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '取消' : '+ 新增用户'}
        </Button>
      </div>

      {/* 新增用户表单 */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-blue-800">创建新用户</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">邮箱（登录用）</label>
              <input
                type="email"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如 zhangsan@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">显示名称</label>
              <input
                type="text"
                value={addForm.displayName}
                onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如 张三"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">初始密码</label>
              <input
                type="text"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">系统角色</label>
              <select
                value={addForm.systemRole}
                onChange={(e) => setAddForm({ ...addForm, systemRole: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="member">普通成员</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm" disabled={addLoading}>
              {addLoading ? '创建中...' : '创建用户'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddForm(false)}>
              取消
            </Button>
          </div>
        </form>
      )}

      {/* 用户列表 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">加载中...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">暂无用户</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">用户</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">邮箱</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">角色</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">状态</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">最后登录</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-2.5 ${u.status === 'disabled' ? 'opacity-60' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.displayName.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{u.displayName}</span>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">我</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.username}</td>
                  <td className="px-4 py-3">
                    {u.systemRole === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        管理员
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">成员</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.status === 'disabled' ? (
                      <span className="text-xs bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">已停用</span>
                    ) : (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">启用中</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.lastLoginAt || 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditTarget(u); setEditRole(u.systemRole); setEditStatus(u.status || 'active'); setEditDisplayName(u.displayName); }}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="编辑"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => { setResetTarget(u); setNewPassword(''); }}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                        title="重置密码"
                      >
                        密码
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="删除"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {editTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-6 animate-in">
            <h3 className="text-lg font-bold text-gray-900 mb-4">编辑用户</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">显示名称</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">系统角色</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">普通成员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">账号状态</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'disabled')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">启用</option>
                  <option value="disabled">停用</option>
                </select>
                {editTarget.id === currentUser?.id && editStatus === 'disabled' && (
                  <p className="mt-1 text-xs text-rose-600">不能停用自己，请选择其他管理员操作。</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="primary" size="sm" onClick={handleEditSave} disabled={editTarget.id === currentUser?.id && editStatus === 'disabled'}>保存</Button>
              <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>取消</Button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {resetTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResetTarget(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-6 animate-in">
            <h3 className="text-lg font-bold text-gray-900 mb-1">重置密码</h3>
            <p className="text-sm text-gray-500 mb-4">为 "{resetTarget.displayName}" 设置新密码</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">新密码</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="至少 6 位"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="primary" size="sm" onClick={handleResetPassword} disabled={!newPassword.trim()}>
                确认重置
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setResetTarget(null)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
