import React, { useState, useEffect, useRef } from 'react';
import { ReleaseNote } from '../../../types/database';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Textarea } from '../../../components/common/Textarea';
import { uploadApk, formatFileSize, ApkUploadResult } from '../../../services/ApkUploadService';
import { apiGetParentVersions, ParentVersionInfo } from '../../../services/ReleaseNoteApiClient';

interface ReleaseNoteFormProps {
  record?: ReleaseNote | null;
  defaultProjectType?: string;
  /** 预设的父版本号（从大版本下添加子版本时传入） */
  defaultParentVersion?: string;
  onSubmit: (data: Partial<ReleaseNote>) => void;
  onCancel: () => void;
  loading?: boolean;
}

/** 默认模块选项（用户可自定义添加） */
const DEFAULT_MODULES = ['录音', '蓝牙', 'ASR', 'NLU', '服务端', '网络', 'Android', 'UI', '数据库'];
/** 默认功能选项（用户可自定义添加） */
const DEFAULT_FEATURES = ['语音识别', '语音合成', '自然语言理解', '数据同步', '性能优化', '安全性'];

/**
 * 标签输入组件
 * 支持从预设选项中选择，也支持自定义输入新标签
 */
const TagInput: React.FC<{
  label: string;
  required?: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  error?: string;
  placeholder?: string;
}> = ({ label, required, tags, onChange, suggestions, error }) => {
  const [customValue, setCustomValue] = useState('');

  // 未选择的预设选项
  const availableSuggestions = suggestions.filter((s) => !tags.includes(s));

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleCustomAdd = () => {
    if (customValue.trim()) {
      addTag(customValue);
      setCustomValue('');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {/* 已选标签 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-200 text-blue-700 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-700 hover:text-blue-800 font-bold ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* 可选标签（直接点击添加） */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="px-3 py-1 border border-gray-300 text-gray-600 rounded-full text-sm hover:bg-blue-100 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {/* 自定义输入 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomAdd(); } }}
          placeholder="自定义添加..."
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleCustomAdd}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-blue-100 hover:text-blue-600 transition-colors"
        >
          添加
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

/**
 * Release Note 表单组件
 * 用于添加和编辑 Release Note
 */
const ReleaseNoteForm: React.FC<ReleaseNoteFormProps> = ({
  record,
  defaultProjectType,
  defaultParentVersion,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<ReleaseNote>>({
    version: '',
    parentVersion: defaultParentVersion || '',
    branch: '',
    author: '',
    changeDescription: '',
    affectedModules: [],
    changeType: '功能',
    severity: '中',
    testingNotes: '',
    regressionRisk: '中',
    affectedFeatures: [],
    breakingChanges: false,
    migrationType: '无',
    fixedPRs: [],
    projectType: (defaultProjectType as any) || 'TV',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [apkUploading, setApkUploading] = useState(false);
  const [apkUploadProgress, setApkUploadProgress] = useState(0);
  const [apkUploadError, setApkUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parentVersions, setParentVersions] = useState<ParentVersionInfo[]>([]);

  useEffect(() => {
    if (record) setFormData(record);
  }, [record]);

  // 加载大版本列表
  useEffect(() => {
    apiGetParentVersions().then(setParentVersions).catch(() => {});
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.version?.trim()) newErrors.version = '版本号不能为空';
    if (!formData.branch?.trim()) newErrors.branch = '分支名不能为空';
    if (!formData.author?.trim()) newErrors.author = '作者不能为空';
    if (!formData.changeDescription?.trim()) newErrors.changeDescription = '修改内容不能为空';
    if (!formData.affectedModules || formData.affectedModules.length === 0) {
      newErrors.affectedModules = '至少添加一个受影响的模块';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let submitData = { ...formData };

    if (apkFile) {
      setApkUploading(true);
      setApkUploadProgress(0);
      setApkUploadError('');
      try {
        const result: ApkUploadResult = await uploadApk(apkFile, (percent) => {
          setApkUploadProgress(percent);
        });
        if (result.success && result.data) {
          submitData = {
            ...submitData,
            apkFileName: result.data.fileName,
            apkFileSize: result.data.fileSize,
            apkFilePath: result.data.filePath,
          };
        } else {
          setApkUploadError(result.message || 'APK 上传失败');
          setApkUploading(false);
          return;
        }
      } catch (error) {
        setApkUploadError((error as Error).message || 'APK 上传失败，请检查服务端是否运行');
        setApkUploading(false);
        return;
      }
      setApkUploading(false);
    }

    onSubmit(submitData);
  };

  const handleApkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkUploadError('只允许上传 .apk 文件');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setApkUploadError('文件大小不能超过 500MB');
      return;
    }
    setApkFile(file);
    setApkUploadError('');
  };

  const handleRemoveApk = () => {
    setApkFile(null);
    setApkUploadError('');
    setApkUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData((prev) => ({
      ...prev,
      apkFileName: undefined,
      apkFileSize: undefined,
      apkFilePath: undefined,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 版本号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            版本号 <span className="text-red-500">*</span>
          </label>
          <Input
            type="text" name="version" value={formData.version || ''}
            onChange={handleInputChange} placeholder={formData.parentVersion ? '例如: 10.5.0.002-Pre' : '例如: 10.5.0-Pre'} error={errors.version}
          />
        </div>

        {/* 所属大版本 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            所属大版本
          </label>
          <select
            name="parentVersion"
            value={formData.parentVersion || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">无（自身为大版本）</option>
            {parentVersions.map((pv) => (
              <option key={pv.id} value={pv.version}>
                {pv.version}{pv.projectType ? ` (${pv.projectType})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {formData.parentVersion ? '子版本：将归属到大版本下' : '大版本：可在此版本下添加子版本 APK'}
          </p>
        </div>

        {/* 分支名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            分支名 <span className="text-red-500">*</span>
          </label>
          <Input
            type="text" name="branch" value={formData.branch || ''}
            onChange={handleInputChange} placeholder="例如: main, develop, release/v1.0" error={errors.branch}
          />
        </div>

        {/* 作者 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            作者 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              name="author" value={formData.author || ''}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择或输入...</option>
              <option value="jeson.zhang">jeson.zhang</option>
            </select>
            <Input
              type="text" name="author" value={formData.author || ''}
              onChange={handleInputChange} placeholder="自定义输入" error={errors.author}
            />
          </div>
        </div>

        {/* 项目类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
          <Select
            name="projectType" value={formData.projectType || 'TV'}
            onChange={handleInputChange}
            options={[
              { value: 'TV', label: 'TV AI Voice' },
              { value: 'Projector', label: 'Projector AI Voice' },
              { value: 'STB', label: 'STB AI Voice' },
            ]}
          />
        </div>

        {/* 修改类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">修改类型</label>
          <Select
            name="changeType" value={formData.changeType || '功能'}
            onChange={handleInputChange}
            options={[
              { value: '功能', label: '功能' },
              { value: '修复', label: '修复' },
              { value: '优化', label: '优化' },
              { value: '重构', label: '重构' },
              { value: '文档', label: '文档' },
            ]}
          />
        </div>

        {/* 严重程度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
          <Select
            name="severity" value={formData.severity || '中'}
            onChange={handleInputChange}
            options={[
              { value: '低', label: '低' },
              { value: '中', label: '中' },
              { value: '高', label: '高' },
              { value: '紧急', label: '紧急' },
            ]}
          />
        </div>

        {/* 回归风险 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">回归风险</label>
          <Select
            name="regressionRisk" value={formData.regressionRisk || '中'}
            onChange={handleInputChange}
            options={[
              { value: '低', label: '低' },
              { value: '中', label: '中' },
              { value: '高', label: '高' },
            ]}
          />
        </div>

        {/* 迁移类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">迁移类型</label>
          <Select
            name="migrationType" value={formData.migrationType || '无'}
            onChange={handleInputChange}
            options={[
              { value: '无', label: '无' },
              { value: '数据迁移', label: '数据迁移' },
              { value: '配置更新', label: '配置更新' },
              { value: '其他', label: '其他' },
            ]}
          />
        </div>

        {/* 破坏性变更 */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox" name="breakingChanges"
              checked={formData.breakingChanges || false}
              onChange={handleInputChange} className="w-4 h-4 rounded border-gray-300"
            />
            破坏性变更
          </label>
        </div>
      </div>

      {/* 修改内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          修改内容 <span className="text-red-500">*</span>
        </label>
        <Textarea
          name="changeDescription" value={formData.changeDescription || ''}
          onChange={handleInputChange} placeholder="详细描述本次修改的内容" rows={3}
          error={errors.changeDescription}
        />
      </div>

      {/* 修复 PR 列表 */}
      <TagInput
        label="修复 PR 列表"
        tags={formData.fixedPRs || []}
        onChange={(tags) => setFormData((prev) => ({ ...prev, fixedPRs: tags }))}
        suggestions={[]}
        placeholder="输入 PR/CR 号后回车添加"
      />

      {/* 受影响的模块 — 标签输入 */}
      <TagInput
        label="受影响的模块"
        required
        tags={formData.affectedModules || []}
        onChange={(tags) => {
          setFormData((prev) => ({ ...prev, affectedModules: tags }));
          if (errors.affectedModules) {
            setErrors((prev) => { const n = { ...prev }; delete n.affectedModules; return n; });
          }
        }}
        suggestions={DEFAULT_MODULES}
        error={errors.affectedModules}
      />

      {/* 受影响的功能 — 标签输入 */}
      <TagInput
        label="受影响的功能"
        tags={formData.affectedFeatures || []}
        onChange={(tags) => setFormData((prev) => ({ ...prev, affectedFeatures: tags }))}
        suggestions={DEFAULT_FEATURES}
      />

      {/* 测试备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">测试备注</label>
        <Textarea
          name="testingNotes" value={formData.testingNotes || ''}
          onChange={handleInputChange}
          placeholder="测试工程师需要关注的事项、测试建议等" rows={3}
        />
      </div>

      {/* APK 上传 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">APK 文件</label>

        {formData.apkFileName && !apkFile && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">{formData.apkFileName}</p>
              <p className="text-xs text-green-600">{formData.apkFileSize ? formatFileSize(formData.apkFileSize) : ''}</p>
            </div>
            <button type="button" onClick={handleRemoveApk} className="text-red-500 hover:text-red-700 text-sm">移除</button>
          </div>
        )}

        {apkFile && (
          <div className="flex items-center gap-3 p-3 bg-blue-100 border border-blue-300 rounded-lg mb-2">
            <svg className="w-5 h-5 text-blue-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-700 truncate">{apkFile.name}</p>
              <p className="text-xs text-blue-700">{formatFileSize(apkFile.size)} · 待上传</p>
            </div>
            <button type="button" onClick={handleRemoveApk} className="text-red-500 hover:text-red-700 text-sm">移除</button>
          </div>
        )}

        {apkUploading && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>上传中...</span><span>{apkUploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${apkUploadProgress}%` }} />
            </div>
          </div>
        )}

        {apkUploadError && <p className="text-red-500 text-sm mb-2">{apkUploadError}</p>}

        {!apkFile && !formData.apkFileName && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">点击选择 APK 文件</p>
            <p className="text-xs text-gray-400 mt-1">支持 .apk 格式，最大 500MB</p>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".apk" onChange={handleApkFileChange} className="hidden" />
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 justify-end pt-4">
        <Button onClick={onCancel} variant="secondary" disabled={loading || apkUploading}>取消</Button>
        <Button type="submit" variant="primary" disabled={loading || apkUploading}>
          {apkUploading ? '上传 APK 中...' : loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  );
};

export default ReleaseNoteForm;
