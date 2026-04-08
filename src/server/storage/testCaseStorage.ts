/**
 * 知识库 - 测试用例 存储层 (SQLite)
 */

import { getDb, generateId } from './sqlite';
import { TestCase } from '../../types/database';

const JSON_FIELDS = ['steps', 'tags'];

function rowToRecord(row: any): TestCase {
  const r = { ...row };
  for (const f of JSON_FIELDS) {
    if (typeof r[f] === 'string') try { r[f] = JSON.parse(r[f]); } catch { r[f] = []; }
  }
  return r as TestCase;
}

function recordToRow(data: any): any {
  const r = { ...data };
  for (const f of JSON_FIELDS) {
    if (Array.isArray(r[f])) r[f] = JSON.stringify(r[f]);
  }
  return r;
}

export function getAllTestCases(): TestCase[] {
  return getDb().prepare('SELECT * FROM test_cases ORDER BY createdAt DESC').all().map(rowToRecord);
}

export function findTestCaseById(id: string): TestCase | undefined {
  const row = getDb().prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
  return row ? rowToRecord(row) : undefined;
}

export function searchTestCases(keyword: string): TestCase[] {
  const like = `%${keyword}%`;
  return getDb().prepare(
    `SELECT * FROM test_cases WHERE caseName LIKE ? OR description LIKE ? OR category LIKE ? OR tags LIKE ? ORDER BY createdAt DESC`
  ).all(like, like, like, like).map(rowToRecord);
}

export function findByCategory(category: string): TestCase[] {
  return getDb().prepare('SELECT * FROM test_cases WHERE category = ? ORDER BY createdAt DESC').all(category).map(rowToRecord);
}

export function createTestCase(data: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = generateId('tc');
  const now = Date.now();
  const row = recordToRow({ ...data, id, createdAt: now, updatedAt: now });
  const cols = Object.keys(row);
  getDb().prepare(`INSERT INTO test_cases (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c] ?? null));
  return id;
}

export function updateTestCase(id: string, data: Partial<TestCase>): boolean {
  const row = recordToRow({ ...data, updatedAt: Date.now() });
  delete row.id; delete row.createdAt;
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  if (cols.length === 0) return false;
  const result = getDb().prepare(`UPDATE test_cases SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`).run(...cols.map((c) => row[c] ?? null), id);
  return result.changes > 0;
}

export function removeTestCase(id: string): boolean {
  return getDb().prepare('DELETE FROM test_cases WHERE id=?').run(id).changes > 0;
}

export function bulkCreateTestCases(cases: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>[]): number {
  const now = Date.now();
  let count = 0;
  const txn = getDb().transaction(() => {
    for (const c of cases) {
      const id = generateId('tc');
      const row = recordToRow({ ...c, id, createdAt: now, updatedAt: now });
      const cols = Object.keys(row);
      try {
        getDb().prepare(`INSERT INTO test_cases (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((col) => row[col] ?? null));
        count++;
      } catch { /* skip bad rows */ }
    }
  });
  txn();
  return count;
}

export function getCategories(): string[] {
  const rows = getDb().prepare("SELECT DISTINCT category FROM test_cases WHERE category != '' ORDER BY category").all() as any[];
  return rows.map((r) => r.category);
}

export function getTestCaseCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as c FROM test_cases').get() as any;
  return row.c;
}
