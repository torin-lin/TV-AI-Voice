/**
 * Release Note 存储层 - SQLite
 */

import { getDb, generateId } from './sqlite';
import { ReleaseNote } from '../../types/database';

const JSON_FIELDS = ['affectedModules', 'affectedFeatures'];

function rowToRecord(row: any): ReleaseNote {
  const r = { ...row };
  for (const f of JSON_FIELDS) {
    if (typeof r[f] === 'string') try { r[f] = JSON.parse(r[f]); } catch { r[f] = []; }
  }
  if (r.breakingChanges !== undefined) r.breakingChanges = !!r.breakingChanges;
  return r as ReleaseNote;
}

function recordToRow(data: any): any {
  const r = { ...data };
  for (const f of JSON_FIELDS) {
    if (Array.isArray(r[f])) r[f] = JSON.stringify(r[f]);
  }
  if (typeof r.breakingChanges === 'boolean') r.breakingChanges = r.breakingChanges ? 1 : 0;
  return r;
}

export function initReleaseNoteStorage(): void { /* SQLite 已在 initSqlite 中初始化 */ }

export function getAllRecords(): ReleaseNote[] {
  return getDb().prepare('SELECT * FROM release_notes ORDER BY createdAt DESC').all().map(rowToRecord);
}

export function findById(id: string): ReleaseNote | undefined {
  const row = getDb().prepare('SELECT * FROM release_notes WHERE id = ?').get(id);
  return row ? rowToRecord(row) : undefined;
}

export function findByCommitHash(hash: string): ReleaseNote | undefined {
  const row = getDb().prepare('SELECT * FROM release_notes WHERE commitHash = ?').get(hash);
  return row ? rowToRecord(row) : undefined;
}

export function create(data: Omit<ReleaseNote, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = generateId('rn');
  const now = Date.now();
  const row = recordToRow({ ...data, id, createdAt: now, updatedAt: now });
  const cols = Object.keys(row);
  getDb().prepare(`INSERT INTO release_notes (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c] ?? null));
  return id;
}

export function update(id: string, data: Partial<ReleaseNote>): boolean {
  const row = recordToRow({ ...data, updatedAt: Date.now() });
  delete row.id; delete row.createdAt;
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  if (cols.length === 0) return false;
  const result = getDb().prepare(`UPDATE release_notes SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`).run(...cols.map((c) => row[c] ?? null), id);
  return result.changes > 0;
}

export function remove(id: string): boolean {
  return getDb().prepare('DELETE FROM release_notes WHERE id=?').run(id).changes > 0;
}
