import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Tag } from '../components/common/Tag';
import { useI18n } from '../i18n/I18nProvider';
import { VersionRecord, ReleaseNote, CustomerProblem, VersionIssue, KBRecommendation, VersionStatus } from '../types/database';
import { apiQueryVersionRecords } from '../services/VersionRecordApiClient';
import { apiUpdateVersionRecord } from '../services/VersionRecordApiClient';
import { apiQueryReleaseNotes } from '../services/ReleaseNoteApiClient';
import { apiQueryProblems } from '../services/CustomerProblemApiClient';
import { fetchVersionIssues } from '../services/VersionIssueApiClient';
import { apiGetRecommendation } from '../services/KnowledgeBaseApiClient';
import { getAllowedVersionStatuses, getVersionStatusClass } from '../features/versionRecords/versionStatus';
import { useToast } from '../components/common/ToastProvider';

type ReleaseDecision = NonNullable<VersionRecord['releaseDecision']>;
type TimelineEvent = {
  id: string;
  timestamp: number;
  title: string;
  detail: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

const RELEASE_DECISIONS: ReleaseDecision[] = ['待评估', '有条件通过', '不通过', '可发布'];

const PROJECT_LABEL_MAP: Record<string, string> = {
  TV: 'TV AI Voice',
  Projector: 'Projector AI Voice',
  STB: 'STB AI Voice',
};

const getRiskClass = (risk?: string) => {
  const mapping: Record<string, string> = {
    '低': 'bg-green-100 text-green-800',
    '中': 'bg-yellow-100 text-yellow-800',
    '高': 'bg-red-100 text-red-800',
  };
  return mapping[risk || ''] || 'bg-gray-100 text-gray-600';
};

const getStatusClass = (status?: string) => {
  const mapping: Record<string, string> = {
    '通过': 'bg-green-100 text-green-800',
    '失败': 'bg-red-100 text-red-800',
    '未测试': 'bg-gray-100 text-gray-700',
    '开放': 'bg-red-100 text-red-800',
    '进行中': 'bg-yellow-100 text-yellow-800',
    '已解决': 'bg-green-100 text-green-800',
    '待处理': 'bg-gray-100 text-gray-700',
    '处理中': 'bg-blue-100 text-blue-800',
    '已关闭': 'bg-gray-200 text-gray-700',
  };
  return mapping[status || ''] || 'bg-gray-100 text-gray-600';
};

const getSeverityClass = (severity?: string) => {
  const mapping: Record<string, string> = {
    '低': 'bg-green-100 text-green-800',
    '中': 'bg-yellow-100 text-yellow-800',
    '高': 'bg-orange-100 text-orange-800',
    '紧急': 'bg-red-100 text-red-800',
  };
  return mapping[severity || ''] || 'bg-gray-100 text-gray-600';
};

const getSuggestedVersionStatus = (
  openIssueCount: number,
  unresolvedProblems: number,
  latestRecord?: VersionRecord
): VersionStatus => {
  if (!latestRecord) {
    return '待测试';
  }

  const hasAnyTestStarted =
    latestRecord.voiceRegressionResult !== '未测试' ||
    latestRecord.systemRegressionResult !== '未测试';

  if (openIssueCount > 0 || unresolvedProblems > 0) {
    return hasAnyTestStarted ? '阻塞' : '测试中';
  }

  if (!hasAnyTestStarted) {
    return '待测试';
  }

  if (latestRecord.releaseDecision === '可发布') {
    return latestRecord.versionStatus === '已发布' ? '已发布' : '可发布';
  }

  return '待结论';
};

const VersionWorkbenchPage: React.FC = () => {
  const { versionKey = '' } = useParams();
  const [searchParams] = useSearchParams();
  const projectType = searchParams.get('projectType') || '';
  const projectGroup = projectType ? PROJECT_LABEL_MAP[projectType] : undefined;
  const { formatDateTime } = useI18n();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [versionRecords, setVersionRecords] = useState<VersionRecord[]>([]);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [problems, setProblems] = useState<CustomerProblem[]>([]);
  const [versionIssues, setVersionIssues] = useState<VersionIssue[]>([]);
  const [recommendation, setRecommendation] = useState<KBRecommendation | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [savingConclusion, setSavingConclusion] = useState(false);
  const [conclusionDraft, setConclusionDraft] = useState<{
    versionStatus: VersionStatus;
    releaseDecision: ReleaseDecision;
    conclusionSummary: string;
    remainingRisks: string;
    nextActions: string;
    conclusionOwner: string;
  }>({
    versionStatus: '待测试',
    releaseDecision: '待评估',
    conclusionSummary: '',
    remainingRisks: '',
    nextActions: '',
    conclusionOwner: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPageError(null);

      try {
        const [recordResult, releaseResult, problemResult] = await Promise.all([
          apiQueryVersionRecords(
            projectGroup ? { projectGroup } : {},
            { page: 1, pageSize: 500 }
          ),
          apiQueryReleaseNotes(
            projectGroup ? { projectGroup } : {},
            { page: 1, pageSize: 500 }
          ),
          apiQueryProblems(
            projectGroup ? { projectGroup, page: 1, pageSize: 500 } : { page: 1, pageSize: 500 }
          ),
        ]);

        const relatedRecords = recordResult.data.filter(
          (record) => (record.parentVersion || record.versionNumber) === versionKey
        );
        setVersionRecords(relatedRecords);

        const versionSet = new Set<string>([versionKey, ...relatedRecords.map((record) => record.versionNumber)]);
        const linkedIssueSet = new Set<string>(
          relatedRecords.flatMap((record) => record.linkedIssues || []).filter(Boolean)
        );

        const relatedReleaseNotes = releaseResult.data.filter((note) => {
          return (
            versionSet.has(note.version) ||
            Boolean(note.parentVersion && versionSet.has(note.parentVersion)) ||
            Boolean(note.fixedPRs?.some((pr) => linkedIssueSet.has(pr)))
          );
        });
        setReleaseNotes(relatedReleaseNotes);

        const relatedProblems = problemResult.data.filter((problem) => {
          if (problem.issueId && linkedIssueSet.has(problem.issueId)) {
            return true;
          }

          if (problem.firmwareVersion) {
            return relatedRecords.some((record) => record.firmwareVersion === problem.firmwareVersion);
          }

          return false;
        });
        setProblems(relatedProblems);

        const issueResults = await Promise.all(
          relatedRecords
            .filter((record): record is VersionRecord & { id: string } => Boolean(record.id))
            .map((record) => fetchVersionIssues(record.id!))
        );
        setVersionIssues(issueResults.flat().sort((a, b) => b.createdAt - a.createdAt));

        const latest = [...relatedRecords].sort((a, b) => b.createdAt - a.createdAt)[0];
        if (latest) {
          setConclusionDraft({
            versionStatus: latest.versionStatus || '待测试',
            releaseDecision: latest.releaseDecision || '待评估',
            conclusionSummary: latest.conclusionSummary || '',
            remainingRisks: latest.remainingRisks || '',
            nextActions: latest.nextActions || '',
            conclusionOwner: latest.conclusionOwner || '',
          });
        }
      } catch (err) {
        setPageError((err as Error).message || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [projectGroup, versionKey]);

  const latestRecord = useMemo(() => {
    return [...versionRecords].sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [versionRecords]);

  const summary = useMemo(() => {
    const openIssueCount = versionIssues.filter((issue) => issue.status !== '已关闭' && issue.status !== '已解决').length;
    const unresolvedProblems = problems.filter((problem) => problem.status !== '已解决').length;

    return {
      recordCount: versionRecords.length,
      releaseCount: releaseNotes.length,
      issueCount: versionIssues.length,
      problemCount: problems.length,
      openIssueCount,
      unresolvedProblems,
    };
  }, [problems, releaseNotes.length, versionIssues, versionRecords.length]);

  const allowedVersionStatuses = useMemo(() => {
    return getAllowedVersionStatuses((latestRecord?.versionStatus || '待测试') as VersionStatus);
  }, [latestRecord?.versionStatus]);

  const rdSummary = useMemo(() => {
    const passedCount = releaseNotes.filter((note) => note.rdSmokeStatus === '通过').length;
    const failedCount = releaseNotes.filter((note) => note.rdSmokeStatus === '失败').length;
    const pendingCount = releaseNotes.filter((note) => !note.rdSmokeStatus || note.rdSmokeStatus === '未测试').length;
    const urgentOverrideCount = releaseNotes.filter((note) => note.severity === '紧急' && note.rdSmokeStatus !== '通过').length;
    const latestUpdatedAt = [...releaseNotes].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.updatedAt;

    return {
      total: releaseNotes.length,
      passedCount,
      failedCount,
      pendingCount,
      urgentOverrideCount,
      latestUpdatedAt,
    };
  }, [releaseNotes]);

  const suggestedVersionStatus = useMemo(() => {
    return getSuggestedVersionStatus(summary.openIssueCount, summary.unresolvedProblems, latestRecord);
  }, [latestRecord, summary.openIssueCount, summary.unresolvedProblems]);

  const guidanceMessages = useMemo(() => {
    const messages: string[] = [];

    if (summary.openIssueCount > 0) {
      messages.push(`还有 ${summary.openIssueCount} 个版本问题未闭环，建议优先处理后再推进准出。`);
    }
    if (summary.unresolvedProblems > 0) {
      messages.push(`还有 ${summary.unresolvedProblems} 个追踪问题未解决，建议保持阻塞或测试中状态。`);
    }
    if (rdSummary.urgentOverrideCount > 0) {
      messages.push(`存在 ${rdSummary.urgentOverrideCount} 个紧急版本由 QA 提前介入，建议同步记录介入原因和当前风险。`);
    }
    if ((conclusionDraft.versionStatus === '可发布' || conclusionDraft.versionStatus === '已发布') && !conclusionDraft.conclusionSummary.trim()) {
      messages.push('进入可发布或已发布前，建议补充结论摘要。');
    }
    if ((conclusionDraft.versionStatus === '可发布' || conclusionDraft.versionStatus === '已发布') && !conclusionDraft.conclusionOwner.trim()) {
      messages.push('进入可发布或已发布前，建议填写结论负责人。');
    }
    if (conclusionDraft.versionStatus === '已发布' && conclusionDraft.releaseDecision !== '可发布') {
      messages.push('已发布状态建议搭配“可发布”结论，避免流程含义冲突。');
    }

    return messages;
  }, [conclusionDraft.conclusionOwner, conclusionDraft.conclusionSummary, conclusionDraft.releaseDecision, conclusionDraft.versionStatus, rdSummary.urgentOverrideCount, summary.openIssueCount, summary.unresolvedProblems]);

  const releaseChecklist = useMemo(() => {
    const hasReleaseNotes = releaseNotes.length > 0;
    const rdQaGateSatisfied =
      hasReleaseNotes &&
      (rdSummary.failedCount === 0 || rdSummary.urgentOverrideCount > 0) &&
      (rdSummary.pendingCount === 0 || rdSummary.urgentOverrideCount > 0);
    const hasQaRecords = versionRecords.length > 0;
    const regressionStarted = versionRecords.some(
      (record) => record.voiceRegressionResult !== '未测试' || record.systemRegressionResult !== '未测试'
    );
    const noOpenVersionIssues = summary.openIssueCount === 0;
    const noOpenTrackedProblems = summary.unresolvedProblems === 0;
    const hasConclusionSummary = Boolean(conclusionDraft.conclusionSummary.trim());
    const hasConclusionOwner = Boolean(conclusionDraft.conclusionOwner.trim());

    return [
      {
        key: 'release-notes',
        label: '已有关联 Release Note',
        passed: hasReleaseNotes,
        detail: hasReleaseNotes ? `已关联 ${releaseNotes.length} 条 Release Note` : '当前版本还没有关联 Release Note',
      },
      {
        key: 'rd-smoke',
        label: 'RD 准入条件已满足',
        passed: rdQaGateSatisfied,
        detail: rdQaGateSatisfied
          ? (rdSummary.urgentOverrideCount > 0
            ? `存在 ${rdSummary.urgentOverrideCount} 个紧急版本走 QA 提前介入，其余 RD 冒烟已补齐`
            : '所有关联 Release Note 的 RD 冒烟都已通过')
          : `通过 ${rdSummary.passedCount} / 失败 ${rdSummary.failedCount} / 未补齐 ${rdSummary.pendingCount}`,
      },
      {
        key: 'qa-records',
        label: '已创建 QA 测试记录',
        passed: hasQaRecords,
        detail: hasQaRecords ? `当前已有 ${versionRecords.length} 条 QA 记录` : '还没有 QA 测试记录',
      },
      {
        key: 'regression-started',
        label: '已开始 QA 回归',
        passed: regressionStarted,
        detail: regressionStarted ? '语音功能回归或系统集成回归已经开始' : '当前回归结果仍未开始',
      },
      {
        key: 'version-issues',
        label: '版本问题已闭环',
        passed: noOpenVersionIssues,
        detail: noOpenVersionIssues ? '当前没有未闭环版本问题' : `还有 ${summary.openIssueCount} 个版本问题未闭环`,
      },
      {
        key: 'tracked-problems',
        label: '追踪问题已处理',
        passed: noOpenTrackedProblems,
        detail: noOpenTrackedProblems ? '当前没有未解决追踪问题' : `还有 ${summary.unresolvedProblems} 个追踪问题未解决`,
      },
      {
        key: 'conclusion-summary',
        label: '结论摘要已填写',
        passed: hasConclusionSummary,
        detail: hasConclusionSummary ? '已填写版本结论摘要' : '当前还未填写结论摘要',
      },
      {
        key: 'conclusion-owner',
        label: '结论负责人已填写',
        passed: hasConclusionOwner,
        detail: hasConclusionOwner ? `当前负责人：${conclusionDraft.conclusionOwner}` : '当前还未填写结论负责人',
      },
    ];
  }, [
    conclusionDraft.conclusionOwner,
    conclusionDraft.conclusionSummary,
    rdSummary.failedCount,
    rdSummary.passedCount,
    rdSummary.pendingCount,
    rdSummary.urgentOverrideCount,
    releaseNotes.length,
    summary.openIssueCount,
    summary.unresolvedProblems,
    versionRecords,
  ]);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    releaseNotes.forEach((note) => {
      const noteKey = note.id || `${note.version}-${note.createdAt}`;
      events.push({
        id: `release-created-${noteKey}`,
        timestamp: note.createdAt,
        title: 'RD 录入 Release Note',
        detail: `${note.version} · ${note.branch}`,
        tone: 'info',
      });

      if (note.rdSmokeStatus && note.rdSmokeStatus !== '未测试') {
        events.push({
          id: `release-smoke-${noteKey}`,
          timestamp: note.updatedAt || note.createdAt,
          title: `RD 冒烟 ${note.rdSmokeStatus}`,
          detail: `${note.version}${note.testingNotes ? ` · ${note.testingNotes}` : ''}`,
          tone: note.rdSmokeStatus === '通过' ? 'success' : 'danger',
        });
      }
    });

    versionRecords.forEach((record) => {
      const recordKey = record.id || `${record.versionNumber}-${record.createdAt}`;
      events.push({
        id: `qa-created-${recordKey}`,
        timestamp: record.createdAt,
        title: '创建 QA 测试记录',
        detail: `${record.versionNumber} · 固件 ${record.firmwareVersion || '-'}`,
        tone: 'info',
      });

      if (record.voiceRegressionResult !== '未测试' || record.systemRegressionResult !== '未测试') {
        events.push({
          id: `qa-regression-${recordKey}`,
          timestamp: record.updatedAt || record.createdAt,
          title: 'QA 回归结果更新',
          detail: `语音功能 ${record.voiceRegressionResult} · 系统集成 ${record.systemRegressionResult}`,
          tone:
            record.voiceRegressionResult === '失败' || record.systemRegressionResult === '失败'
              ? 'danger'
              : 'success',
        });
      }

      if (record.versionStatus) {
        events.push({
          id: `qa-status-${recordKey}`,
          timestamp: record.conclusionUpdatedAt || record.updatedAt || record.createdAt,
          title: `版本状态更新为 ${record.versionStatus}`,
          detail: `${record.versionNumber} · 固件 ${record.firmwareVersion || '-'}`,
          tone: record.versionStatus === '阻塞' ? 'warning' : record.versionStatus === '已发布' ? 'success' : 'neutral',
        });
      }

      if (record.releaseDecision && record.releaseDecision !== '待评估') {
        events.push({
          id: `qa-decision-${recordKey}`,
          timestamp: record.conclusionUpdatedAt || record.updatedAt || record.createdAt,
          title: `发布结论：${record.releaseDecision}`,
          detail: record.conclusionSummary || `${record.versionNumber} 已更新结论卡`,
          tone: record.releaseDecision === '可发布' ? 'success' : record.releaseDecision === '不通过' ? 'danger' : 'warning',
        });
      }
    });

    versionIssues.forEach((issue) => {
      events.push({
        id: `version-issue-${issue.id}`,
        timestamp: issue.createdAt,
        title: '新增版本问题',
        detail: issue.title,
        tone: issue.severity === '高' || issue.severity === '紧急' ? 'danger' : 'warning',
      });

      if (issue.updatedAt > issue.createdAt && (issue.status === '已解决' || issue.status === '已关闭')) {
        events.push({
          id: `version-issue-status-${issue.id}`,
          timestamp: issue.updatedAt,
          title: `版本问题${issue.status}`,
          detail: issue.title,
          tone: 'success',
        });
      }
    });

    problems.forEach((problem) => {
      events.push({
        id: `tracked-problem-${problem.id}`,
        timestamp: problem.createdAt,
        title: '新增追踪问题',
        detail: problem.description,
        tone: problem.status === '已解决' ? 'success' : 'warning',
      });

      if (problem.updatedAt > problem.createdAt && problem.status === '已解决') {
        events.push({
          id: `tracked-problem-resolved-${problem.id}`,
          timestamp: problem.updatedAt,
          title: '追踪问题已解决',
          detail: problem.description,
          tone: 'success',
        });
      }
    });

    if (recommendation) {
      events.push({
        id: `recommendation-${recommendation.id || recommendation.createdAt}`,
        timestamp: recommendation.createdAt,
        title: '生成工作台测试推荐',
        detail: `${recommendation.recommendedCases.length} 条推荐用例 · ${recommendation.retestIssues.length} 条建议复测问题`,
        tone: 'info',
      });
    }

    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 16);
  }, [problems, recommendation, releaseNotes, versionIssues, versionRecords]);

  const handleGenerateRecommendation = async () => {
    if (!latestRecord) {
      return;
    }

    setRecommendLoading(true);
    try {
      const nextRecommendation = await apiGetRecommendation({
        versionRecordId: latestRecord.id,
        versionNumber: latestRecord.versionNumber,
        changeDescription: latestRecord.changeDescription,
        modules: latestRecord.modifiedModules,
        riskLevel: latestRecord.riskLevel,
        projectType: latestRecord.projectType,
      });
      setRecommendation(nextRecommendation);
    } catch (err) {
      showToast((err as Error).message || '生成推荐失败', 'error');
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleSaveConclusion = async () => {
    if (!latestRecord?.id) {
      return;
    }

    if ((conclusionDraft.versionStatus === '可发布' || conclusionDraft.versionStatus === '已发布') && !conclusionDraft.conclusionSummary.trim()) {
      showToast('可发布或已发布状态下必须填写结论摘要', 'error');
      return;
    }

    if ((conclusionDraft.versionStatus === '可发布' || conclusionDraft.versionStatus === '已发布') && !conclusionDraft.conclusionOwner.trim()) {
      showToast('可发布或已发布状态下必须填写结论负责人', 'error');
      return;
    }

    if (conclusionDraft.versionStatus === '已发布' && conclusionDraft.releaseDecision !== '可发布') {
      showToast('已发布状态必须搭配“可发布”结论', 'error');
      return;
    }

    setSavingConclusion(true);
    setPageError(null);
    try {
      await apiUpdateVersionRecord(latestRecord.id, {
        ...conclusionDraft,
        conclusionUpdatedAt: Date.now(),
      });
      setVersionRecords((prev) =>
        prev.map((record) =>
          record.id === latestRecord.id
            ? {
                ...record,
                ...conclusionDraft,
                conclusionUpdatedAt: Date.now(),
              }
            : record
        )
      );
      showToast('保存成功', 'success');
    } catch (err) {
      showToast((err as Error).message || '保存结论失败', 'error');
    } finally {
      setSavingConclusion(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-6 min-h-screen bg-gray-50">
        <Card>
          <p className="text-red-700">{pageError}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">版本工作台</h1>
              <Tag variant="primary" className={getRiskClass(latestRecord?.riskLevel)}>
                {latestRecord?.riskLevel || '-'}
              </Tag>
              <Tag variant="primary" className={getVersionStatusClass(latestRecord?.versionStatus || conclusionDraft.versionStatus)}>
                {latestRecord?.versionStatus || conclusionDraft.versionStatus}
              </Tag>
            </div>
            <p className="text-gray-600 mt-2">围绕版本聚合变更、测试、问题和推荐信息</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-500">
              <span>主版本: <span className="font-semibold text-gray-900">{versionKey}</span></span>
              {latestRecord?.projectType && (
                <span>项目: <span className="font-semibold text-gray-900">{latestRecord.projectType}</span></span>
              )}
              {latestRecord?.createdAt && (
                <span>最近更新: <span className="font-semibold text-gray-900">{formatDateTime(latestRecord.createdAt)}</span></span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link to={`/release-notes?keyword=${encodeURIComponent(versionKey)}`}>
              <Button variant="secondary">查看 RD</Button>
            </Link>
            <Link to={`/customer-problems?keyword=${encodeURIComponent((latestRecord?.linkedIssues && latestRecord.linkedIssues[0]) || latestRecord?.firmwareVersion || versionKey)}`}>
              <Button variant="secondary">查看问题</Button>
            </Link>
            <Link to="/version-records">
              <Button variant="secondary">返回版本记录</Button>
            </Link>
            <Button onClick={handleGenerateRecommendation} disabled={recommendLoading || !latestRecord}>
              {recommendLoading ? '生成中...' : '生成测试推荐'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: '版本记录', value: summary.recordCount, color: 'text-blue-600' },
            { label: 'Release Note', value: summary.releaseCount, color: 'text-violet-600' },
            { label: '版本问题', value: summary.issueCount, color: 'text-orange-600' },
            { label: '未闭环版本问题', value: summary.openIssueCount, color: 'text-red-600' },
            { label: '关联问题追踪', value: summary.problemCount, color: 'text-cyan-600' },
            { label: '未解决问题追踪', value: summary.unresolvedProblems, color: 'text-rose-600' },
          ].map((item) => (
            <Card key={item.label} className="p-4">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`text-3xl font-bold mt-2 ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">版本测试范围</h2>
              <span className="text-sm text-gray-500">{versionRecords.length} 条记录</span>
            </div>
            <div className="space-y-4">
              {versionRecords.map((record) => (
                <div key={record.id || record.versionNumber} className="rounded-lg border border-gray-200 p-4 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-gray-900 break-all">{record.versionNumber}</p>
                      <p className="text-sm text-gray-500 mt-1 break-words">
                        固件 {record.firmwareVersion || '-'} · 测试周期 {record.testCycle || '-'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Tag variant="primary" className={getStatusClass(record.voiceRegressionResult)}>
                        语音功能 {record.voiceRegressionResult}
                      </Tag>
                      <Tag variant="primary" className={getStatusClass(record.systemRegressionResult)}>
                        系统集成 {record.systemRegressionResult}
                      </Tag>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap break-words">{record.changeDescription}</p>
                  {record.qaEarlyInterventionReason && (
                    <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-700">提前介入原因</p>
                      <p className="mt-2 text-sm text-red-800 whitespace-pre-wrap break-words">{record.qaEarlyInterventionReason}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {record.modifiedModules.map((module) => (
                      <span key={module} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {versionRecords.length === 0 && <p className="text-gray-400">暂无关联版本记录</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">发布结论草稿</h2>
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">版本风险</p>
                <p className="text-gray-900 font-semibold mt-1">{latestRecord?.riskLevel || '-'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">当前版本状态</p>
                <p className="text-gray-900 font-semibold mt-1">{latestRecord?.versionStatus || '待测试'}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                <p className="text-gray-500">推荐状态</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Tag variant="primary" className={getVersionStatusClass(suggestedVersionStatus)}>
                    {suggestedVersionStatus}
                  </Tag>
                  {suggestedVersionStatus !== conclusionDraft.versionStatus && (
                    <button
                      type="button"
                      onClick={() => setConclusionDraft((prev) => ({ ...prev, versionStatus: suggestedVersionStatus }))}
                      className="text-xs text-blue-700 hover:text-blue-900 underline"
                    >
                      应用建议
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">当前阻塞判断</p>
                <p className="text-gray-900 font-semibold mt-1">
                  {summary.openIssueCount > 0 || summary.unresolvedProblems > 0 ? '存在未闭环问题' : '暂无明显阻塞'}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">版本状态</label>
                <select
                  value={conclusionDraft.versionStatus}
                  onChange={(e) => setConclusionDraft((prev) => ({ ...prev, versionStatus: e.target.value as VersionStatus }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {allowedVersionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">状态流转遵循待测试 → 测试中 → 待结论 / 阻塞 → 可发布 → 已发布</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">发布结论</label>
                <select
                  value={conclusionDraft.releaseDecision}
                  onChange={(e) => setConclusionDraft((prev) => ({ ...prev, releaseDecision: e.target.value as ReleaseDecision }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {RELEASE_DECISIONS.map((decision) => (
                    <option key={decision} value={decision}>
                      {decision}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结论摘要</label>
                <textarea
                  value={conclusionDraft.conclusionSummary}
                  onChange={(e) => setConclusionDraft((prev) => ({ ...prev, conclusionSummary: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="总结版本当前测试结论和准出判断"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">遗留风险</label>
                <textarea
                  value={conclusionDraft.remainingRisks}
                  onChange={(e) => setConclusionDraft((prev) => ({ ...prev, remainingRisks: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="记录尚未关闭的风险和影响面"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">发布前行动项</label>
                <textarea
                  value={conclusionDraft.nextActions}
                  onChange={(e) => setConclusionDraft((prev) => ({ ...prev, nextActions: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例如：补 2 条回归、关闭 blocker、复核 APK"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结论负责人</label>
                <input
                  value={conclusionDraft.conclusionOwner}
                  onChange={(e) => setConclusionDraft((prev) => ({ ...prev, conclusionOwner: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="填写负责人姓名"
                />
              </div>
              {latestRecord?.conclusionUpdatedAt && (
                <p className="text-xs text-gray-400">
                  最近保存时间：{formatDateTime(latestRecord.conclusionUpdatedAt)}
                </p>
              )}
              {guidanceMessages.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">流程提醒</p>
                  {guidanceMessages.map((message) => (
                    <p key={message} className="text-xs text-amber-700 break-words">{message}</p>
                  ))}
                </div>
              )}
              <Button onClick={handleSaveConclusion} disabled={savingConclusion || !latestRecord?.id} className="w-full">
                {savingConclusion ? '保存中...' : '保存结论卡'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">RD 提测信息</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">关联 Release Note</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{rdSummary.total}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">最近 RD 更新</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 break-words">
                    {rdSummary.latestUpdatedAt ? formatDateTime(rdSummary.latestUpdatedAt) : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                  <p className="text-xs text-green-700">RD 冒烟通过</p>
                  <p className="mt-2 text-2xl font-bold text-green-800">{rdSummary.passedCount}</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-xs text-red-700">RD 冒烟失败</p>
                  <p className="mt-2 text-2xl font-bold text-red-800">{rdSummary.failedCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">RD 冒烟未补齐</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{rdSummary.pendingCount}</p>
                </div>
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                  <p className="text-xs text-rose-700">紧急 QA 介入</p>
                  <p className="mt-2 text-2xl font-bold text-rose-800">{rdSummary.urgentOverrideCount}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">RD 提测判断</p>
                {releaseNotes.length === 0 ? (
                  <p className="text-sm text-gray-400">当前版本下还没有关联的 Release Note。</p>
                ) : rdSummary.urgentOverrideCount > 0 ? (
                  <p className="text-sm text-rose-700">存在紧急版本允许 QA 提前介入，即使 RD 尚未完成冒烟，也可以先创建测试记录并同步记录风险。</p>
                ) : rdSummary.failedCount > 0 ? (
                  <p className="text-sm text-red-700">存在 RD 冒烟失败项，建议先完成研发侧自测修复，再进入 QA 准出判断。</p>
                ) : rdSummary.pendingCount > 0 ? (
                  <p className="text-sm text-amber-700">还有 Release Note 未填写 RD 冒烟结果，建议先补齐提测信息。</p>
                ) : (
                  <p className="text-sm text-green-700">当前关联 Release Note 的 RD 冒烟结果已补齐，可以和 QA 回归结果一起判断是否准出。</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">关联 Release Note</h2>
            <div className="space-y-3">
              {releaseNotes.map((note) => (
                <div key={note.id || `${note.version}-${note.branch}`} className="rounded-lg border border-gray-200 p-4 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 break-all">{note.version}</p>
                      <p className="text-sm text-gray-500 mt-1 break-words">{note.branch} · {note.author}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Tag variant="primary" className={getRiskClass(note.regressionRisk)}>
                        {note.regressionRisk || '-'}
                      </Tag>
                      <Tag variant="primary" className={getSeverityClass(note.severity)}>
                        {note.severity}
                      </Tag>
                      <Tag variant="primary" className={getStatusClass(note.rdSmokeStatus)}>
                        {`RD 冒烟 ${note.rdSmokeStatus || '未测试'}`}
                      </Tag>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap break-words">{note.changeDescription}</p>
                  {note.testingNotes && (
                    <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap break-words">{note.testingNotes}</p>
                  )}
                </div>
              ))}
              {releaseNotes.length === 0 && <p className="text-gray-400">暂无关联 Release Note</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">版本问题与追踪问题</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">版本问题</p>
                <div className="space-y-2">
                  {versionIssues.slice(0, 6).map((issue) => (
                    <div key={issue.id} className="rounded-lg bg-gray-50 p-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 break-words">{issue.title}</span>
                        <Tag variant="primary" className={getStatusClass(issue.status)}>{issue.status}</Tag>
                        <Tag variant="primary" className={getRiskClass(issue.severity)}>{issue.severity}</Tag>
                      </div>
                      {issue.description && <p className="text-sm text-gray-600 mt-2 break-words whitespace-pre-wrap">{issue.description}</p>}
                    </div>
                  ))}
                  {versionIssues.length === 0 && <p className="text-gray-400">暂无版本问题</p>}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">问题追踪</p>
                <div className="space-y-2">
                  {problems.slice(0, 6).map((problem) => (
                    <div key={problem.id} className="rounded-lg bg-gray-50 p-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 break-words whitespace-pre-wrap">{problem.description}</span>
                        <Tag variant="primary" className={getStatusClass(problem.status)}>{problem.status}</Tag>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 break-all">
                        {problem.issueId ? `PR#${problem.issueId} · ` : ''}
                        {problem.firmwareVersion || '-'}
                      </p>
                    </div>
                  ))}
                  {problems.length === 0 && <p className="text-gray-400">暂无关联问题追踪</p>}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">发布前检查清单</h2>
              <span className="text-sm text-gray-500">
                {releaseChecklist.filter((item) => item.passed).length}/{releaseChecklist.length}
              </span>
            </div>
            <div className="space-y-3">
              {releaseChecklist.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-lg border p-4 ${
                    item.passed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-semibold ${item.passed ? 'text-green-800' : 'text-amber-800'}`}>
                        {item.label}
                      </p>
                      <p className={`mt-1 text-sm break-words ${item.passed ? 'text-green-700' : 'text-amber-700'}`}>
                        {item.detail}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.passed ? '已满足' : '待处理'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">状态变更时间轴</h2>
              <span className="text-sm text-gray-500">最近 {timelineEvents.length} 条</span>
            </div>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => {
                const toneClassMap: Record<TimelineEvent['tone'], string> = {
                  neutral: 'bg-gray-100 border-gray-200 text-gray-700',
                  success: 'bg-green-100 border-green-200 text-green-700',
                  warning: 'bg-amber-100 border-amber-200 text-amber-700',
                  danger: 'bg-red-100 border-red-200 text-red-700',
                  info: 'bg-blue-100 border-blue-200 text-blue-700',
                };

                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-3 w-3 rounded-full border ${toneClassMap[event.tone]}`} />
                      {index < timelineEvents.length - 1 && <span className="mt-1 h-full w-px bg-gray-200" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <p className="font-semibold text-gray-900 break-words">{event.title}</p>
                        <span className="text-xs text-gray-400">{formatDateTime(event.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 break-words whitespace-pre-wrap">{event.detail}</p>
                    </div>
                  </div>
                );
              })}
              {timelineEvents.length === 0 && <p className="text-gray-400">当前还没有可展示的状态历史。</p>}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">测试推荐与下一步</h2>
            {recommendation && (
              <span className="text-sm text-gray-400">生成于 {formatDateTime(recommendation.createdAt)}</span>
            )}
          </div>
          {!recommendation ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center">
              <p className="text-gray-500">当前还没有工作台级别的测试推荐。</p>
              <p className="text-gray-400 mt-2">可以基于最新版本记录生成一份聚合测试建议。</p>
              <Button onClick={handleGenerateRecommendation} className="mt-4" disabled={recommendLoading || !latestRecord}>
                {recommendLoading ? '生成中...' : '立即生成'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">测试计划摘要</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{recommendation.testPlanSummary}</p>
              </div>
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">风险分析</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{recommendation.riskAnalysis || '暂无风险分析'}</p>
              </div>
              <div className="rounded-lg bg-white border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">推荐测试用例</h3>
                <div className="space-y-2">
                  {recommendation.recommendedCases.slice(0, 8).map((testCase) => (
                    <div key={`${testCase.caseId}-${testCase.caseName}`} className="rounded bg-gray-50 p-3 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-gray-900 break-words min-w-0">{testCase.caseName}</p>
                        <span className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">{testCase.score}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 break-words whitespace-pre-wrap">{testCase.reason}</p>
                    </div>
                  ))}
                  {recommendation.recommendedCases.length === 0 && <p className="text-gray-400">暂无推荐测试用例</p>}
                </div>
              </div>
              <div className="rounded-lg bg-white border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">建议复测问题</h3>
                <div className="space-y-2">
                  {recommendation.retestIssues.slice(0, 8).map((issue) => (
                    <div key={`${issue.issueId}-${issue.title}`} className="rounded bg-gray-50 p-3 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-gray-900 break-words min-w-0">{issue.title}</p>
                        <span className="text-xs text-orange-700 bg-orange-100 rounded px-2 py-1">{issue.score}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 break-words whitespace-pre-wrap">{issue.reason}</p>
                    </div>
                  ))}
                  {recommendation.retestIssues.length === 0 && <p className="text-gray-400">暂无建议复测问题</p>}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VersionWorkbenchPage;
