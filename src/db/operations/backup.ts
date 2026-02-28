/**
 * 备份和恢复操作
 * 提供数据备份、恢复、清除和存储监控功能
 */

import { getDatabase } from '../database';
import { BackupData, StorageUsage } from '../../types/database';
import { executeTransaction } from './transaction';

/**
 * 备份所有数据为 JSON
 * @returns JSON 字符串
 */
export async function backupDatabase(): Promise<string> {
  const db = getDatabase();

  try {
    const versionRecords = await db.versionTestRecords.toArray();
    const customerProblems = await db.customerProblems.toArray();
    const voiceRecords = await db.voiceRecognitionRecords.toArray();
    const testCases = await db.testCaseLibrary.toArray();

    const backupData: BackupData = {
      versionRecords,
      customerProblems,
      voiceRecords,
      testCases,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(backupData);
  } catch (error) {
    console.error('Backup failed:', error);
    throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 从 JSON 恢复数据
 * @param backupData JSON 字符串
 */
export async function restoreDatabase(backupData: string): Promise<void> {
  try {
    const data: BackupData = JSON.parse(backupData);

    // 验证数据格式
    if (!data.versionRecords || !data.customerProblems || !data.voiceRecords) {
      throw new Error('Invalid backup format');
    }

    // 在事务中恢复数据
    await executeTransaction(async (db) => {
      // 清除现有数据
      await db.versionTestRecords.clear();
      await db.customerProblems.clear();
      await db.voiceRecognitionRecords.clear();
      await db.testCaseLibrary.clear();

      // 导入备份数据
      await db.versionTestRecords.bulkAdd(data.versionRecords);
      await db.customerProblems.bulkAdd(data.customerProblems);
      await db.voiceRecognitionRecords.bulkAdd(data.voiceRecords);
      if (data.testCases && data.testCases.length > 0) {
        await db.testCaseLibrary.bulkAdd(data.testCases);
      }
    });

    console.log('Database restored successfully');
  } catch (error) {
    console.error('Restore failed:', error);
    throw new Error(`Failed to restore database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 清除所有数据
 */
export async function clearAllData(): Promise<void> {
  try {
    await executeTransaction(async (db) => {
      await db.versionTestRecords.clear();
      await db.customerProblems.clear();
      await db.voiceRecognitionRecords.clear();
      await db.testCaseLibrary.clear();
    });

    // 清除 LocalStorage 中的敏感数据
    localStorage.removeItem('apiKey');
    localStorage.removeItem('userPreferences');

    console.log('All data cleared');
  } catch (error) {
    console.error('Clear failed:', error);
    throw new Error(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 获取存储使用情况
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, available: 0, percentage: 0 };
    }

    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const available = estimate.quota || 0;
    const percentage = available > 0 ? (used / available) * 100 : 0;

    return { used, available, percentage };
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}

/**
 * 清理过期数据
 * @param daysOld 删除多少天前的数据（默认 30 天）
 * @returns 删除的记录数
 */
export async function cleanupExpiredData(daysOld: number = 30): Promise<number> {
  const db = getDatabase();
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

  try {
    let deletedCount = 0;

    // 清理客户问题
    const problemsToDelete = await db.customerProblems
      .where('createdAt')
      .below(cutoffTime)
      .toArray();
    deletedCount += problemsToDelete.length;
    const problemIds = problemsToDelete.map((p) => p.id).filter((id): id is string => id !== undefined);
    if (problemIds.length > 0) {
      await db.customerProblems.bulkDelete(problemIds);
    }

    // 清理语音识别记录
    const voiceToDelete = await db.voiceRecognitionRecords
      .where('createdAt')
      .below(cutoffTime)
      .toArray();
    deletedCount += voiceToDelete.length;
    const voiceIds = voiceToDelete.map((v) => v.id).filter((id): id is string => id !== undefined);
    if (voiceIds.length > 0) {
      await db.voiceRecognitionRecords.bulkDelete(voiceIds);
    }

    console.log(`Cleaned up ${deletedCount} expired records`);
    return deletedCount;
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw new Error(`Failed to cleanup expired data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  versionRecords: number;
  customerProblems: number;
  voiceRecords: number;
  testCases: number;
  total: number;
}> {
  const db = getDatabase();

  try {
    const versionRecordsCount = await db.versionTestRecords.count();
    const customerProblemsCount = await db.customerProblems.count();
    const voiceRecordsCount = await db.voiceRecognitionRecords.count();
    const testCasesCount = await db.testCaseLibrary.count();

    return {
      versionRecords: versionRecordsCount,
      customerProblems: customerProblemsCount,
      voiceRecords: voiceRecordsCount,
      testCases: testCasesCount,
      total: versionRecordsCount + customerProblemsCount + voiceRecordsCount + testCasesCount,
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
