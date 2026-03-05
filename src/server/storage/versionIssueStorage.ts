/**
 * 版本问题 存储层 - SQLite
 */

import { getDb, generateId } from './sqlite';
import { VersionIssue } from '../../types/database';

const JSON_FIELDS = ['attachments'];

function rowToRecord(row: any): VersionIssue {
  const r = { ...row };
  for (const f of JSON_FIELDS) {
    if (typeof r[f] === 'string') try { r[f] = JSON.parse(r[f]); } catch { r[f] = []; }
  }
  return r as VersionIssue;
}

function recordToRow(data: any): any {
  const r = { ...data };
  for (const f of JSON_FIELDS) {
    if (Array.isArray(r[f])) r[f] = JSON.stringify(r[f]);
  }
  return r;
}

export function initVersionIssueStorage(): void { /* SQLite 已在 initSqlite 中初始化 */ }

export function getAllRecords(): VersionIssue[] {
  return getDb().prepare('SELECT * FROM version_issues ORDER BY createdAt DESC').all().map(rowToRecord);
}

export function findByVersionId(versionRecordId: string): VersionIssue[] {
  return getDb().prepare('SELECT * FROM version_issues WHERE versionRecordId = ? ORDER BY createdAt DESC').all(versionRecordId).map(rowToRecord);
}

export function findById(id: string): VersionIssue | undefined {
  const row = getDb().prepare('SELECT * FROM version_issues WHERE id = ?').get(id);
  return row ? rowToRecord(row) : undefined;
}

export function create(data: Omit<VersionIssue, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = generateId('vi');
  const now = Date.now();
  const row = recordToRow({ ...data, id, createdAt: now, updatedAt: now });
  const cols = Object.keys(row);
  getDb().prepare(`INSERT INTO version_issues (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c] ?? null));
  return id;
}

export function update(id: string, data: Partial<VersionIssue>): boolean {
  const row = recordToRow({ ...data, updatedAt: Date.now() });
  delete row.id; delete row.createdAt;
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  if (cols.length === 0) return false;
  const result = getDb().prepare(`UPDATE version_issues SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`).run(...cols.map((c) => row[c] ?? null), id);
  return result.changes > 0;
}

export function remove(id: string): boolean {
  return getDb().prepare('DELETE FROM version_issues WHERE id=?').run(id).changes > 0;
}
