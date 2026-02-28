# 应用设计文档

**项目**: TV AI Voice 测试全流程体系 Web 网页
**日期**: 2026-02-28
**阶段**: 启动阶段 - 应用设计

---

## 1. 应用架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Web 浏览器                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React 应用层                             │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  UI 组件层                                      │  │   │
│  │  │  - 页面组件 (Dashboard, Records, Problems)     │  │   │
│  │  │  - 通用组件 (Table, Form, Modal, Chart)       │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↓                                 │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  业务逻辑层                                      │  │   │
│  │  │  - 数据管理 (Redux/Context)                    │  │   │
│  │  │  - API 集成 (Azure OpenAI)                     │  │   │
│  │  │  - 数据处理和转换                              │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↓                                 │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  数据访问层                                      │  │   │
│  │  │  - IndexedDB 操作                              │  │   │
│  │  │  - 本地存储操作                                │  │   │
│  │  │  - 数据查询和筛选                              │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              本地存储层                               │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  IndexedDB (本地数据库)                        │  │   │
│  │  │  - versionTestRecords 表                       │  │   │
│  │  │  - customerProblems 表                         │  │   │
│  │  │  - voiceRecognitionRecords 表                  │  │   │
│  │  │  - testCaseLibrary 表                          │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  LocalStorage (配置存储)                       │  │   │
│  │  │  - API Key                                     │  │   │
│  │  │  - 用户偏好设置                                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Azure OpenAI API   │
                    │  (eastus 区域)      │
                    └─────────────────────┘
```

### 1.2 技术栈

**前端框架**:
- React 18 - UI 框架
- TypeScript - 类型安全
- Vite - 构建工具

**样式和 UI**:
- Tailwind CSS - 样式框架（支持渐变）
- Shadcn/ui - 现代化组件库
- Chart.js / Recharts - 图表库

**数据管理**:
- Redux Toolkit - 状态管理
- Dexie.js - IndexedDB 包装库

**API 集成**:
- axios - HTTP 客户端
- openai - Azure OpenAI SDK

**数据导出**:
- xlsx - Excel 导出
- papaparse - CSV 导出

**开发工具**:
- ESLint - 代码检查
- Prettier - 代码格式化
- Vitest - 单元测试

---

## 2. 页面结构设计

### 2.1 页面导航

```
┌─────────────────────────────────────────────────────────┐
│  TV AI Voice 测试全流程体系                              │
├─────────────────────────────────────────────────────────┤
│ 🏠 仪表板 │ 📋 版本记录 │ 🐛 问题追踪 │ 🎤 语音记录 │ 🤖 推荐 │ ⚙️ 设置 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                    页面内容区域                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 页面列表

| 页面 | 路由 | 功能 | 对应故事 |
|------|------|------|---------|
| 仪表板 | / | 统计数据、趋势、快速操作 | US-006 |
| 版本测试记录 | /records | CRUD、搜索、筛选、导出 | US-001, US-004 |
| 客户问题追踪 | /problems | CRUD、AI 分类、搜索、筛选 | US-003 |
| 语音识别记录 | /voice | CRUD、准确率统计 | US-005 |
| AI 推荐 | /recommendations | 推荐引擎、历史记录 | US-002 |
| 设置 | /settings | API Key 配置、数据管理 | US-007, US-008 |

---

## 3. 组件设计

### 3.1 页面级组件

**Dashboard (仪表板)**
- 统计卡片组件
- 图表组件（饼图、折线图）
- 最近活动列表
- 快速操作按钮

**VersionRecords (版本测试记录)**
- 表格组件（带分页、排序、筛选）
- 添加/编辑表单
- 搜索栏
- 导出按钮

**CustomerProblems (客户问题追踪)**
- 表格组件（带分页、排序、筛选）
- 添加/编辑表单
- AI 分类结果显示
- 搜索栏

**VoiceRecords (语音识别记录)**
- 表格组件
- 添加/编辑表单
- 准确率统计
- 搜索栏

**Recommendations (AI 推荐)**
- 推荐表单（版本信息输入）
- 推荐结果展示
- 历史记录列表
- 保存推荐按钮

**Settings (设置)**
- API Key 输入表单
- 连接测试按钮
- 数据管理（备份、恢复、清除）
- 存储使用情况显示

### 3.2 通用组件

**DataTable (数据表格)**
- 分页
- 排序
- 筛选
- 行选择
- 导出

**Form (表单)**
- 文本输入
- 下拉选择
- 多选框
- 日期选择
- 验证

**Modal (模态框)**
- 确认对话框
- 信息提示
- 加载状态

**Chart (图表)**
- 饼图
- 折线图
- 柱状图

**Card (卡片)**
- 统计卡片
- 信息卡片

---

## 4. 数据流设计

### 4.1 版本测试记录流程

```
用户输入版本信息
    ↓
验证数据
    ↓
保存到 IndexedDB
    ↓
更新 Redux 状态
    ↓
刷新表格显示
    ↓
更新仪表板统计
```

### 4.2 AI 推荐流程

```
用户输入版本信息
    ↓
验证数据
    ↓
检查缓存
    ↓
调用 Azure OpenAI API
    ↓
处理 API 响应
    ↓
显示推荐结果
    ↓
用户保存推荐
    ↓
保存到 IndexedDB
```

### 4.3 客户问题追踪流程

```
用户输入问题信息
    ↓
验证数据
    ↓
调用 Azure OpenAI API 分类
    ↓
处理分类结果
    ↓
保存到 IndexedDB
    ↓
更新表格显示
    ↓
更新仪表板统计
```

### 4.4 数据导出流程

```
用户选择导出选项
    ↓
从 IndexedDB 查询数据
    ↓
数据转换和格式化
    ↓
生成 Excel/CSV 文件
    ↓
浏览器下载文件
```

---

## 5. 数据库设计

### 5.1 IndexedDB 表结构

**表 1: versionTestRecords (版本测试记录)**
```
{
  id: string (主键, UUID)
  versionNumber: string (唯一索引)
  modificationContent: string
  modifiedModules: string[]
  riskLevel: 'low' | 'medium' | 'high' (索引)
  smokeTestResult: 'pass' | 'fail' | 'pending'
  voiceRegressionResult: 'pass' | 'fail' | 'pending'
  systemRegressionResult: 'pass' | 'fail' | 'pending'
  testConclusion: string
  createdAt: timestamp (索引)
  updatedAt: timestamp
}
```

**表 2: customerProblems (客户问题追踪)**
```
{
  id: string (主键, UUID)
  date: timestamp (索引)
  tvModel: string
  versionNumber: string (索引)
  networkEnvironment: string
  bluetoothDistance: string
  batteryStatus: string
  isReproducible: boolean
  frequency: string
  originalSpeech: string
  recognitionResult: string
  category: string (索引, AI 分类)
  status: 'open' | 'in_progress' | 'resolved' (索引)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**表 3: voiceRecognitionRecords (语音识别记录)**
```
{
  id: string (主键, UUID)
  corpusId: string (索引)
  originalText: string
  recognizedText: string
  isCorrect: boolean (索引)
  versionNumber: string (索引)
  createdAt: timestamp
}
```

**表 4: testCaseLibrary (测试用例库)**
```
{
  id: string (主键, UUID)
  caseId: string (唯一)
  caseName: string
  description: string
  steps: string[]
  expectedResult: string
  category: string (索引)
  riskLevel: string
  createdAt: timestamp
}
```

### 5.2 LocalStorage 存储

```
{
  "apiKey": "sk-...",
  "apiEndpoint": "https://fz-test-qa.openai.azure.com/openai/v1/chat/completions",
  "apiRegion": "eastus",
  "userPreferences": {
    "theme": "light",
    "itemsPerPage": 20
  }
}
```

---

## 6. 状态管理设计

### 6.1 Redux Store 结构

```
store
├── versionRecords
│   ├── items: VersionRecord[]
│   ├── loading: boolean
│   ├── error: string | null
│   └── filters: FilterOptions
├── customerProblems
│   ├── items: CustomerProblem[]
│   ├── loading: boolean
│   ├── error: string | null
│   └── filters: FilterOptions
├── voiceRecords
│   ├── items: VoiceRecord[]
│   ├── loading: boolean
│   └── error: string | null
├── recommendations
│   ├── currentRecommendation: Recommendation | null
│   ├── history: Recommendation[]
│   ├── loading: boolean
│   └── error: string | null
├── ui
│   ├── currentPage: string
│   ├── sidebarOpen: boolean
│   └── notifications: Notification[]
└── settings
    ├── apiKey: string
    ├── apiConnected: boolean
    └── storageUsage: number
```

---

## 7. API 集成设计

### 7.1 Azure OpenAI API 调用

**用例推荐 API 调用**:
```
POST /openai/v1/chat/completions

请求体:
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "你是一个 TV AI Voice 测试专家..."
    },
    {
      "role": "user",
      "content": "版本号: v1.2.3, 修改内容: 蓝牙优化, 风险等级: 中..."
    }
  ]
}

响应:
{
  "choices": [
    {
      "message": {
        "content": "推荐的测试用例: 1. 冒烟测试... 2. 蓝牙专项回归..."
      }
    }
  ]
}
```

**问题分类 API 调用**:
```
POST /openai/v1/chat/completions

请求体:
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "你是一个问题分类专家..."
    },
    {
      "role": "user",
      "content": "问题: 用户说'打开设置'但系统没有响应..."
    }
  ]
}

响应:
{
  "choices": [
    {
      "message": {
        "content": "分类: ASR 识别问题"
      }
    }
  ]
}
```

### 7.2 错误处理和重试

- 实现指数退避重试（最多 3 次）
- 显示友好的错误提示
- 记录 API 调用日志
- 实现请求缓存（相同输入 1 小时内不重复调用）

---

## 8. 用户界面布局

### 8.1 主布局

```
┌─────────────────────────────────────────────────────────┐
│  Header (导航栏)                                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Sidebar (侧边栏)  │  Main Content (主内容区)            │
│  - 仪表板          │  - 页面标题                         │
│  - 版本记录        │  - 搜索栏                           │
│  - 问题追踪        │  - 数据表格/表单                    │
│  - 语音记录        │  - 分页                             │
│  - AI 推荐         │  - 操作按钮                         │
│  - 设置            │                                     │
│                    │                                     │
├─────────────────────────────────────────────────────────┤
│  Footer (页脚)                                           │
└─────────────────────────────────────────────────────────┘
```

### 8.2 颜色方案 (蓝色系渐变)

- 主色: #0066CC (深蓝)
- 辅色: #00CCFF (浅蓝)
- 背景: #F0F4F8 (浅灰蓝)
- 文字: #1A1A1A (深灰)
- 成功: #00AA00 (绿色)
- 警告: #FF9900 (橙色)
- 错误: #CC0000 (红色)

### 8.3 响应式设计

- 仅支持桌面浏览器 (1920x1080 及以上)
- 固定宽度布局
- 侧边栏固定

---

## 9. 性能优化策略

### 9.1 前端优化

- 代码分割 (Code Splitting)
- 懒加载 (Lazy Loading)
- 虚拟滚动 (Virtual Scrolling) - 大数据集
- 缓存策略 - API 响应缓存

### 9.2 数据库优化

- 创建适当的索引
- 分页查询
- 数据聚合优化

### 9.3 API 优化

- 请求缓存
- 批量操作
- 错误重试

---

## 10. 安全性考虑

### 10.1 数据安全

- API Key 仅保存在浏览器 LocalStorage
- 不上传用户数据到服务器
- 支持数据清除功能

### 10.2 输入验证

- 前端表单验证
- 数据类型检查
- SQL 注入防护 (IndexedDB)

---

## 11. 下一步

应用设计已完成。准备进入单元生成阶段。

**请确认**:
1. ✅ 应用架构是否满足需求？
2. ✅ 页面结构和组件设计是否合理？
3. ✅ 数据流和数据库设计是否清晰？
4. ✅ 是否可以继续进行单元生成？

**请回复**: "确认" 继续单元生成，或 "需要调整" 并说明具体调整内容。
