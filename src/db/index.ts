/**
 * 数据库模块导出
 * 统一导出所有数据库相关的函数和类
 */

// 数据库初始化
export { initializeDatabase, getDatabase, isDatabaseInitialized, closeDatabase, db } from './database';
export type { TVAIVoiceDatabase } from './database';

// CRUD 操作
export {
  createVersionRecord,
  getVersionRecord,
  getAllVersionRecords,
  updateVersionRecord,
  deleteVersionRecord,
  bulkCreateVersionRecords,
  bulkDeleteVersionRecords,
  bulkUpdateVersionRecords,
  createCustomerProblem,
  getCustomerProblem,
  getAllCustomerProblems,
  updateCustomerProblem,
  deleteCustomerProblem,
  bulkCreateCustomerProblems,
  bulkDeleteCustomerProblems,
  createVoiceRecord,
  getVoiceRecord,
  getAllVoiceRecords,
  deleteVoiceRecord,
  bulkCreateVoiceRecords,
  bulkDeleteVoiceRecords,
  createTestCase,
  getTestCase,
  getAllTestCases,
  deleteTestCase,
  bulkCreateTestCases,
} from './operations/crud';

// 查询操作
export {
  queryVersionRecords,
  searchVersionRecords,
  getVersionRecordsByDateRange,
  getVersionRecordByNumber,
  getVersionRecordsByRiskLevel,
  queryCustomerProblems,
  searchCustomerProblems,
  getCustomerProblemsByCategory,
  getCustomerProblemsByStatus,
  getCustomerProblemsByVersion,
  queryVoiceRecords,
  getVoiceRecordsByCorpusId,
  getVoiceRecordsByVersion,
  getVoiceRecordAccuracy,
  getVersionRecordStats,
  getCustomerProblemStats,
  getProblemCategoryStats,
} from './operations/query';

// 事务操作
export {
  executeTransaction,
  executeTransactionWithRetry,
  executeReadTransaction,
  executeWriteTransaction,
} from './operations/transaction';

// 备份和恢复
export {
  backupDatabase,
  restoreDatabase,
  clearAllData,
  getStorageUsage,
  cleanupExpiredData,
  getDatabaseStats,
} from './operations/backup';

// 工具函数
export {
  validateData,
  validateVersionRecord,
  validateCustomerProblem,
  validateVoiceRecord,
  versionRecordValidationRules,
  customerProblemValidationRules,
  voiceRecordValidationRules,
} from './utils/validation';

export { QueryCache, queryCache, generateCacheKey, getOrSetCache, cleanupAllCaches } from './utils/cache';

export {
  DatabaseError,
  createDatabaseError,
  handleDatabaseError,
  isDatabaseError,
  getErrorMessage,
  logError,
} from './utils/error';

export { Logger, LogLevel, logger } from './utils/logger';
export type { LogEntry } from './utils/logger';

export {
  generateUUID,
  generateShortId,
  getCurrentTimestamp,
  formatDate,
  parseDate,
  getDateRange,
  getTodayRange,
  getWeekRange,
  getMonthRange,
  deepClone,
  mergeObjects,
  filterObject,
  transformObjectKeys,
  calculatePercentage,
  formatBytes,
  delay,
  retry,
  uniqueArray,
  groupArray,
} from './utils/helpers';

// 类型导出
export type {
  VersionRecord,
  CustomerProblem,
  VoiceRecord,
  TestCase,
  QueryFilter,
  PaginationOptions,
  PaginationResult,
  StorageUsage,
  ValidationRule,
  ValidationResult,
  CacheEntry,
  BackupData,
} from '../types/database';

export { DatabaseErrorType } from '../types/database';
