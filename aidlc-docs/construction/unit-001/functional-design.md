# UNIT-001: 本地数据库层 - 功能设计

**单元**: UNIT-001 (本地数据库层)
**日期**: 2026-02-28
**阶段**: 构建阶段 - 功能设计

---

## 1. 功能设计概述

### 1.1 设计目标

为整个应用提供完整的本地数据库操作层，支持结构化数据存储、复杂查询、事务处理和数据备份恢复。

### 1.2 设计原则

- **简洁性**: 提供清晰的 API 接口
- **可靠性**: 确保数据完整性和一致性
- **性能**: 优化查询速度和存储效率
- **可维护性**: 代码结构清晰，易于扩展

---

## 2. 数据库架构设计

### 2.1 数据库初始化流程

```
应用启动
  ↓
检查 IndexedDB 是否存在
  ↓
  ├─ 不存在 → 创建数据库和表
  └─ 存在 → 检查版本
       ↓
       ├─ 版本相同 → 使用现有数据库
       └─ 版本不同 → 执行迁移
  ↓
初始化完成，返回数据库实例
```

### 2.2 数据库版本管理

```typescript
// 数据库版本历史
const DB_VERSION = 1;
const DB_NAME = 'TVAIVoiceTestDB';

// 版本 1: 初始版本
// - versionTestRecords 表
// - customerProblems 表
// - voiceRecognitionRecords 表
// - testCaseLibrary 表
```

---

## 3. 数据表设计

### 3.1 表 1: versionTestRecords (版本测试记录)

**用途**: 存储每个版本的测试记录

**字段定义**:
```typescript
interface VersionRecord {
  id: string;                    // 主键 (UUID)
  versionNumber: string;         // 版本号 (唯一)
  modificationContent: string;   // 修改内容
  modifiedModules: string[];     // 修改模块列表
  riskLevel: 'low' | 'medium' | 'high';  // 风险等级
  smokeTestResult: 'pass' | 'fail' | 'pending';
  voiceRegressionResult: 'pass' | 'fail' | 'pending';
  systemRegressionResult: 'pass' | 'fail' | 'pending';
  testConclusion: string;        // 测试结论
  createdAt: number;             // 创建时间 (timestamp)
  updatedAt: number;             // 更新时间 (timestamp)
}
```

**索引设计**:
- 主键: `id`
- 唯一索引: `versionNumber`
- 普通索引: `riskLevel`, `createdAt`

**查询场景**:
- 按版本号查询
- 按风险等级筛选
- 按日期范围查询
- 按修改模块搜索

---

### 3.2 表 2: customerProblems (客户问题追踪)

**用途**: 存储客户问题和追踪信息

**字段定义**:
```typescript
interface CustomerProblem {
  id: string;                    // 主键 (UUID)
  date: number;                  // 问题日期 (timestamp)
  tvModel: string;               // 电视型号
  versionNumber: string;         // 版本号
  networkEnvironment: string;    // 网络环境
  bluetoothDistance: string;     // 蓝牙距离
  batteryStatus: string;         // 电量情况
  isReproducible: boolean;       // 是否必现
  frequency: string;             // 出现频率
  originalSpeech: string;        // 原始说话内容
  recognitionResult: string;     // 识别结果
  category: string;              // 问题分类 (AI 分类)
  status: 'open' | 'in_progress' | 'resolved';  // 问题状态
  createdAt: number;             // 创建时间
  updatedAt: number;             // 更新时间
}
```

**索引设计**:
- 主键: `id`
- 普通索引: `date`, `versionNumber`, `category`, `status`

**查询场景**:
- 按日期范围查询
- 按版本号查询
- 按分类筛选
- 按状态筛选
- 按电视型号搜索

---

### 3.3 表 3: voiceRecognitionRecords (语音识别记录)

**用途**: 存储语音识别的测试结果

**字段定义**:
```typescript
interface VoiceRecord {
  id: string;                    // 主键 (UUID)
  corpusId: string;              // 语料 ID
  originalText: string;          // 原始文本
  recognizedText: string;        // 识别文本
  isCorrect: boolean;            // 是否正确
  versionNumber: string;         // 版本号
  createdAt: number;             // 创建时间
}
```

**索引设计**:
- 主键: `id`
- 普通索引: `corpusId`, `isCorrect`, `versionNumber`

**查询场景**:
- 按语料 ID 查询
- 按版本号查询
- 按正确性筛选
- 计算准确率

---

### 3.4 表 4: testCaseLibrary (测试用例库)

**用途**: 存储测试用例库

**字段定义**:
```typescript
interface TestCase {
  id: string;                    // 主键 (UUID)
  caseId: string;                // 用例 ID (唯一)
  caseName: string;              // 用例名称
  description: string;           // 用例描述
  steps: string[];               // 执行步骤
  expectedResult: string;        // 预期结果
  category: string;              // 用例分类
  riskLevel: string;             // 风险等级
  createdAt: number;             // 创建时间
}
```

**索引设计**:
- 主键: `id`
- 唯一索引: `caseId`
- 普通索引: `category`

---

## 4. 操作接口设计

### 4.1 数据库初始化

```typescript
/**
 * 初始化数据库
 * @returns Promise<void>
 */
export async function initializeDatabase(): Promise<void>

/**
 * 获取数据库实例
 * @returns Dexie 数据库实例
 */
export function getDatabase(): Database
```

### 4.2 CRUD 操作 - 版本记录

```typescript
// Create
export async function createVersionRecord(
  data: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string>

// Read
export async function getVersionRecord(id: string): Promise<VersionRecord | undefined>
export async function getVersionRecordByNumber(versionNumber: string): Promise<VersionRecord | undefined>

// Update
export async function updateVersionRecord(
  id: string,
  data: Partial<VersionRecord>
): Promise<void>

// Delete
export async function deleteVersionRecord(id: string): Promise<void>

// List
export async function getAllVersionRecords(): Promise<VersionRecord[]>
```

### 4.3 查询和筛选

```typescript
/**
 * 查询版本记录
 */
export async function queryVersionRecords(
  filters: {
    riskLevel?: 'low' | 'medium' | 'high';
    startDate?: number;
    endDate?: number;
    modifiedModules?: string[];
  },
  pagination?: {
    page: number;
    pageSize: number;
  }
): Promise<{
  data: VersionRecord[];
  total: number;
}>

/**
 * 搜索版本记录
 */
export async function searchVersionRecords(
  keyword: string,
  pagination?: {
    page: number;
    pageSize: number;
  }
): Promise<{
  data: VersionRecord[];
  total: number;
}>

/**
 * 按日期范围查询
 */
export async function getVersionRecordsByDateRange(
  startDate: number,
  endDate: number
): Promise<VersionRecord[]>
```

### 4.4 批量操作

```typescript
/**
 * 批量创建记录
 */
export async function bulkCreateVersionRecords(
  records: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<string[]>

/**
 * 批量删除记录
 */
export async function bulkDeleteVersionRecords(ids: string[]): Promise<void>

/**
 * 批量更新记录
 */
export async function bulkUpdateVersionRecords(
  updates: Array<{
    id: string;
    data: Partial<VersionRecord>;
  }>
): Promise<void>
```

### 4.5 数据备份和恢复

```typescript
/**
 * 备份所有数据为 JSON
 */
export async function backupDatabase(): Promise<string>

/**
 * 从 JSON 恢复数据
 */
export async function restoreDatabase(backupData: string): Promise<void>

/**
 * 清除所有数据
 */
export async function clearAllData(): Promise<void>

/**
 * 获取存储使用情况
 */
export async function getStorageUsage(): Promise<{
  used: number;
  available: number;
  percentage: number;
}>
```

### 4.6 事务处理

```typescript
/**
 * 执行事务
 */
export async function executeTransaction<T>(
  callback: (db: Database) => Promise<T>
): Promise<T>
```

---

## 5. 错误处理设计

### 5.1 错误类型

```typescript
enum DatabaseErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
}

class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
  }
}
```

### 5.2 错误处理策略

- 初始化失败: 重试 3 次，失败后降级到 LocalStorage
- 查询失败: 记录日志，返回空结果
- 写入失败: 抛出异常，由调用者处理
- 存储满: 提示用户清除数据

---

## 6. 性能优化设计

### 6.1 索引优化

- 为常用查询字段创建索引
- 避免过多索引影响写入性能
- 定期分析查询性能

### 6.2 查询优化

- 使用分页查询大数据集
- 实现查询结果缓存
- 避免全表扫描

### 6.3 存储优化

- 定期清理过期数据
- 压缩存储数据
- 监控存储使用情况

---

## 7. 验收标准

- [ ] AC1: 数据库成功初始化，4 个表创建完成
- [ ] AC2: 所有 CRUD 操作正常工作
- [ ] AC3: 复杂查询和筛选功能正常
- [ ] AC4: 数据备份和恢复功能正常
- [ ] AC5: 事务处理正确
- [ ] AC6: 错误处理完善
- [ ] AC7: 性能测试通过（查询 < 500ms）

---

## 8. 下一步

功能设计已完成。准备进入非功能需求评估阶段。

**请确认**:
1. ✅ 数据表设计是否合理？
2. ✅ 操作接口是否完整？
3. ✅ 错误处理策略是否清晰？
4. ✅ 是否可以继续进行非功能需求评估？

**请回复**: "确认" 继续非功能需求评估，或 "需要调整" 并说明具体调整内容。
