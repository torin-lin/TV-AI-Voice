/**
 * MITM 规则存储（SQLite）
 * - 请求记录只实时推送到浏览器，由前端 IndexedDB 保存
 * - 规则 CRUD
 */

import { getDb } from '../storage/sqlite';
import { MitmRule } from './ruleEngine';
import { v4 as uuid } from 'uuid';

export interface MitmRequestRecord {
  id: string;
  ownerId?: string | null;
  deviceId: string;
  timestamp: number;
  method: string;
  url: string;
  host: string;
  path: string;
  requestHeaders: string;  // JSON
  requestBody: string | null;
  responseStatus: number;
  responseHeaders: string; // JSON
  responseBody: string | null;
  packageName: string | null;
  duration: number;
  size: number;
  matched: boolean;
  matchedRuleId: string | null;
  modified: boolean;
}

export function initMitmStorage(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS mitm_rules (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 100,
      device_scope TEXT DEFAULT 'all',
      is_public INTEGER DEFAULT 0,
      conditions TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      hit_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  const ruleColumns = db.prepare(`PRAGMA table_info(mitm_rules)`).all() as Array<{ name: string }>;
  if (!ruleColumns.some((col) => col.name === 'owner_id')) {
    db.exec(`ALTER TABLE mitm_rules ADD COLUMN owner_id TEXT`);
  }
  if (!ruleColumns.some((col) => col.name === 'is_public')) {
    db.exec(`ALTER TABLE mitm_rules ADD COLUMN is_public INTEGER DEFAULT 0`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS mitm_rule_device_scopes (
      device_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_mitm_rules_owner ON mitm_rules(owner_id)`);
}

// ==================== 规则操作 ====================

export function getAllRules(ownerId?: string): MitmRule[] {
  const db = getDb();
  const rows = ownerId
    ? db.prepare('SELECT * FROM mitm_rules WHERE owner_id = ? ORDER BY priority ASC').all(ownerId) as any[]
    : db.prepare('SELECT * FROM mitm_rules ORDER BY priority ASC').all() as any[];
  return rows.map(rowToRule);
}

export function getRulesForOwner(ownerId: string): MitmRule[] {
  return getAllRules(ownerId);
}

export function getPublicRules(excludeOwnerId?: string): MitmRule[] {
  const db = getDb();
  const rows = excludeOwnerId
    ? db.prepare('SELECT * FROM mitm_rules WHERE is_public = 1 AND owner_id != ? ORDER BY updated_at DESC').all(excludeOwnerId) as any[]
    : db.prepare('SELECT * FROM mitm_rules WHERE is_public = 1 ORDER BY updated_at DESC').all() as any[];
  return rows.map(rowToRule);
}

export function createRule(data: Omit<MitmRule, 'id' | 'createdAt' | 'updatedAt' | 'hitCount'>): MitmRule {
  const db = getDb();
  const id = uuid();
  const now = Date.now();
  db.prepare(`
    INSERT INTO mitm_rules (id, owner_id, name, enabled, priority, device_scope, is_public, conditions, action, description, hit_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, data.ownerId || null, data.name, data.enabled ? 1 : 0, data.priority, data.deviceScope, data.isPublic ? 1 : 0, JSON.stringify(data.conditions), JSON.stringify(data.action), data.description || '', now, now);

  return { ...data, id, createdAt: now, updatedAt: now, hitCount: 0 };
}

export function copyPublicRuleToOwner(ruleId: string, ownerId: string): MitmRule | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM mitm_rules WHERE id = ? AND is_public = 1 AND owner_id != ?').get(ruleId, ownerId) as any;
  if (!row) return null;
  const source = rowToRule(row);
  return createRule({
    ownerId,
    name: source.name,
    enabled: false,
    priority: source.priority,
    deviceScope: source.deviceScope,
    isPublic: false,
    conditions: source.conditions,
    action: source.action,
    description: source.description,
  });
}

export function updateRule(id: string, data: Partial<MitmRule>, ownerId?: string): boolean {
  const db = getDb();
  const existing = ownerId
    ? db.prepare('SELECT * FROM mitm_rules WHERE id = ? AND owner_id = ?').get(id, ownerId) as any
    : db.prepare('SELECT * FROM mitm_rules WHERE id = ?').get(id) as any;
  if (!existing) return false;

  const now = Date.now();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
  if (data.deviceScope !== undefined) { updates.push('device_scope = ?'); values.push(data.deviceScope); }
  if (data.isPublic !== undefined) { updates.push('is_public = ?'); values.push(data.isPublic ? 1 : 0); }
  if (data.conditions !== undefined) { updates.push('conditions = ?'); values.push(JSON.stringify(data.conditions)); }
  if (data.action !== undefined) { updates.push('action = ?'); values.push(JSON.stringify(data.action)); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE mitm_rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return true;
}

export function deleteRule(id: string, ownerId?: string): boolean {
  const db = getDb();
  const result = ownerId
    ? db.prepare('DELETE FROM mitm_rules WHERE id = ? AND owner_id = ?').run(id, ownerId)
    : db.prepare('DELETE FROM mitm_rules WHERE id = ?').run(id);
  return result.changes > 0;
}

export function toggleRule(id: string, ownerId?: string): boolean {
  const db = getDb();
  const row = ownerId
    ? db.prepare('SELECT enabled FROM mitm_rules WHERE id = ? AND owner_id = ?').get(id, ownerId) as any
    : db.prepare('SELECT enabled FROM mitm_rules WHERE id = ?').get(id) as any;
  if (!row) return false;
  db.prepare('UPDATE mitm_rules SET enabled = ?, updated_at = ? WHERE id = ?').run(row.enabled ? 0 : 1, Date.now(), id);
  return true;
}

export function incrementHitCount(id: string): void {
  const db = getDb();
  db.prepare('UPDATE mitm_rules SET hit_count = hit_count + 1 WHERE id = ?').run(id);
}

// ==================== 规则生效范围 ====================

export function bindRuleOwnerToDevice(deviceId: string, ownerId: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO mitm_rule_device_scopes (device_id, owner_id, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET owner_id = excluded.owner_id, updated_at = excluded.updated_at
  `).run(deviceId, ownerId, Date.now());
}

export function getRuleOwnerForDevice(deviceId: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT owner_id FROM mitm_rule_device_scopes WHERE device_id = ?').get(deviceId) as any;
  if (row?.owner_id) return row.owner_id;
  const recent = db.prepare('SELECT owner_id FROM mitm_rule_device_scopes ORDER BY updated_at DESC LIMIT 1').get() as any;
  return recent?.owner_id || null;
}

// ==================== 工具函数 ====================

function rowToRule(row: any): MitmRule {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    enabled: Boolean(row.enabled),
    priority: row.priority,
    deviceScope: row.device_scope,
    isPublic: Boolean(row.is_public),
    conditions: JSON.parse(row.conditions || '{}'),
    action: JSON.parse(row.action || '{}'),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hitCount: row.hit_count,
  };
}
