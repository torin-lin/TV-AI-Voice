import React, { useState, useEffect, useRef } from 'react';
import { VersionRecord } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';
import { uploadDoc, getDocDownloadUrl, DocUploadResult } from '../../../services/DocUploadService';
import { formatFileSize } from '../../../services/ApkUploadService';
import { apiGetEligibleQaReleaseNotes, EligibleQaReleaseNoteInfo } from '../../../services/ReleaseNoteApiClient';
import { DEFAULT_MODULE_OPTIONS, RISK_LEVEL_OPTIONS, TEST_RESULT_OPTIONS, VERSION_STATUS_OPTIONS } from '../../../config/dictionaries';
import { useWorkspaceProjectOptions } from '../../../hooks/useWorkspaceProjectOptions';

interface VersionRecordFormProps {
  record?: VersionRecord | null;
  defaultProjectType?: string;
  onSubmit: (data: Partial<VersionRecord>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';

/** 标签输入组件 */
const TagInput: React.FC<{
  label: string;
  required?: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  error?: string;
}> = ({ label, required, tags, onChange, suggestions, error }) => {
  const [customValue, setCustomValue] = useState('');
  const availableSuggestions = suggestions.filter((s) => !tags.includes(s));

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
  };
  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));
  const handleCustomAdd = () => { if (customValue.trim()) { addTag(customValue); setCustomValue(''); } };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-200 text-blue-700 rounded-full text-sm">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-blue-700 hover:text-blue-800 font-bold ml-1">×</button>
            </span>
          ))}
        </div>
      )}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {availableSuggestions.map((s) => (
            <button key={s} type="button" onClick={() => addTag(s)}
              className="px-3 py-1 border border-gray-300 text-gray-600 rounded-full text-sm hover:bg-blue-100 hover:border-blue-400 hover:text-blue-600 transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={customValue} onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomAdd(); } }}
          placeholder="自定义添加..." className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="button" onClick={handleCustomAdd}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-blue-100 hover:text-blue-600 transition-colors">添加</button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

/** 关联 PR/CR 输入组件 */
const LinkedIssuesInput: React.FC<{
  issues: string[];
  onChange: (issues: string[]) => void;
}> = ({ issues, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const addIssue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !issues.includes(trimmed)) {
      onChange([...issues, trimmed]);
      setInputValue('');
    }
  };

  const removeIssue = (issue: string) => {
    onChange(issues.filter((i) => i !== issue));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">关联的 PR/CR</label>
      {issues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {issues.map((issue) => (
            <span key={issue} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-full text-sm">
              <a href={`${ZMIND_BASE_URL}${issue}`} target="_blank" rel="noopener noreferrer"
                className="hover:underline hover:text-purple-600" onClick={(e) => e.stopPropagation()}>
                #{issue}
              </a>
              <button type="button" onClick={() => removeIssue(issue)} className="text-purple-500 hover:text-purple-800 font-bold ml-1">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIssue(); } }}
          placeholder="输入 PR 或 CR 号，按回车添加"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="button" onClick={addIssue}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-blue-100 hover:text-blue-600 transition-colors">关联</button>
      </div>
      <p className="text-gray-500 text-xs mt-1">添加后点击编号可跳转到 zmind 对应页面</p>
    </div>
  );
};

const VersionRecordForm: React.FC<VersionRecordFormProps> = ({ record, defaultProjectType, onSubmit, onCancel, loading = false }) => {
  const projectOptions = useWorkspaceProjectOptions();
  const [formData, setFormData] = useState<Partial<VersionRecord>>({
    versionNumber: '',
    firmwareVersion: '',
    linkedIssues: [],
    changeDescription: '',
    modifiedModules: [],
    riskLevel: '中',
    voiceRegressionResult: '未测试',
    systemRegressionResult: '未测试',
    projectType: (defaultProjectType as any) || projectOptions[0]?.value || 'TV',
    testCycle: '',
    prototypeSource: '',
    languageModel: '',
    versionStatus: '待测试',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [resultUploading, setResultUploading] = useState(false);
  const [resultUploadError, setResultUploadError] = useState('');
  const resultInputRef = useRef<HTMLInputElement>(null);
  const [eligibleReleaseNotes, setEligibleReleaseNotes] = useState<EligibleQaReleaseNoteInfo[]>([]);
  const selectedReleaseNote = eligibleReleaseNotes.find((item) => item.id === formData.releaseNoteId);
  const isUrgentOverride = selectedReleaseNote?.qaEntryMode === 'urgent_override';

  useEffect(() => { if (record) setFormData(record); }, [record]);
  useEffect(() => {
    apiGetEligibleQaReleaseNotes(record?.projectType || defaultProjectType).then(setEligibleReleaseNotes).catch(() => {});
  }, [defaultProjectType, record?.projectType]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!record?.id && !formData.releaseNoteId) newErrors.releaseNoteId = '请先选择一个 RD 冒烟通过或紧急版本';
    if (isUrgentOverride && !formData.qaEarlyInterventionReason?.trim()) {
      newErrors.qaEarlyInterventionReason = '紧急版本提前介入时必须填写介入原因';
    }
    if (isUrgentOverride && !formData.qaEarlyInterventionOwner?.trim()) {
      newErrors.qaEarlyInterventionOwner = '紧急版本提前介入时必须填写介入责任人';
    }
    if (!formData.versionNumber?.trim()) newErrors.versionNumber = '版本号不能为空';
    if (!formData.changeDescription?.trim()) newErrors.changeDescription = '修改内容不能为空';
    if (!formData.modifiedModules || formData.modifiedModules.length === 0) newErrors.modifiedModules = '至少选择一个修改模块';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitAfterUploads = (extraData: Partial<VersionRecord>) => {
      onSubmit({ ...formData, ...extraData });
    };

    // 如果有附件需要上传，按顺序上传
    if (docFile) {
      setDocUploading(true);
      setDocUploadError('');
      uploadDoc(docFile).then((result: DocUploadResult) => {
        setDocUploading(false);
        if (result.success && result.data) {
          const nextData: Partial<VersionRecord> = {
            prototypeFileName: result.data.fileName,
            prototypeFilePath: result.data.filePath,
            prototypeFileSize: result.data.fileSize,
          };
          if (resultFile) {
            setResultUploading(true);
            setResultUploadError('');
            uploadDoc(resultFile).then((resultDoc: DocUploadResult) => {
              setResultUploading(false);
              if (resultDoc.success && resultDoc.data) {
                submitAfterUploads({
                  ...nextData,
                  testResultFileName: resultDoc.data.fileName,
                  testResultFilePath: resultDoc.data.filePath,
                  testResultFileSize: resultDoc.data.fileSize,
                });
              } else {
                setResultUploadError(resultDoc.message || '测试结果上传失败');
              }
            }).catch((err) => {
              setResultUploading(false);
              setResultUploadError((err as Error).message || '测试结果上传失败');
            });
            return;
          }
          submitAfterUploads(nextData);
        } else {
          setDocUploadError(result.message || '文档上传失败');
        }
      }).catch((err) => {
        setDocUploading(false);
        setDocUploadError((err as Error).message || '文档上传失败');
      });
      return;
    }

    if (resultFile) {
      setResultUploading(true);
      setResultUploadError('');
      uploadDoc(resultFile).then((result: DocUploadResult) => {
        setResultUploading(false);
        if (result.success && result.data) {
          submitAfterUploads({
            testResultFileName: result.data.fileName,
            testResultFilePath: result.data.filePath,
            testResultFileSize: result.data.fileSize,
          });
        } else {
          setResultUploadError(result.message || '测试结果上传失败');
        }
      }).catch((err) => {
        setResultUploading(false);
        setResultUploadError((err as Error).message || '测试结果上传失败');
      });
      return;
    }

    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'releaseNoteId') {
      const selected = eligibleReleaseNotes.find((item) => item.id === value);
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          releaseNoteId: selected.id,
          versionNumber: selected.version,
          parentVersion: selected.parentVersion || '',
          projectType: (selected.projectType as VersionRecord['projectType']) || prev.projectType,
          changeDescription: prev.changeDescription?.trim() ? prev.changeDescription : selected.changeDescription,
          modifiedModules: prev.modifiedModules && prev.modifiedModules.length > 0 ? prev.modifiedModules : selected.affectedModules,
          riskLevel: selected.regressionRisk || prev.riskLevel || '中',
        }));
      } else {
        setFormData((prev) => ({ ...prev, releaseNoteId: value || undefined }));
      }
      if (errors.releaseNoteId) setErrors((prev) => { const n = { ...prev }; delete n.releaseNoteId; return n; });
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(() => {
        if (!isUrgentOverride) return null;
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            当前关联的是紧急 RD 版本。即使 RD 尚未完成冒烟，QA 也允许提前介入创建测试记录。
          </div>
        );
      })()}

      {formData.releaseNoteId && !eligibleReleaseNotes.some((item) => item.id === formData.releaseNoteId) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          当前记录绑定的是历史 RD 版本，暂未出现在“可新建 QA 记录”的候选列表中。
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          关联 RD 版本 {!record?.id && <span className="text-red-500">*</span>}
        </label>
        <select
          name="releaseNoteId"
          value={formData.releaseNoteId || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{record?.id ? '未绑定旧记录，可重新选择' : '请选择 RD 冒烟通过或紧急版本'}</option>
          {formData.releaseNoteId && !eligibleReleaseNotes.some((item) => item.id === formData.releaseNoteId) && (
            <option value={formData.releaseNoteId}>
              {`${formData.versionNumber || '历史版本'}（当前已关联）`}
            </option>
          )}
          {eligibleReleaseNotes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.version} {item.projectType ? `(${item.projectType})` : ''} - {item.branch} / {item.author}{item.qaEntryMode === 'urgent_override' ? ' [紧急介入]' : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">QA 版本记录可以基于 RD 冒烟通过的 Release Note 创建；如果版本严重程度为紧急，即使 RD 尚未冒烟也允许 QA 提前介入。同一个 RD 版本可以创建多条不同固件的测试记录。</p>
        {errors.releaseNoteId && <p className="text-red-500 text-sm mt-1">{errors.releaseNoteId}</p>}
      </div>

      {isUrgentOverride && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            提前介入原因 <span className="text-red-500">*</span>
          </label>
          <Textarea
            name="qaEarlyInterventionReason"
            value={formData.qaEarlyInterventionReason || ''}
            onChange={handleInputChange}
            placeholder="说明为什么 RD 尚未完成冒烟时，QA 需要提前介入测试"
            rows={3}
            error={errors.qaEarlyInterventionReason}
          />
          <p className="text-xs text-gray-400 mt-1">建议记录紧急背景、影响范围、介入目标和当前已知风险。</p>
        </div>
      )}

      {isUrgentOverride && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            介入责任人 <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="qaEarlyInterventionOwner"
            value={formData.qaEarlyInterventionOwner || ''}
            onChange={handleInputChange}
            placeholder="填写本次提前介入的责任人"
            error={errors.qaEarlyInterventionOwner}
          />
          <p className="text-xs text-gray-400 mt-1">建议填写当前主跟进人，便于后续回溯和催办。</p>
        </div>
      )}

      {formData.parentVersion && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">所属版本分组：</span>
          {formData.parentVersion}
        </div>
      )}

      {/* 版本号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">版本号 <span className="text-red-500">*</span></label>
        <Input type="text" name="versionNumber" value={formData.versionNumber || ''} onChange={handleInputChange} placeholder="例如: v1.0.0" error={errors.versionNumber} readOnly={Boolean(formData.releaseNoteId)} />
        {formData.releaseNoteId && <p className="text-xs text-gray-400 mt-1">版本号从关联的 RD 版本自动带出。</p>}
      </div>

      {/* 项目类型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
        <Select name="projectType" value={formData.projectType || 'TV'} onChange={handleInputChange}
          options={projectOptions} />
      </div>

      {/* 固件版本号 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">固件版本号</label>
        <Input type="text" name="firmwareVersion" value={formData.firmwareVersion || ''} onChange={handleInputChange} placeholder="例如: FW_2.1.3_20260301" />
      </div>

      {/* 关联的 PR/CR */}
      <LinkedIssuesInput
        issues={formData.linkedIssues || []}
        onChange={(issues) => setFormData((prev) => ({ ...prev, linkedIssues: issues }))}
      />

      {/* 修改内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">修改内容 <span className="text-red-500">*</span></label>
        <Textarea name="changeDescription" value={formData.changeDescription || ''} onChange={handleInputChange} placeholder="描述本次版本的主要修改内容" rows={3} error={errors.changeDescription} />
      </div>

      {/* 修改模块 */}
      <TagInput label="修改模块" required tags={formData.modifiedModules || []}
        onChange={(tags) => { setFormData((prev) => ({ ...prev, modifiedModules: tags })); if (errors.modifiedModules) setErrors((prev) => { const n = { ...prev }; delete n.modifiedModules; return n; }); }}
        suggestions={[...DEFAULT_MODULE_OPTIONS]} error={errors.modifiedModules} />

      {/* 语言模型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">语言模型</label>
        <Input type="text" name="languageModel" value={formData.languageModel || ''} onChange={handleInputChange} placeholder="例如: GPT-4o、Qwen2.5" />
      </div>

      {/* 风险等级 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
        <Select name="riskLevel" value={formData.riskLevel || '中'} onChange={handleInputChange}
          options={[...RISK_LEVEL_OPTIONS]} />
      </div>

      {/* 版本状态 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">版本状态</label>
        <Select
          name="versionStatus"
          value={formData.versionStatus || '待测试'}
          onChange={handleInputChange}
          options={[...VERSION_STATUS_OPTIONS]}
        />
        <p className="text-xs text-gray-400 mt-1">建议按 待测试 → 测试中 → 待结论 / 阻塞 → 可发布 → 已发布 的节奏推进</p>
      </div>

      {/* 语音回归结果 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">语音功能回归结果</label>
        <Select name="voiceRegressionResult" value={formData.voiceRegressionResult || '未测试'} onChange={handleInputChange}
          options={[...TEST_RESULT_OPTIONS]} />
        <p className="text-xs text-gray-400 mt-1">用于记录语音主链路能力回归，比如唤醒、ASR、NLU、TTS、多轮对话等。</p>
      </div>

      {/* 系统集成回归结果 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">系统集成回归结果</label>
        <Select name="systemRegressionResult" value={formData.systemRegressionResult || '未测试'} onChange={handleInputChange}
          options={[...TEST_RESULT_OPTIONS]} />
        <p className="text-xs text-gray-400 mt-1">用于记录语音能力与系统页面、设置、权限、网络、蓝牙等联动场景的回归结果。</p>
      </div>

      {/* 测试周期 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">测试周期</label>
        <Input type="text" name="testCycle" value={formData.testCycle || ''} onChange={handleInputChange} placeholder="例如: 2026-03-01 ~ 2026-03-07" />
      </div>

      {/* 原型来源 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">原型来源</label>
        <Input type="text" name="prototypeSource" value={formData.prototypeSource || ''} onChange={handleInputChange} placeholder="输入链接地址或文档描述" />
        {formData.prototypeSource && (formData.prototypeSource.startsWith('http://') || formData.prototypeSource.startsWith('https://')) && (
          <a href={formData.prototypeSource} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline text-xs mt-1 inline-block">
            🔗 打开链接
          </a>
        )}

        {/* 已有上传文档（编辑模式） */}
        {formData.prototypeFileName && !docFile && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mt-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <a href={getDocDownloadUrl(formData.prototypeFilePath!)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-800 hover:underline truncate block">
                {formData.prototypeFileName}
              </a>
              <p className="text-xs text-green-600">{formData.prototypeFileSize ? formatFileSize(formData.prototypeFileSize) : ''}</p>
            </div>
            <button type="button" onClick={() => { setFormData((prev) => ({ ...prev, prototypeFileName: undefined, prototypeFilePath: undefined, prototypeFileSize: undefined })); }} className="text-red-500 hover:text-red-700 text-sm">移除</button>
          </div>
        )}

        {/* 新选择的文档 */}
        {docFile && (
          <div className="flex items-center gap-3 p-3 bg-blue-100 border border-blue-300 rounded-lg mt-2">
            <svg className="w-5 h-5 text-blue-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-700 truncate">{docFile.name}</p>
              <p className="text-xs text-blue-700">{formatFileSize(docFile.size)} · 待上传</p>
            </div>
            <button type="button" onClick={() => { setDocFile(null); setDocUploadError(''); if (docInputRef.current) docInputRef.current.value = ''; }} className="text-red-500 hover:text-red-700 text-sm">移除</button>
          </div>
        )}

        {docUploadError && <p className="text-red-500 text-sm mt-1">{docUploadError}</p>}

        {/* 上传按钮 */}
        {!docFile && !formData.prototypeFileName && (
          <div className="mt-2">
            <button type="button" onClick={() => docInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-blue-100 hover:border-blue-400 hover:text-blue-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              上传文档
            </button>
            <span className="text-gray-400 text-xs ml-2">支持 PDF、Word、图片等，最大 100MB</span>
          </div>
        )}
        <input ref={docInputRef} type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 100 * 1024 * 1024) { setDocUploadError('文件大小不能超过 100MB'); return; } setDocFile(f); setDocUploadError(''); } }} className="hidden" />
      </div>

      {/* 测试结果 Excel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">测试结果 Excel</label>

        {formData.testResultFileName && !resultFile && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mt-2">
            <div className="flex-1 min-w-0">
              <a href={getDocDownloadUrl(formData.testResultFilePath!)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-800 hover:underline truncate block">
                {formData.testResultFileName}
              </a>
              <p className="text-xs text-emerald-600">{formData.testResultFileSize ? formatFileSize(formData.testResultFileSize) : ''}</p>
            </div>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, testResultFileName: undefined, testResultFilePath: undefined, testResultFileSize: undefined }))} className="text-red-500 hover:text-red-700 text-sm">移除</button>
          </div>
        )}

        {resultFile && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 truncate">{resultFile.name}</p>
              <p className="text-xs text-amber-700">{formatFileSize(resultFile.size)} · 待上传</p>
            </div>
            <button type="button" onClick={() => { setResultFile(null); setResultUploadError(''); if (resultInputRef.current) resultInputRef.current.value = ''; }} className="text-red-500 hover:text-red-700 text-sm">移除</button>
          </div>
        )}

        {resultUploadError && <p className="text-red-500 text-sm mt-1">{resultUploadError}</p>}

        {!resultFile && !formData.testResultFileName && (
          <div className="mt-2">
            <button type="button" onClick={() => resultInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-blue-100 hover:border-blue-400 hover:text-blue-600 transition-colors">
              上传测试结果
            </button>
            <span className="text-gray-400 text-xs ml-2">支持 Excel/CSV，最大 100MB</span>
          </div>
        )}
        <input
          ref={resultInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              if (f.size > 100 * 1024 * 1024) { setResultUploadError('文件大小不能超过 100MB'); return; }
              const lower = f.name.toLowerCase();
              if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
                setResultUploadError('只允许上传 Excel 或 CSV 文件');
                return;
              }
              setResultFile(f);
              setResultUploadError('');
            }
          }}
          className="hidden"
        />
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <Textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} placeholder="添加任何额外的备注信息" rows={2} />
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 justify-end pt-4">
        <Button onClick={onCancel} variant="secondary" disabled={loading || docUploading || resultUploading}>取消</Button>
        <Button type="submit" variant="primary" disabled={loading || docUploading || resultUploading}>
          {docUploading ? '上传原型中...' : resultUploading ? '上传测试结果中...' : loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
};

export default VersionRecordForm;
