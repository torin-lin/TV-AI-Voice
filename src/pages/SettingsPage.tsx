import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../components/common/ToastProvider';
import { Link } from 'react-router-dom';
import { usePermission } from '../auth/usePermission';
import UserManagement from '../auth/UserManagement';
import AuditLogPanel from '../auth/AuditLogPanel';

const SettingsPage: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const permission = usePermission();
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [modelName, setModelName] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem('azure_openai_api_key') || '');
    setEndpoint(localStorage.getItem('azure_openai_endpoint') || 'https://fz-test-qa.openai.azure.com/openai/v1/chat/completions');
    setModelName(localStorage.getItem('azure_openai_model') || 'gpt-5');
  }, []);

  const handleSave = () => {
    localStorage.setItem('azure_openai_api_key', apiKey);
    localStorage.setItem('azure_openai_endpoint', endpoint);
    localStorage.setItem('azure_openai_model', modelName);
    showToast(t('设置已保存'), 'success');
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      if (!apiKey) { setTestResult(`❌ ${t('请先输入 API Key')}`); return; }
      if (!endpoint) { setTestResult(`❌ ${t('请先输入端点地址')}`); return; }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName || undefined,
          messages: [{ role: 'user', content: '你好' }],
          max_completion_tokens: 10,
          temperature: 1,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const model = data?.model || '';
        const reply = data?.choices?.[0]?.message?.content || '';
        setTestResult(`✅ ${t('连接成功')}${model ? ` (${t('模型:')} ${model})` : ''}${reply ? `\n${t('回复:')} ${reply}` : ''}`);
      } else {
        const msg = data?.error?.message || response.statusText;
        setTestResult(`❌ ${t('连接失败')} (${response.status}): ${msg}`);
      }
    } catch (error) {
      setTestResult(`❌ ${t('网络错误')}: ${(error as Error).message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="text-gray-600 mt-2">配置应用和管理数据</p>
        </div>

        {/* Azure OpenAI 配置 */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Azure OpenAI 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API 端点</label>
              <Input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://fz-test-qa.openai.azure.com/openai/v1/chat/completions" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
              <Input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)}
                placeholder="gpt-5" />
              <p className="text-xs text-gray-500 mt-1">请求 body 中的 model 字段</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的 API Key" />
              <p className="text-xs text-gray-500 mt-1">API Key 仅保存在本地浏览器中</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} variant="primary">保存设置</Button>
              <Button onClick={handleTest} variant="secondary" disabled={testLoading}>
                {testLoading ? '测试中...' : '测试连接'}
              </Button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg whitespace-pre-wrap text-sm ${
                testResult.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult}
              </div>
            )}
          </div>
        </Card>

        {/* 数据管理 */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">数据管理</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>所有数据存储在服务端 SQLite 数据库中（data/app.db），支持多人共享访问。</p>
            <p>如需备份数据，请直接复制服务器上的 <code className="bg-gray-100 px-1 rounded">data/app.db</code> 文件。</p>
            <p>如需恢复数据，将备份的 <code className="bg-gray-100 px-1 rounded">app.db</code> 文件放回 data 目录并重启服务器即可。</p>
          </div>
        </Card>

        <Card className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">项目与权限管理</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>独立项目、项目组和扩展模块显示权限统一在模块中心维护，顶部区域只保留切换当前工作上下文。</p>
            <Link
              to="/module-center"
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              打开模块中心
            </Link>
          </div>
        </Card>

        {/* 用户管理（仅管理员可见） */}
        {permission.isAdmin && (
          <Card className="mt-6">
            <UserManagement />
          </Card>
        )}

        {/* 审计日志（仅管理员可见） */}
        {permission.isAdmin && (
          <Card className="mt-6">
            <AuditLogPanel />
          </Card>
        )}

        {/* 关于 */}
        <Card className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">关于</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-semibold">应用名称:</span> 项目交付管理平台</p>
            <p><span className="font-semibold">版本:</span> 1.0.0</p>
            <p><span className="font-semibold">技术栈:</span> React 18 + TypeScript + Redux Toolkit + Tailwind CSS</p>
            <p><span className="font-semibold">数据存储:</span> SQLite (服务端)</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
