/**
 * 版本问题列表组件 - 支持附件上传、编辑、前提条件/测试环境、同步到问题追踪
 */
import React, { useState, useEffect, useRef } from 'react';
import { VersionIssue, IssueAttachment } from '../../../types/database';
import { fetchVersionIssues, createVersionIssue, updateVersionIssue, deleteVersionIssue, uploadIssueAttachment, deleteIssueAttachment, getAttachmentUrl } from '../../../services/VersionIssueApiClient';
import { fetchZmindProjectConfig, fetchZmindProjects, ZmindProject, ZmindProjectConfig, uploadFileToZmind } from '../../../services/ZmindApiService';
import { buildProjectTreeOptions } from '../../../components/zmind/zmindUtils';
import { ZMIND_DESCRIPTION_TEMPLATE } from '../../../components/zmind/zmindConstants';
import { useI18n } from '../../../i18n/I18nProvider';
import { useToast } from '../../../components/common/ToastProvider';
import { usePermission } from '../../../auth/usePermission';

const ZMIND_BASE = 'https://zmind.whaletv.com/issues/';
const SEV_CLS: Record<string, string> = { '低': 'bg-green-100 text-green-800', '中': 'bg-yellow-100 text-yellow-800', '高': 'bg-red-100 text-red-800', '紧急': 'bg-red-200 text-red-900' };
const STA_CLS: Record<string, string> = { '待处理': 'bg-gray-100 text-gray-800', '处理中': 'bg-blue-100 text-blue-800', '已解决': 'bg-green-100 text-green-800', '已关闭': 'bg-gray-200 text-gray-500' };
const FT_ICON: Record<string, string> = { image: '🖼️', video: '🎬', log: '📄', other: '📎' };
function fmtSz(b: number) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
const STATUSES: VersionIssue['status'][] = ['待处理', '处理中', '已解决', '已关闭'];

const VersionIssueList: React.FC<{ versionRecordId: string; versionNumber: string }> = ({ versionRecordId }) => {
  const { showToast } = useToast();
  const permission = usePermission();
  const [issues, setIssues] = useState<VersionIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const emptyForm = {
    title: '',
    description: ZMIND_DESCRIPTION_TEMPLATE,
    precondition: '',
    testEnvironment: '',
    severity: '中',
    linkedPR: '',
    zmindSync: {
      enabled: true,
      projectId: undefined as number | undefined,
      trackerId: undefined as number | undefined,
      statusId: undefined as number | undefined,
      priorityId: undefined as number | undefined,
      assignedToId: undefined as number | undefined,
      categoryId: undefined as number | undefined,
      fixedVersionId: undefined as number | undefined,
      fixedVersionName: '',
      customFields: {} as Record<string, string>,
      pendingFiles: [] as File[],
    },
  };
  const [form, setForm] = useState(emptyForm);
  const load = async () => { setLoading(true); try { setIssues(await fetchVersionIssues(versionRecordId)); } catch {} setLoading(false); };
  useEffect(() => { load(); }, [versionRecordId]);
  const onCreate = async () => {
    if (!form.title.trim() || creating) return;
    setCreating(true);
    try {
      // 如果有待上传附件，通过 zmind uploads API 上传获取 token
      let uploads: Array<{ token: string; filename: string; content_type: string }> = [];
      if (form.zmindSync.enabled && form.zmindSync.pendingFiles && form.zmindSync.pendingFiles.length > 0) {
        for (const file of form.zmindSync.pendingFiles) {
          try {
            const result = await uploadFileToZmind(file);
            uploads.push(result);
          } catch (err) {
            showToast(`附件 "${file.name}" 上传失败: ${(err as Error).message}`, 'error');
          }
        }
      }

      const submitData: any = {
        versionRecordId,
        ...form,
        description: form.description.trim() || ZMIND_DESCRIPTION_TEMPLATE,
      };
      // 把 uploads tokens 放入 zmindSync
      if (form.zmindSync.enabled) {
        submitData.zmindSync = { ...form.zmindSync, uploads: uploads.length > 0 ? uploads : undefined, pendingFiles: undefined };
      }

      await createVersionIssue(submitData);
      setForm({
        ...emptyForm,
        zmindSync: {
          ...form.zmindSync,
          categoryId: undefined,
          fixedVersionId: undefined,
          fixedVersionName: '',
          customFields: {},
          pendingFiles: [],
        },
      });
      setShowForm(false);
      showToast(form.zmindSync.enabled ? '问题已提交并同步到 zmind' : '问题已提交', 'success');
      load();
    } catch (err) {
      showToast(`提交失败: ${(err as Error).message}`, 'error');
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">📋 问题列表 <span className="ml-2 text-xs font-normal text-gray-500">({issues.length} 条)</span></h4>
        <button type="button" onClick={() => setShowForm(!showForm)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={!permission.canEditVersionRecords}>{showForm ? '取消' : '+ 提问题'}</button>
      </div>
      {showForm && <CreateForm form={form} setForm={setForm} onCreate={onCreate} creating={creating} />}
      {loading ? <p className="text-sm text-gray-500 py-2">加载中...</p> : issues.length === 0 ? <p className="text-sm text-gray-400 py-2">暂无问题记录</p> : (
        <div className="space-y-2">{issues.map(iss => <IssueCard key={iss.id} issue={iss} onRefresh={load} />)}</div>
      )}
    </div>
  );
};
export default VersionIssueList;


/** 创建问题表单 - 含前提条件和测试环境 */
const CreateForm: React.FC<{ form: any; setForm: (f: any) => void; onCreate: () => void; creating: boolean }> = ({ form, setForm, onCreate, creating }) => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<ZmindProject[]>([]);
  const [config, setConfig] = useState<ZmindProjectConfig | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [zmindError, setZmindError] = useState('');

  const setSync = (patch: Record<string, any>) => setForm({ ...form, zmindSync: { ...form.zmindSync, ...patch } });
  const selectedProject = projects.find(project => project.id === form.zmindSync.projectId);
  const filteredProjects = buildProjectTreeOptions(projects, projectSearch);
  const visibleCustomFields = config?.customFields || [];
  const requiredCustomFields = visibleCustomFields.filter(field => field.required);

  useEffect(() => {
    if (!form.zmindSync.enabled || projects.length > 0 || loadingProjects || zmindError) return;
    setLoadingProjects(true);
    fetchZmindProjects()
      .then((items) => setProjects(items))
      .catch((err) => {
        const msg = (err as Error).message;
        setZmindError(msg);
        showToast(`获取 zmind 项目失败: ${msg}`, 'error');
      })
      .finally(() => setLoadingProjects(false));
  }, [form.zmindSync.enabled, projects.length, loadingProjects, zmindError]);

  useEffect(() => {
    const projectId = form.zmindSync.projectId;
    if (!form.zmindSync.enabled || !projectId) {
      setConfig(null);
      return;
    }
    setLoadingConfig(true);
    fetchZmindProjectConfig(projectId)
      .then((data) => {
        setConfig(data);
        const defaultTracker = data.trackers.find(item => /(^|\b)pr\b|pull request/i.test(item.name)) || data.trackers[0];
        setForm({
          ...form,
          zmindSync: {
            ...form.zmindSync,
            trackerId: form.zmindSync.trackerId || defaultTracker?.id,
            statusId: form.zmindSync.statusId || data.statuses[0]?.id,
            priorityId: form.zmindSync.priorityId || data.priorities[0]?.id,
          },
        });
      })
      .catch((err) => showToast(`获取 zmind 配置失败: ${(err as Error).message}`, 'error'))
      .finally(() => setLoadingConfig(false));
  }, [form.zmindSync.enabled, form.zmindSync.projectId]);

  const syncEnabled = form.zmindSync.enabled;
  const requiredCustomFieldsComplete = requiredCustomFields.every(field =>
    String(form.zmindSync.customFields?.[field.id] || '').trim()
  );
  const trackerComplete = !syncEnabled || !config?.trackers.length || Boolean(form.zmindSync.trackerId);
  const submitDisabled = creating || loadingConfig || !form.title.trim() || (syncEnabled && (!form.zmindSync.projectId || !trackerComplete || !requiredCustomFieldsComplete));

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
      <div className="border border-gray-200 bg-white rounded-lg p-2 space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={syncEnabled} onChange={e => setSync({ enabled: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          同步创建到 zmind
        </label>
        {syncEnabled && (
          <div className="space-y-2">
            <div className="space-y-1">
              {loadingProjects && <p className="text-xs text-blue-700">正在加载全部 zmind 项目...</p>}
              {selectedProject && <p className="text-xs text-blue-700">已选择项目: {selectedProject.name}</p>}
              <input
                type="text"
                value={projectSearch}
                disabled={loadingProjects || projects.length === 0}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder={projects.length > 0 ? '搜索已加载项目' : '项目加载完成后可搜索'}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <select
                value={form.zmindSync.projectId || ''}
                disabled={loadingProjects}
                onChange={e => {
                  const projectId = e.target.value ? Number(e.target.value) : undefined;
                  setSync({
                    projectId,
                    trackerId: undefined,
                    statusId: undefined,
                    priorityId: undefined,
                    assignedToId: undefined,
                    categoryId: undefined,
                    fixedVersionId: undefined,
                    fixedVersionName: '',
                  });
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{loadingProjects ? '正在加载项目...' : '选择 zmind 项目 *'}</option>
                {filteredProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.depth > 0 ? `${'　'.repeat(project.depth)}↳ ` : ''}{project.name}{project.identifier ? ` (${project.identifier})` : ''}
                  </option>
                ))}
              </select>
              {zmindError && (
                <p className="text-xs text-red-600 mt-1 px-1">
                  ⚠️ {zmindError.includes('个人中心') ? (
                    <span>{zmindError}（<a href="/profile" className="underline text-blue-600">去配置</a>）</span>
                  ) : zmindError}
                </p>
              )}
            </div>
            {form.zmindSync.projectId && (
              <div className="space-y-2">
                {loadingConfig && <p className="text-xs text-blue-700">正在获取这个项目的创建参数...</p>}
                {config?.currentUser && <p className="text-xs text-gray-500">提交账号: {config.currentUser.name}</p>}
                <div className="grid grid-cols-3 gap-2">
                <select value={form.zmindSync.trackerId || ''} disabled={loadingConfig} onChange={e => setSync({ trackerId: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">跟踪</option>
                  {config?.trackers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={form.zmindSync.statusId || ''} disabled={loadingConfig} onChange={e => setSync({ statusId: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">状态</option>
                  {config?.statuses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={form.zmindSync.priorityId || ''} disabled={loadingConfig} onChange={e => setSync({ priorityId: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">优先级</option>
                  {config?.priorities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={form.zmindSync.assignedToId || ''} disabled={loadingConfig} onChange={e => setSync({ assignedToId: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">指派给</option>
                  {config?.assignees.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={form.zmindSync.categoryId || ''} disabled={loadingConfig} onChange={e => setSync({ categoryId: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{config?.categories.length ? '类别' : '该项目暂无类别'}</option>
                  {config?.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={form.zmindSync.fixedVersionId || ''} disabled={loadingConfig} onChange={e => setSync({ fixedVersionId: e.target.value ? Number(e.target.value) : undefined, fixedVersionName: '' })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{config?.versions.length ? '目标版本' : '无目标版本可选'}</option>
                  {config?.versions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <input
                  type="text"
                  value={form.zmindSync.fixedVersionName || ''}
                  onChange={e => setSync({ fixedVersionName: e.target.value, fixedVersionId: undefined })}
                  placeholder="手填目标版本"
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
                {visibleCustomFields.length > 0 && (
                  <div className="space-y-1 border-t border-gray-100 pt-2">
                    <p className="text-xs text-gray-500">扩展字段（带 * 为必填）</p>
                    <div className="grid grid-cols-2 gap-2">
                      {visibleCustomFields.map(field => (
                        field.possibleValues.length > 0 ? (
                          <select
                            key={field.id}
                            value={form.zmindSync.customFields?.[field.id] || ''}
                            onChange={e => setSync({ customFields: { ...(form.zmindSync.customFields || {}), [field.id]: e.target.value } })}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">{field.name}{field.required ? ' *' : ''}</option>
                            {field.possibleValues.map(item => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
                          </select>
                        ) : (
                          <input
                            key={field.id}
                            type={field.fieldFormat === 'date' ? 'date' : 'text'}
                            placeholder={`${field.name}${field.required ? ' *' : ''}`}
                            value={form.zmindSync.customFields?.[field.id] || ''}
                            onChange={e => setSync({ customFields: { ...(form.zmindSync.customFields || {}), [field.id]: e.target.value } })}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )
                      ))}
                    </div>
                  </div>
                )}
                {!loadingConfig && config && visibleCustomFields.length === 0 && (
                  <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
                    该项目暂无扩展字段
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <input type="text" placeholder="主题 *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Description</span>
          <button
            type="button"
            onClick={() => setForm({ ...form, description: ZMIND_DESCRIPTION_TEMPLATE })}
            className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded"
          >
            套用 zmind 模板
          </button>
        </div>
        <textarea placeholder="Description" value={form.description} rows={9} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <textarea placeholder="Precondition（可选）" value={form.precondition} rows={2} onChange={e => setForm({ ...form, precondition: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <textarea placeholder="Tested Environment（可选）" value={form.testEnvironment} rows={2} onChange={e => setForm({ ...form, testEnvironment: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="低">低</option><option value="中">中</option><option value="高">高</option><option value="紧急">紧急</option>
        </select>
        <input type="text" placeholder={syncEnabled ? '同步后自动回填 zmind ID' : '关联 zmind ID（可选）'} value={form.linkedPR} disabled={syncEnabled} onChange={e => setForm({ ...form, linkedPR: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
        <button type="button" onClick={onCreate} disabled={submitDisabled} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">{creating ? '提交中...' : '提交'}</button>
      </div>

      {/* 附件上传（提交时一起同步到 zmind） */}
      {syncEnabled && (
        <div className="border border-dashed border-gray-300 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">📎 附件（随 PR 一起上传到 zmind）</span>
            <label className="text-xs text-blue-600 hover:underline cursor-pointer px-2 py-0.5 bg-blue-50 rounded">
              + 选择文件
              <input
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*,.log,.txt,.csv,.json,.xml,.zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newFiles = Array.from(files);
                  setForm({
                    ...form,
                    zmindSync: {
                      ...form.zmindSync,
                      pendingFiles: [...(form.zmindSync.pendingFiles || []), ...newFiles],
                    },
                  });
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {(form.zmindSync.pendingFiles || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(form.zmindSync.pendingFiles || []).map((file: File, idx: number) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                  📄 {file.name} <span className="text-gray-400">({(file.size / 1024).toFixed(0)}KB)</span>
                  <button type="button" onClick={() => {
                    const next = [...(form.zmindSync.pendingFiles || [])];
                    next.splice(idx, 1);
                    setForm({ ...form, zmindSync: { ...form.zmindSync, pendingFiles: next } });
                  }} className="text-gray-400 hover:text-red-500 ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


/** 单条问题卡片 - 支持编辑、前提条件/测试环境显示、同步指示器 */
const IssueCard: React.FC<{ issue: VersionIssue; onRefresh: () => void }> = ({ issue, onRefresh }) => {
  const { formatDateTime, t } = useI18n();
  const { showToast } = useToast();
  const permission = usePermission();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: issue.title, description: issue.description || '', precondition: issue.precondition || '',
    testEnvironment: issue.testEnvironment || '', severity: issue.severity, linkedPR: issue.linkedPR || '',
  });
  const [resEditing, setResEditing] = useState(false);
  const [res, setRes] = useState(issue.resolution || '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const atts = issue.attachments || [];

  const onStatus = async (s: string) => { await updateVersionIssue(issue.id!, { status: s as any }); onRefresh(); };
  const onDel = async () => { if (!confirm(t('确定删除这条记录吗？'))) return; await deleteVersionIssue(issue.id!); onRefresh(); };
  const onSaveEdit = async () => {
    await updateVersionIssue(issue.id!, editForm as any); setEditing(false); onRefresh();
  };
  const onSaveRes = async () => { await updateVersionIssue(issue.id!, { resolution: res }); setResEditing(false); onRefresh(); };
  const doUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    try { for (let i = 0; i < files.length; i++) { setProgress(0); await uploadIssueAttachment(issue.id!, files[i], setProgress); } onRefresh(); }
    catch (err) { showToast(`${t('失败')}: ${(err as Error).message}`, 'error'); }
    setUploading(false); if (fileRef.current) fileRef.current.value = '';
  };
  const doDelAtt = async (a: IssueAttachment) => {
    if (!confirm(`确定删除附件 "${a.fileName}"？`)) return;
    try { await deleteIssueAttachment(issue.id!, a.savedFileName); onRefresh(); } catch (err) { showToast(`${t('删除')} ${t('失败')}: ${(err as Error).message}`, 'error'); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      {/* 头部：标题、标签、操作按钮 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{issue.title}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${SEV_CLS[issue.severity] || ''}`}>{issue.severity}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${STA_CLS[issue.status] || ''}`}>{issue.status}</span>
            {issue.linkedPR && <a href={`${ZMIND_BASE}${issue.linkedPR}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs hover:underline">PR#{issue.linkedPR}</a>}
            {issue.syncedProblemId && <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs" title="已同步到问题追踪">✅ 已同步</span>}
          </div>
          {issue.precondition && <p className="text-xs text-gray-500 mt-1">📌 前提条件: {issue.precondition}</p>}
          {issue.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{issue.description}</p>}
          {issue.testEnvironment && <p className="text-xs text-gray-500 mt-0.5">🖥️ 测试环境: {issue.testEnvironment}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span>提交人: {issue.reporter}</span>{issue.assignee && <span>处理人: {issue.assignee}</span>}
            <span>{formatDateTime(issue.createdAt)}</span>
          </div>
          {issue.resolution && !resEditing && <div className="mt-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-800">💡 解决备注: {issue.resolution}</div>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <select value={issue.status} onChange={e => onStatus(e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" disabled={!permission.canEditVersionRecords}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className={`px-2 py-1 text-xs rounded ${permission.canEditVersionRecords ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`} title="上传附件">
            📎<input ref={fileRef} type="file" multiple className="hidden" accept="image/*,video/*,.log,.txt,.csv,.json,.xml,.zip,.rar,.7z" onChange={doUpload} disabled={!permission.canEditVersionRecords} />
          </label>
          <button type="button" onClick={() => { setEditing(!editing); if (!editing) setEditForm({ title: issue.title, description: issue.description || '', precondition: issue.precondition || '', testEnvironment: issue.testEnvironment || '', severity: issue.severity, linkedPR: issue.linkedPR || '' }); }} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-300 disabled:cursor-not-allowed" title="编辑问题" disabled={!permission.canEditVersionRecords}>✏️</button>
          <button type="button" onClick={() => { setResEditing(!resEditing); setRes(issue.resolution || ''); }} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-300 disabled:cursor-not-allowed" title="解决备注" disabled={!permission.canEditVersionRecords}>📝</button>
          <button type="button" onClick={onDel} className="px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:text-gray-300 disabled:cursor-not-allowed" title="删除" disabled={!permission.canEditVersionRecords}>🗑</button>
        </div>
      </div>

      {/* 编辑表单 */}
      {editing && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-blue-700 mb-1">✏️ 编辑问题</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="问题标题" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={editForm.severity} onChange={e => setEditForm({ ...editForm, severity: e.target.value as any })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="低">低</option><option value="中">中</option><option value="高">高</option><option value="紧急">紧急</option>
            </select>
          </div>
          <textarea placeholder="前提条件" value={editForm.precondition} rows={2} onChange={e => setEditForm({ ...editForm, precondition: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea placeholder="问题描述" value={editForm.description} rows={2} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="测试环境" value={editForm.testEnvironment} onChange={e => setEditForm({ ...editForm, testEnvironment: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="关联 PR 号" value={editForm.linkedPR} onChange={e => setEditForm({ ...editForm, linkedPR: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100">取消</button>
            <button type="button" onClick={onSaveEdit} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
          </div>
        </div>
      )}

      {/* 解决备注编辑 */}
      {resEditing && (
        <div className="mt-2 flex gap-2">
          <input type="text" value={res} placeholder="输入解决备注..." onChange={e => setRes(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <button type="button" onClick={onSaveRes} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">保存</button>
        </div>
      )}

      {/* 上传进度 */}
      {uploading && <div className="mt-2 flex items-center gap-2 text-xs text-blue-600"><div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} /></div><span>{progress}%</span></div>}

      {/* 附件列表 */}
      {atts.length > 0 && <div className="mt-2 border-t border-gray-100 pt-2"><p className="text-xs text-gray-500 mb-1.5">📎 附件 ({atts.length})</p><div className="flex flex-wrap gap-2">{atts.map((a, i) => <AttItem key={i} att={a} onDel={() => doDelAtt(a)} onPrev={url => setPreview(url)} />)}</div></div>}

      {/* 预览弹窗 */}
      {preview && <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8" onClick={() => setPreview(null)}><div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>{preview.match(/\.(mp4|webm|mov)/) ? <video src={preview} controls autoPlay className="max-h-[80vh] rounded-lg" /> : <img src={preview} alt="预览" className="max-h-[80vh] rounded-lg" />}<button type="button" onClick={() => setPreview(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 text-lg">✕</button></div></div>}
    </div>
  );
};


/** 附件项 */
const AttItem: React.FC<{ att: IssueAttachment; onDel: () => void; onPrev: (url: string) => void }> = ({ att, onDel, onPrev }) => {
  const url = getAttachmentUrl(att.filePath);
  const icon = FT_ICON[att.fileType] || '📎';
  const canPrev = att.fileType === 'image' || att.fileType === 'video';
  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100">
      <span>{icon}</span>
      {canPrev ? <button type="button" onClick={() => onPrev(url)} className="text-blue-600 hover:underline truncate max-w-[140px]" title={att.fileName}>{att.fileName}</button>
        : <a href={url} download className="text-blue-600 hover:underline truncate max-w-[140px]" title={att.fileName}>{att.fileName}</a>}
      <span className="text-gray-400">{fmtSz(att.fileSize)}</span>
      {canPrev && <a href={url} download title="下载" className="text-gray-400 hover:text-blue-600">⬇</a>}
      <button type="button" onClick={onDel} title="删除附件" className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
};
