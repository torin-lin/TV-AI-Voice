/**
 * 个人中心页面
 * 管理基本信息、修改密码、配置 zmind API Key
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/ToastProvider';
import { useAuth } from './AuthProvider';

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  systemRole: string;
  phone: string;
  zmindApiKey: string;
  hasZmindApiKey: boolean;
  createdAt: number;
  updatedAt: number;
}

const ProfilePage: React.FC = () => {
  const { showToast } = useToast();
  const { isLoggedIn, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // 基本信息表单
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // 密码修改
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // zmind API Key
  const [zmindKey, setZmindKey] = useState('');
  const [zmindKeyVisible, setZmindKeyVisible] = useState(false);
  const [zmindSaving, setZmindSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/auth/profile');
      if (res.data.success) {
        const data = res.data.data;
        setProfile(data);
        setDisplayName(data.displayName);
        setPhone(data.phone || '');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '加载个人信息失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { if (isLoggedIn) loadProfile(); }, [isLoggedIn, loadProfile]);

  const handleSaveBasic = async () => {
    if (!displayName.trim()) {
      showToast('显示名称不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      await axios.put('/api/auth/profile', { displayName: displayName.trim(), phone: phone.trim() });
      showToast('个人信息已更新', 'success');
      refreshUser();
      loadProfile();
    } catch (err: any) {
      showToast(err.response?.data?.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      showToast('请填写完整', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('新密码至少 6 位', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    setPasswordSaving(true);
    try {
      await axios.put('/api/auth/profile/password', { oldPassword, newPassword });
      showToast('密码已修改', 'success');
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.message || '修改失败', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLoadZmindKey = async () => {
    try {
      const res = await axios.get('/api/auth/profile/zmind-key');
      if (res.data.success) {
        setZmindKey(res.data.data.zmindApiKey || '');
        setZmindKeyVisible(true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '获取失败', 'error');
    }
  };

  const handleSaveZmindKey = async () => {
    setZmindSaving(true);
    try {
      await axios.put('/api/auth/profile', { zmindApiKey: zmindKey.trim() });
      showToast('zmind API Key 已保存', 'success');
      loadProfile();
    } catch (err: any) {
      showToast(err.response?.data?.message || '保存失败', 'error');
    } finally {
      setZmindSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">请先登录后访问个人中心</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">个人中心</h1>
          <p className="text-gray-500 mt-1">管理你的账号信息和集成配置</p>
        </div>

        {/* 用户概览卡片 */}
        <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {profile?.displayName?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile?.displayName}</h2>
              <p className="text-sm text-gray-500">{profile?.username}</p>
              <div className="flex items-center gap-2 mt-1">
                {profile?.systemRole === 'admin' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">管理员</span>
                )}
                {profile?.phone && (
                  <span className="text-xs text-gray-400">📱 {profile.phone}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 基本信息 */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <Input type="text" value={profile?.username || ''} disabled />
              <p className="text-xs text-gray-400 mt-1">登录邮箱不可修改</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的显示名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="选填，方便团队联系"
              />
            </div>
            <Button onClick={handleSaveBasic} variant="primary" disabled={saving}>
              {saving ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </Card>

        {/* 修改密码 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">密码</h2>
            {!showPasswordForm && (
              <Button variant="secondary" size="sm" onClick={() => setShowPasswordForm(true)}>
                修改密码
              </Button>
            )}
          </div>
          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="输入当前密码"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={passwordSaving}>
                  {passwordSaving ? '修改中...' : '确认修改'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowPasswordForm(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                  取消
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">密码已设置，点击右上角按钮可修改</p>
          )}
        </Card>

        {/* zmind API Key */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-2">zmind API Key</h2>
          <p className="text-sm text-gray-500 mb-4">
            配置你的 zmind（Redmine）访问密钥，用于问题同步和项目数据获取。每人使用自己的 Key，创建的 issue 会显示为你的账号。
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">当前状态：</span>
              {profile?.hasZmindApiKey ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">已配置</span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">未配置</span>
              )}
              {profile?.hasZmindApiKey && !zmindKeyVisible && (
                <button onClick={handleLoadZmindKey} className="text-xs text-blue-600 hover:underline ml-2">
                  查看/编辑
                </button>
              )}
            </div>

            {(zmindKeyVisible || !profile?.hasZmindApiKey) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={zmindKey}
                    onChange={(e) => setZmindKey(e.target.value)}
                    placeholder="粘贴你的 zmind API Key"
                    className="flex-1 font-mono text-sm"
                  />
                  <Button onClick={handleSaveZmindKey} variant="primary" size="sm" disabled={zmindSaving}>
                    {zmindSaving ? '保存中...' : '保存'}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  获取方式：登录 zmind → 右上角「我的账号」→ 左侧「API 访问键」→ 显示/重置
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 账号信息 */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-3">账号信息</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">账号 ID</span>
              <p className="font-mono text-gray-700 mt-0.5">{profile?.id}</p>
            </div>
            <div>
              <span className="text-gray-500">系统角色</span>
              <p className="text-gray-700 mt-0.5">{profile?.systemRole === 'admin' ? '管理员' : '普通成员'}</p>
            </div>
            <div>
              <span className="text-gray-500">创建时间</span>
              <p className="text-gray-700 mt-0.5">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">最后更新</span>
              <p className="text-gray-700 mt-0.5">{profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('zh-CN') : '-'}</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default ProfilePage;
