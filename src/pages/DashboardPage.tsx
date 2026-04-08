import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { ReleaseNote, CustomerProblem } from '../types/database';
import { Card } from '../components/common/Card';
import { PieChart } from '../components/common/Charts';
import { apiQueryReleaseNotes } from '../services/ReleaseNoteApiClient';
import { apiQueryProblems } from '../services/CustomerProblemApiClient';
import { fetchVersionRecords } from '../features/versionRecords/store/versionRecordsSlice';
import { useI18n } from '../i18n/I18nProvider';
import { getVersionStatusClass } from '../features/versionRecords/versionStatus';

const DAY_MS = 24 * 60 * 60 * 1000;

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatDate } = useI18n();
  const versionRecords = useSelector((state: RootState) => state.versionRecords.items);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [customerProblems, setCustomerProblems] = useState<CustomerProblem[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [totalReleaseNotes, setTotalReleaseNotes] = useState(0);
  const now = Date.now();

  useEffect(() => {
    const pg = currentProject !== '全部' ? currentProject : undefined;
    dispatch(fetchVersionRecords({ filters: pg ? { projectGroup: pg } : {}, pagination: { page: 1, pageSize: 200 } }));
    apiQueryReleaseNotes(pg ? { projectGroup: pg } : {}, { page: 1, pageSize: 200 })
      .then((res) => { setReleaseNotes(res.data); setTotalReleaseNotes(res.total); })
      .catch(() => {});
    apiQueryProblems({ page: 1, pageSize: 200, ...(pg ? { projectGroup: pg } : {}) })
      .then((res) => { setCustomerProblems(res.data); setTotalProblems(res.total); })
      .catch(() => {});
  }, [currentProject, dispatch]);

  const blockedVersions = useMemo(
    () => versionRecords.filter((v) => v.versionStatus === '阻塞').sort((a, b) => b.updatedAt - a.updatedAt),
    [versionRecords]
  );
  const pendingConclusionVersions = useMemo(
    () => versionRecords.filter((v) => v.versionStatus === '待结论').sort((a, b) => b.updatedAt - a.updatedAt),
    [versionRecords]
  );
  const testingVersions = useMemo(
    () => versionRecords.filter((v) => v.versionStatus === '测试中').sort((a, b) => b.updatedAt - a.updatedAt),
    [versionRecords]
  );
  const releasableVersions = useMemo(
    () => versionRecords.filter((v) => v.versionStatus === '可发布').sort((a, b) => b.updatedAt - a.updatedAt),
    [versionRecords]
  );
  const highRiskVersions = useMemo(
    () => versionRecords.filter((v) => v.riskLevel === '高').sort((a, b) => b.updatedAt - a.updatedAt),
    [versionRecords]
  );
  const urgentQaInterventionVersions = useMemo(
    () =>
      versionRecords
        .filter((v) => Boolean(v.qaEarlyInterventionReason?.trim()))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [versionRecords]
  );

  const unresolvedProblems = useMemo(
    () => customerProblems.filter((p) => p.status === '开放' || p.status === '进行中').sort((a, b) => b.updatedAt - a.updatedAt),
    [customerProblems]
  );

  const rdSmokeMissing = useMemo(
    () => releaseNotes.filter((rn) => !rn.rdSmokeStatus || rn.rdSmokeStatus === '未测试').sort((a, b) => b.updatedAt - a.updatedAt),
    [releaseNotes]
  );
  const rdSmokeFailed = useMemo(
    () => releaseNotes.filter((rn) => rn.rdSmokeStatus === '失败').sort((a, b) => b.updatedAt - a.updatedAt),
    [releaseNotes]
  );
  const staleBlockedVersions = useMemo(
    () =>
      blockedVersions
        .filter((v) => now - v.updatedAt >= 2 * DAY_MS)
        .sort((a, b) => a.updatedAt - b.updatedAt),
    [blockedVersions, now]
  );
  const stalePendingConclusionVersions = useMemo(
    () =>
      pendingConclusionVersions
        .filter((v) => now - v.updatedAt >= DAY_MS)
        .sort((a, b) => a.updatedAt - b.updatedAt),
    [now, pendingConclusionVersions]
  );
  const staleOpenProblems = useMemo(
    () =>
      unresolvedProblems
        .filter((p) => now - p.updatedAt >= 2 * DAY_MS)
        .sort((a, b) => a.updatedAt - b.updatedAt),
    [now, unresolvedProblems]
  );
  const staleRdHandoffs = useMemo(
    () =>
      [...rdSmokeFailed, ...rdSmokeMissing]
        .filter((rn) => now - rn.updatedAt >= DAY_MS)
        .sort((a, b) => a.updatedAt - b.updatedAt),
    [now, rdSmokeFailed, rdSmokeMissing]
  );

  const passedTests = versionRecords.filter(
    (v) => v.voiceRegressionResult === '通过' && v.systemRegressionResult === '通过'
  ).length;
  const passRate = versionRecords.length > 0 ? Math.round((passedTests / versionRecords.length) * 100) : 0;
  const openProblems = customerProblems.filter((p) => p.status === '开放').length;
  const inProgressProblems = customerProblems.filter((p) => p.status === '进行中').length;
  const resolvedProblems = customerProblems.filter((p) => p.status === '已解决').length;
  const versionStatusCounts = {
    '待测试': versionRecords.filter((v) => (v.versionStatus || '待测试') === '待测试').length,
    '测试中': testingVersions.length,
    '阻塞': blockedVersions.length,
    '待结论': pendingConclusionVersions.length,
    '可发布': releasableVersions.length,
    '已发布': versionRecords.filter((v) => v.versionStatus === '已发布').length,
  };

  const riskDistribution = {
    labels: ['低', '中', '高'],
    data: [
      versionRecords.filter((v) => v.riskLevel === '低').length,
      versionRecords.filter((v) => v.riskLevel === '中').length,
      highRiskVersions.length,
    ],
  };

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

  const statusDistribution = {
    labels: ['开放', '进行中', '已解决'],
    data: [openProblems, inProgressProblems, resolvedProblems],
  };

  const versionStatusDistribution = {
    labels: Object.keys(versionStatusCounts),
    data: Object.values(versionStatusCounts),
  };

  const managementHighlights = [
    {
      label: '阻塞版本',
      value: blockedVersions.length,
      tone: 'text-red-600',
      bg: 'bg-red-50 border-red-100',
      link: '/version-records?keyword=',
      cta: '优先处理',
    },
    {
      label: '待结论版本',
      value: pendingConclusionVersions.length,
      tone: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      link: '/version-records?keyword=',
      cta: '补结论',
    },
    {
      label: 'RD 冒烟缺口',
      value: rdSmokeMissing.length + rdSmokeFailed.length,
      tone: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-100',
      link: '/release-notes?keyword=',
      cta: '回看提测',
    },
    {
      label: '未闭环问题',
      value: unresolvedProblems.length,
      tone: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      link: '/customer-problems?keyword=',
      cta: '去处理',
    },
    {
      label: '紧急介入版本',
      value: urgentQaInterventionVersions.length,
      tone: 'text-red-700',
      bg: 'bg-red-50 border-red-100',
      link: '/version-records?keyword=',
      cta: '查看原因',
    },
  ];
  const agingHighlights = [
    {
      label: '超时阻塞版本',
      value: staleBlockedVersions.length,
      tone: 'text-red-700',
      bg: 'bg-red-50 border-red-100',
      desc: '阻塞超过 2 天',
      link: '/version-records?keyword=',
    },
    {
      label: '超时待结论版本',
      value: stalePendingConclusionVersions.length,
      tone: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-100',
      desc: '待结论超过 1 天',
      link: '/version-records?keyword=',
    },
    {
      label: '超时未闭环问题',
      value: staleOpenProblems.length,
      tone: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-100',
      desc: '问题超过 2 天未更新',
      link: '/customer-problems?keyword=',
    },
    {
      label: '超时 RD 提测缺口',
      value: staleRdHandoffs.length,
      tone: 'text-violet-700',
      bg: 'bg-violet-50 border-violet-100',
      desc: '缺口超过 1 天未处理',
      link: '/release-notes?keyword=',
    },
  ];

  const versionActionItems = useMemo(() => {
    return [...blockedVersions, ...pendingConclusionVersions, ...testingVersions]
      .sort((a, b) => {
        const weight = (status?: string) => {
          if (status === '阻塞') return 3;
          if (status === '待结论') return 2;
          if (status === '测试中') return 1;
          return 0;
        };
        return weight(b.versionStatus) - weight(a.versionStatus) || b.updatedAt - a.updatedAt;
      })
      .slice(0, 8);
  }, [blockedVersions, pendingConclusionVersions, testingVersions]);

  const rdActionItems = useMemo(() => [...rdSmokeFailed, ...rdSmokeMissing].slice(0, 8), [rdSmokeFailed, rdSmokeMissing]);
  const getDaysWaiting = (timestamp: number) => Math.max(1, Math.floor((now - timestamp) / DAY_MS));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
            <p className="mt-2 text-gray-600">
              {formatDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="mt-3 max-w-3xl text-sm text-gray-500">
              当前仪表板已经切到管理视角，优先展示阻塞版本、待结论版本、RD 提测缺口和未闭环问题。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/version-records">
              <span className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                查看 QA 版本
              </span>
            </Link>
            <Link to="/release-notes">
              <span className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                查看 RD 提测
              </span>
            </Link>
            <Link to="/customer-problems">
              <span className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                查看问题闭环
              </span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {managementHighlights.map((item) => (
            <Card key={item.label} className={`border ${item.bg} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className={`mt-3 text-4xl font-bold ${item.tone}`}>{item.value}</p>
                </div>
                <Link to={item.link}>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                    {item.cta}
                  </span>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agingHighlights.map((item) => (
            <Card key={item.label} className={`border ${item.bg} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className={`mt-3 text-4xl font-bold ${item.tone}`}>{item.value}</p>
                  <p className="mt-2 text-xs text-gray-500">{item.desc}</p>
                </div>
                <Link to={item.link}>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                    查看
                  </span>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600">QA版本</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{versionRecords.length}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600">Release Note</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{totalReleaseNotes}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600">问题总数</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{totalProblems}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600">未解决问题</p>
              <p className="mt-2 text-3xl font-bold text-orange-500">{openProblems + inProgressProblems}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600">回归通过率</p>
              <p className="mt-2 text-3xl font-bold text-cyan-500">{passRate}%</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">版本推进重点</h2>
              <Link to="/version-records">
                <span className="text-sm text-blue-700 hover:text-blue-900 hover:underline">查看全部</span>
              </Link>
            </div>
            <div className="space-y-3">
              {versionActionItems.map((record) => (
                <Link
                  key={record.id}
                  to={`/version-workbench/${encodeURIComponent(record.parentVersion || record.versionNumber)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                  className="block rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 break-all">{record.versionNumber}</p>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getVersionStatusClass(record.versionStatus || '待测试')}`}>
                          {record.versionStatus || '待测试'}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          record.riskLevel === '高' ? 'bg-red-100 text-red-800' : record.riskLevel === '中' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {record.riskLevel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 truncate" title={record.changeDescription}>{record.changeDescription}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        固件 {record.firmwareVersion || '-'} · 最近更新 {formatDate(record.updatedAt, { month: '2-digit', day: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-xs text-blue-700">进入工作台</span>
                  </div>
                </Link>
              ))}
              {versionActionItems.length === 0 && <p className="text-sm text-gray-400">当前没有需要重点推进的版本</p>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">RD 提测缺口</h2>
              <Link to="/release-notes">
                <span className="text-sm text-blue-700 hover:text-blue-900 hover:underline">查看全部</span>
              </Link>
            </div>
            <div className="space-y-3">
              {rdActionItems.map((note) => (
                <Link
                  key={note.id}
                  to={`/release-notes?keyword=${encodeURIComponent(note.version)}`}
                  className="block rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 break-all">{note.version}</p>
                      <p className="mt-1 text-sm text-gray-600 truncate" title={note.changeDescription}>{note.changeDescription}</p>
                      <p className="mt-2 text-xs text-gray-400">{note.branch} · {note.author}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      note.rdSmokeStatus === '失败' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {note.rdSmokeStatus || '未测试'}
                    </span>
                  </div>
                </Link>
              ))}
              {rdActionItems.length === 0 && <p className="text-sm text-gray-400">当前没有 RD 提测缺口</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">问题闭环重点</h2>
              <Link to="/customer-problems">
                <span className="text-sm text-blue-700 hover:text-blue-900 hover:underline">查看全部</span>
              </Link>
            </div>
            <div className="space-y-3">
              {unresolvedProblems.slice(0, 8).map((problem) => (
                <Link
                  key={problem.id}
                  to={`/customer-problems?keyword=${encodeURIComponent(problem.issueId || problem.firmwareVersion || problem.description.slice(0, 20))}`}
                  className="block rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-rose-200 hover:bg-rose-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate" title={problem.description}>{problem.description}</p>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          problem.status === '开放' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {problem.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {problem.classification || '未分类'} · {problem.issueId ? `PR#${problem.issueId}` : problem.firmwareVersion || '-'}
                      </p>
                    </div>
                    <span className="text-xs text-blue-700">进入问题页</span>
                  </div>
                </Link>
              ))}
              {unresolvedProblems.length === 0 && <p className="text-sm text-gray-400">当前没有未闭环问题</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">准出候选版本</h2>
            <div className="space-y-3">
              {releasableVersions.slice(0, 6).map((record) => (
                <Link
                  key={record.id}
                  to={`/version-workbench/${encodeURIComponent(record.parentVersion || record.versionNumber)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                  className="block rounded-lg border border-green-100 bg-green-50 p-4 hover:bg-green-100/60"
                >
                  <p className="font-semibold text-gray-900 break-all">{record.versionNumber}</p>
                  <p className="mt-1 text-sm text-gray-600 truncate" title={record.conclusionSummary || record.changeDescription}>
                    {record.conclusionSummary || record.changeDescription}
                  </p>
                  <p className="mt-2 text-xs text-green-700">
                    负责人 {record.conclusionOwner || '-'} · 固件 {record.firmwareVersion || '-'}
                  </p>
                </Link>
              ))}
              {releasableVersions.length === 0 && <p className="text-sm text-gray-400">当前没有可发布候选版本</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">超时版本处理</h2>
              <span className="text-sm text-gray-500">按等待时间排序</span>
            </div>
            <div className="space-y-3">
              {[...staleBlockedVersions, ...stalePendingConclusionVersions]
                .sort((a, b) => a.updatedAt - b.updatedAt)
                .slice(0, 8)
                .map((record) => (
                  <Link
                    key={record.id}
                    to={`/version-workbench/${encodeURIComponent(record.parentVersion || record.versionNumber)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                    className="block rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-red-200 hover:bg-red-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900 break-all">{record.versionNumber}</p>
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getVersionStatusClass(record.versionStatus || '待测试')}`}>
                            {record.versionStatus || '待测试'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 truncate" title={record.changeDescription}>{record.changeDescription}</p>
                        <p className="mt-2 text-xs text-red-700">
                          已等待 {getDaysWaiting(record.updatedAt)} 天 · 固件 {record.firmwareVersion || '-'}
                        </p>
                      </div>
                      <span className="text-xs text-blue-700">进入工作台</span>
                    </div>
                  </Link>
                ))}
              {staleBlockedVersions.length + stalePendingConclusionVersions.length === 0 && (
                <p className="text-sm text-gray-400">当前没有超时未推进的版本</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">超时问题与提测缺口</h2>
              <span className="text-sm text-gray-500">优先催办对象</span>
            </div>
            <div className="space-y-3">
              {[
                ...staleOpenProblems.map((problem) => ({
                  key: `problem-${problem.id}`,
                  title: problem.description,
                  meta: `${problem.classification || '未分类'} · ${problem.status}`,
                  waitDays: getDaysWaiting(problem.updatedAt),
                  link: `/customer-problems?keyword=${encodeURIComponent(problem.issueId || problem.firmwareVersion || problem.description.slice(0, 20))}`,
                  tone: 'text-rose-700',
                })),
                ...staleRdHandoffs.map((note) => ({
                  key: `release-${note.id}`,
                  title: note.version,
                  meta: `RD 冒烟 ${note.rdSmokeStatus || '未测试'} · ${note.branch}`,
                  waitDays: getDaysWaiting(note.updatedAt),
                  link: `/release-notes?keyword=${encodeURIComponent(note.version)}`,
                  tone: 'text-violet-700',
                })),
              ]
                .sort((a, b) => b.waitDays - a.waitDays)
                .slice(0, 8)
                .map((item) => (
                  <Link
                    key={item.key}
                    to={item.link}
                    className="block rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-rose-200 hover:bg-rose-50/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 break-words">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-600 break-words">{item.meta}</p>
                        <p className={`mt-2 text-xs ${item.tone}`}>已等待 {item.waitDays} 天</p>
                      </div>
                      <span className="text-xs text-blue-700">查看</span>
                    </div>
                  </Link>
                ))}
              {staleOpenProblems.length + staleRdHandoffs.length === 0 && (
                <p className="text-sm text-gray-400">当前没有超时问题或提测缺口</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">紧急介入版本</h2>
              <span className="text-sm text-gray-500">{urgentQaInterventionVersions.length} 条</span>
            </div>
            <div className="space-y-3">
              {urgentQaInterventionVersions.slice(0, 8).map((record) => (
                <Link
                  key={record.id}
                  to={`/version-workbench/${encodeURIComponent(record.parentVersion || record.versionNumber)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                  className="block rounded-lg border border-red-100 bg-red-50 p-4 hover:bg-red-100/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 break-all">{record.versionNumber}</p>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getVersionStatusClass(record.versionStatus || '待测试')}`}>
                          {record.versionStatus || '待测试'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 truncate" title={record.changeDescription}>{record.changeDescription}</p>
                      <p className="mt-2 text-xs text-red-700 break-words" title={record.qaEarlyInterventionReason}>
                        {record.qaEarlyInterventionReason}
                      </p>
                    </div>
                    <span className="text-xs text-blue-700">进入工作台</span>
                  </div>
                </Link>
              ))}
              {urgentQaInterventionVersions.length === 0 && <p className="text-sm text-gray-400">当前没有紧急介入版本</p>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">高风险版本</h2>
              <span className="text-sm text-gray-500">{highRiskVersions.length} 条</span>
            </div>
            <div className="space-y-3">
              {highRiskVersions.slice(0, 8).map((record) => (
                <Link
                  key={record.id}
                  to={`/version-workbench/${encodeURIComponent(record.parentVersion || record.versionNumber)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                  className="block rounded-lg border border-orange-100 bg-orange-50 p-4 hover:bg-orange-100/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 break-all">{record.versionNumber}</p>
                      <p className="mt-1 text-sm text-gray-600 truncate" title={record.changeDescription}>{record.changeDescription}</p>
                      <p className="mt-2 text-xs text-orange-700">
                        固件 {record.firmwareVersion || '-'} · 状态 {record.versionStatus || '待测试'}
                      </p>
                    </div>
                    <span className="text-xs text-blue-700">进入工作台</span>
                  </div>
                </Link>
              ))}
              {highRiskVersions.length === 0 && <p className="text-sm text-gray-400">当前没有高风险版本</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900">风险等级分布</h2>
            <PieChart data={riskDistribution} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900">问题分类分布</h2>
            <PieChart data={problemDistribution} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900">问题状态分布</h2>
            <PieChart data={statusDistribution} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900">版本状态分布</h2>
            <PieChart data={versionStatusDistribution} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900">最近 QA 版本记录</h2>
            <div className="space-y-3">
              {versionRecords.slice(0, 5).map((record) => (
                <Link
                  key={record.id}
                  to={`/version-workbench/${encodeURIComponent(record.parentVersion || record.versionNumber)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-blue-50"
                >
                  <div className="mr-3 min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{record.versionNumber}</p>
                    <p className="truncate text-sm text-gray-600" title={record.changeDescription}>{record.changeDescription}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0 ${
                    record.riskLevel === '低' ? 'bg-green-100 text-green-800'
                      : record.riskLevel === '中' ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>{record.riskLevel}</span>
                </Link>
              ))}
              {versionRecords.length === 0 && <p className="text-sm text-gray-400">暂无记录</p>}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900">最近 Release Note</h2>
            <div className="space-y-3">
              {releaseNotes.slice(0, 5).map((rn) => (
                <Link
                  key={rn.id}
                  to={`/release-notes?keyword=${encodeURIComponent(rn.version)}`}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-violet-50"
                >
                  <div className="mr-3 min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                      {rn.version} <span className="text-xs font-normal text-gray-400">{rn.branch}</span>
                    </p>
                    <p className="truncate text-sm text-gray-600" title={rn.changeDescription}>{rn.changeDescription}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0 ${
                    rn.severity === '低' ? 'bg-green-100 text-green-800'
                      : rn.severity === '中' ? 'bg-yellow-100 text-yellow-800'
                      : rn.severity === '高' ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
                  }`}>{rn.changeType}</span>
                </Link>
              ))}
              {releaseNotes.length === 0 && <p className="text-sm text-gray-400">暂无记录</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
