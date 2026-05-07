/**
 * 版本记录 存储层 - SQLite
 */

import { getDb, generateId } from './sqlite';
import { VersionRecord } from '../../types/database';

const JSON_FIELDS = ['linkedIssues', 'modifiedModules'];

function rowToRecord(row: any): VersionRecord {
  const r = { ...row };
  for (const f of JSON_FIELDS) {
    if (typeof r[f] === 'string') try { r[f] = JSON.parse(r[f]); } catch { r[f] = []; }
  }
  return r as VersionRecord;
}

function recordToRow(data: any): any {
  const r = { ...data };
  for (const f of JSON_FIELDS) {
    if (Array.isArray(r[f])) r[f] = JSON.stringify(r[f]);
  }
  return r;
}

export function getAllRecords(): VersionRecord[] {
  return getDb().prepare('SELECT * FROM version_records ORDER BY createdAt DESC').all().map(rowToRecord);
}

export function findById(id: string): VersionRecord | undefined {
  const row = getDb().prepare('SELECT * FROM version_records WHERE id = ?').get(id);
  return row ? rowToRecord(row) : undefined;
}

export function getParentVersions(): Array<{ id: string; versionNumber: string; projectType?: string; workspaceId?: string }> {
  return getDb().prepare(
    `SELECT id, versionNumber, projectType, workspaceId
     FROM version_records
     WHERE COALESCE(parentVersion, '') = ''
     ORDER BY createdAt DESC`
  ).all() as Array<{ id: string; versionNumber: string; projectType?: string }>;
}

export function create(data: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = generateId('vr');
  const now = Date.now();
  const row = recordToRow({ ...data, id, createdAt: now, updatedAt: now });
  const cols = Object.keys(row);
  getDb().prepare(`INSERT INTO version_records (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c] ?? null));
  return id;
}

export function update(id: string, data: Partial<VersionRecord>): boolean {
  const row = recordToRow({ ...data, updatedAt: Date.now() });
  delete row.id; delete row.createdAt;
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  if (cols.length === 0) return false;
  const result = getDb().prepare(`UPDATE version_records SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id=?`).run(...cols.map((c) => row[c] ?? null), id);
  return result.changes > 0;
}

export function remove(id: string): boolean {
  return getDb().prepare('DELETE FROM version_records WHERE id=?').run(id).changes > 0;
}
