# UNIT-002: 版本测试记录模块 - 功能设计

**单元**: UNIT-002 (版本测试记录模块)
**日期**: 2026-02-28
**阶段**: 构建阶段 - 功能设计

---

## 1. 功能设计概述

### 1.1 设计目标

实现版本测试记录的完整管理功能，包括 CRUD、搜索、筛选、排序和导出。

### 1.2 核心功能

- 版本记录的添加、查看、编辑、删除
- 搜索和筛选功能
- 数据排序
- 分页加载
- 数据导出（Excel/CSV）

---

## 2. 页面结构设计

### 2.1 版本记录页面布局

```
┌─────────────────────────────────────────────────────┐
│  版本测试记录                                        │
├─────────────────────────────────────────────────────┤
│  [搜索框] [筛选] [添加新记录] [导出]                 │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ 版本号 │ 修改内容 │ 风险等级 │ 冒烟 │ 语音 │ 系统 │
│  ├─────────────────────────────────────────────────┤│
│  │ v1.0.0 │ 蓝牙优化 │ 中      │ 通过 │ 通过 │ 通过 │
│  │ v1.0.1 │ 修复 bug │ 低      │ 通过 │ 通过 │ 通过 │
│  │ ...    │ ...     │ ...    │ ... │ ... │ ... │
│  └─────────────────────────────────────────────────┘│
│  第 1 页，共 10 页 [上一页] [下一页]                 │
└─────────────────────────────────────────────────────┘
```

### 2.2 表格列定义

| 列名 | 类型 | 宽度 | 可排序 | 可筛选 |
|------|------|------|--------|--------|
| 版本号 | 文本 | 120px | ✅ | ✅ |
| 修改内容 | 文本 | 200px | ❌ | ❌ |
| 修改模块 | 标签 | 150px | ❌ | ✅ |
| 风险等级 | 标签 | 100px | ✅ | ✅ |
| 冒烟测试 | 状态 | 100px | ✅ | ✅ |
| 语音回归 | 状态 | 100px | ✅ | ✅ |
| 系统回归 | 状态 | 100px | ✅ | ✅ |
| 操作 | 按钮 | 150px | ❌ | ❌ |

---

## 3. 组件设计

### 3.1 页面级组件

**VersionRecordsPage**
- 主页面容器
- 管理页面状态
- 协调子组件

### 3.2 功能组件

**VersionRecordsTable**
- 显示版本记录表格
- 支持排序、分页
- 行操作（编辑、删除）

**VersionRecordForm**
- 添加/编辑表单
- 表单验证
- 提交处理

**VersionRecordFilters**
- 搜索框
- 筛选条件
- 筛选应用

**VersionRecordModal**
- 模态框容器
- 表单展示
- 确认/取消操作

### 3.3 通用组件

- DataTable（数据表格）
- Form（表单）
- Modal（模态框）
- Button（按钮）
- Input（输入框）
- Select（下拉选择）
- Tag（标签）

---

## 4. 数据流设计

### 4.1 添加版本记录流程

```
用户点击"添加新记录"
  ↓
打开表单模态框
  ↓
用户填写表单
  ↓
用户点击"保存"
  ↓
验证表单数据
  ↓
调用 Redux action
  ↓
调用数据库 API
  ↓
保存到 IndexedDB
  ↓
更新 Redux 状态
  ↓
刷新表格
  ↓
关闭模态框
  ↓
显示成功提示
```

### 4.2 编辑版本记录流程

```
用户点击"编辑"按钮
  ↓
打开表单模态框（预填充数据）
  ↓
用户修改表单
  ↓
用户点击"保存"
  ↓
验证表单数据
  ↓
调用 Redux action
  ↓
调用数据库 API
  ↓
更新 IndexedDB
  ↓
更新 Redux 状态
  ↓
刷新表格
  ↓
关闭模态框
  ↓
显示成功提示
```

### 4.3 删除版本记录流程

```
用户点击"删除"按钮
  ↓
显示确认对话框
  ↓
用户确认删除
  ↓
调用 Redux action
  ↓
调用数据库 API
  ↓
从 IndexedDB 删除
  ↓
更新 Redux 状态
  ↓
刷新表格
  ↓
显示成功提示
```

### 4.4 搜索和筛选流程

```
用户输入搜索关键词或选择筛选条件
  ↓
触发搜索/筛选事件
  ↓
调用 Redux action
  ↓
调用数据库查询 API
  ↓
获取筛选结果
  ↓
更新 Redux 状态
  ↓
刷新表格显示
```

---

## 5. Redux 状态管理设计

### 5.1 状态结构

```typescript
{
  versionRecords: {
    items: VersionRecord[],
    loading: boolean,
    error: string | null,
    filters: {
      keyword: string,
      riskLevel: string,
      modifiedModules: string[],
      startDate: number,
      endDate: number
    },
    pagination: {
      page: number,
      pageSize: number,
      total: number
    },
    sorting: {
      field: string,
      order: 'asc' | 'desc'
    }
  }
}
```

### 5.2 Actions

- `fetchVersionRecords` - 获取版本记录
- `createVersionRecord` - 创建版本记录
- `updateVersionRecord` - 更新版本记录
- `deleteVersionRecord` - 删除版本记录
- `searchVersionRecords` - 搜索版本记录
- `setFilters` - 设置筛选条件
- `setPagination` - 设置分页
- `setSorting` - 设置排序

### 5.3 Selectors

- `selectVersionRecords` - 获取版本记录列表
- `selectVersionRecordsLoading` - 获取加载状态
- `selectVersionRecordsError` - 获取错误信息
- `selectVersionRecordsFilters` - 获取筛选条件
- `selectVersionRecordsPagination` - 获取分页信息

---

## 6. 服务层设计

### 6.1 VersionRecordsService

**方法**:
- `fetchRecords(filters, pagination)` - 获取记录
- `createRecord(data)` - 创建记录
- `updateRecord(id, data)` - 更新记录
- `deleteRecord(id)` - 删除记录
- `searchRecords(keyword)` - 搜索记录
- `exportToExcel(records)` - 导出为 Excel
- `exportToCSV(records)` - 导出为 CSV

### 6.2 VersionRecordsExportService

**方法**:
- `exportToExcel(records, filename)` - 导出 Excel
- `exportToCSV(records, filename)` - 导出 CSV
- `generateExcelFile(records)` - 生成 Excel 文件
- `generateCSVFile(records)` - 生成 CSV 文件

---

## 7. 验收标准

- [ ] AC1: 能够添加新的版本记录
- [ ] AC2: 能够查看所有版本记录列表
- [ ] AC3: 能够编辑现有版本记录
- [ ] AC4: 能够删除版本记录
- [ ] AC5: 能够搜索和筛选版本记录
- [ ] AC6: 能够排序版本记录
- [ ] AC7: 能够导出为 Excel/CSV
- [ ] AC8: 分页加载正常工作
- [ ] AC9: 单元测试覆盖率 > 85%

---

## 8. 下一步

功能设计已完成。准备进入非功能需求评估阶段。

**请确认**:
1. ✅ 页面结构是否合理？
2. ✅ 组件设计是否完整？
3. ✅ 数据流是否清晰？
4. ✅ 是否可以继续进行非功能需求评估？

**请回复**: "确认" 继续非功能需求评估。
