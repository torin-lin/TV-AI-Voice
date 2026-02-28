# 单元生成文档

**项目**: TV AI Voice 测试全流程体系 Web 网页
**日期**: 2026-02-28
**阶段**: 启动阶段 - 单元生成

---

## 1. 单元分解策略

### 1.1 分解原则

- **独立性**: 每个单元可以独立开发和测试
- **完整性**: 每个单元包含完整的功能
- **可交付性**: 每个单元可以独立部署
- **依赖最小化**: 单元间依赖关系清晰

### 1.2 分解维度

按照**技术层次**和**功能模块**进行分解：

```
应用层
├── 数据层 (单元 1)
├── 功能模块 (单元 2, 3, 4)
└── UI 层 (单元 5)
```

---

## 2. 单元详细设计

### 单元 1: 本地数据库层 (Database Layer)

**单元 ID**: UNIT-001
**优先级**: P0 (必须)
**依赖**: 无
**被依赖**: 所有其他单元

#### 2.1.1 单元目标

建立完整的本地数据库操作层，为整个应用提供数据持久化基础。

#### 2.1.2 功能范围

**核心功能**:
- IndexedDB 数据库初始化
- 4 个数据表的创建和管理
- CRUD 操作接口
- 复杂查询和筛选
- 数据备份和恢复
- 事务处理

**包含的故事**:
- US-008: 数据持久化 - 本地数据库

#### 2.1.3 技术栈

- Dexie.js - IndexedDB 包装库
- TypeScript - 类型定义
- Jest - 单元测试

#### 2.1.4 交付物

```
src/
├── db/
│   ├── database.ts          # 数据库初始化
│   ├── schema.ts            # 数据库 schema 定义
│   ├── tables/
│   │   ├── versionRecords.ts
│   │   ├── customerProblems.ts
│   │   ├── voiceRecords.ts
│   │   └── testCaseLibrary.ts
│   └── operations/
│       ├── create.ts        # 创建操作
│       ├── read.ts          # 读取操作
│       ├── update.ts        # 更新操作
│       ├── delete.ts        # 删除操作
│       ├── query.ts         # 复杂查询
│       ├── backup.ts        # 备份操作
│       └── restore.ts       # 恢复操作
├── types/
│   └── database.ts          # 数据类型定义
└── __tests__/
    └── database.test.ts
```

#### 2.1.5 关键接口

```typescript
// 数据库初始化
export function initializeDatabase(): Promise<void>

// CRUD 操作
export function createVersionRecord(data: VersionRecord): Promise<string>
export function getVersionRecord(id: string): Promise<VersionRecord>
export function updateVersionRecord(id: string, data: Partial<VersionRecord>): Promise<void>
export function deleteVersionRecord(id: string): Promise<void>

// 查询操作
export function queryVersionRecords(filters: QueryFilter): Promise<VersionRecord[]>
export function searchVersionRecords(keyword: string): Promise<VersionRecord[]>

// 备份和恢复
export function backupDatabase(): Promise<string>
export function restoreDatabase(backupData: string): Promise<void>
export function clearAllData(): Promise<void>
```

#### 2.1.6 验收标准

- [ ] AC1: 数据库成功初始化，4 个表创建完成
- [ ] AC2: 所有 CRUD 操作正常工作
- [ ] AC3: 复杂查询和筛选功能正常
- [ ] AC4: 数据备份和恢复功能正常
- [ ] AC5: 事务处理正确
- [ ] AC6: 单元测试覆盖率 > 90%
- [ ] AC7: 性能测试通过（查询 < 500ms）

#### 2.1.7 工作量估计

- 功能设计: 1 小时
- 非功能评估: 30 分钟
- 非功能设计: 1 小时
- 代码生成: 2-3 小时
- **总计**: 4.5-5 小时

---

### 单元 2: 版本测试记录模块 (Version Records Module)

**单元 ID**: UNIT-002
**优先级**: P0 (必须)
**依赖**: UNIT-001 (数据库层)
**被依赖**: UNIT-005 (UI 层)

#### 2.2.1 单元目标

实现版本测试记录的完整管理功能，包括 CRUD、搜索、筛选和导出。

#### 2.2.2 功能范围

**核心功能**:
- 版本记录的添加、查看、编辑、删除
- 搜索和筛选功能
- 数据排序
- 分页加载
- 数据导出（Excel/CSV）

**包含的故事**:
- US-001: 版本测试记录管理
- US-004: 数据导出（版本记录部分）

#### 2.2.3 技术栈

- React 18 - UI 框架
- Redux Toolkit - 状态管理
- TypeScript - 类型定义
- Vitest - 单元测试

#### 2.2.4 交付物

```
src/
├── features/
│   └── versionRecords/
│       ├── components/
│       │   ├── VersionRecordsTable.tsx
│       │   ├── VersionRecordForm.tsx
│       │   ├── VersionRecordModal.tsx
│       │   └── VersionRecordFilters.tsx
│       ├── store/
│       │   ├── versionRecordsSlice.ts
│       │   └── versionRecordsSelectors.ts
│       ├── services/
│       │   ├── versionRecordsService.ts
│       │   └── versionRecordsExport.ts
│       ├── types/
│       │   └── versionRecords.ts
│       └── __tests__/
│           ├── components.test.tsx
│           ├── store.test.ts
│           └── services.test.ts
```

#### 2.2.5 关键接口

```typescript
// Redux actions
export const fetchVersionRecords = createAsyncThunk(...)
export const createVersionRecord = createAsyncThunk(...)
export const updateVersionRecord = createAsyncThunk(...)
export const deleteVersionRecord = createAsyncThunk(...)
export const searchVersionRecords = createAsyncThunk(...)

// Services
export function exportVersionRecordsToExcel(records: VersionRecord[]): void
export function exportVersionRecordsToCSV(records: VersionRecord[]): void
```

#### 2.2.6 验收标准

- [ ] AC1: 能够添加新的版本记录
- [ ] AC2: 能够查看所有版本记录列表
- [ ] AC3: 能够编辑现有版本记录
- [ ] AC4: 能够删除版本记录
- [ ] AC5: 能够搜索和筛选版本记录
- [ ] AC6: 能够排序版本记录
- [ ] AC7: 能够导出为 Excel/CSV
- [ ] AC8: 分页加载正常工作
- [ ] AC9: 单元测试覆盖率 > 85%

#### 2.2.7 工作量估计

- 功能设计: 1 小时
- 非功能评估: 30 分钟
- 非功能设计: 1 小时
- 代码生成: 3-4 小时
- **总计**: 5.5-6.5 小时

---

### 单元 3: 客户问题追踪模块 (Customer Problems Module)

**单元 ID**: UNIT-003
**优先级**: P0 (必须)
**依赖**: UNIT-001 (数据库层)
**被依赖**: UNIT-005 (UI 层)

#### 2.3.1 单元目标

实现客户问题的记录、追踪和 AI 自动分类功能。

#### 2.3.2 功能范围

**核心功能**:
- 客户问题的添加、查看、编辑、删除
- AI 自动分类（调用 Azure OpenAI API）
- 问题状态管理
- 搜索和筛选功能
- 数据导出（Excel/CSV）

**包含的故事**:
- US-003: 客户问题追踪
- US-004: 数据导出（问题部分）

#### 2.3.3 技术栈

- React 18 - UI 框架
- Redux Toolkit - 状态管理
- axios - HTTP 客户端
- Azure OpenAI SDK - AI 集成
- TypeScript - 类型定义

#### 2.3.4 交付物

```
src/
├── features/
│   └── customerProblems/
│       ├── components/
│       │   ├── CustomerProblemsTable.tsx
│       │   ├── CustomerProblemForm.tsx
│       │   ├── CustomerProblemModal.tsx
│       │   ├── CustomerProblemFilters.tsx
│       │   └── ClassificationResult.tsx
│       ├── store/
│       │   ├── customerProblemsSlice.ts
│       │   └── customerProblemsSelectors.ts
│       ├── services/
│       │   ├── customerProblemsService.ts
│       │   ├── classificationService.ts
│       │   └── customerProblemsExport.ts
│       ├── types/
│       │   └── customerProblems.ts
│       └── __tests__/
│           ├── components.test.tsx
│           ├── store.test.ts
│           └── services.test.ts
```

#### 2.3.5 关键接口

```typescript
// Redux actions
export const fetchCustomerProblems = createAsyncThunk(...)
export const createCustomerProblem = createAsyncThunk(...)
export const updateCustomerProblem = createAsyncThunk(...)
export const deleteCustomerProblem = createAsyncThunk(...)
export const classifyProblem = createAsyncThunk(...)

// Services
export function classifyProblemWithAI(problem: CustomerProblem): Promise<string>
export function exportProblemsToExcel(problems: CustomerProblem[]): void
export function exportProblemsToCSV(problems: CustomerProblem[]): void
```

#### 2.3.6 验收标准

- [ ] AC1: 能够添加新的客户问题
- [ ] AC2: 能够查看所有客户问题列表
- [ ] AC3: 能够编辑客户问题
- [ ] AC4: 能够删除客户问题
- [ ] AC5: AI 能够自动分类问题
- [ ] AC6: 能够搜索和筛选问题
- [ ] AC7: 能够更新问题状态
- [ ] AC8: 能够导出为 Excel/CSV
- [ ] AC9: 单元测试覆盖率 > 85%

#### 2.3.7 工作量估计

- 功能设计: 1 小时
- 非功能评估: 30 分钟
- 非功能设计: 1 小时
- 代码生成: 3-4 小时
- **总计**: 5.5-6.5 小时

---

### 单元 4: AI 推荐引擎 (AI Recommendation Engine)

**单元 ID**: UNIT-004
**优先级**: P1 (重要)
**依赖**: UNIT-001 (数据库层)
**被依赖**: UNIT-005 (UI 层)

#### 2.4.1 单元目标

实现基于 Azure OpenAI API 的智能用例推荐引擎。

#### 2.4.2 功能范围

**核心功能**:
- 版本信息输入和验证
- 调用 Azure OpenAI API 生成推荐
- 三层推荐策略（版本分析 + 风险等级 + 历史问题）
- 推荐结果缓存
- 推荐历史记录管理
- 错误处理和重试机制

**包含的故事**:
- US-002: AI 用例推荐

#### 2.4.3 技术栈

- React 18 - UI 框架
- Redux Toolkit - 状态管理
- axios - HTTP 客户端
- Azure OpenAI SDK - AI 集成
- TypeScript - 类型定义

#### 2.4.4 交付物

```
src/
├── features/
│   └── recommendations/
│       ├── components/
│       │   ├── RecommendationForm.tsx
│       │   ├── RecommendationResult.tsx
│       │   ├── RecommendationHistory.tsx
│       │   └── RecommendationLoading.tsx
│       ├── store/
│       │   ├── recommendationsSlice.ts
│       │   └── recommendationsSelectors.ts
│       ├── services/
│       │   ├── recommendationService.ts
│       │   ├── aiService.ts
│       │   └── cacheService.ts
│       ├── types/
│       │   └── recommendations.ts
│       └── __tests__/
│           ├── components.test.tsx
│           ├── store.test.ts
│           └── services.test.ts
```

#### 2.4.5 关键接口

```typescript
// Redux actions
export const generateRecommendation = createAsyncThunk(...)
export const fetchRecommendationHistory = createAsyncThunk(...)
export const saveRecommendation = createAsyncThunk(...)

// Services
export function callAzureOpenAIAPI(prompt: string): Promise<string>
export function generateRecommendationPrompt(versionInfo: VersionInfo): string
export function parseRecommendationResult(result: string): RecommendationResult
export function getCachedRecommendation(key: string): RecommendationResult | null
export function cacheRecommendation(key: string, result: RecommendationResult): void
```

#### 2.4.6 验收标准

- [ ] AC1: 能够输入版本信息
- [ ] AC2: 能够调用 Azure OpenAI API
- [ ] AC3: 能够生成推荐结果
- [ ] AC4: 推荐结果包括推荐理由
- [ ] AC5: 能够缓存推荐结果
- [ ] AC6: 能够查看推荐历史
- [ ] AC7: 能够保存推荐结果
- [ ] AC8: 错误处理和重试正常工作
- [ ] AC9: 单元测试覆盖率 > 85%

#### 2.4.7 工作量估计

- 功能设计: 1.5 小时
- 非功能评估: 30 分钟
- 非功能设计: 1 小时
- 基础设施设计: 1 小时
- 代码生成: 2-3 小时
- **总计**: 6-7 小时

---

### 单元 5: UI 框架和仪表板 (UI Framework & Dashboard)

**单元 ID**: UNIT-005
**优先级**: P1 (重要)
**依赖**: UNIT-001, UNIT-002, UNIT-003, UNIT-004
**被依赖**: 无

#### 2.5.1 单元目标

实现整个应用的 UI 框架、页面布局和仪表板功能。

#### 2.5.2 功能范围

**核心功能**:
- 应用主框架（Header、Sidebar、Main Content）
- 6 个主要页面的 UI 实现
- 仪表板统计和图表
- 通用组件库
- 响应式布局
- 主题和样式

**包含的故事**:
- US-005: 语音识别记录管理
- US-006: 仪表板和统计
- US-007: API Key 配置

#### 2.5.3 技术栈

- React 18 - UI 框架
- TypeScript - 类型定义
- Tailwind CSS - 样式框架
- Shadcn/ui - 组件库
- Chart.js / Recharts - 图表库
- React Router - 路由

#### 2.5.4 交付物

```
src/
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   ├── DataTable.tsx
│   │   ├── Form.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Chart.tsx
│   │   └── LoadingSpinner.tsx
│   └── layout/
│       └── MainLayout.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── VersionRecords.tsx
│   ├── CustomerProblems.tsx
│   ├── VoiceRecords.tsx
│   ├── Recommendations.tsx
│   └── Settings.tsx
├── features/
│   └── voiceRecords/
│       ├── components/
│       │   ├── VoiceRecordsTable.tsx
│       │   ├── VoiceRecordForm.tsx
│       │   └── AccuracyStats.tsx
│       ├── store/
│       │   ├── voiceRecordsSlice.ts
│       │   └── voiceRecordsSelectors.ts
│       ├── services/
│       │   └── voiceRecordsService.ts
│       ├── types/
│       │   └── voiceRecords.ts
│       └── __tests__/
│           └── components.test.tsx
├── features/
│   └── settings/
│       ├── components/
│       │   ├── APIKeyConfig.tsx
│       │   ├── DataManagement.tsx
│       │   └── StorageUsage.tsx
│       ├── store/
│       │   ├── settingsSlice.ts
│       │   └── settingsSelectors.ts
│       ├── services/
│       │   └── settingsService.ts
│       ├── types/
│       │   └── settings.ts
│       └── __tests__/
│           └── components.test.tsx
├── styles/
│   ├── globals.css
│   ├── tailwind.config.ts
│   └── theme.ts
└── __tests__/
    └── pages.test.tsx
```

#### 2.5.5 关键接口

```typescript
// 页面组件
export function Dashboard(): JSX.Element
export function VersionRecords(): JSX.Element
export function CustomerProblems(): JSX.Element
export function VoiceRecords(): JSX.Element
export function Recommendations(): JSX.Element
export function Settings(): JSX.Element

// 通用组件
export function DataTable(props: DataTableProps): JSX.Element
export function Form(props: FormProps): JSX.Element
export function Modal(props: ModalProps): JSX.Element
export function Chart(props: ChartProps): JSX.Element
```

#### 2.5.6 验收标准

- [ ] AC1: 应用主框架正常显示
- [ ] AC2: 所有 6 个页面可以正常访问
- [ ] AC3: 仪表板显示所有统计数据
- [ ] AC4: 图表正常显示和更新
- [ ] AC5: 通用组件正常工作
- [ ] AC6: 样式和颜色方案正确
- [ ] AC7: 响应式布局正常
- [ ] AC8: 页面加载时间 < 2 秒
- [ ] AC9: 单元测试覆盖率 > 80%

#### 2.5.7 工作量估计

- 功能设计: 1.5 小时
- 非功能评估: 30 分钟
- 非功能设计: 1 小时
- 代码生成: 4-5 小时
- **总计**: 7-8 小时

---

## 3. 单元依赖关系

### 3.1 依赖图

```
UNIT-001 (数据库层)
  ↓
  ├─→ UNIT-002 (版本记录)
  ├─→ UNIT-003 (问题追踪)
  └─→ UNIT-004 (AI 推荐)
       ↓
       └─→ UNIT-005 (UI 框架)
```

### 3.2 并行开发可能性

- **第 1 阶段**: UNIT-001 (必须先完成)
- **第 2 阶段**: UNIT-002, UNIT-003, UNIT-004 (可并行开发)
- **第 3 阶段**: UNIT-005 (依赖前面所有单元)

---

## 4. 单元集成计划

### 4.1 集成顺序

1. UNIT-001 完成 → 测试数据库层
2. UNIT-002 完成 → 集成版本记录模块
3. UNIT-003 完成 → 集成问题追踪模块
4. UNIT-004 完成 → 集成 AI 推荐引擎
5. UNIT-005 完成 → 集成 UI 框架
6. 全系统集成测试

### 4.2 集成测试计划

- 单元间数据流测试
- 端到端功能测试
- 性能测试
- 浏览器兼容性测试

---

## 5. 工作量总结

| 单元 | 优先级 | 工作量 | 总计 |
|------|--------|--------|------|
| UNIT-001 | P0 | 4.5-5h | 4.5-5h |
| UNIT-002 | P0 | 5.5-6.5h | 5.5-6.5h |
| UNIT-003 | P0 | 5.5-6.5h | 5.5-6.5h |
| UNIT-004 | P1 | 6-7h | 6-7h |
| UNIT-005 | P1 | 7-8h | 7-8h |
| **总计** | - | - | **28.5-33.5h** |

---

## 6. 下一步

单元生成已完成。启动阶段全部完成，准备进入构建阶段。

**请确认**:
1. ✅ 单元分解是否合理？
2. ✅ 单元依赖关系是否清晰？
3. ✅ 工作量估计是否合理？
4. ✅ 是否可以开始构建阶段？

**请回复**: "确认" 开始构建阶段，或 "需要调整" 并说明具体调整内容。
