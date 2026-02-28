/**
 * 查询和筛选操作
 * 提供复杂查询、搜索、统计等功能
 */

import { getDatabase } from '../database';
import {
  VersionRecord,
  CustomerProblem,
  VoiceRecord,
  QueryFilter,
  PaginationOptions,
  PaginationResult,
} from '../../types/database';

// ============ 版本记录查询 ============

/**
 * 分页查询版本记录
 */
export async function queryVersionRecords(
  filters: QueryFilter = {},
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<VersionRecord>> {
  const db = getDatabase();
  const { page, pageSize } = pagination;

  let query = db.versionTestRecords.toCollection();

  // 应用过滤条件
  if (filters.riskLevel) {
    const riskLevelMap: Record<string, string> = {
      'low': '低',
      'medium': '中',
      'high': '高',
    };
    const chineseRiskLevel = riskLevelMap[filters.riskLevel] || filters.riskLevel;
    query = query.filter((record) => record.riskLevel === chineseRiskLevel);
  }

  if (filters.startDate && filters.endDate) {
    query = query.filter(
      (record) => record.createdAt >= filters.startDate! && record.createdAt <= filters.endDate!
    );
  }

  if (filters.modifiedModules && filters.modifiedModules.length > 0) {
    query = query.filter((record) =>
      filters.modifiedModules!.some((module) => record.modifiedModules.includes(module))
    );
  }

  // 获取总数
  const total = await query.count();

  // 计算分页
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // 执行分页查询
  const data = await query.offset(offset).limit(pageSize).toArray();

  return { data, total, page, pageSize, totalPages };
}

/**
 * 搜索版本记录
 */
export async function searchVersionRecords(
  keyword: string,
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<VersionRecord>> {
  const db = getDatabase();
  const { page, pageSize } = pagination;

  const lowerKeyword = keyword.toLowerCase();
  let query = db.versionTestRecords.toCollection();

  query = query.filter(
    (record) =>
      record.versionNumber.toLowerCase().includes(lowerKeyword) ||
      record.changeDescription.toLowerCase().includes(lowerKeyword)
  );

  const total = await query.count();
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  const data = await query.offset(offset).limit(pageSize).toArray();

  return { data, total, page, pageSize, totalPages };
}

/**
 * 按日期范围查询版本记录
 */
export async function getVersionRecordsByDateRange(
  startDate: number,
  endDate: number
): Promise<VersionRecord[]> {
  const db = getDatabase();
  return await db.versionTestRecords
    .where('createdAt')
    .between(startDate, endDate)
    .toArray();
}

/**
 * 按版本号获取版本记录
 */
export async function getVersionRecordByNumber(versionNumber: string): Promise<VersionRecord | undefined> {
  const db = getDatabase();
  return await db.versionTestRecords.where('versionNumber').equals(versionNumber).first();
}

/**
 * 按风险等级获取版本记录
 */
export async function getVersionRecordsByRiskLevel(
  riskLevel: 'low' | 'medium' | 'high'
): Promise<VersionRecord[]> {
  const db = getDatabase();
  return await db.versionTestRecords.where('riskLevel').equals(riskLevel).toArray();
}

// ============ 客户问题查询 ============

/**
 * 分页查询客户问题
 */
export async function queryCustomerProblems(
  filters: QueryFilter = {},
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<CustomerProblem>> {
  const db = getDatabase();
  const { page, pageSize } = pagination;

  let query = db.customerProblems.toCollection();

  // 应用过滤条件
  if (filters.category) {
    query = query.filter((record) => record.classification === filters.category);
  }

  if (filters.status) {
    const statusMap: Record<string, string> = {
      'open': '开放',
      'in_progress': '进行中',
      'resolved': '已解决',
    };
    const chineseStatus = statusMap[filters.status] || filters.status;
    query = query.filter((record) => record.status === chineseStatus);
  }

  if (filters.startDate && filters.endDate) {
    query = query.filter(
      (record) => record.createdAt >= filters.startDate! && record.createdAt <= filters.endDate!
    );
  }

  // 获取总数
  const total = await query.count();

  // 计算分页
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // 执行分页查询
  const data = await query.offset(offset).limit(pageSize).toArray();

  return { data, total, page, pageSize, totalPages };
}

/**
 * 搜索客户问题
 */
export async function searchCustomerProblems(
  keyword: string,
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<CustomerProblem>> {
  const db = getDatabase();
  const { page, pageSize } = pagination;

  const lowerKeyword = keyword.toLowerCase();
  let query = db.customerProblems.toCollection();

  query = query.filter(
    (record) =>
      record.description.toLowerCase().includes(lowerKeyword)
  );

  const total = await query.count();
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  const data = await query.offset(offset).limit(pageSize).toArray();

  return { data, total, page, pageSize, totalPages };
}

/**
 * 按分类获取客户问题
 */
export async function getCustomerProblemsByCategory(
  category: string
): Promise<CustomerProblem[]> {
  const db = getDatabase();
  return await db.customerProblems.where('classification').equals(category).toArray();
}

/**
 * 按状态获取客户问题
 */
export async function getCustomerProblemsByStatus(
  status: 'open' | 'in_progress' | 'resolved'
): Promise<CustomerProblem[]> {
  const db = getDatabase();
  const statusMap: Record<string, string> = {
    'open': '开放',
    'in_progress': '进行中',
    'resolved': '已解决',
  };
  const chineseStatus = statusMap[status] || status;
  return await db.customerProblems.where('status').equals(chineseStatus).toArray();
}

/**
 * 按版本号获取客户问题
 */
export async function getCustomerProblemsByVersion(versionNumber: string): Promise<CustomerProblem[]> {
  const db = getDatabase();
  // CustomerProblem 没有 versionNumber 字段，返回空数组
  return [];
}

// ============ 语音识别记录查询 ============

/**
 * 分页查询语音识别记录
 */
export async function queryVoiceRecords(
  filters: QueryFilter = {},
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
): Promise<PaginationResult<VoiceRecord>> {
  const db = getDatabase();
  const { page, pageSize } = pagination;

  let query = db.voiceRecognitionRecords.toCollection();

  // 应用过滤条件
  if (filters.versionNumber) {
    query = query.filter((record) => record.versionNumber === filters.versionNumber);
  }

  if (typeof filters.isCorrect === 'boolean') {
    query = query.filter((record) => record.isCorrect === filters.isCorrect);
  }

  // 获取总数
  const total = await query.count();

  // 计算分页
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // 执行分页查询
  const data = await query.offset(offset).limit(pageSize).toArray();

  return { data, total, page, pageSize, totalPages };
}

/**
 * 按语料 ID 获取语音识别记录
 */
export async function getVoiceRecordsByCorpusId(corpusId: string): Promise<VoiceRecord[]> {
  const db = getDatabase();
  return await db.voiceRecognitionRecords.where('corpusId').equals(corpusId).toArray();
}

/**
 * 按版本号获取语音识别记录
 */
export async function getVoiceRecordsByVersion(versionNumber: string): Promise<VoiceRecord[]> {
  const db = getDatabase();
  return await db.voiceRecognitionRecords.where('versionNumber').equals(versionNumber).toArray();
}

// ============ 统计函数 ============

/**
 * 获取语音识别准确率
 */
export async function getVoiceRecordAccuracy(): Promise<number> {
  const db = getDatabase();
  const records = await db.voiceRecognitionRecords.toArray();

  if (records.length === 0) return 0;

  const correctCount = records.filter((r) => r.isCorrect).length;
  return (correctCount / records.length) * 100;
}

/**
 * 获取版本记录统计
 */
export async function getVersionRecordStats(): Promise<{
  total: number;
  passed: number;
  failed: number;
  pending: number;
}> {
  const db = getDatabase();
  const records = await db.versionTestRecords.toArray();

  return {
    total: records.length,
    passed: records.filter((r) => r.smokeTestResult === '通过').length,
    failed: records.filter((r) => r.smokeTestResult === '失败').length,
    pending: records.filter((r) => r.smokeTestResult === '未测试').length,
  };
}

/**
 * 获取客户问题统计
 */
export async function getCustomerProblemStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}> {
  const db = getDatabase();
  const records = await db.customerProblems.toArray();

  return {
    total: records.length,
    open: records.filter((r) => r.status === '开放').length,
    inProgress: records.filter((r) => r.status === '进行中').length,
    resolved: records.filter((r) => r.status === '已解决').length,
  };
}

/**
 * 获取问题分类统计
 */
export async function getProblemCategoryStats(): Promise<Record<string, number>> {
  const db = getDatabase();
  const records = await db.customerProblems.toArray();

  const stats: Record<string, number> = {};
  for (const record of records) {
    const category = record.classification || '未分类';
    stats[category] = (stats[category] || 0) + 1;
  }

  return stats;
}
