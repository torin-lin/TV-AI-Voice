/**
 * 客户问题/QA问题 存储层 - SQLite
 */

import { getDb, generateId } from './sqlite';
import { CustomerProblem } from '../../types/database';

const JSON_FIELDS = ['linkedQaProblems'];

function rowToRecord(row: any): CustomerProblem {
  const r = { ...row };
  for (const f of JSON_FIELDS) {
    if (typeof r[f] === 'string') try { r[f] = JSON.parse(r[f]); } catch { r[f] = []; }
  }
  return r as CustomerProblem;
}

function recordToRow(data: any): any {
  const r = { ...data };
  for (const f of JSON_FIELDS) {
    if (Array.isArray(r[f])) r[f] = JSON.stringify(r[f]);
  }
  return r;
}

export function initCustomerProblemStorage(): void { /* SQLite 已在 initSqlite 中初始化 */ }

export function getAllRecords(): CustomerProblem[] {
  return getDb().prepare('SELECT * FROM customer_problems ORDER BY createdAt DESC').all().map(rowToRecord);
}

export function findById(id: string): CustomerProblem | undefined {
  const row = getDb().prepare('SELECT * FROM customer_problems WHERE id = ?').get(id);
  return row ? rowToRecord(row) : undefined;
}

export function create(data: Omit<CustomerProblem, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = generateId('cp');
  const now = Date.now();
  const row = recordToRow({ ...data, id, createdAt: now, updatedAt: now });
  const cols = Object.keys(row);
  getDb().prepare(`INSERT INTO customer_problems (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c] ?? null));
  return id;
}

export function update(id: string, data: Partial<CustomerProblem>): boolean {
  const row = recordToRow({ ...data, updatedAt: Date.now() });
  delete row.id; delete row.createdAt;
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  if (cols.length === 0) return false;
  const result = getDb().prepare(`UPDATE customer_problems SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`).run(...cols.map((c) => row[c] ?? null), id);
  return result.changes > 0;
}

export function remove(id: string): boolean {
  return getDb().prepare('DELETE FROM customer_problems WHERE id=?').run(id).changes > 0;
}
