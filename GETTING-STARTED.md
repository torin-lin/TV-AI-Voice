# 快速开始指南

**项目**: TV AI Voice 测试全流程体系 Web 网页
**版本**: 0.1.0（开发中）
**最后更新**: 2026-02-28

---

## 📋 项目概览

这是一个现代化的 Web 应用，用于管理 TV AI Voice 的测试全流程。应用提供以下功能：

- 📊 版本测试记录管理（CRUD、搜索、筛选、排序、导出）
- 🤖 AI 驱动的测试用例推荐（待开发）
- 🐛 客户问题追踪（待开发）
- 📈 仪表板和统计（待开发）
- 💾 本地数据持久化（IndexedDB）

---

## 🚀 快速开始

### 1. 环境要求

- Node.js 16+
- npm 8+ 或 yarn 1.22+
- 现代浏览器（Chrome、Firefox、Safari、Edge）

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:5173` 打开。

### 4. 构建生产版本

```bash
npm run build
```

构建输出在 `dist/` 目录。

---

## 📁 项目结构

```
project/
├── src/
│   ├── types/                    # TypeScript 类型定义
│   │   └── database.ts
│   ├── db/                       # 数据库层（UNIT-001）
│   │   ├── database.ts
│   │   ├── operations/
│   │   ├── utils/
│   │   └── index.ts
│   ├── features/                 # 功能模块
│   │   ├── versionRecords/       # 版本记录模块（UNIT-002）
│   │   ├── customerProblems/     # 问题追踪模块（待开发）
│   │   ├── voiceRecords/         # 语音记录模块（待开发）
│   │   ├── recommendations/      # AI 推荐模块（待开发）
│   │   └── settings/             # 设置模块（待开发）
│   ├── components/               # 通用组件
│   │   └── common/
│   ├── store/                    # Redux 存储
│   ├── styles/                   # 全局样式
│   ├── App.tsx                   # 主应用
│   └── main.tsx                  # 入口
├── aidlc-docs/                   # 项目文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🎨 设计风格

### 颜色方案

- **主色**: 蓝色渐变 (#0066CC → #00CCFF)
- **风险等级**:
  - 低: 绿色 (#10B981)
  - 中: 黄色 (#F59E0B)
  - 高: 红色 (#EF4444)
- **测试状态**:
  - 通过: 绿色
  - 失败: 红色
  - 未测试: 灰色

### 组件库

所有 UI 组件都在 `src/components/common/` 中：

- `Button` - 按钮（primary, secondary, danger）
- `Input` - 输入框
- `Select` - 下拉选择
- `Textarea` - 文本域
- `Tag` - 标签
- `LoadingSpinner` - 加载动画

---

## 📊 已完成的功能

### UNIT-001: 本地数据库层 ✅

**功能**:
- IndexedDB 数据库初始化
- CRUD 操作
- 查询和筛选
- 事务处理
- 备份和恢复
- 数据验证和缓存

**文件**: `src/db/`

**使用示例**:
```typescript
import { db } from './db';

// 创建版本记录
const record = await db.versionTestRecords.add({
  versionNumber: 'v1.0.0',
  changeDescription: '蓝牙优化',
  modifiedModules: ['蓝牙'],
  riskLevel: '中',
  smokeTestResult: '通过',
  voiceRegressionResult: '通过',
  systemRegressionResult: '通过',
});

// 查询记录
const records = await db.versionTestRecords.toArray();

// 更新记录
await db.versionTestRecords.update(id, { riskLevel: '高' });

// 删除记录
await db.versionTestRecords.delete(id);
```

### UNIT-002: 版本测试记录模块 ✅

**功能**:
- 版本记录 CRUD
- 搜索、筛选、排序
- 分页加载
- 导出为 Excel/CSV
- Redux 状态管理

**页面**: `/version-records`

**主要组件**:
- `VersionRecordsPage` - 主页面
- `VersionRecordsTable` - 数据表格
- `VersionRecordForm` - 表单
- `VersionRecordFilters` - 筛选器
- `VersionRecordModal` - 模态框

**使用示例**:
```typescript
import VersionRecordsPage from './features/versionRecords/components/VersionRecordsPage';

// 在路由中使用
<Route path="/version-records" element={<VersionRecordsPage />} />
```

---

## 🔄 Redux 状态管理

### 版本记录状态

```typescript
{
  versionRecords: {
    items: VersionRecord[],
    loading: boolean,
    error: string | null,
    filters: {
      keyword?: string,
      riskLevel?: string,
      modifiedModules?: string[],
      startDate?: number,
      endDate?: number
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

### 使用示例

```typescript
import { useDispatch, useSelector } from 'react-redux';
import { fetchVersionRecords } from './features/versionRecords/store/versionRecordsSlice';

function MyComponent() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector(state => state.versionRecords);

  useEffect(() => {
    dispatch(fetchVersionRecords({ filters: {}, pagination: { page: 1, pageSize: 10 }, sorting: { field: 'versionNumber', order: 'asc' } }));
  }, [dispatch]);

  return (
    <div>
      {loading ? <p>加载中...</p> : <p>共 {items.length} 条记录</p>}
    </div>
  );
}
```

---

## 🔧 开发工具

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

### 运行测试（待实现）

```bash
npm run test
```

---

## 📚 待开发的功能

### UNIT-003: 客户问题追踪模块 ⏳

**功能**:
- 问题记录 CRUD
- AI 自动分类（Azure OpenAI）
- 问题状态管理
- 搜索、筛选、排序
- 导出为 Excel/CSV

**预计完成**: 5.5-6.5 小时

### UNIT-004: AI 推荐引擎 ⏳

**功能**:
- 版本信息输入
- Azure OpenAI API 调用
- 三层推荐策略
- 推荐结果缓存
- 历史记录管理

**预计完成**: 6-7 小时

### UNIT-005: UI 框架和仪表板 ⏳

**功能**:
- 主应用框架
- 6 个主要页面
- 仪表板统计
- 通用组件完善
- 主题和样式

**预计完成**: 7-8 小时

---

## 🔐 配置 Azure OpenAI API

### 1. 获取 API Key

访问 Azure 门户，获取 OpenAI 服务的 API Key。

### 2. 配置应用

在应用设置页面输入 API Key：

```
区域: eastus
端点: https://fz-test-qa.openai.azure.com/openai/v1/chat/completions
API Key: [你的 API Key]
```

API Key 将保存在 LocalStorage 中（仅本地浏览器）。

### 3. 测试连接

点击"测试连接"按钮验证 API 配置。

---

## 📖 文档

### 项目文档

- [README.md](./README.md) - 项目概览
- [GETTING-STARTED.md](./GETTING-STARTED.md) - 快速开始（本文件）

### 设计文档

- [项目总结](./aidlc-docs/PROJECT-SUMMARY.md)
- [项目状态](./aidlc-docs/aidlc-state.md)
- [进度总结](./aidlc-docs/construction/PROGRESS-SUMMARY.md)

### Inception 阶段

- [需求分析](./aidlc-docs/inception/requirements-analysis.md)
- [用户故事](./aidlc-docs/inception/user-stories-generated.md)
- [应用设计](./aidlc-docs/inception/application-design.md)
- [单元分解](./aidlc-docs/inception/units-generation.md)

### Construction 阶段

- [单元快速设计](./aidlc-docs/construction/UNITS-QUICK-DESIGN.md)
- [UNIT-001 设计](./aidlc-docs/construction/unit-001/functional-design.md)
- [UNIT-002 设计](./aidlc-docs/construction/unit-002/functional-design.md)
- [UNIT-003 计划](./aidlc-docs/construction/unit-003/code-generation-plan.md)

---

## 🐛 常见问题

### Q: 如何添加新的版本记录？

A: 在版本记录页面点击"添加新记录"按钮，填写表单并提交。

### Q: 如何导出数据？

A: 在版本记录页面点击"导出 Excel"或"导出 CSV"按钮。

### Q: 数据保存在哪里？

A: 所有数据保存在浏览器的 IndexedDB 中（本地存储）。API Key 保存在 LocalStorage 中。

### Q: 如何清除所有数据？

A: 打开浏览器开发者工具 → Application → IndexedDB → 删除数据库。

### Q: 支持哪些浏览器？

A: 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。

---

## 📞 支持

### 报告问题

如果遇到问题，请检查：

1. 浏览器控制台是否有错误信息
2. 网络连接是否正常
3. IndexedDB 是否可用
4. API Key 是否正确配置

### 获取帮助

查看项目文档或联系开发团队。

---

## 📝 许可证

本项目为内部项目，仅供 TV AI Voice 测试团队使用。

---

## 🎯 下一步

1. 安装依赖: `npm install`
2. 启动开发服务器: `npm run dev`
3. 打开浏览器: `http://localhost:5173`
4. 开始使用应用

祝你使用愉快！🎉

</content>
