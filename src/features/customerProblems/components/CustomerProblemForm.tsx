import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { CustomerProblem } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';
import { Input } from '../../../components/common/Input';
import { fetchFirmwareVersion, fetchZmindProjects, fetchZmindProjectConfig, ZmindProject, ZmindProjectConfig, uploadFileToZmind } from '../../../services/ZmindApiService';
import { buildProjectTreeOptions } from '../../../components/zmind/zmindUtils';
import { ZMIND_DESCRIPTION_TEMPLATE } from '../../../components/zmind/zmindConstants';
import { useI18n } from '../../../i18n/I18nProvider';
import { CUSTOMER_PROBLEM_STATUS_OPTIONS, DEFAULT_PROBLEM_CLASSIFICATIONS } from '../../../config/dictionaries';
import { useWorkspaceProjectOptions } from '../../../hooks/useWorkspaceProjectOptions';
import { useToast } from '../../../components/common/ToastProvider';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';

interface CustomerProblemFormProps {
  problem?: CustomerProblem | null;
  problemType: 'customer' | 'qa';
  defaultProjectType?: string;
  onSubmit: (data: Partial<CustomerProblem>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CustomerProblemForm: React.FC<CustomerProblemFormProps> = ({
  problem,
  problemType,
  defaultProjectType,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { formatDateTime } = useI18n();
  const qaItems = useSelector((state: RootState) => state.customerProblems.qaItems);
  const projectOptions = useWorkspaceProjectOptions();

  const [formData, setFormData] = useState<Partial<CustomerProblem>>({
    problemType,
    issueId: '',
    firmwareVersion: '',
    description: '',
    classification: undefined,
    status: '开放',
    linkedQaProblems: [],
    projectType: (defaultProjectType as any) || projectOptions[0]?.value || 'TV',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchingFirmware, setFetchingFirmware] = useState(false);
  const [firmwareError, setFirmwareError] = useState('');
  const [qaSearch, setQaSearch] = useState('');
  const [customClassification, setCustomClassification] = useState('');

  // zmind 同步
  const { showToast } = useToast();
  const [zmindSyncEnabled, setZmindSyncEnabled] = useState(false);
  const [zmindProjects, setZmindProjects] = useState<ZmindProject[]>([]);
  const [zmindProjectId, setZmindProjectId] = useState<number | undefined>();
  const [zmindConfig, setZmindConfig] = useState<ZmindProjectConfig | null>(null);
  const [zmindTrackerId, setZmindTrackerId] = useState<number | undefined>();
  const [zmindStatusId, setZmindStatusId] = useState<number | undefined>();
  const [zmindPriorityId, setZmindPriorityId] = useState<number | undefined>();
  const [zmindAssignedToId, setZmindAssignedToId] = useState<number | undefined>();
  const [zmindCategoryId, setZmindCategoryId] = useState<number | undefined>();
  const [zmindFixedVersionId, setZmindFixedVersionId] = useState<number | undefined>();
  const [zmindFixedVersionName, setZmindFixedVersionName] = useState('');
  const [zmindCustomFields, setZmindCustomFields] = useState<Record<string, string>>({});
  const [zmindSubject, setZmindSubject] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [zmindError, setZmindError] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [zmindPendingFiles, setZmindPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (problem) {
      setFormData({ ...problem, problemType });
    }
  }, [problem, problemType]);

  // 加载 zmind 项目列表
  useEffect(() => {
    if (!zmindSyncEnabled || zmindProjects.length > 0 || loadingProjects || zmindError) return;
    setLoadingProjects(true);
    fetchZmindProjects()
      .then((items) => setZmindProjects(items))
      .catch((err) => { setZmindError((err as Error).message); showToast(`获取 zmind 项目失败: ${(err as Error).message}`, 'error'); })
      .finally(() => setLoadingProjects(false));
  }, [zmindSyncEnabled, zmindProjects.length, loadingProjects, zmindError, showToast]);

  // 加载 zmind 项目配置
  useEffect(() => {
    if (!zmindSyncEnabled || !zmindProjectId) { setZmindConfig(null); return; }
    setLoadingConfig(true);
    fetchZmindProjectConfig(zmindProjectId)
      .then((data) => {
        setZmindConfig(data);
        const defaultTracker = data.trackers.find(item => /(^|\b)pr\b|pull request|bug/i.test(item.name)) || data.trackers[0];
        if (!zmindTrackerId && defaultTracker) setZmindTrackerId(defaultTracker.id);
        if (!zmindStatusId && data.statuses.length > 0) setZmindStatusId(data.statuses[0].id);
        if (!zmindPriorityId && data.priorities.length > 0) setZmindPriorityId(data.priorities[0].id);
      })
      .catch((err) => showToast(`获取 zmind 配置失败: ${(err as Error).message}`, 'error'))
      .finally(() => setLoadingConfig(false));
  }, [zmindSyncEnabled, zmindProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.description?.trim()) newErrors.description = '问题描述不能为空';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const submitData: any = { ...formData };
    if (zmindSyncEnabled && !formData.issueId?.trim() && zmindProjectId) {
      // 上传附件到 zmind 获取 tokens
      let uploads: Array<{ token: string; filename: string; content_type: string }> = [];
      if (zmindPendingFiles.length > 0) {
        for (const file of zmindPendingFiles) {
          try {
            const result = await uploadFileToZmind(file);
            uploads.push(result);
          } catch (err) {
            showToast(`附件 "${file.name}" 上传失败: ${(err as Error).message}`, 'error');
          }
        }
      }
      submitData.zmindSync = {
        enabled: true,
        projectId: zmindProjectId,
        trackerId: zmindTrackerId,
        statusId: zmindStatusId,
        priorityId: zmindPriorityId,
        assignedToId: zmindAssignedToId,
        categoryId: zmindCategoryId,
        fixedVersionId: zmindFixedVersionId,
        fixedVersionName: zmindFixedVersionName,
        customFields: zmindCustomFields,
        subject: zmindSubject.trim() || undefined,
        uploads: uploads.length > 0 ? uploads : undefined,
      };
    }
    onSubmit(submitData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  /** 输入PR号后自动获取固件版本和创建时间 */
  const handleFetchFirmware = async () => {
    const issueId = formData.issueId?.trim();
    if (!issueId) return;
    setFetchingFirmware(true);
    setFirmwareError('');
    try {
      const info = await fetchFirmwareVersion(issueId);
      setFormData((prev) => ({
        ...prev,
        firmwareVersion: info.firmwareVersion || prev.firmwareVersion,
        description: info.subject || prev.description,
        issueCreatedAt: info.issueCreatedAt || prev.issueCreatedAt,
      }));
      if (!info.firmwareVersion) {
        setFirmwareError('未找到固件版本信息（Tested Environment / Issue Version）');
      }
    } catch (err) {
      setFirmwareError((err as Error).message);
    } finally {
      setFetchingFirmware(false);
    }
  };

  /** 关联/取消关联 QA 问题 */
  const toggleQaLink = (qaId: string) => {
    setFormData((prev) => {
      const linked = prev.linkedQaProblems || [];
      if (linked.includes(qaId)) {
        return { ...prev, linkedQaProblems: linked.filter((id) => id !== qaId) };
      }
      return { ...prev, linkedQaProblems: [...linked, qaId] };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* PR号 + 自动获取固件版本 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PR号（zmind Issue ID）</label>
        <div className="flex gap-2">
          <Input
            type="text"
            name="issueId"
            value={formData.issueId || ''}
            onChange={handleInputChange}
            placeholder="输入 PR 号，如 12345"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleFetchFirmware}
            disabled={fetchingFirmware || !formData.issueId?.trim()}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {fetchingFirmware ? '获取中...' : '同步PR信息'}
          </button>
        </div>
        {formData.issueId && (
          <a href={`${ZMIND_BASE_URL}${formData.issueId}`} target="_blank" rel="noopener noreferrer"
            className="text-blue-700 hover:underline text-xs mt-1 inline-block">
            🔗 查看 zmind #{formData.issueId}
          </a>
        )}
        {firmwareError && <p className="text-orange-500 text-xs mt-1">{firmwareError}</p>}
      </div>

      {/* zmind 同步（没有 PR 号时可选择项目创建新 issue） */}
      {!problem && !formData.issueId?.trim() && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={zmindSyncEnabled} onChange={(e) => setZmindSyncEnabled(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            同步创建到 zmind（没有 PR 号时，创建新 issue）
          </label>
          {zmindSyncEnabled && (
            <div className="space-y-3 pl-6 pt-1">
              {loadingProjects && <p className="text-xs text-blue-600">正在加载 zmind 项目...</p>}
              {zmindError && (
                <p className="text-xs text-red-600">⚠️ {zmindError}
                  {zmindError.includes('个人中心') && <a href="/profile" className="ml-1 underline text-blue-600">去配置</a>}
                </p>
              )}
              {!zmindError && (
                <>
                  {/* 项目选择（层级搜索树） */}
                  <div className="space-y-1">
                    {zmindProjectId && <p className="text-xs text-blue-600">已选择项目: {zmindProjects.find(p => p.id === zmindProjectId)?.name}</p>}
                    <input
                      type="text"
                      value={projectSearch}
                      disabled={loadingProjects || zmindProjects.length === 0}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder={zmindProjects.length > 0 ? '搜索已加载项目' : '项目加载完成后可搜索'}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <select
                      value={zmindProjectId || ''}
                      onChange={(e) => { setZmindProjectId(e.target.value ? Number(e.target.value) : undefined); setZmindTrackerId(undefined); setZmindStatusId(undefined); setZmindPriorityId(undefined); setZmindAssignedToId(undefined); setZmindCategoryId(undefined); setZmindFixedVersionId(undefined); }}
                      disabled={loadingProjects}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{loadingProjects ? '正在加载项目...' : '选择 zmind 项目 *'}</option>
                      {buildProjectTreeOptions(zmindProjects, projectSearch).map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.depth > 0 ? `${'　'.repeat(project.depth)}↳ ` : ''}{project.name}{project.identifier ? ` (${project.identifier})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 项目配置字段 */}
                  {zmindProjectId && (
                    <div className="space-y-2">
                      {loadingConfig && <p className="text-xs text-blue-600">加载项目配置...</p>}
                      {zmindConfig?.currentUser && <p className="text-xs text-gray-500">提交账号: {zmindConfig.currentUser.name}</p>}

                      {/* 主题（可选，不填则用问题描述） */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">zmind 主题（不填则用问题描述前100字）</label>
                        <input type="text" value={zmindSubject} onChange={(e) => setZmindSubject(e.target.value)} placeholder="自定义 issue 主题" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>

                      {/* 6 个下拉 */}
                      <div className="grid grid-cols-3 gap-2">
                        <select value={zmindTrackerId || ''} disabled={loadingConfig} onChange={(e) => setZmindTrackerId(e.target.value ? Number(e.target.value) : undefined)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                          <option value="">跟踪</option>
                          {zmindConfig?.trackers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={zmindStatusId || ''} disabled={loadingConfig} onChange={(e) => setZmindStatusId(e.target.value ? Number(e.target.value) : undefined)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                          <option value="">状态</option>
                          {zmindConfig?.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select value={zmindPriorityId || ''} disabled={loadingConfig} onChange={(e) => setZmindPriorityId(e.target.value ? Number(e.target.value) : undefined)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                          <option value="">优先级</option>
                          {zmindConfig?.priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={zmindAssignedToId || ''} disabled={loadingConfig} onChange={(e) => setZmindAssignedToId(e.target.value ? Number(e.target.value) : undefined)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                          <option value="">指派给</option>
                          {zmindConfig?.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select value={zmindCategoryId || ''} disabled={loadingConfig} onChange={(e) => setZmindCategoryId(e.target.value ? Number(e.target.value) : undefined)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                          <option value="">{zmindConfig?.categories.length ? '类别' : '无类别'}</option>
                          {zmindConfig?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={zmindFixedVersionId || ''} disabled={loadingConfig} onChange={(e) => { setZmindFixedVersionId(e.target.value ? Number(e.target.value) : undefined); setZmindFixedVersionName(''); }} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                          <option value="">{zmindConfig?.versions.length ? '目标版本' : '无版本'}</option>
                          {zmindConfig?.versions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>

                      {/* 手填目标版本 */}
                      <input type="text" value={zmindFixedVersionName} onChange={(e) => { setZmindFixedVersionName(e.target.value); setZmindFixedVersionId(undefined); }} placeholder="手填目标版本（可选）" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

                      {/* 必填自定义字段 */}
                      {zmindConfig && zmindConfig.customFields.length > 0 && (
                        <div className="space-y-2 border-t border-gray-200 pt-2">
                          <p className="text-xs text-gray-500">扩展字段（带 * 为必填）</p>
                          <div className="grid grid-cols-2 gap-2">
                            {zmindConfig.customFields.map((field) => (
                              field.possibleValues.length > 0 ? (
                                <select key={field.id} value={zmindCustomFields[field.id] || ''} onChange={(e) => setZmindCustomFields({ ...zmindCustomFields, [field.id]: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500">
                                  <option value="">{field.name}{field.required ? ' *' : ''}</option>
                                  {field.possibleValues.map((v) => <option key={v.id || v.name} value={v.name}>{v.name}</option>)}
                                </select>
                              ) : (
                                <input key={field.id} type={field.fieldFormat === 'date' ? 'date' : 'text'} value={zmindCustomFields[field.id] || ''} onChange={(e) => setZmindCustomFields({ ...zmindCustomFields, [field.id]: e.target.value })} placeholder={`${field.name}${field.required ? ' *' : ''}`} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500" />
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 附件上传（随 issue 一起上传到 zmind） */}
                      <div className="border border-dashed border-gray-300 rounded-lg p-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">📎 附件（随 issue 一起上传到 zmind）</span>
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
                                setZmindPendingFiles(prev => [...prev, ...Array.from(files)]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {zmindPendingFiles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {zmindPendingFiles.map((file, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                                📄 {file.name} <span className="text-gray-400">({(file.size / 1024).toFixed(0)}KB)</span>
                                <button type="button" onClick={() => setZmindPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 ml-0.5">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 固件版本号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">固件版本号</label>
        <Input
          type="text"
          name="firmwareVersion"
          value={formData.firmwareVersion || ''}
          onChange={handleInputChange}
          placeholder="自动获取或手动输入"
        />
      </div>

      {/* 问题创建时间（追责时间轴） */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题创建时间（追责时间轴）</label>
        <Input
          type="text"
          name="issueCreatedAt"
          value={formData.issueCreatedAt ? formatDateTime(formData.issueCreatedAt) : ''}
          onChange={() => {}}
          placeholder="同步 PR 后自动获取，无 PR 则以提交时间为准"
          disabled
        />
        {formData.issueCreatedAt && (
          <p className="text-xs text-gray-500 mt-1">📅 来源: zmind PR#{formData.issueId} 创建时间</p>
        )}
        {!formData.issueCreatedAt && formData.issueId && (
          <p className="text-xs text-gray-400 mt-1">点击"获取固件版本"同步创建时间</p>
        )}
      </div>

      {/* 问题描述 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            问题描述 <span className="text-red-500">*</span>
          </label>
          {zmindSyncEnabled && !formData.description?.trim() && (
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, description: ZMIND_DESCRIPTION_TEMPLATE }))}
              className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
            >
              套用 zmind 模板
            </button>
          )}
        </div>
        <Textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          placeholder={zmindSyncEnabled ? '填写问题描述（将同步到 zmind issue 的 description）' : '详细描述问题'}
          rows={zmindSyncEnabled ? 8 : 3}
          error={errors.description}
        />
      </div>

      {/* 问题分类 - tag 风格 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题分类</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_PROBLEM_CLASSIFICATIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, classification: prev.classification === c ? undefined : c }))}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                formData.classification === c
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-blue-100 hover:border-blue-400'
              }`}
            >
              {c}
            </button>
          ))}
          {formData.classification && !DEFAULT_PROBLEM_CLASSIFICATIONS.includes(formData.classification as any) && (
            <span className="px-3 py-1 rounded-full text-sm bg-blue-500 text-white">{formData.classification}</span>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customClassification}
            onChange={(e) => setCustomClassification(e.target.value)}
            placeholder="自定义分类"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = customClassification.trim(); if (v) { setFormData((prev) => ({ ...prev, classification: v })); setCustomClassification(''); } } }}
          />
          <button
            type="button"
            onClick={() => { const v = customClassification.trim(); if (v) { setFormData((prev) => ({ ...prev, classification: v })); setCustomClassification(''); } }}
            disabled={!customClassification.trim()}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >确定</button>
        </div>
      </div>

      {/* 项目类型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
        <Select
          name="projectType"
          value={formData.projectType || 'TV'}
          onChange={handleInputChange}
          options={projectOptions}
        />
      </div>

      {/* 状态 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题状态</label>
        <Select
          name="status"
          value={formData.status || '开放'}
          onChange={handleInputChange}
          options={[...CUSTOMER_PROBLEM_STATUS_OPTIONS]}
        />
      </div>

      {/* 关联QA问题（仅客户问题显示）- 智能推荐 */}
      {problemType === 'customer' && qaItems.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">关联 QA 问题（追责时间轴）</label>
          <input
            type="text"
            value={qaSearch}
            onChange={(e) => setQaSearch(e.target.value)}
            placeholder="搜索 QA 问题（描述、PR号、分类）"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <div className="max-h-48 overflow-y-auto overflow-x-hidden border border-gray-200 rounded-lg p-2 space-y-1">
            {(() => {
              // 智能推荐：计算每个 QA 问题的匹配分数
              const scored = qaItems
                .filter((qa) => {
                  if (!qaSearch.trim()) return true;
                  const kw = qaSearch.toLowerCase();
                  return (
                    (qa.description || '').toLowerCase().includes(kw) ||
                    (qa.issueId || '').toLowerCase().includes(kw) ||
                    (qa.classification || '').toLowerCase().includes(kw) ||
                    (qa.firmwareVersion || '').toLowerCase().includes(kw)
                  );
                })
                .map((qa) => {
                  let score = 0;
                  // 固件版本匹配（权重最高）
                  if (formData.firmwareVersion && qa.firmwareVersion &&
                    qa.firmwareVersion.toLowerCase().includes(formData.firmwareVersion.toLowerCase())) {
                    score += 30;
                  }
                  // 分类匹配
                  if (formData.classification && qa.classification === formData.classification) {
                    score += 20;
                  }
                  // 描述关键词匹配
                  if (formData.description && qa.description) {
                    const words = formData.description.toLowerCase().split(/[\s,，。.、;；]+/).filter(w => w.length >= 2);
                    const qaDesc = qa.description.toLowerCase();
                    for (const w of words) {
                      if (qaDesc.includes(w)) score += 5;
                    }
                  }
                  // 项目类型匹配
                  if (formData.projectType && qa.projectType === formData.projectType) {
                    score += 10;
                  }
                  // 已关联的排最前
                  if ((formData.linkedQaProblems || []).includes(qa.id!)) score += 100;
                  return { qa, score };
                })
                .sort((a, b) => b.score - a.score);

              return scored.map(({ qa, score }) => {
                const isLinked = (formData.linkedQaProblems || []).includes(qa.id!);
                const isRecommended = !isLinked && score >= 15;
                return (
                  <div
                    key={qa.id}
                    onClick={() => toggleQaLink(qa.id!)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors overflow-hidden ${
                      isLinked ? 'bg-blue-100 border border-blue-300'
                        : isRecommended ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input type="checkbox" checked={isLinked} readOnly className="rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-900 truncate min-w-0">{qa.description}</p>
                        {isRecommended && <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-400 text-white rounded text-[10px] leading-none">推荐</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {qa.issueId && `PR#${qa.issueId} · `}
                        {qa.firmwareVersion && `${qa.firmwareVersion} · `}
                        {qa.classification || '未分类'} · {qa.status}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <Textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleInputChange}
          placeholder="添加任何额外的备注信息"
          rows={2}
        />
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 justify-end pt-4">
        <Button onClick={onCancel} variant="secondary" disabled={loading}>取消</Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerProblemForm;
