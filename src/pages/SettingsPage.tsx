import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';

/**
 * 设置页面
 * 配置 API Key 和数据管理
 */
const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 初始化加载设置
  useEffect(() => {
    const savedKey = localStorage.getItem('azure_openai_api_key') || '';
    const savedEndpoint =
      localStorage.getItem('azure_openai_endpoint') ||
      'https://your-resource.openai.azure.com/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-15-preview';
    setApiKey(savedKey);
    setEndpoint(savedEndpoint);
  }, []);

  // 保存设置
  const handleSaveSettings = () => {
    localStorage.setItem('azure_openai_api_key', apiKey);
    localStorage.setItem('azure_openai_endpoint', endpoint);
    alert('设置已保存');
  };

  // 测试连接
  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      if (!apiKey) {
        setTestResult('❌ 请先输入 API Key');
        return;
      }

      if (!endpoint) {
        setTestResult('❌ 请先输入 API 端点');
        return;
      }

      // 验证端点格式
      if (!endpoint.includes('/deployments/')) {
        setTestResult('❌ API 端点格式不正确，应包含 /deployments/ 路径');
        return;
      }

      // 构建正确的 Azure OpenAI 请求
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10,
          temperature: 0.7,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setTestResult('✅ 连接成功');
      } else {
        const errorMessage = responseData?.error?.message || response.statusText;
        
        // 提供更详细的错误提示
        if (errorMessage.includes('does not exist')) {
          setTestResult(
            `❌ 部署不存在: 请检查部署名称是否正确。\n错误: ${errorMessage}`
          );
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          setTestResult('❌ API Key 无效或已过期，请检查 API Key');
        } else {
          setTestResult(`❌ 连接失败: ${errorMessage}`);
        }
      }
    } catch (error) {
      setTestResult(`❌ 错误: ${(error as Error).message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // 导出数据
  const handleExportData = () => {
    const data = {
      versionRecords: localStorage.getItem('versionRecords'),
      customerProblems: localStorage.getItem('customerProblems'),
      recommendations: localStorage.getItem('recommendations'),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().getTime()}.json`;
    link.click();
  };

  // 清除数据
  const handleClearData = () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可撤销。')) {
      localStorage.clear();
      alert('所有数据已清除');
      window.location.reload();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="text-gray-600 mt-2">配置应用和管理数据</p>
        </div>

        {/* Azure OpenAI 配置 */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Azure OpenAI 配置
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入你的 Azure OpenAI API Key"
              />
              <p className="text-xs text-gray-500 mt-1">
                API Key 仅保存在本地浏览器中，不会上传到服务器
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API 端点
              </label>
              <Input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://your-resource.openai.azure.com/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-15-preview"
              />
              <p className="text-xs text-gray-500 mt-1">
                格式: https://&lt;resource-name&gt;.openai.azure.com/openai/deployments/&lt;deployment-id&gt;/chat/completions?api-version=2024-02-15-preview
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveSettings} variant="primary">
                保存设置
              </Button>
              <Button
                onClick={handleTestConnection}
                variant="secondary"
                disabled={testLoading}
              >
                {testLoading ? '测试中...' : '测试连接'}
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg whitespace-pre-wrap ${
                  testResult.includes('✅')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {testResult}
              </div>
            )}
          </div>
        </Card>

        {/* 数据管理 */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">数据管理</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">备份和恢复</h3>
              <p className="text-sm text-gray-600 mb-3">
                导出所有数据为 JSON 文件，可用于备份或迁移
              </p>
              <Button onClick={handleExportData} variant="secondary">
                导出数据
              </Button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">危险操作</h3>
              <p className="text-sm text-gray-600 mb-3">
                清除所有本地数据。此操作不可撤销，请谨慎操作。
              </p>
              <Button onClick={handleClearData} variant="danger">
                清除所有数据
              </Button>
            </div>
          </div>
        </Card>

        {/* 关于 */}
        <Card className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">关于</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-semibold">应用名称:</span> TV AI Voice 测试全流程体系
            </p>
            <p>
              <span className="font-semibold">版本:</span> 1.0.0
            </p>
            <p>
              <span className="font-semibold">开发方式:</span> AI-DLC
            </p>
            <p>
              <span className="font-semibold">技术栈:</span> React 18 + TypeScript +
              Redux Toolkit + Tailwind CSS
            </p>
            <p>
              <span className="font-semibold">数据存储:</span> IndexedDB (本地浏览器)
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
