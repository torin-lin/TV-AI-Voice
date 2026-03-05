import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ReleaseNote, CustomerProblem } from '../types/database';
import { Card } from '../components/common/Card';
import { LineChart, PieChart } from '../components/common/Charts';
import { apiQueryReleaseNotes } from '../services/ReleaseNoteApiClient';
import { apiQueryProblems } from '../services/CustomerProblemApiClient';

/**
 * 仪表板页面
 * 显示项目统计和概览
 */
const DashboardPage: React.FC = () => {
  const versionRecords = useSelector((state: RootState) => state.versionRecords.items);
  const recommendations = useSelector((state: RootState) => state.recommendations.history);

  const [stats, setStats] = useState({
    totalVersions: 0,
    totalProblems: 0,
    totalRecommendations: 0,
    totalReleaseNotes: 0,
    passRate: 0,
    highRiskVersions: 0,
  });
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [customerProblems, setCustomerProblems] = useState<CustomerProblem[]>([]);

  // 加载服务端数据
  useEffect(() => {
    apiQueryReleaseNotes({}, { page: 1, pageSize: 5 })
      .then((res) => setReleaseNotes(res.data))
      .catch(() => {});
    apiQueryProblems({ page: 1, pageSize: 10 })
      .then((res) => setCustomerProblems(res.data))
      .catch(() => {});
  }, []);

  // 计算统计数据
  useEffect(() => {
    const passedTests = versionRecords.filter(
      (v) =>
        v.smokeTestResult === '通过' &&
        v.voiceRegressionResult === '通过' &&
        v.systemRegressionResult === '通过'
    ).length;

    const highRisk = versionRecords.filter((v) => v.riskLevel === '高').length;

    setStats({
      totalVersions: versionRecords.length,
      totalProblems: customerProblems.length,
      totalRecommendations: recommendations.length,
      totalReleaseNotes: releaseNotes.length,
      passRate:
        versionRecords.length > 0
          ? Math.round((passedTests / versionRecords.length) * 100)
          : 0,
      highRiskVersions: highRisk,
    });
  }, [versionRecords, customerProblems, recommendations, releaseNotes]);

  // 风险等级分布数据
  const riskDistribution = {
    labels: ['低', '中', '高'],
    data: [
      versionRecords.filter((v) => v.riskLevel === '低').length,
      versionRecords.filter((v) => v.riskLevel === '中').length,
      versionRecords.filter((v) => v.riskLevel === '高').length,
    ],
  };

  // 问题分类分布数据
  const problemDistribution = {
    labels: ['录音', '蓝牙', 'ASR', 'NLU', '服务端', '网络', 'Android'],
    data: [
      customerProblems.filter((p) => p.classification === '录音').length,
      customerProblems.filter((p) => p.classification === '蓝牙').length,
      customerProblems.filter((p) => p.classification === 'ASR').length,
      customerProblems.filter((p) => p.classification === 'NLU').length,
      customerProblems.filter((p) => p.classification === '服务端').length,
      customerProblems.filter((p) => p.classification === '网络').length,
      customerProblems.filter((p) => p.classification === 'Android').length,
    ],
  };

  // 最近 7 天活动数据
  const activityData = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    data: [12, 19, 8, 15, 22, 18, 14],
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600 mt-2">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">QA版本</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.totalVersions}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Release Note</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.totalReleaseNotes}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">问题总数</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats.totalProblems}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">通过率</p>
              <p className="text-3xl font-bold text-cyan-500 mt-2">
                {stats.passRate}%
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">高风险版本</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats.highRiskVersions}
              </p>
            </div>
          </Card>
        </div>

        {/* 图表区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 风险等级分布 */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">风险等级分布</h2>
            <PieChart data={riskDistribution} />
          </Card>

          {/* 问题分类分布 */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">问题分类分布</h2>
            <PieChart data={problemDistribution} />
          </Card>
        </div>

        {/* 活动趋势 */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">最近 7 天活动趋势</h2>
          <LineChart data={activityData} />
        </Card>

        {/* 最近活动 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* 最近 QA 版本记录 */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">最近 QA 版本记录</h2>
            <div className="space-y-3">
              {versionRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">
                      {record.versionNumber}
                    </p>
                    <p className="text-sm text-gray-600 truncate" title={record.changeDescription}>
                      {record.changeDescription}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      record.riskLevel === '低'
                        ? 'bg-green-100 text-green-800'
                        : record.riskLevel === '中'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {record.riskLevel}
                  </span>
                </div>
              ))}
              {versionRecords.length === 0 && <p className="text-gray-400 text-sm">暂无记录</p>}
            </div>
          </Card>

          {/* 最近 Release Note */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">最近 Release Note</h2>
            <div className="space-y-3">
              {releaseNotes.slice(0, 5).map((rn) => (
                <div
                  key={rn.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">
                      {rn.version} <span className="text-xs text-gray-400 font-normal">{rn.branch}</span>
                    </p>
                    <p className="text-sm text-gray-600 truncate" title={rn.changeDescription}>
                      {rn.changeDescription}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      rn.severity === '低' ? 'bg-green-100 text-green-800'
                        : rn.severity === '中' ? 'bg-yellow-100 text-yellow-800'
                        : rn.severity === '高' ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {rn.changeType}
                  </span>
                </div>
              ))}
              {releaseNotes.length === 0 && <p className="text-gray-400 text-sm">暂无记录</p>}
            </div>
          </Card>
        </div>

        {/* 最近问题 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">最近问题</h2>
            <div className="space-y-3">
              {customerProblems.slice(0, 5).map((problem) => (
                <div
                  key={problem.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900 truncate" title={problem.description}>
                      {problem.description}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {problem.classification || '未分类'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      problem.status === '开放'
                        ? 'bg-red-100 text-red-800'
                        : problem.status === '进行中'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {problem.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
