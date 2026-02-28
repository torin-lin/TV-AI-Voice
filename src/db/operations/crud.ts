/**
 * CRUD 操作
 * 提供创建、读取、更新、删除操作的接口
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import {
  VersionRecord,
  CustomerProblem,
  VoiceRecord,
  TestCase,
} from '../../types/database';

/**
 * 生成 UUID
 */
function generateId(): string {
  return uuidv4();
}

/**
 * 获取当前时间戳
 */
function getCurrentTimestamp(): number {
  return Date.now();
}

// ============ 版本记录 CRUD ============

/**
 * 创建版本记录
 */
export async function createVersionRecord(
  data: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = getCurrentTimestamp();

  const record: VersionRecord = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.versionTestRecords.add(record);
  return id;
}

/**
 * 获取版本记录
 */
export async function getVersionRecord(id: string): Promise<VersionRecord | undefined> {
  const db = getDatabase();
  return await db.versionTestRecords.get(id);
}

/**
 * 获取所有版本记录
 */
export async function getAllVersionRecords(): Promise<VersionRecord[]> {
  const db = getDatabase();
  return await db.versionTestRecords.toArray();
}

/**
 * 更新版本记录
 */
export async function updateVersionRecord(
  id: string,
  data: Partial<VersionRecord>
): Promise<void> {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  await db.versionTestRecords.update(id, {
    ...data,
    updatedAt: now,
  });
}

/**
 * 删除版本记录
 */
export async function deleteVersionRecord(id: string): Promise<void> {
  const db = getDatabase();
  await db.versionTestRecords.delete(id);
}

/**
 * 批量创建版本记录
 */
export async function bulkCreateVersionRecords(
  records: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<string[]> {
  const db = getDatabase();
  const ids: string[] = [];
  const now = getCurrentTimestamp();

  const recordsToAdd = records.map((record) => {
    const id = generateId();
    ids.push(id);
    return {
      ...record,
      id,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db.versionTestRecords.bulkAdd(recordsToAdd);
  return ids;
}

/**
 * 批量删除版本记录
 */
export async function bulkDeleteVersionRecords(ids: string[]): Promise<void> {
  const db = getDatabase();
  await db.versionTestRecords.bulkDelete(ids);
}

/**
 * 批量更新版本记录
 */
export async function bulkUpdateVersionRecords(
  updates: Array<{
    id: string;
    data: Partial<VersionRecord>;
  }>
): Promise<void> {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  for (const { id, data } of updates) {
    await db.versionTestRecords.update(id, {
      ...data,
      updatedAt: now,
    });
  }
}

// ============ 客户问题 CRUD ============

/**
 * 创建客户问题
 */
export async function createCustomerProblem(
  data: Omit<CustomerProblem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = getCurrentTimestamp();

  const record: CustomerProblem = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.customerProblems.add(record);
  return id;
}

/**
 * 获取客户问题
 */
export async function getCustomerProblem(id: string): Promise<CustomerProblem | undefined> {
  const db = getDatabase();
  return await db.customerProblems.get(id);
}

/**
 * 获取所有客户问题
 */
export async function getAllCustomerProblems(): Promise<CustomerProblem[]> {
  const db = getDatabase();
  return await db.customerProblems.toArray();
}

/**
 * 更新客户问题
 */
export async function updateCustomerProblem(
  id: string,
  data: Partial<CustomerProblem>
): Promise<void> {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  await db.customerProblems.update(id, {
    ...data,
    updatedAt: now,
  });
}

/**
 * 删除客户问题
 */
export async function deleteCustomerProblem(id: string): Promise<void> {
  const db = getDatabase();
  await db.customerProblems.delete(id);
}

/**
 * 批量创建客户问题
 */
export async function bulkCreateCustomerProblems(
  records: Omit<CustomerProblem, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<string[]> {
  const db = getDatabase();
  const ids: string[] = [];
  const now = getCurrentTimestamp();

  const recordsToAdd = records.map((record) => {
    const id = generateId();
    ids.push(id);
    return {
      ...record,
      id,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db.customerProblems.bulkAdd(recordsToAdd);
  return ids;
}

/**
 * 批量删除客户问题
 */
export async function bulkDeleteCustomerProblems(ids: string[]): Promise<void> {
  const db = getDatabase();
  await db.customerProblems.bulkDelete(ids);
}

// ============ 语音识别记录 CRUD ============

/**
 * 创建语音识别记录
 */
export async function createVoiceRecord(
  data: Omit<VoiceRecord, 'id' | 'createdAt'>
): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = getCurrentTimestamp();

  const record: VoiceRecord = {
    ...data,
    id,
    createdAt: now,
  };

  await db.voiceRecognitionRecords.add(record);
  return id;
}

/**
 * 获取语音识别记录
 */
export async function getVoiceRecord(id: string): Promise<VoiceRecord | undefined> {
  const db = getDatabase();
  return await db.voiceRecognitionRecords.get(id);
}

/**
 * 获取所有语音识别记录
 */
export async function getAllVoiceRecords(): Promise<VoiceRecord[]> {
  const db = getDatabase();
  return await db.voiceRecognitionRecords.toArray();
}

/**
 * 删除语音识别记录
 */
export async function deleteVoiceRecord(id: string): Promise<void> {
  const db = getDatabase();
  await db.voiceRecognitionRecords.delete(id);
}

/**
 * 批量创建语音识别记录
 */
export async function bulkCreateVoiceRecords(
  records: Omit<VoiceRecord, 'id' | 'createdAt'>[]
): Promise<string[]> {
  const db = getDatabase();
  const ids: string[] = [];
  const now = getCurrentTimestamp();

  const recordsToAdd = records.map((record) => {
    const id = generateId();
    ids.push(id);
    return {
      ...record,
      id,
      createdAt: now,
    };
  });

  await db.voiceRecognitionRecords.bulkAdd(recordsToAdd);
  return ids;
}

/**
 * 批量删除语音识别记录
 */
export async function bulkDeleteVoiceRecords(ids: string[]): Promise<void> {
  const db = getDatabase();
  await db.voiceRecognitionRecords.bulkDelete(ids);
}

// ============ 测试用例库 CRUD ============

/**
 * 创建测试用例
 */
export async function createTestCase(
  data: Omit<TestCase, 'id' | 'createdAt'>
): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = getCurrentTimestamp();

  const record: TestCase = {
    ...data,
    id,
    createdAt: now,
  };

  await db.testCaseLibrary.add(record);
  return id;
}

/**
 * 获取测试用例
 */
export async function getTestCase(id: string): Promise<TestCase | undefined> {
  const db = getDatabase();
  return await db.testCaseLibrary.get(id);
}

/**
 * 获取所有测试用例
 */
export async function getAllTestCases(): Promise<TestCase[]> {
  const db = getDatabase();
  return await db.testCaseLibrary.toArray();
}

/**
 * 删除测试用例
 */
export async function deleteTestCase(id: string): Promise<void> {
  const db = getDatabase();
  await db.testCaseLibrary.delete(id);
}

/**
 * 批量创建测试用例
 */
export async function bulkCreateTestCases(
  records: Omit<TestCase, 'id' | 'createdAt'>[]
): Promise<string[]> {
  const db = getDatabase();
  const ids: string[] = [];
  const now = getCurrentTimestamp();

  const recordsToAdd = records.map((record) => {
    const id = generateId();
    ids.push(id);
    return {
      ...record,
      id,
      createdAt: now,
    };
  });

  await db.testCaseLibrary.bulkAdd(recordsToAdd);
  return ids;
}
