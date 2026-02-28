# UNIT-003: 客户问题追踪模块 - 代码生成计划

**单元**: UNIT-003 (客户问题追踪模块)
**日期**: 2026-02-28
**阶段**: 构建阶段 - 代码生成计划

---

## 1. 代码生成概述

### 1.1 生成范围

UNIT-003 客户问题追踪模块的完整代码实现，包括：
- Redux 状态管理（异步 thunks、状态结构、selectors）
- React 组件（页面、表格、表单、筛选器、模态框、分类结果）
- 服务层（CRUD、AI 分类、导出）
- AI 集成（Azure OpenAI API 调用）

### 1.2 依赖关系

- **依赖**: UNIT-001（数据库层）
- **被依赖**: UNIT-005（UI 框架）

### 1.3 工作量估算

| 任务 | 时间 |
|------|------|
| 功能设计 | 1h |
| 非功能评估 | 30min |
| 非功能设计 | 1h |
| 代码生成 | 3-4h |
| **总计** | **5.5-6.5h** |

---

## 2. 代码生成计划

### 2.1 Redux 状态管理

**文件**: `src/features/customerProblems/store/customerProblemsSlice.ts`

**内容**:
- 状态结构定义
- 异步 thunks:
  - `fetchCustomerProblems` - 获取问题列表
  - `createCustomerProblem` - 创建问题
  - `updateCustomerProblem` - 更新问题
  - `deleteCustomerProblem` - 删除问题
  - `searchCustomerProblems` - 搜索问题
  - `classifyProblem` - AI 分类问题
- Reducers（状态更新）
- Selectors（状态选择器）

**代码行数**: 300-400 行

### 2.2 React 组件

#### 2.2.1 CustomerProblemsPage
**文件**: `src/features/customerProblems/components/CustomerProblemsPage.tsx`

**功能**:
- 页面容器
- 工具栏（添加、导出）
- 筛选器集成
- 表格显示
- 模态框管理

**代码行数**: 150-180 行

#### 2.2.2 CustomerProblemsTable
**文件**: `src/features/customerProblems/components/CustomerProblemsTable.tsx`

**功能**:
- 显示问题列表
- 排序、分页
- 行操作（编辑、删除、查看分类）
- 状态颜色标记

**代码行数**: 180-220 行

#### 2.2.3 CustomerProblemForm
**文件**: `src/features/customerProblems/components/CustomerProblemForm.tsx`

**功能**:
- 问题描述输入
- 问题类型选择
- 状态选择
- 备注输入
- 表单验证

**代码行数**: 150-180 行

#### 2.2.4 CustomerProblemFilters
**文件**: `src/features/customerProblems/components/CustomerProblemFilters.tsx`

**功能**:
- 关键词搜索
- 高级筛选
- 问题分类筛选
- 状态筛选
- 日期范围筛选

**代码行数**: 150-180 行

#### 2.2.5 CustomerProblemModal
**文件**: `src/features/customerProblems/components/CustomerProblemModal.tsx`

**功能**:
- 模态框容器
- 表单展示
- 添加/编辑模式

**代码行数**: 80-100 行

#### 2.2.6 ClassificationResult
**文件**: `src/features/customerProblems/components/ClassificationResult.tsx`

**功能**:
- 显示 AI 分类结果
- 分类置信度
- 建议操作

**代码行数**: 100-120 行

**总组件代码行数**: 810-980 行

### 2.3 服务层

#### 2.3.1 CustomerProblemsService
**文件**: `src/features/customerProblems/services/CustomerProblemsService.ts`

**方法**:
- `fetchProblems(filters, pagination)` - 获取问题
- `createProblem(data)` - 创建问题
- `updateProblem(id, data)` - 更新问题
- `deleteProblem(id)` - 删除问题
- `searchProblems(keyword)` - 搜索问题

**代码行数**: 80-100 行

#### 2.3.2 ClassificationService
**文件**: `src/features/customerProblems/services/ClassificationService.ts`

**方法**:
- `classifyProblem(description)` - 调用 Azure OpenAI 进行分类
- `parseClassificationResult(response)` - 解析分类结果
- `getClassificationCategories()` - 获取分类类别

**代码行数**: 120-150 行

#### 2.3.3 CustomerProblemsExportService
**文件**: `src/features/customerProblems/services/CustomerProblemsExportService.ts`

**方法**:
- `exportToExcel(problems)` - 导出 Excel
- `exportToCSV(problems)` - 导出 CSV

**代码行数**: 100-120 行

**总服务代码行数**: 300-370 行

### 2.4 类型定义

**文件**: `src/types/database.ts`（扩展）

**新增类型**:
- `CustomerProblem` 接口
- `ProblemClassification` 接口
- `ClassificationResult` 接口

**代码行数**: 50-80 行

---

## 3. 文件结构

```
src/features/customerProblems/
├── components/
│   ├── CustomerProblemsPage.tsx
│   ├── CustomerProblemsTable.tsx
│   ├── CustomerProblemForm.tsx
│   ├── CustomerProblemFilters.tsx
│   ├── CustomerProblemModal.tsx
│   └── ClassificationResult.tsx
├── services/
│   ├── CustomerProblemsService.ts
│   ├── ClassificationService.ts
│   └── CustomerProblemsExportService.ts
└── store/
    └── customerProblemsSlice.ts
```

---

## 4. 关键实现细节

### 4.1 AI 分类集成

**Azure OpenAI API 调用**:
```typescript
// 调用 Azure OpenAI API 进行问题分类
const response = await axios.post(
  'https://fz-test-qa.openai.azure.com/openai/v1/chat/completions',
  {
    model: 'gpt-35-turbo',
    messages: [
      {
        role: 'system',
        content: '你是一个 TV AI Voice 测试问题分类专家...'
      },
      {
        role: 'user',
        content: `请分类以下问题：${description}`
      }
    ]
  },
  {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    }
  }
);
```

**分类类别**:
1. 录音 (Recording)
2. 蓝牙 (Bluetooth)
3. ASR (Automatic Speech Recognition)
4. NLU (Natural Language Understanding)
5. 服务端 (Server)
6. 网络 (Network)
7. Android

### 4.2 问题状态管理

**状态类型**:
- 开放 (Open)
- 进行中 (In Progress)
- 已解决 (Resolved)

### 4.3 数据导出

**Excel 导出字段**:
- 问题 ID
- 描述
- 分类
- 置信度
- 状态
- 创建时间
- 更新时间

**CSV 导出字段**: 同上

---

## 5. 技术考虑

### 5.1 性能优化
- 分类结果缓存
- 虚拟滚动（大数据集）
- 防抖搜索

### 5.2 错误处理
- API 调用失败处理
- 网络错误重试
- 用户友好的错误提示

### 5.3 安全性
- API Key 安全存储（LocalStorage）
- 输入验证
- XSS 防护

---

## 6. 验收标准

- [ ] AC1: 能够添加新的问题记录
- [ ] AC2: 能够查看所有问题列表
- [ ] AC3: 能够编辑现有问题
- [ ] AC4: 能够删除问题
- [ ] AC5: 能够搜索和筛选问题
- [ ] AC6: 能够自动分类问题（AI）
- [ ] AC7: 能够导出为 Excel/CSV
- [ ] AC8: 分页加载正常工作
- [ ] AC9: 分类准确率 > 85%

---

## 7. 下一步

1. 进行功能设计评审
2. 进行非功能需求评估
3. 进行非功能设计
4. 开始代码生成

---

**计划生成时间**: 2026-02-28
**预计完成时间**: 2026-02-28 + 5.5-6.5 小时

</content>
