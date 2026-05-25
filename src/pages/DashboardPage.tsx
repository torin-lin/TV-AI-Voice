import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { ReleaseNote, CustomerProblem } from '../types/database';
import { Card } from '../components/common/Card';
import { apiQueryReleaseNotes } from '../services/ReleaseNoteApiClient';
import { apiQueryProblems } from '../services/CustomerProblemApiClient';
import { fetchVersionRecords } from '../features/versionRecords/store/versionRecordsSlice';
import { useI18n } from '../i18n/I18nProvider';
import { getVersionStatusClass } from '../features/versionRecords/versionStatus';
import { useAuth } from '../auth/AuthProvider';

const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// 我的待处理
// ============================================================
const MyPendingItems: React.FC<{
  userName: string;
  versionRecords: any[];
  releaseNotes: ReleaseNote[];
}> = ({ userName, versionRecords, releaseNotes }) => {
  const myVersions = useMemo(
    () => versionRecords.filter((v: any) =>
      (v.conclusionOwner === userName || v.qaEarlyInterventionOwner === userName)
    ).filter((v: any) => v.versionStatus !== '已发布'),
    [versionRecords, userName]
  );
  const myRnGaps = useMemo(
    () => releaseNotes.filter((rn) => rn.author === userName)
      .filter((rn) => !rn.rdSmokeStatus || rn.rdSmokeStatus === '未测试' || rn.rdSmokeStatus === '失败'),
    [releaseNotes, userName]
  );
  const total = myVersions.length + myRnGaps.length;
  if (total === 0) return null;

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {userName.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">我的待处理</h2>
          <p className="text-xs text-gray-500">{userName} · {total} 项待关注</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {myVersions.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800">📋 我的版本</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{myVersions.length}</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {myVersions.slice(0, 5).map((v: any) => (
                <Link key={v.id} to={`/version-workbench/${encodeURIComponent(v.parentVersion || v.versionNumber)}${v.projectType ? `?projectType=${encodeURIComponent(v.projectType)}` : ''}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-blue-50 transition">
                  <span className="text-sm text-gray-900 truncate">{v.versionNumber}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getVersionStatusClass(v.versionStatus || '待测试')}`}>{v.versionStatus || '待测试'}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {myRnGaps.length > 0 && (
          <div className="rounded-xl border border-green-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-800">📝 我的 RN 缺口</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{myRnGaps.length}</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {myRnGaps.slice(0, 5).map((rn) => (
                <Link key={rn.id} to={`/release-notes?keyword=${encodeURIComponent(rn.version)}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-green-50 transition">
                  <span className="text-sm text-gray-900 truncate">{rn.version}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${rn.rdSmokeStatus === '失败' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{rn.rdSmokeStatus || '未测试'}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">📊 概览</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">待测/测试中</span><span className="font-bold text-blue-600">{myVersions.filter((v: any) => v.versionStatus === '待测试' || v.versionStatus === '测试中').length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">阻塞</span><span className="font-bold text-red-600">{myVersions.filter((v: any) => v.versionStatus === '阻塞').length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">待结论</span><span className="font-bold text-amber-600">{myVersions.filter((v: any) => v.versionStatus === '待结论').length}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">RN 缺口</span><span className="font-bold text-green-600">{myRnGaps.length}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ============================================================
// 主仪表板
// ============================================================
const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatDate } = useI18n();
  const { user, isLoggedIn } = useAuth();
  const versionRecords = useSelector((state: RootState) => state.versionRecords.items);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);

  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [customerProblems, setCustomerProblems] = useState<CustomerProblem[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [totalReleaseNotes, setTotalReleaseNotes] = useState(0);
  const now = Date.now();

  useEffect(() => {
    const pg = currentProject !== '全部' ? currentProject : undefined;
    dispatch(fetchVersionRecords({ filters: pg ? { projectGroup: pg } : {}, pagination: { page: 1, pageSize: 200 }, workspaceId: currentWorkspace }));
    apiQueryReleaseNotes(pg ? { projectGroup: pg } : {}, { page: 1, pageSize: 200 })
      .then((res) => { setReleaseNotes(res.data); setTotalReleaseNotes(res.total); })
      .catch(() => {});
    apiQueryProblems({ page: 1, pageSize: 200, ...(pg ? { projectGroup: pg } : {}) })
      .then((res) => { setCustomerProblems(res.data); setTotalProblems(res.total); })
      .catch(() => {});
  }, [currentProject, currentWorkspace, dispatch]);

  // 关键筛选
  const blockedVersions = useMemo(() => versionRecords.filter((v) => v.versionStatus === '阻塞').sort((a, b) => b.updatedAt - a.updatedAt), [versionRecords]);
  const pendingConclusionVersions = useMemo(() => versionRecords.filter((v) => v.versionStatus === '待结论').sort((a, b) => b.updatedAt - a.updatedAt), [versionRecords]);
  const testingVersions = useMemo(() => versionRecords.filter((v) => v.versionStatus === '测试中').sort((a, b) => b.updatedAt - a.updatedAt), [versionRecords]);
  const unresolvedProblems = useMemo(() => customerProblems.filter((p) => p.status === '开放' || p.status === '进行中').sort((a, b) => b.updatedAt - a.updatedAt), [customerProblems]);
  const rdSmokeMissing = useMemo(() => releaseNotes.filter((rn) => !rn.rdSmokeStatus || rn.rdSmokeStatus === '未测试'), [releaseNotes]);
  const rdSmokeFailed = useMemo(() => releaseNotes.filter((rn) => rn.rdSmokeStatus === '失败'), [releaseNotes]);

  // 统计
  const passedTests = versionRecords.filter((v) => v.voiceRegressionResult === '通过' && v.systemRegressionResult === '通过').length;
  const passRate = versionRecords.length > 0 ? Math.round((passedTests / versionRecords.length) * 100) : 0;
  const openProblems = customerProblems.filter((p) => p.status === '开放').length;
  const inProgressProblems = customerProblems.filter((p) => p.status === '进行中').length;

  // 版本推进列表（阻塞 > 待结论 > 测试中）
  const versionActionItems = useMemo(() => {
    return [...blockedVersions, ...pendingConclusionVersions, ...testingVersions]
      .sort((a, b) => {
        const w = (s?: string) => s === '阻塞' ? 3 : s === '待结论' ? 2 : s === '测试中' ? 1 : 0;
        return w(b.versionStatus) - w(a.versionStatus) || b.updatedAt - a.updatedAt;
      }).slice(0, 6);
  }, [blockedVersions, pendingConclusionVersions, testingVersions]);

  // 超时预警（合并所有超时项）
  const overdueItems = useMemo(() => {
    const items: { key: string; title: string; type: string; days: number; link: string; tone: string }[] = [];
    for (const v of blockedVersions) {
      const days = Math.floor((now - v.updatedAt) / DAY_MS);
      if (days >= 2) items.push({ key: `v-${v.id}`, title: v.versionNumber, type: '阻塞', days, link: `/version-workbench/${encodeURIComponent(v.parentVersion || v.versionNumber)}`, tone: 'text-red-700' });
    }
    for (const v of pendingConclusionVersions) {
      const days = Math.floor((now - v.updatedAt) / DAY_MS);
      if (days >= 1) items.push({ key: `vc-${v.id}`, title: v.versionNumber, type: '待结论', days, link: `/version-workbench/${encodeURIComponent(v.parentVersion || v.versionNumber)}`, tone: 'text-amber-700' });
    }
    for (const p of unresolvedProblems) {
      const days = Math.floor((now - p.updatedAt) / DAY_MS);
      if (days >= 2) items.push({ key: `p-${p.id}`, title: p.description.slice(0, 40), type: '问题', days, link: `/customer-problems?keyword=${encodeURIComponent(p.issueId || p.description.slice(0, 15))}`, tone: 'text-rose-700' });
    }
    return items.sort((a, b) => b.days - a.days).slice(0, 8);
  }, [blockedVersions, pendingConclusionVersions, unresolvedProblems, now]);

  // 按负责人统计
  const ownerStats = useMemo(() => {
    const stats: Record<string, { versions: number; blocked: number; pendingConclusion: number; rnGaps: number }> = {};
    const ensure = (n: string) => { if (n && !stats[n]) stats[n] = { versions: 0, blocked: 0, pendingConclusion: 0, rnGaps: 0 }; };
    for (const v of versionRecords) {
      const owner = v.conclusionOwner || v.qaEarlyInterventionOwner;
      if (!owner) continue;
      ensure(owner);
      if (v.versionStatus !== '已发布') stats[owner].versions++;
      if (v.versionStatus === '阻塞') stats[owner].blocked++;
      if (v.versionStatus === '待结论') stats[owner].pendingConclusion++;
    }
    for (const rn of releaseNotes) {
      if (!rn.author) continue;
      if (!rn.rdSmokeStatus || rn.rdSmokeStatus === '未测试' || rn.rdSmokeStatus === '失败') {
        ensure(rn.author);
        stats[rn.author].rnGaps++;
      }
    }
    return Object.entries(stats)
      .map(([name, d]) => ({ name, ...d, total: d.versions + d.rnGaps }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [versionRecords, releaseNotes]);

  const getDaysWaiting = (ts: number) => Math.max(1, Math.floor((now - ts) / DAY_MS));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full space-y-6">

        {/* ===== 标题 ===== */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })} · 管理视角
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/version-records"><span className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">QA 版本</span></Link>
            <Link to="/release-notes"><span className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">RD 提测</span></Link>
            <Link to="/customer-problems"><span className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">问题闭环</span></Link>
          </div>
        </div>

        {/* ===== 我的待处理 ===== */}
        {isLoggedIn && user && (
          <MyPendingItems userName={user.displayName} versionRecords={versionRecords} releaseNotes={releaseNotes} />
        )}

        {/* ===== 关键指标 ===== */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Card className="border border-red-100 bg-red-50/50 p-4">
            <p className="text-xs text-gray-500">阻塞版本</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{blockedVersions.length}</p>
          </Card>
          <Card className="border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-xs text-gray-500">待结论</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">{pendingConclusionVersions.length}</p>
          </Card>
          <Card className="border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs text-gray-500">RD 冒烟缺口</p>
            <p className="mt-1 text-3xl font-bold text-violet-600">{rdSmokeMissing.length + rdSmokeFailed.length}</p>
          </Card>
          <Card className="border border-rose-100 bg-rose-50/50 p-4">
            <p className="text-xs text-gray-500">未闭环问题</p>
            <p className="mt-1 text-3xl font-bold text-rose-600">{openProblems + inProgressProblems}</p>
          </Card>
          <Card className="border border-cyan-100 bg-cyan-50/50 p-4">
            <p className="text-xs text-gray-500">回归通过率</p>
            <p className="mt-1 text-3xl font-bold text-cyan-600">{passRate}%</p>
          </Card>
        </div>

        {/* ===== 按负责人统计 ===== */}
        {ownerStats.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">按负责人统计</h2>
              <span className="text-xs text-gray-400">{ownerStats.length} 人</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">负责人</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">版本</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">阻塞</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">待结论</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">RN缺口</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">合计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ownerStats.map((s) => (
                    <tr key={s.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">{s.name.charAt(0)}</div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-2 font-semibold text-blue-600">{s.versions}</td>
                      <td className="text-center px-3 py-2">{s.blocked > 0 ? <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{s.blocked}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="text-center px-3 py-2">{s.pendingConclusion > 0 ? <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{s.pendingConclusion}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="text-center px-3 py-2">{s.rnGaps > 0 ? <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">{s.rnGaps}</span> : <span className="text-gray-400">-</span>}</td>
                      <td className="text-center px-3 py-2 font-bold text-gray-900">{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ===== 版本推进 + 问题闭环 ===== */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">版本推进重点</h2>
              <Link to="/version-records"><span className="text-xs text-blue-600 hover:underline">全部</span></Link>
            </div>
            <div className="space-y-2">
              {versionActionItems.map((r) => (
                <Link key={r.id} to={`/version-workbench/${encodeURIComponent(r.parentVersion || r.versionNumber)}${r.projectType ? `?projectType=${encodeURIComponent(r.projectType)}` : ''}`}
                  className="block rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:border-blue-200 hover:bg-blue-50/40 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm truncate">{r.versionNumber}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${getVersionStatusClass(r.versionStatus || '待测试')}`}>{r.versionStatus || '待测试'}</span>
                        {r.riskLevel === '高' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">高风险</span>}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 truncate">{r.changeDescription}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{getDaysWaiting(r.updatedAt)}天</span>
                  </div>
                </Link>
              ))}
              {versionActionItems.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">暂无需要推进的版本</p>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">问题闭环重点</h2>
              <Link to="/customer-problems"><span className="text-xs text-blue-600 hover:underline">全部</span></Link>
            </div>
            <div className="space-y-2">
              {unresolvedProblems.slice(0, 6).map((p) => (
                <Link key={p.id} to={`/customer-problems?keyword=${encodeURIComponent(p.issueId || p.description.slice(0, 15))}`}
                  className="block rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:border-rose-200 hover:bg-rose-50/40 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm truncate">{p.description}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${p.status === '开放' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{p.classification || '未分类'} · {p.issueId ? `#${p.issueId}` : p.firmwareVersion || '-'}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{getDaysWaiting(p.updatedAt)}天</span>
                  </div>
                </Link>
              ))}
              {unresolvedProblems.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">暂无未闭环问题</p>}
            </div>
          </Card>
        </div>

        {/* ===== 超时预警 ===== */}
        {overdueItems.length > 0 && (
          <Card className="border border-orange-200 bg-orange-50/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <h2 className="text-base font-bold text-gray-900">超时预警</h2>
              <span className="text-xs text-gray-500 ml-auto">{overdueItems.length} 项超时未处理</span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {overdueItems.map((item) => (
                <Link key={item.key} to={item.link}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-orange-200 transition">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900 truncate block">{item.title}</span>
                    <span className="text-xs text-gray-500">{item.type}</span>
                  </div>
                  <span className={`text-xs font-bold ${item.tone} flex-shrink-0 ml-2`}>{item.days}天</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* ===== 底部数据总览 ===== */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500">QA 版本总数</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{versionRecords.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500">Release Note</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalReleaseNotes}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500">问题总数</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalProblems}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500">测试中版本</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{testingVersions.length}</p>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
