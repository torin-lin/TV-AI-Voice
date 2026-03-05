/**
 * SQLite 统一数据库层
 * 替换所有 JSON 文件存储，支持索引和高效查询
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db: Database.Database;

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('数据库未初始化，请先调用 initSqlite()');
  return db;
}

/** 初始化 SQLite 数据库，创建所有表 */
export function initSqlite(): void {
  if (db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Release Notes 表
  db.exec(`CREATE TABLE IF NOT EXISTS release_notes (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT '',
    commitHash TEXT,
    commitMessage TEXT,
    author TEXT NOT NULL DEFAULT '',
    changeDescription TEXT NOT NULL DEFAULT '',
    affectedModules TEXT DEFAULT '[]',
    changeType TEXT NOT NULL DEFAULT '功能',
    severity TEXT NOT NULL DEFAULT '中',
    testingNotes TEXT,
    regressionRisk TEXT,
    affectedFeatures TEXT DEFAULT '[]',
    breakingChanges INTEGER DEFAULT 0,
    migrationType TEXT DEFAULT '无',
    projectType TEXT,
    apkFileName TEXT,
    apkFileSize INTEGER,
    apkFilePath TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  // 版本记录表
  db.exec(`CREATE TABLE IF NOT EXISTS version_records (
    id TEXT PRIMARY KEY,
    versionNumber TEXT NOT NULL,
    firmwareVersion TEXT,
    linkedIssues TEXT DEFAULT '[]',
    changeDescription TEXT NOT NULL DEFAULT '',
    modifiedModules TEXT DEFAULT '[]',
    riskLevel TEXT NOT NULL DEFAULT '中',
    smokeTestResult TEXT NOT NULL DEFAULT '未测试',
    voiceRegressionResult TEXT NOT NULL DEFAULT '未测试',
    systemRegressionResult TEXT NOT NULL DEFAULT '未测试',
    projectType TEXT,
    testCycle TEXT,
    prototypeSource TEXT,
    prototypeFileName TEXT,
    prototypeFilePath TEXT,
    prototypeFileSize INTEGER,
    languageModel TEXT,
    notes TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  // 客户问题表
  db.exec(`CREATE TABLE IF NOT EXISTS customer_problems (
    id TEXT PRIMARY KEY,
    problemType TEXT NOT NULL DEFAULT 'qa',
    issueId TEXT,
    firmwareVersion TEXT,
    description TEXT NOT NULL DEFAULT '',
    classification TEXT,
    confidence REAL,
    status TEXT NOT NULL DEFAULT '开放',
    linkedQaProblems TEXT DEFAULT '[]',
    projectType TEXT,
    notes TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  // 版本问题表
  db.exec(`CREATE TABLE IF NOT EXISTS version_issues (
    id TEXT PRIMARY KEY,
    versionRecordId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT '待处理',
    severity TEXT NOT NULL DEFAULT '中',
    linkedPR TEXT,
    reporter TEXT NOT NULL,
    assignee TEXT,
    resolution TEXT,
    attachments TEXT DEFAULT '[]',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rn_createdAt ON release_notes(createdAt)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rn_projectType ON release_notes(projectType)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vr_createdAt ON version_records(createdAt)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vr_projectType ON version_records(projectType)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cp_createdAt ON customer_problems(createdAt)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cp_problemType ON customer_problems(problemType)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cp_status ON customer_problems(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vi_versionRecordId ON version_issues(versionRecordId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vi_createdAt ON version_issues(createdAt)`);

  // 增量迁移：给 version_issues 添加 attachments 列（兼容已有数据库）
  try {
    db.exec(`ALTER TABLE version_issues ADD COLUMN attachments TEXT DEFAULT '[]'`);
  } catch { /* 列已存在则忽略 */ }

  // 迁移旧 JSON 数据
  migrateJsonData();

  console.log(`SQLite 数据库已初始化: ${DB_PATH}`);
}

/** 迁移旧 JSON 文件数据到 SQLite */
function migrateJsonData(): void {
  const jsonFiles: { file: string; table: string }[] = [
    { file: 'release-notes.json', table: 'release_notes' },
    { file: 'customer-problems.json', table: 'customer_problems' },
    { file: 'version-issues.json', table: 'version_issues' },
  ];

  for (const { file, table } of jsonFiles) {
    const jsonPath = path.join(DATA_DIR, file);
    if (!fs.existsSync(jsonPath)) continue;

    const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as any;
    if (count.c > 0) continue; // 已有数据，跳过迁移

    try {
      const records = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!Array.isArray(records) || records.length === 0) continue;

      const columns = Object.keys(records[0]);
      const insertSql = `INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
      const insert = db.prepare(insertSql);

      const migrate = db.transaction((rows: any[]) => {
        for (const row of rows) {
          const values = columns.map((col) => {
            const v = row[col];
            if (v === undefined || v === null) return null;
            if (Array.isArray(v)) return JSON.stringify(v);
            if (typeof v === 'boolean') return v ? 1 : 0;
            return v;
          });
          try { insert.run(...values); } catch { /* skip bad rows */ }
        }
      });

      migrate(records);
      console.log(`已迁移 ${records.length} 条 ${file} 数据到 SQLite`);

      // 重命名旧文件
      fs.renameSync(jsonPath, jsonPath + '.migrated');
    } catch (e) {
      console.error(`迁移 ${file} 失败:`, e);
    }
  }
}

/** 关闭数据库 */
export function closeSqlite(): void {
  if (db) { db.close(); }
}
