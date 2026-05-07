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
    parentVersion TEXT DEFAULT '',
    branch TEXT NOT NULL DEFAULT '',
    commitHash TEXT,
    commitMessage TEXT,
    author TEXT NOT NULL DEFAULT '',
    changeDescription TEXT NOT NULL DEFAULT '',
    affectedModules TEXT DEFAULT '[]',
    changeType TEXT NOT NULL DEFAULT '功能',
    severity TEXT NOT NULL DEFAULT '中',
    rdSmokeStatus TEXT DEFAULT '未测试',
    testingNotes TEXT,
    regressionRisk TEXT,
    affectedFeatures TEXT DEFAULT '[]',
    breakingChanges INTEGER DEFAULT 0,
    migrationType TEXT DEFAULT '无',
    workspaceId TEXT DEFAULT 'AI Voice',
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
    releaseNoteId TEXT,
    qaEarlyInterventionReason TEXT,
    qaEarlyInterventionOwner TEXT,
    versionNumber TEXT NOT NULL,
    parentVersion TEXT DEFAULT '',
    firmwareVersion TEXT,
    linkedIssues TEXT DEFAULT '[]',
    changeDescription TEXT NOT NULL DEFAULT '',
    modifiedModules TEXT DEFAULT '[]',
    riskLevel TEXT NOT NULL DEFAULT '中',
    smokeTestResult TEXT NOT NULL DEFAULT '未测试',
    voiceRegressionResult TEXT NOT NULL DEFAULT '未测试',
    systemRegressionResult TEXT NOT NULL DEFAULT '未测试',
    workspaceId TEXT DEFAULT 'AI Voice',
    projectType TEXT,
    testCycle TEXT,
    prototypeSource TEXT,
    prototypeFileName TEXT,
    prototypeFilePath TEXT,
    prototypeFileSize INTEGER,
    testResultFileName TEXT,
    testResultFilePath TEXT,
    testResultFileSize INTEGER,
    languageModel TEXT,
    versionStatus TEXT DEFAULT '待测试',
    releaseDecision TEXT DEFAULT '待评估',
    conclusionSummary TEXT,
    remainingRisks TEXT,
    nextActions TEXT,
    conclusionOwner TEXT,
    conclusionUpdatedAt INTEGER,
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
    workspaceId TEXT DEFAULT 'AI Voice',
    projectType TEXT,
    issueCreatedAt TEXT DEFAULT '',
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
    precondition TEXT DEFAULT '',
    testEnvironment TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT '待处理',
    severity TEXT NOT NULL DEFAULT '中',
    linkedPR TEXT,
    reporter TEXT NOT NULL,
    assignee TEXT,
    resolution TEXT,
    attachments TEXT DEFAULT '[]',
    syncedProblemId TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  // 知识库 - 测试用例表
  db.exec(`CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL DEFAULT '',
    caseName TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    steps TEXT DEFAULT '[]',
    expectedResult TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    module TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT '中',
    workspaceId TEXT DEFAULT 'AI Voice',
    projectType TEXT,
    tags TEXT DEFAULT '[]',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);

  // 系统设置表（存储 token 等配置）
  db.exec(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tc_category ON test_cases(category)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tc_projectType ON test_cases(projectType)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tc_createdAt ON test_cases(createdAt)`);

  // 增量迁移：给 version_issues 添加新列（兼容已有数据库）
  try { db.exec(`ALTER TABLE version_issues ADD COLUMN attachments TEXT DEFAULT '[]'`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_issues ADD COLUMN precondition TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_issues ADD COLUMN testEnvironment TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_issues ADD COLUMN syncedProblemId TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE customer_problems ADD COLUMN issueCreatedAt TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE customer_problems ADD COLUMN workspaceId TEXT DEFAULT 'AI Voice'`); } catch { /* 列已存在 */ }
  // test_cases 新增 precondition 列
  try { db.exec(`ALTER TABLE test_cases ADD COLUMN precondition TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE test_cases ADD COLUMN workspaceId TEXT DEFAULT 'AI Voice'`); } catch { /* 列已存在 */ }
  // release_notes 新增 parentVersion 列（大版本/子版本层级）
  try { db.exec(`ALTER TABLE release_notes ADD COLUMN parentVersion TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE release_notes ADD COLUMN rdSmokeStatus TEXT DEFAULT '未测试'`); } catch { /* 列已存在 */ }
  // release_notes 新增 fixedPRs 列（修复PR列表）
  try { db.exec(`ALTER TABLE release_notes ADD COLUMN fixedPRs TEXT DEFAULT '[]'`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE release_notes ADD COLUMN workspaceId TEXT DEFAULT 'AI Voice'`); } catch { /* 列已存在 */ }
  // version_records 新增 parentVersion 和测试结果附件列
  try { db.exec(`ALTER TABLE version_records ADD COLUMN releaseNoteId TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN qaEarlyInterventionReason TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN qaEarlyInterventionOwner TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN parentVersion TEXT DEFAULT ''`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN testResultFileName TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN testResultFilePath TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN testResultFileSize INTEGER`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN versionStatus TEXT DEFAULT '待测试'`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN releaseDecision TEXT DEFAULT '待评估'`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN conclusionSummary TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN remainingRisks TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN nextActions TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN conclusionOwner TEXT`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN conclusionUpdatedAt INTEGER`); } catch { /* 列已存在 */ }
  try { db.exec(`ALTER TABLE version_records ADD COLUMN workspaceId TEXT DEFAULT 'AI Voice'`); } catch { /* 列已存在 */ }

  // 补列之后再创建依赖新列的索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rn_workspaceId ON release_notes(workspaceId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vr_workspaceId ON version_records(workspaceId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_cp_workspaceId ON customer_problems(workspaceId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tc_workspaceId ON test_cases(workspaceId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vr_parentVersion ON version_records(parentVersion)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_vr_releaseNoteId ON version_records(releaseNoteId)`);

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
