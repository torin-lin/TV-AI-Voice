import React, { useState } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { useI18n } from '../i18n/I18nProvider';

/**
 * 语音记录页面
 * 管理语音识别记录
 */
const VoiceRecordsPage: React.FC = () => {
  const { formatDateTime } = useI18n();
  const [records, setRecords] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    originalText: '',
    recognizedText: '',
  });

  // 处理添加记录
  const handleAddRecord = () => {
    if (formData.originalText && formData.recognizedText) {
      const isCorrect = formData.originalText === formData.recognizedText;
      setRecords([
        {
          id: `voice_${Date.now()}`,
          ...formData,
          isCorrect,
          createdAt: formatDateTime(new Date()),
        },
        ...records,
      ]);
      setFormData({ originalText: '', recognizedText: '' });
    }
  };

  // 处理删除记录
  const handleDeleteRecord = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
  };

  // 计算准确率
  const accuracy =
    records.length > 0
      ? Math.round((records.filter((r) => r.isCorrect).length / records.length) * 100)
      : 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">语音识别记录</h1>
          <p className="text-gray-600 mt-2">管理和追踪语音识别结果</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：添加表单 */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-lg font-bold text-gray-900 mb-4">添加记录</h2>
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="原始文本"
                  value={formData.originalText}
                  onChange={(e) =>
                    setFormData({ ...formData, originalText: e.target.value })
                  }
                />
                <Input
                  type="text"
                  placeholder="识别结果"
                  value={formData.recognizedText}
                  onChange={(e) =>
                    setFormData({ ...formData, recognizedText: e.target.value })
                  }
                />
                <Button
                  onClick={handleAddRecord}
                  variant="primary"
                  className="w-full"
                >
                  添加
                </Button>
              </div>
            </Card>
          </div>

          {/* 右侧：统计和记录 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">总记录数</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {records.length}
                  </p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">正确数</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {records.filter((r) => r.isCorrect).length}
                  </p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">准确率</p>
                  <p className="text-2xl font-bold text-cyan-500 mt-2">
                    {accuracy}%
                  </p>
                </div>
              </Card>
            </div>

            {/* 记录列表 */}
            <Card>
              <h2 className="text-lg font-bold text-gray-900 mb-4">记录列表</h2>
              {records.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无记录</p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              record.isCorrect
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {record.isCorrect ? '正确' : '错误'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {record.createdAt}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">原始:</span>{' '}
                          {record.originalText}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">识别:</span>{' '}
                          {record.recognizedText}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeleteRecord(record.id)}
                        variant="danger"
                        size="sm"
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecordsPage;
