# UNIT-001: 本地数据库层 - 非功能设计

**单元**: UNIT-001 (本地数据库层)
**日期**: 2026-02-28
**阶段**: 构建阶段 - 非功能设计

---

## 1. 性能优化设计

### 1.1 索引策略

**索引设计原则**:
- 为频繁查询的字段创建索引
- 避免过多索引影响写入性能
- 定期分析查询性能

**索引规划**:

**versionTestRecords 表**:
```typescript
// 主键索引
db.versionTestRecords.primaryKey = 'id'

// 唯一索引
db.versionTestRecords.index('versionNumber').unique()

// 普通索引
db.versionTestRecords.index('riskLevel')
db.versionTestRecords.index('createdAt')

// 复合索引
db.versionTestRecords.index('[riskLevel+createdAt]')
```

**customerProblems 表**:
```typescript
// 主键索引
db.customerProblems.primaryKey = 'id'

// 普通索引
db.customerProblems.index('date')
db.customerProblems.index('versionNumber')
db.customerProblems.index('category')
db.customerProblems.index('status')

// 复合索引
db.customerProblems.index('[versionNumber+category]')
db.customerProblems.index('[status+date]')
```

**voiceRecognitionRecords 表**:
```typescript
// 主键索引
db.voiceRecognitionRecords.primaryKey = 'id'

// 普通索引
db.voiceRecognitionRecords.index('corpusId')
db.voiceRecognitionRecords.index('isCorrect')
db.voiceRecognitionRecords.index('versionNumber')

// 复合索引
db.voiceRecognitionRecords.index('[versionNumber+isCorrect]')
```

### 1.2 查询优化

**分页查询实现**:
```typescript
export async function queryVersionRecordsWithPagination(
  filters: QueryFilter,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  data: VersionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  // 1. 构建查询条件
  let query = db.versionTestRecords.where(filters);
  
  // 2. 获取总数
  const total = await query.count();
  
  // 3. 计算分页
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);
  
  // 4. 执行分页查询
  const data = await query
    .offset(offset)
    .limit(pageSize)
    .toArray();
  
  return { data, total, page, pageSize, totalPages };
}
```

**查询结果缓存**:
```typescript
class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 分钟

  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

**避免全表扫描**:
```typescript
// 不好的做法 - 全表扫描
async function findProblems(keyword: string) {
  const all = await db.customerProblems.toArray();
  return all.filter(p => p.originalSpeech.includes(keyword));
}

// 好的做法 - 使用索引
async function findProblems(keyword: string) {
  return await db.customerProblems
    .where('originalSpeech')
    .startsWithIgnoreCase(keyword)
    .toArray();
}
```

### 1.3 存储优化

**数据压缩**:
```typescript
// 压缩长文本字段
function compressData(data: string): string {
  // 使用 LZ-string 或类似库进行压缩
  return compress(data);
}

function decompressData(compressed: string): string {
  return decompress(compressed);
}
```

**定期清理过期数据**:
```typescript
export async function cleanupExpiredData(): Promise<void> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  // 清理 30 天前的客户问题
  await db.customerProblems
    .where('createdAt')
    .below(thirtyDaysAgo)
    .delete();
  
  // 清理 30 天前的语音识别记录
  await db.voiceRecognitionRecords
    .where('createdAt')
    .below(thirtyDaysAgo)
    .delete();
}
```

**存储使用监控**:
```typescript
export async function getStorageUsage(): Promise<StorageUsage> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { used: 0, available: 0, percentage: 0 };
  }
  
  const estimate = await navigator.storage.estimate();
  const used = estimate.usage || 0;
  const available = estimate.quota || 0;
  const percentage = (used / available) * 100;
  
  return { used, available, percentage };
}
```

---

## 2. 可靠性设计

### 2.1 事务处理

**事务实现**:
```typescript
export async function executeTransaction<T>(
  callback: (db: Database) => Promise<T>
): Promise<T> {
  try {
    return await db.transaction('rw', 
      db.versionTestRecords,
      db.customerProblems,
      db.voiceRecognitionRecords,
      db.testCaseLibrary,
      async () => {
        return await callback(db);
      }
    );
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.TRANSACTION_FAILED,
      `Transaction failed: ${error.message}`,
      error
    );
  }
}
```

**批量操作事务**:
```typescript
export async function bulkCreateVersionRecords(
  records: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<string[]> {
  return await executeTransaction(async (db) => {
    const ids: string[] = [];
    
    for (const record of records) {
      const id = generateUUID();
      await db.versionTestRecords.add({
        ...record,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      ids.push(id);
    }
    
    return ids;
  });
}
```

### 2.2 错误恢复

**重试机制**:
```typescript
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, i)); // 指数退避
      }
    }
  }
  
  throw lastError;
}
```

**降级方案**:
```typescript
class DatabaseWithFallback {
  private db: Database | null = null;
  private fallbackStorage: LocalStorageFallback | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await initializeDatabase();
    } catch (error) {
      console.warn('IndexedDB initialization failed, using LocalStorage fallback');
      this.fallbackStorage = new LocalStorageFallback();
      await this.fallbackStorage.initialize();
    }
  }

  async query(table: string, filters: any): Promise<any[]> {
    if (this.db) {
      return await this.db.query(table, filters);
    } else {
      return await this.fallbackStorage.query(table, filters);
    }
  }
}
```

### 2.3 数据一致性

**乐观锁实现**:
```typescript
interface VersionedRecord {
  id: string;
  version: number;
  data: any;
}

export async function updateWithOptimisticLock(
  id: string,
  updates: any,
  expectedVersion: number
): Promise<void> {
  const record = await db.versionTestRecords.get(id);
  
  if (record.version !== expectedVersion) {
    throw new Error('Concurrent modification detected');
  }
  
  await db.versionTestRecords.update(id, {
    ...updates,
    version: expectedVersion + 1,
    updatedAt: Date.now()
  });
}
```

---

## 3. 安全性设计

### 3.1 输入验证

**数据验证模式**:
```typescript
interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
}

export function validateData(
  data: any,
  rules: ValidationRule[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const rule of rules) {
    const value = data[rule.field];
    
    // 检查必填字段
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`${rule.field} is required`);
      continue;
    }
    
    if (value === undefined || value === null) continue;
    
    // 检查类型
    if (typeof value !== rule.type) {
      errors.push(`${rule.field} must be ${rule.type}`);
      continue;
    }
    
    // 检查字符串长度
    if (rule.type === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }
    }
    
    // 检查枚举值
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${rule.field} must be one of ${rule.enum.join(', ')}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

**版本记录验证规则**:
```typescript
const versionRecordValidationRules: ValidationRule[] = [
  { field: 'versionNumber', type: 'string', required: true, minLength: 1, maxLength: 50 },
  { field: 'modificationContent', type: 'string', required: true, maxLength: 1000 },
  { field: 'modifiedModules', type: 'array', required: true },
  { field: 'riskLevel', type: 'string', required: true, enum: ['low', 'medium', 'high'] },
  { field: 'smokeTestResult', type: 'string', required: true, enum: ['pass', 'fail', 'pending'] },
];
```

### 3.2 数据隐私

**数据清除功能**:
```typescript
export async function clearAllData(): Promise<void> {
  try {
    await db.versionTestRecords.clear();
    await db.customerProblems.clear();
    await db.voiceRecognitionRecords.clear();
    await db.testCaseLibrary.clear();
    
    // 清除 LocalStorage 中的敏感数据
    localStorage.removeItem('apiKey');
    localStorage.removeItem('userPreferences');
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.CLEAR_FAILED,
      `Failed to clear data: ${error.message}`,
      error
    );
  }
}
```

**数据导出和导入**:
```typescript
export async function exportDatabase(): Promise<string> {
  const data = {
    versionRecords: await db.versionTestRecords.toArray(),
    customerProblems: await db.customerProblems.toArray(),
    voiceRecords: await db.voiceRecognitionRecords.toArray(),
    testCases: await db.testCaseLibrary.toArray(),
    exportDate: new Date().toISOString()
  };
  
  return JSON.stringify(data);
}

export async function importDatabase(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    
    // 验证数据格式
    if (!data.versionRecords || !data.customerProblems) {
      throw new Error('Invalid backup format');
    }
    
    // 导入数据
    await executeTransaction(async (db) => {
      await db.versionTestRecords.bulkAdd(data.versionRecords);
      await db.customerProblems.bulkAdd(data.customerProblems);
      await db.voiceRecognitionRecords.bulkAdd(data.voiceRecords);
      await db.testCaseLibrary.bulkAdd(data.testCases);
    });
  } catch (error) {
    throw new DatabaseError(
      DatabaseErrorType.IMPORT_FAILED,
      `Failed to import data: ${error.message}`,
      error
    );
  }
}
```

---

## 4. 可维护性设计

### 4.1 代码结构

**模块化设计**:
```
src/db/
├── database.ts              # 数据库初始化
├── schema.ts                # Schema 定义
├── tables/
│   ├── versionRecords.ts    # 版本记录操作
│   ├── customerProblems.ts  # 问题追踪操作
│   ├── voiceRecords.ts      # 语音记录操作
│   └── testCaseLibrary.ts   # 用例库操作
├── operations/
│   ├── crud.ts              # CRUD 操作
│   ├── query.ts             # 查询操作
│   ├── transaction.ts       # 事务处理
│   ├── backup.ts            # 备份操作
│   └── restore.ts           # 恢复操作
├── utils/
│   ├── validation.ts        # 数据验证
│   ├── cache.ts             # 缓存管理
│   ├── error.ts             # 错误处理
│   └── logger.ts            # 日志记录
└── types/
    └── database.ts          # 类型定义
```

### 4.2 错误处理

**统一的错误处理**:
```typescript
export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message
    };
  }
}

// 使用示例
try {
  await createVersionRecord(data);
} catch (error) {
  if (error instanceof DatabaseError) {
    logger.error(`Database error: ${error.type}`, error);
    // 处理特定的数据库错误
  } else {
    logger.error('Unexpected error', error);
  }
}
```

### 4.3 日志记录

**日志系统**:
```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

class Logger {
  log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    console.log(JSON.stringify(logEntry));
    
    // 可选：发送到远程日志服务
    if (level === LogLevel.ERROR) {
      this.sendToRemote(logEntry);
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  private sendToRemote(logEntry: any): void {
    // 实现远程日志发送
  }
}
```

---

## 5. 可扩展性设计

### 5.1 数据库版本管理

**版本升级策略**:
```typescript
const DB_VERSIONS = {
  1: {
    name: 'Initial version',
    tables: ['versionTestRecords', 'customerProblems', 'voiceRecognitionRecords', 'testCaseLibrary']
  },
  2: {
    name: 'Add new fields',
    migration: async (db: Database) => {
      // 执行迁移逻辑
      await db.versionTestRecords.toCollection().modify(record => {
        record.newField = 'default value';
      });
    }
  }
};

export async function migrateDatabase(fromVersion: number, toVersion: number): Promise<void> {
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const versionConfig = DB_VERSIONS[v];
    if (versionConfig.migration) {
      await versionConfig.migration(db);
    }
  }
}
```

### 5.2 插件系统

**扩展点设计**:
```typescript
interface DatabasePlugin {
  name: string;
  version: string;
  install(db: Database): Promise<void>;
  uninstall(db: Database): Promise<void>;
}

class DatabasePluginManager {
  private plugins: Map<string, DatabasePlugin> = new Map();

  async install(plugin: DatabasePlugin): Promise<void> {
    await plugin.install(db);
    this.plugins.set(plugin.name, plugin);
  }

  async uninstall(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      await plugin.uninstall(db);
      this.plugins.delete(pluginName);
    }
  }
}
```

---

## 6. 验收标准

- [ ] AC1: 索引策略正确实现
- [ ] AC2: 查询优化有效（性能指标达成）
- [ ] AC3: 事务处理正确
- [ ] AC4: 错误恢复机制完善
- [ ] AC5: 数据验证完整
- [ ] AC6: 数据隐私保护充分
- [ ] AC7: 代码结构清晰
- [ ] AC8: 错误处理完善
- [ ] AC9: 日志记录完整
- [ ] AC10: 可扩展性设计合理

---

## 7. 下一步

非功能设计已完成。准备进入代码生成阶段。

**请确认**:
1. ✅ 性能优化设计是否合理？
2. ✅ 可靠性设计是否完善？
3. ✅ 安全性设计是否充分？
4. ✅ 可维护性设计是否清晰？
5. ✅ 是否可以继续进行代码生成？

**请回复**: "确认" 继续代码生成，或 "需要调整" 并说明具体调整内容。
