# UNIT-001: 本地数据库层 - 代码生成计划

**单元**: UNIT-001 (本地数据库层)
**日期**: 2026-02-28
**阶段**: 构建阶段 - 代码生成规划

---

## 1. 代码生成概述

### 1.1 生成范围

本计划涵盖 UNIT-001 的所有代码生成工作：
- 数据库初始化和配置
- 数据表定义和操作
- CRUD 操作接口
- 查询和筛选功能
- 事务处理
- 数据备份和恢复
- 错误处理和日志
- 单元测试

### 1.2 技术栈

- **数据库**: IndexedDB + Dexie.js
- **语言**: TypeScript
- **测试**: Vitest + @testing-library
- **工具**: ESLint, Prettier

---

## 2. 代码生成计划

### 2.1 第 1 部分：类型定义和 Schema

**文件**: `src/types/database.ts`

**内容**:
- [ ] VersionRecord 接口定义
- [ ] CustomerProblem 接口定义
- [ ] VoiceRecord 接口定义
- [ ] TestCase 接口定义
- [ ] 查询过滤器接口
- [ ] 分页结果接口
- [ ] 错误类型枚举

**预计代码行数**: 150-200 行

---

### 2.2 第 2 部分：数据库初始化

**文件**: `src/db/database.ts`

**内容**:
- [ ] 数据库配置常量
- [ ] Dexie 数据库类定义
- [ ] 表定义和索引
- [ ] 数据库初始化函数
- [ ] 数据库实例导出

**预计代码行数**: 100-150 行

**关键代码**:
```typescript
import Dexie, { Table } from 'dexie';
import { VersionRecord, CustomerProblem, VoiceRecord, TestCase } from '../types/database';

export class TVAIVoiceDatabase extends Dexie {
  versionTestRecords!: Table<VersionRecord>;
  customerProblems!: Table<CustomerProblem>;
  voiceRecognitionRecords!: Table<VoiceRecord>;
  testCaseLibrary!: Table<TestCase>;

  constructor() {
    super('TVAIVoiceTestDB');
    this.version(1).stores({
      versionTestRecords: '++id, versionNumber, riskLevel, createdAt',
      customerProblems: '++id, date, versionNumber, category, status',
      voiceRecognitionRecords: '++id, corpusId, isCorrect, versionNumber',
      testCaseLibrary: '++id, caseId, category'
    });
  }
}

export const db = new TVAIVoiceDatabase();

export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
  } catch (error) {
    throw new DatabaseError(DatabaseErrorType.INITIALIZATION_FAILED, ...);
  }
}
```

---

### 2.3 第 3 部分：CRUD 操作

**文件**: `src/db/operations/crud.ts`

**内容**:
- [ ] 创建记录函数（所有表）
- [ ] 读取记录函数（所有表）
- [ ] 更新记录函数（所有表）
- [ ] 删除记录函数（所有表）
- [ ] 批量操作函数

**预计代码行数**: 200-250 行

**关键函数**:
```typescript
// 版本记录 CRUD
export async function createVersionRecord(data: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
export async function getVersionRecord(id: string): Promise<VersionRecord | undefined>
export async function updateVersionRecord(id: string, data: Partial<VersionRecord>): Promise<void>
export async function deleteVersionRecord(id: string): Promise<void>

// 批量操作
export async function bulkCreateVersionRecords(records: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]>
export async function bulkDeleteVersionRecords(ids: string[]): Promise<void>
```

---

### 2.4 第 4 部分：查询和筛选

**文件**: `src/db/operations/query.ts`

**内容**:
- [ ] 分页查询函数
- [ ] 搜索函数
- [ ] 日期范围查询
- [ ] 复杂筛选查询
- [ ] 统计函数

**预计代码行数**: 200-250 行

**关键函数**:
```typescript
export async function queryVersionRecords(filters: QueryFilter, pagination?: PaginationOptions): Promise<PaginationResult<VersionRecord>>
export async function searchVersionRecords(keyword: string, pagination?: PaginationOptions): Promise<PaginationResult<VersionRecord>>
export async function getVersionRecordsByDateRange(startDate: number, endDate: number): Promise<VersionRecord[]>
export async function getCustomerProblemsByCategory(category: string): Promise<CustomerProblem[]>
export async function getVoiceRecordAccuracy(): Promise<number>
```

---

### 2.5 第 5 部分：事务处理

**文件**: `src/db/operations/transaction.ts`

**内容**:
- [ ] 事务执行函数
- [ ] 事务错误处理
- [ ] 事务回滚逻辑

**预计代码行数**: 80-120 行

**关键函数**:
```typescript
export async function executeTransaction<T>(callback: (db: TVAIVoiceDatabase) => Promise<T>): Promise<T>
export async function executeTransactionWithRetry<T>(callback: (db: TVAIVoiceDatabase) => Promise<T>, maxRetries?: number): Promise<T>
```

---

### 2.6 第 6 部分：数据备份和恢复

**文件**: `src/db/operations/backup.ts`

**内容**:
- [ ] 备份函数
- [ ] 恢复函数
- [ ] 数据清除函数
- [ ] 存储使用情况查询

**预计代码行数**: 120-150 行

**关键函数**:
```typescript
export async function backupDatabase(): Promise<string>
export async function restoreDatabase(backupData: string): Promise<void>
export async function clearAllData(): Promise<void>
export async function getStorageUsage(): Promise<StorageUsage>
export async function cleanupExpiredData(daysOld?: number): Promise<number>
```

---

### 2.7 第 7 部分：工具函数

**文件**: `src/db/utils/`

**内容**:

#### 2.7.1 验证工具 (`validation.ts`)
- [ ] 数据验证函数
- [ ] 验证规则定义
- [ ] 错误消息生成

**预计代码行数**: 100-150 行

#### 2.7.2 缓存工具 (`cache.ts`)
- [ ] 查询缓存类
- [ ] 缓存管理函数
- [ ] TTL 管理

**预计代码行数**: 80-120 行

#### 2.7.3 错误处理 (`error.ts`)
- [ ] DatabaseError 类
- [ ] 错误类型定义
- [ ] 错误处理工具函数

**预计代码行数**: 80-120 行

#### 2.7.4 日志记录 (`logger.ts`)
- [ ] Logger 类
- [ ] 日志级别定义
- [ ] 日志输出函数

**预计代码行数**: 80-120 行

#### 2.7.5 工具函数 (`helpers.ts`)
- [ ] UUID 生成
- [ ] 日期处理
- [ ] 数据转换

**预计代码行数**: 80-120 行

---

### 2.8 第 8 部分：单元测试

**文件**: `src/db/__tests__/`

**内容**:

#### 2.8.1 数据库初始化测试 (`database.test.ts`)
- [ ] 数据库初始化测试
- [ ] 表创建测试
- [ ] 索引创建测试

**预计代码行数**: 80-120 行

#### 2.8.2 CRUD 操作测试 (`crud.test.ts`)
- [ ] 创建操作测试
- [ ] 读取操作测试
- [ ] 更新操作测试
- [ ] 删除操作测试
- [ ] 批量操作测试

**预计代码行数**: 200-250 行

#### 2.8.3 查询操作测试 (`query.test.ts`)
- [ ] 分页查询测试
- [ ] 搜索功能测试
- [ ] 日期范围查询测试
- [ ] 复杂筛选测试

**预计代码行数**: 200-250 行

#### 2.8.4 事务处理测试 (`transaction.test.ts`)
- [ ] 事务成功测试
- [ ] 事务失败回滚测试
- [ ] 并发事务测试

**预计代码行数**: 120-150 行

#### 2.8.5 备份恢复测试 (`backup.test.ts`)
- [ ] 备份功能测试
- [ ] 恢复功能测试
- [ ] 数据清除测试

**预计代码行数**: 120-150 行

#### 2.8.6 工具函数测试 (`utils.test.ts`)
- [ ] 验证函数测试
- [ ] 缓存功能测试
- [ ] 错误处理测试

**预计代码行数**: 150-200 行

---

## 3. 代码生成执行计划

### 3.1 执行顺序

```
第 1 步: 类型定义和 Schema (2.1, 2.2)
  ↓
第 2 步: 数据库初始化 (2.2)
  ↓
第 3 步: CRUD 操作 (2.3)
  ↓
第 4 步: 查询和筛选 (2.4)
  ↓
第 5 步: 事务处理 (2.5)
  ↓
第 6 步: 备份和恢复 (2.6)
  ↓
第 7 步: 工具函数 (2.7)
  ↓
第 8 步: 单元测试 (2.8)
```

### 3.2 工作量估计

| 部分 | 文件数 | 代码行数 | 工作量 |
|------|--------|----------|--------|
| 类型定义 | 1 | 150-200 | 1h |
| 数据库初始化 | 1 | 100-150 | 1h |
| CRUD 操作 | 1 | 200-250 | 1.5h |
| 查询和筛选 | 1 | 200-250 | 1.5h |
| 事务处理 | 1 | 80-120 | 1h |
| 备份和恢复 | 1 | 120-150 | 1h |
| 工具函数 | 5 | 400-600 | 2h |
| 单元测试 | 6 | 870-1120 | 2.5h |
| **总计** | **17** | **2120-2840** | **11.5h** |

### 3.3 代码质量目标

- 代码覆盖率: > 90%
- 代码复杂度: < 10
- ESLint 检查: 0 错误
- Prettier 格式化: 100% 通过

---

## 4. 代码生成检查清单

### 4.1 第 1 部分：类型定义和 Schema
- [ ] VersionRecord 接口完整
- [ ] CustomerProblem 接口完整
- [ ] VoiceRecord 接口完整
- [ ] TestCase 接口完整
- [ ] 所有接口都有完整的 JSDoc 注释
- [ ] 类型定义通过 TypeScript 检查

### 4.2 第 2 部分：数据库初始化
- [ ] 数据库类定义正确
- [ ] 所有表都正确定义
- [ ] 索引都正确创建
- [ ] 初始化函数能够成功执行
- [ ] 错误处理完善

### 4.3 第 3 部分：CRUD 操作
- [ ] 创建操作能够正确保存数据
- [ ] 读取操作能够正确检索数据
- [ ] 更新操作能够正确修改数据
- [ ] 删除操作能够正确删除数据
- [ ] 批量操作能够正确处理多条记录
- [ ] 所有操作都有错误处理

### 4.4 第 4 部分：查询和筛选
- [ ] 分页查询能够正确分页
- [ ] 搜索功能能够正确搜索
- [ ] 日期范围查询能够正确过滤
- [ ] 复杂筛选能够正确组合条件
- [ ] 统计函数能够正确计算

### 4.5 第 5 部分：事务处理
- [ ] 事务能够正确执行
- [ ] 事务失败时能够正确回滚
- [ ] 并发事务能够正确隔离
- [ ] 错误处理完善

### 4.6 第 6 部分：备份和恢复
- [ ] 备份能够正确导出数据
- [ ] 恢复能够正确导入数据
- [ ] 数据清除能够正确删除所有数据
- [ ] 存储使用情况能够正确计算

### 4.7 第 7 部分：工具函数
- [ ] 验证函数能够正确验证数据
- [ ] 缓存功能能够正确缓存数据
- [ ] 错误处理能够正确处理错误
- [ ] 日志记录能够正确记录日志
- [ ] 所有工具函数都有完整的测试

### 4.8 第 8 部分：单元测试
- [ ] 所有测试都能通过
- [ ] 代码覆盖率 > 90%
- [ ] 测试用例覆盖所有主要功能
- [ ] 测试用例覆盖所有错误情况

---

## 5. 代码生成完成标准

### 5.1 功能完成标准

- [ ] 所有 CRUD 操作都已实现
- [ ] 所有查询功能都已实现
- [ ] 事务处理已实现
- [ ] 备份和恢复已实现
- [ ] 所有工具函数都已实现

### 5.2 质量完成标准

- [ ] 代码覆盖率 > 90%
- [ ] 所有测试都通过
- [ ] ESLint 检查 0 错误
- [ ] Prettier 格式化 100% 通过
- [ ] 代码复杂度 < 10

### 5.3 文档完成标准

- [ ] 所有函数都有 JSDoc 注释
- [ ] 所有接口都有类型注释
- [ ] 所有错误都有错误消息
- [ ] README 文档已更新

---

## 6. 下一步

代码生成计划已完成。准备进入代码生成执行阶段。

**请确认**:
1. ✅ 代码生成计划是否合理？
2. ✅ 工作量估计是否准确？
3. ✅ 检查清单是否完整？
4. ✅ 是否可以开始代码生成？

**请回复**: "确认" 开始代码生成，或 "需要调整" 并说明具体调整内容。
