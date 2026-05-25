import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SessionExpiredModal from './auth/SessionExpiredModal';
import { useI18n } from './i18n/I18nProvider';
import { AuthProvider, useAuth } from './auth/AuthProvider';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VersionRecordsPage = lazy(() => import('./features/versionRecords/components/VersionRecordsPage'));
const ReleaseNotesPage = lazy(() => import('./features/releaseNotes/components/ReleaseNotesPage'));
const CustomerProblemsPage = lazy(() => import('./features/customerProblems/components/CustomerProblemsPage'));
const RecommendationsPage = lazy(() => import('./features/recommendations/components/RecommendationsPage'));
const VoiceRecordsPage = lazy(() => import('./pages/VoiceRecordsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AliasTestPage = lazy(() => import('./pages/AliasTestPage'));
const VersionWorkbenchPage = lazy(() => import('./pages/VersionWorkbenchPage'));
const ProjectApkManagementPage = lazy(() => import('./pages/ProjectApkManagementPage'));
const ModuleCenterPage = lazy(() => import('./pages/ModuleCenterPage'));
const MitmProxyPage = lazy(() => import('./features/mitmProxy/components/MitmProxyPage'));
const AdbToolPublicPage = lazy(() => import('./pages/AdbToolPublicPage'));
const ProfilePage = lazy(() => import('./auth/ProfilePage'));

const PageFallback: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      <p className="mt-3 text-sm text-slate-500">加载中...</p>
    </div>
  </div>
);

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(username, password);
    if (!result.success) {
      setError(result.message || '登录失败');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            AI
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">项目交付管理平台</h1>
          <p className="mt-2 text-sm text-slate-500">请登录后访问系统</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="app-login-username" className="mb-1 block text-sm font-medium text-slate-700">
              邮箱
            </label>
            <input
              id="app-login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              placeholder="请输入邮箱"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="app-login-password" className="mb-1 block text-sm font-medium text-slate-700">
              密码
            </label>
            <input
              id="app-login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * 应用内容（需要在 AuthProvider 内部使用）
 */
const AppContent: React.FC = () => {
  const { localizeNode } = useI18n();
  const { isLoggedIn, loading } = useAuth();

  // 初始化加载中（检查 token 有效性）
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return localizeNode(<LoginScreen />);
  }

  return localizeNode(
    <Router>
      <MainLayout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/adb-tool-public" element={<AdbToolPublicPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/version-records" element={<VersionRecordsPage />} />
            <Route path="/release-notes" element={<ReleaseNotesPage />} />
            <Route path="/customer-problems" element={<CustomerProblemsPage />} />
            <Route path="/voice-records" element={<VoiceRecordsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/alias-test" element={<AliasTestPage />} />
            <Route path="/mitm-proxy" element={<MitmProxyPage />} />
            <Route path="/apk-management" element={<ProjectApkManagementPage />} />
            <Route path="/module-center" element={<ModuleCenterPage />} />
            <Route path="/version-workbench/:versionKey" element={<VersionWorkbenchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
};

/**
 * 主应用组件
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
      <SessionExpiredModal />
    </AuthProvider>
  );
};

export default App;
