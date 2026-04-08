import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { ReleaseNote, CustomerProblem } from '../types/database';
import { Card } from '../components/common/Card';
import { PieChart } from '../components/common/Charts';
import { apiQueryReleaseNotes } from '../services/ReleaseNoteApiClient';
import { apiQueryProblems } from '../services/CustomerProblemApiClient';
import { fetchVersionRecords } from '../features/versionRecords/store/versionRecordsSlice';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const versionRecords = useSelector((state: RootState) => state.versionRecords.items);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [customerProblems, setCustomerProblems] = useState<CustomerProblem[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [totalReleaseNotes, setTotalReleaseNotes] = useState(0);

  // 加载服务端数据
  useEffect(() => {
    const pg = currentProject !== '全部' ? currentProject : undefined;
    dispatch(fetchVersionRecords({ filters: pg ? { projectGroup: pg } : {}, pagination: { page: 1, pageSize: 100 } }));
    apiQueryReleaseNotes(pg ? { projectGroup: pg } : {}, { page: 1, pageSize: 5 })
      .then((res) => { setReleaseNotes(res.data); setTotalReleaseNotes(res.total); })
      .catch(() => {});
    apiQueryProblems({ page: 1, pageSize: 100, ...(pg ? { projectGroup: pg } : {}) })
      .then((res) => { setCustomerProblems(res.data); setTotalProblems(res.total); })
      .catch(() => {});
  }, [currentProject, dispatch]);

  // 统计
  const passedTests = versionRecords.filter(
    (v) => v.smokeTestResult === '通过' && v.voiceRegressionResult === '通过' && v.systemRegressionResult === '通过'
  ).length;
  const highRisk = versionRecords.filter((v) => v.riskLevel === '高').length;
  const passRate = versionRecords.length > 0 ? Math.round((passedTests / versionRecords.length) * 100) : 0;
  const openProblems = customerProblems.filter((p) => p.status === '开放').length;
  const inProgressProblems = customerProblems.filter((p) => p.status === '进行中').length;
  const resolvedProblems = customerProblems.filter((p) => p.status === '已解决').length;

  // 风险等级分布
  const riskDistribution = {
    labels: ['低', '中', '高'],
    data: [
      versionRecords.filter((v) => v.riskLevel === '低').length,
      versionRecords.filter((v) => v.riskLevel === '中').length,
      versionRecords.filter((v) => v.riskLevel === '高').length,
    ],
  };

  // 问题分类分布 - 动态统计所有分类
  const classificationCounts: Record<string, number> = {};
  customerProblems.forEach((p) => {
    const c = p.classification || '未分类';
    classificationCounts[c] = (classificationCounts[c] || 0) + 1;
  });
  const classLabels = Object.keys(classificationCounts);
  const problemDistribution = {
    labels: classLabels.length > 0 ? classLabels : ['暂无数据'],
    data: classLabels.length > 0 ? classLabels.map((l) => classificationCounts[l]) : [0],
  };

  // 问题状态分布
  const statusDistribution = {
    labels: ['开放', '进行中', '已解决'],
    data: [openProblems, inProgressProblems, resolvedProblems],
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600 mt-2">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">QA版本</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{versionRecords.length}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Release Note</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{totalReleaseNotes}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">问题总数</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{totalProblems}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">未解决问题</p>
              <p className="text-3xl font-bold text-orange-500 mt-2">{openProblems + inProgressProblems}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm">通过率</p>
              <p className="text-3xl font-bold text-cyan-500 mt-2">{passRate}%</p>
            </div>
          </Card>
        </div>

        {/* 图表区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">风险等级分布</h2>
            <PieChart data={riskDistribution} />
          </Card>
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">问题分类分布</h2>
            <PieChart data={problemDistribution} />
          </Card>
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">问题状态分布</h2>
            <PieChart data={statusDistribution} />
          </Card>
        </div>

        {/* 最近活动 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近 QA 版本记录 */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">最近 QA 版本记录</h2>
            <div className="space-y-3">
              {versionRecords.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">{record.versionNumber}</p>
                    <p className="text-sm text-gray-600 truncate" title={record.changeDescription}>{record.changeDescription}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    record.riskLevel === '低' ? 'bg-green-100 text-green-800'
                      : record.riskLevel === '中' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>{record.riskLevel}</span>
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
                <div key={rn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">{rn.version} <span className="text-xs text-gray-400 font-normal">{rn.branch}</span></p>
                    <p className="text-sm text-gray-600 truncate" title={rn.changeDescription}>{rn.changeDescription}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    rn.severity === '低' ? 'bg-green-100 text-green-800'
                      : rn.severity === '中' ? 'bg-yellow-100 text-yellow-800'
                      : rn.severity === '高' ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}>{rn.changeType}</span>
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
                <div key={problem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900 truncate" title={problem.description}>{problem.description}</p>
                    <p className="text-sm text-gray-600 truncate">{problem.classification || '未分类'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    problem.status === '开放' ? 'bg-red-100 text-red-800'
                      : problem.status === '进行中' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>{problem.status}</span>
                </div>
              ))}
              {customerProblems.length === 0 && <p className="text-gray-400 text-sm">暂无记录</p>}
            </div>
          </Card>

          {/* 高风险版本 */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">高风险版本 ({highRisk})</h2>
            <div className="space-y-3">
              {versionRecords.filter((v) => v.riskLevel === '高').slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">{record.versionNumber}</p>
                    <p className="text-sm text-gray-600 truncate" title={record.changeDescription}>{record.changeDescription}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${record.smokeTestResult === '通过' ? 'bg-green-100 text-green-800' : record.smokeTestResult === '失败' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{record.smokeTestResult}</span>
                  </div>
                </div>
              ))}
              {highRisk === 0 && <p className="text-gray-400 text-sm">暂无高风险版本 👍</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
