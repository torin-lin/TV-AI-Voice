/**
 * 数据库类型定义
 * 定义所有数据表的接口和相关类型
 */

/**
 * 版本测试记录接口
 */
export interface VersionRecord {
  id?: string;
  versionNumber: string;
  changeDescription: string;
  modifiedModules: string[];
  riskLevel: '低' | '中' | '高';
  smokeTestResult: '通过' | '失败' | '未测试';
  voiceRegressionResult: '通过' | '失败' | '未测试';
  systemRegressionResult: '通过' | '失败' | '未测试';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 客户问题接口
 */
export interface CustomerProblem {
  id?: string;
  description: string;
  classification?: string;
  confidence?: number;
  status: '开放' | '进行中' | '已解决';
  notes?: string;
  createdAt: number;
  updatedAt: number;
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
 * 测试用例接口
 */
export interface TestCase {
  id: string;
  caseId: string;
  caseName: string;
  description: string;
  steps: string[];
  expectedResult: string;
  category: string;
  riskLevel: string;
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
  customerProblems: CustomerProblem[];
  voiceRecords: VoiceRecord[];
  testCases: TestCase[];
  exportDate: string;
}
