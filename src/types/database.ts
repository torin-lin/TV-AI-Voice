/**
 * 数据库类型定义
 * 定义所有数据表的接口和相关类型
 */

/**
 * Release Note 接口（研发代码修改同步）
 */
export interface ReleaseNote {
  id?: string;
  version: string;
  /** 父版本号（大版本），为空表示自身是大版本 */
  parentVersion?: string;
  branch: string;
  commitHash?: string;
  commitMessage?: string;
  author: string;
  changeDescription: string;
  affectedModules: string[];
  changeType: '功能' | '修复' | '优化' | '重构' | '文档';
  severity: '低' | '中' | '高' | '紧急';
  testingNotes?: string;
  regressionRisk?: '低' | '中' | '高';
  affectedFeatures?: string[];
  breakingChanges?: boolean;
  migrationType?: '无' | '数据迁移' | '配置更新' | '其他';
  projectType?: 'TV' | 'Projector' | 'STB';
  /** 修复的 PR/CR 列表 */
  fixedPRs?: string[];
  /** APK 文件名 */
  apkFileName?: string;
  /** APK 文件大小（字节） */
  apkFileSize?: number;
  /** APK 文件在服务端的存储路径 */
  apkFilePath?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 版本测试记录接口
 */
export interface VersionRecord {
  id?: string;
  versionNumber: string;
  /** 关联主版本号，为空表示自身是主版本 */
  parentVersion?: string;
  /** 固件版本号 */
  firmwareVersion?: string;
  /** 关联的 PR/CR 号列表 */
  linkedIssues?: string[];
  changeDescription: string;
  modifiedModules: string[];
  riskLevel: '低' | '中' | '高';
  smokeTestResult: '通过' | '失败' | '未测试';
  voiceRegressionResult: '通过' | '失败' | '未测试';
  systemRegressionResult: '通过' | '失败' | '未测试';
  projectType?: 'TV' | 'Projector' | 'STB';
  /** 测试周期 */
  testCycle?: string;
  /** 原型来源（文档链接或描述） */
  prototypeSource?: string;
  /** 原型文档文件名 */
  prototypeFileName?: string;
  /** 原型文档服务端路径 */
  prototypeFilePath?: string;
  /** 原型文档文件大小 */
  prototypeFileSize?: number;
  /** 测试结果 Excel 文件名 */
  testResultFileName?: string;
  /** 测试结果 Excel 服务端路径 */
  testResultFilePath?: string;
  /** 测试结果 Excel 文件大小 */
  testResultFileSize?: number;
  /** 语言模型 */
  languageModel?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 客户问题接口
 */
export interface CustomerProblem {
  id?: string;
  /** 问题类型：客户问题 / QA问题 */
  problemType: 'customer' | 'qa';
  /** PR号（zmind issue ID） */
  issueId?: string;
  /** 固件版本号（从 zmind 自动获取） */
  firmwareVersion?: string;
  description: string;
  classification?: string;
  confidence?: number;
  status: '开放' | '进行中' | '已解决';
  /** 关联的 QA 问题 ID 列表（仅客户问题使用） */
  linkedQaProblems?: string[];
  /** 项目类型 */
  projectType?: 'TV' | 'Projector' | 'STB';
  /** PR/CR 在 zmind 上的创建时间（追责时间轴依据） */
  issueCreatedAt?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 版本问题接口（QA 提问题，RD 解决）
 */
export interface VersionIssue {
  id?: string;
  /** 关联的版本记录 ID */
  versionRecordId: string;
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description?: string;
  /** 前提条件 */
  precondition?: string;
  /** 测试环境 */
  testEnvironment?: string;
  /** 问题状态 */
  status: '待处理' | '处理中' | '已解决' | '已关闭';
  /** 严重程度 */
  severity: '低' | '中' | '高' | '紧急';
  /** 关联的 zmind PR 号 */
  linkedPR?: string;
  /** 提交人 */
  reporter: string;
  /** 处理人 */
  assignee?: string;
  /** 解决备注 */
  resolution?: string;
  /** 附件列表 (JSON 数组) */
  attachments?: IssueAttachment[];
  /** 同步到问题追踪的 QA 问题 ID */
  syncedProblemId?: string;
  createdAt: number;
  updatedAt: number;
}

/** 问题附件 */
export interface IssueAttachment {
  /** 原始文件名 */
  fileName: string;
  /** 服务端保存的文件名 */
  savedFileName: string;
  /** 下载路径 */
  filePath: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件类型: image / video / log */
  fileType: 'image' | 'video' | 'log' | 'other';
  /** 上传时间 */
  uploadedAt: number;
}

/**
 * 语音识别记录接口
 */
export interface VoiceRecord {
  id: string;
  corpusId: string;
  originalText: string;
  recognizedText: string;
  isCorrect: boolean;
  versionNumber: string;
  createdAt: number;
}

/**
 * 测试用例接口（知识库）
 */
export interface TestCase {
  id?: string;
  /** 用例编号 */
  caseId: string;
  /** 用例名称 */
  caseName: string;
  /** 用例描述（操作步骤） */
  description: string;
  /** 前置条件 */
  precondition?: string;
  /** 测试步骤 */
  steps: string[];
  /** 预期结果 */
  expectedResult: string;
  /** 分类（如：语音、蓝牙、系统等） */
  category: string;
  /** 关联模块 */
  module?: string;
  /** 优先级 */
  priority: 'L1' | 'L2' | 'L3' | 'L4' | '高' | '中' | '低';
  /** 项目类型 */
  projectType?: 'TV' | 'Projector' | 'STB';
  /** 关键词标签 */
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * AI 推荐结果接口
 */
export interface KBRecommendation {
  id?: string;
  /** 关联的版本记录 ID */
  versionRecordId?: string;
  /** 版本号 */
  versionNumber: string;
  /** 推荐的测试用例 */
  recommendedCases: { caseId: string; caseName: string; reason: string; score: number }[];
  /** 需要复测的问题 */
  retestIssues: { issueId: string; title: string; reason: string; score: number }[];
  /** 测试计划摘要 */
  testPlanSummary: string;
  /** 风险分析 */
  riskAnalysis: string;
  /** 是否使用了 AI */
  usedAI: boolean;
  createdAt: number;
}

/**
 * 查询过滤器接口
 */
export interface QueryFilter {
  riskLevel?: 'low' | 'medium' | 'high';
  startDate?: number;
  endDate?: number;
  modifiedModules?: string[];
  category?: string;
  status?: 'open' | 'in_progress' | 'resolved';
  versionNumber?: string;
  [key: string]: any;
}

/**
 * 分页选项接口
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * 分页结果接口
 */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 存储使用情况接口
 */
export interface StorageUsage {
  used: number;
  available: number;
  percentage: number;
}

/**
 * 数据库错误类型枚举
 */
export enum DatabaseErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  CLEAR_FAILED = 'CLEAR_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  value: any;
  timestamp: number;
}

/**
 * 备份数据接口
 */
export interface BackupData {
  versionRecords: VersionRecord[];
  releaseNotes: ReleaseNote[];
  customerProblems: CustomerProblem[];
  voiceRecords: VoiceRecord[];
  testCases: TestCase[];
  exportDate: string;
}
