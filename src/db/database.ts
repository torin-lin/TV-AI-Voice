/**
 * 数据库初始化和配置
 * 使用 Dexie.js 管理 IndexedDB
 */

import Dexie, { Table } from 'dexie';
import {
  VersionRecord,
  CustomerProblem,
  VoiceRecord,
  TestCase,
} from '../types/database';

/**
 * 数据库配置常量
 */
export const DB_CONFIG = {
  name: 'TVAIVoiceTestDB',
  version: 1,
};

/**
 * TV AI Voice 数据库类
 */
export class TVAIVoiceDatabase extends Dexie {
  versionTestRecords!: Table<VersionRecord>;
  customerProblems!: Table<CustomerProblem>;
  voiceRecognitionRecords!: Table<VoiceRecord>;
  testCaseLibrary!: Table<TestCase>;

  constructor() {
    super(DB_CONFIG.name);
    this.version(DB_CONFIG.version).stores({
      versionTestRecords:
        '++id, versionNumber, riskLevel, createdAt, [riskLevel+createdAt]',
      customerProblems:
        '++id, date, versionNumber, category, status, [versionNumber+category], [status+date]',
      voiceRecognitionRecords:
        '++id, corpusId, isCorrect, versionNumber, [versionNumber+isCorrect]',
      testCaseLibrary: '++id, caseId, category',
    });
  }
}

/**
 * 全局数据库实例
 */
export let db: TVAIVoiceDatabase;

/**
 * 初始化数据库
 * @returns Promise<void>
 * @throws DatabaseError 如果初始化失败
 */
export async function initializeDatabase(): Promise<void> {
  try {
    db = new TVAIVoiceDatabase();
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * 获取数据库实例
 * @returns TVAIVoiceDatabase 数据库实例
 */
export function getDatabase(): TVAIVoiceDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * 检查数据库是否已初始化
 * @returns boolean
 */
export function isDatabaseInitialized(): boolean {
  return !!db;
}

/**
 * 关闭数据库连接
 * @returns Promise<void>
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    console.log('Database closed');
  }
}
