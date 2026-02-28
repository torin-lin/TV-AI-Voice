/**
 * 事务处理
 * 提供事务执行和错误恢复功能
 */

import { getDatabase, TVAIVoiceDatabase } from '../database';

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 执行事务
 * @param callback 事务回调函数
 * @returns 事务执行结果
 * @throws 如果事务执行失败
 */
export async function executeTransaction<T>(
  callback: (db: TVAIVoiceDatabase) => Promise<T>
): Promise<T> {
  const db = getDatabase();

  try {
    return await db.transaction('rw', db.versionTestRecords, db.customerProblems, db.voiceRecognitionRecords, db.testCaseLibrary, async () => {
      return await callback(db);
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * 执行事务并支持重试
 * @param callback 事务回调函数
 * @param maxRetries 最大重试次数
 * @returns 事务执行结果
 * @throws 如果所有重试都失败
 */
export async function executeTransactionWithRetry<T>(
  callback: (db: TVAIVoiceDatabase) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await executeTransaction(callback);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Transaction attempt ${i + 1} failed, retrying...`, error);

      if (i < maxRetries - 1) {
        // 指数退避
        const delayMs = 1000 * Math.pow(2, i);
        await delay(delayMs);
      }
    }
  }

  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * 执行只读事务
 * @param callback 事务回调函数
 * @returns 事务执行结果
 */
export async function executeReadTransaction<T>(
  callback: (db: TVAIVoiceDatabase) => Promise<T>
): Promise<T> {
  const db = getDatabase();

  try {
    return await db.transaction('r', db.versionTestRecords, db.customerProblems, db.voiceRecognitionRecords, db.testCaseLibrary, async () => {
      return await callback(db);
    });
  } catch (error) {
    console.error('Read transaction failed:', error);
    throw error;
  }
}

/**
 * 执行写入事务
 * @param callback 事务回调函数
 * @returns 事务执行结果
 */
export async function executeWriteTransaction<T>(
  callback: (db: TVAIVoiceDatabase) => Promise<T>
): Promise<T> {
  const db = getDatabase();

  try {
    return await db.transaction('rw', db.versionTestRecords, db.customerProblems, db.voiceRecognitionRecords, db.testCaseLibrary, async () => {
      return await callback(db);
    });
  } catch (error) {
    console.error('Write transaction failed:', error);
    throw error;
  }
}
