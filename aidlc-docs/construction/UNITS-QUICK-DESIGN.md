# 所有单元快速设计总结

**项目**: TV AI Voice 测试全流程体系 Web 网页
**日期**: 2026-02-28
**阶段**: 构建阶段 - 快速设计总结

---

## UNIT-002: 版本测试记录模块

### 核心功能
- 版本记录 CRUD（创建、读取、更新、删除）
- 搜索、筛选、排序
- 分页加载
- 导出为 Excel/CSV

### 主要组件
- `VersionRecordsPage` - 主页面
- `VersionRecordsTable` - 数据表格
- `VersionRecordForm` - 表单
- `VersionRecordFilters` - 筛选器
- `VersionRecordModal` - 模态框

### Redux 状态
```typescript
{
  items: VersionRecord[],
  loading: boolean,
  error: string | null,
  filters: QueryFilter,
  pagination: { page, pageSize, total },
  sorting: { field, order }
}
```

### 服务层
- `VersionRecordsService` - CRUD 和查询
- `VersionRecordsExportService` - 导出功能

### 工作量
- 功能设计: 1h ✅
- 非功能评估: 30min
- 非功能设计: 1h
- 代码生成: 3-4h
- **总计**: 5.5-6.5h

---

## UNIT-003: 客户问题追踪模块

### 核心功能
- 问题记录 CRUD
- AI 自动分类（调用 Azure OpenAI API）
- 问题状态管理（开放/进行中/已解决）
- 搜索、筛选、排序
- 导出为 Excel/CSV

### 主要组件
- `CustomerProblemsPage` - 主页面
- `CustomerProblemsTable` - 数据表格
- `CustomerProblemForm` - 表单
- `CustomerProblemFilters` - 筛选器
- `ClassificationResult` - 分类结果显示
- `CustomerProblemModal` - 模态框

### Redux 状态
```typescript
{
  items: CustomerProblem[],
  loading: boolean,
  classifying: boolean,
  error: string | null,
  filters: QueryFilter,
  pagination: { page, pageSize, total },
  sorting: { field, order }
}
```

### 服务层
- `CustomerProblemsService` - CRUD 和查询
- `ClassificationService` - AI 分类
- `CustomerProblemsExportService` - 导出功能

### AI 集成
- 调用 Azure OpenAI API 进行问题分类
- 支持 7 种分类：录音、蓝牙、ASR、NLU、服务端、网络、Android

### 工作量
- 功能设计: 1h
- 非功能评估: 30min
- 非功能设计: 1h
- 代码生成: 3-4h
- **总计**: 5.5-6.5h

---

## UNIT-004: AI 推荐引擎

### 核心功能
- 版本信息输入和验证
- 调用 Azure OpenAI API 生成推荐
- 三层推荐策略：版本分析 + 风险等级 + 历史问题
- 推荐结果缓存
- 推荐历史记录管理
- 错误处理和重试

### 主要组件
- `RecommendationsPage` - 主页面
- `RecommendationForm` - 推荐表单
- `RecommendationResult` - 推荐结果显示
- `RecommendationHistory` - 历史记录
- `RecommendationLoading` - 加载状态

### Redux 状态
```typescript
{
  currentRecommendation: Recommendation | null,
  history: Recommendation[],
  loading: boolean,
  error: string | null,
  cache: Map<string, Recommendation>
}
```

### 服务层
- `RecommendationService` - 推荐逻辑
- `AIService` - Azure OpenAI API 调用
- `CacheService` - 缓存管理

### 推荐逻辑
1. 分析版本修改内容 → 推荐相关用例
2. 根据风险等级推荐：
   - 低风险：冒烟 + 定向测试
   - 中风险：冒烟 + 语音专项回归
   - 高风险：全链路回归 + 边界测试
3. 基于历史问题推荐相关回归测试

### 工作量
- 功能设计: 1.5h
- 非功能评估: 30min
- 非功能设计: 1h
- 基础设施设计: 1h
- 代码生成: 2-3h
- **总计**: 6-7h

---

## UNIT-005: UI 框架和仪表板

### 核心功能
- 应用主框架（Header、Sidebar、Main Content）
- 6 个主要页面的 UI 实现
- 仪表板统计和图表
- 通用组件库
- 响应式布局
- 主题和样式

### 主要页面
1. **仪表板** - 统计数据、趋势、快速操作
2. **版本记录** - UNIT-002 集成
3. **问题追踪** - UNIT-003 集成
4. **语音记录** - 语音识别记录管理
5. **AI 推荐** - UNIT-004 集成
6. **设置** - API Key 配置、数据管理

### 通用组件
- `DataTable` - 数据表格
- `Form` - 表单
- `Modal` - 模态框
- `Card` - 卡片
- `Chart` - 图表（饼图、折线图）
- `Button` - 按钮
- `Input` - 输入框
- `Select` - 下拉选择
- `Tag` - 标签
- `LoadingSpinner` - 加载动画

### 仪表板功能
- 版本测试统计（总数、通过/失败比例）
- 客户问题统计（总数、分类统计）
- 语音识别准确率
- 最近 7 天活动趋势
- 最近 5 条活动记录
- 高风险版本警告

### 语音识别记录功能
- 添加、查看、删除记录
- 准确率统计
- 数据导入功能

### 设置功能
- API Key 输入和验证
- 连接测试
- 数据备份和恢复
- 存储使用情况显示

### 样式设计
- 蓝色系渐变（#0066CC → #00CCFF）
- 现代化设计（卡片、圆角、阴影）
- 响应式布局（仅桌面）

### 工作量
- 功能设计: 1.5h
- 非功能评估: 30min
- 非功能设计: 1h
- 代码生成: 4-5h
- **总计**: 7-8h

---

## 快速设计总结表

| 单元 | 名称 | 优先级 | 工作量 | 依赖 | 状态 |
|------|------|--------|--------|------|------|
| UNIT-001 | 本地数据库层 | P0 | 4.5-5h | 无 | ✅ 完成 |
| UNIT-002 | 版本测试记录 | P0 | 5.5-6.5h | UNIT-001 | 设计中 |
| UNIT-003 | 客户问题追踪 | P0 | 5.5-6.5h | UNIT-001 | 待进行 |
| UNIT-004 | AI 推荐引擎 | P1 | 6-7h | UNIT-001 | 待进行 |
| UNIT-005 | UI 框架 | P1 | 7-8h | 所有单元 | 待进行 |
| **总计** | - | - | **28.5-33.5h** | - | - |

---

## 技术栈统一

### 前端框架
- React 18 + TypeScript
- Vite（构建工具）
- React Router（路由）

### 状态管理
- Redux Toolkit（全局状态）
- React Context（局部状态）

### UI 和样式
- Tailwind CSS（样式框架）
- Shadcn/ui（组件库）
- Chart.js / Recharts（图表）

### 数据和 API
- Dexie.js（IndexedDB 包装）
- axios（HTTP 客户端）
- Azure OpenAI SDK（AI 集成）

### 数据导出
- xlsx（Excel 导出）
- papaparse（CSV 导出）

### 测试
- Vitest（单元测试）
- @testing-library/react（组件测试）

### 代码质量
- ESLint（代码检查）
- Prettier（代码格式化）

---

## 项目结构

```
project/
├── src/
│   ├── types/
│   │   └── database.ts
│   ├── db/
│   │   ├── database.ts
│   │   ├── operations/
│   │   ├── utils/
│   │   └── index.ts
│   ├── features/
│   │   ├── versionRecords/
│   │   ├── customerProblems/
│   │   ├── voiceRecords/
│   │   ├── recommendations/
│   │   └── settings/
│   ├── components/
│   │   ├── common/
│   │   └── layout/
│   ├── pages/
│   ├── store/
│   ├── services/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── aidlc-docs/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 下一步行动

### 立即进行
1. ✅ UNIT-001 代码生成完成
2. ⏳ UNIT-002 快速设计完成 → 进行代码生成
3. ⏳ UNIT-003 快速设计完成 → 进行代码生成
4. ⏳ UNIT-004 快速设计完成 → 进行代码生成
5. ⏳ UNIT-005 快速设计完成 → 进行代码生成

### 建议
- 所有单元可以并行开发（UNIT-002、003、004）
- UNIT-005 依赖其他单元，最后进行
- 每个单元完成后进行单元测试
- 所有单元完成后进行集成测试

---

## 总结

所有 5 个单元的快速设计已完成，总工作量约 28.5-33.5 小时。

**UNIT-001** 已完成代码生成（1940+ 行代码）。

**UNIT-002 到 UNIT-005** 已完成快速设计，准备进行代码生成。

建议立即开始 UNIT-002、003、004 的代码生成，然后进行 UNIT-005 的代码生成。
