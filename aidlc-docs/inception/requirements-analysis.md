# 需求分析文档

**项目**: TV AI Voice 测试全流程体系 Web 网页
**日期**: 2026-02-28
**状态**: 已批准

---

## 1. 项目概述

### 1.1 项目目标
创建一个现代化的 Web 网页应用，用于管理 TV AI Voice 的测试全流程，包括版本测试记录、AI 用例推荐、客户问题追踪和语音识别记录。

### 1.2 核心特性
- ✅ 无账号管理，公开访问
- ✅ 现代化蓝色系渐变设计
- ✅ AI 驱动的用例推荐引擎
- ✅ 客户问题自动分类
- ✅ 本地数据库存储
- ✅ 完整的数据导出功能

---

## 2. 功能需求

### 2.1 AI 用例推荐引擎 (问题 1: D - 组合方式)

**推荐逻辑**：采用三层推荐策略

1. **基于版本修改内容分析**
   - 输入：版本号、修改内容、涉及模块
   - 输出：相关的测试用例集合
   - 示例：修改蓝牙模块 → 推荐蓝牙相关用例

2. **基于风险等级推荐**
   - 低风险：冒烟测试 + 定向测试
   - 中风险：冒烟 + 语音专项回归
   - 高风险：全链路回归 + 边界测试

3. **基于历史问题数据推荐**
   - 分析客户问题追踪表中的常见问题
   - 推荐相关的回归测试用例

**AI 集成**：
- 使用 Azure OpenAI API (eastus 区域)
- Endpoint: https://fz-test-qa.openai.azure.com/openai/v1/chat/completions
- 功能：分析版本信息并生成推荐

### 2.2 数据存储 (问题 2: 本地数据库)

**存储方案**：IndexedDB（浏览器本地数据库，类似 SQL）

**特点**：
- 结构化数据存储（类似 SQL 表）
- 支持复杂查询和关系
- 支持事务处理
- 无需后端服务器
- 数据完全本地化
- 支持大容量存储（通常 50MB+）
- 离线可用

**数据表结构**：
1. `versionTestRecords` - 版本测试记录表
2. `customerProblems` - 客户问题追踪表
3. `voiceRecognitionRecords` - 语音识别记录表
4. `testCaseLibrary` - 测试用例库表

### 2.3 主要用户角色 (问题 3: A - 测试工程师)

**主要用户**：测试工程师

**需求**：
- 详细的测试记录管理
- 数据分析和统计
- 用例推荐和执行追踪
- 问题复现和分类

### 2.4 UI/UX 设计 (问题 4: A - 蓝色系渐变)

**设计风格**：
- 颜色方案：蓝色系渐变（#0066CC → #00CCFF）
- 现代化设计：卡片式布局、圆角、阴影
- 专业科技感

### 2.5 Azure OpenAI 集成 (问题 5: B - 推荐 + 问题分析)

**功能范围**：
1. **用例推荐**：基于版本信息生成推荐
2. **问题分析**：分析客户问题并自动分类

**不包含**：生成测试报告（可作为未来功能）

### 2.6 响应式设计 (问题 6: A - 仅桌面)

**支持范围**：
- 仅桌面浏览器
- 最小分辨率：1920x1080
- 优化分辨率：1920x1080 及以上

### 2.7 版本测试记录功能 (问题 7: D - 完整功能 + 导出)

**操作功能**：
- ✅ 查看记录
- ✅ 搜索和筛选
- ✅ 添加新记录
- ✅ 编辑现有记录
- ✅ 删除记录
- ✅ 导出为 CSV/Excel

**记录字段**：
- 版本号
- 修改内容
- 修改模块
- 冒烟测试结果
- 语音回归结果
- 风险等级
- 测试结论

### 2.8 客户问题追踪 (问题 8: B - 记录 + 自动分类)

**功能**：
- ✅ 记录问题信息
- ✅ 自动分类（使用 AI）
- ❌ 推荐解决方案（未来功能）

**自动分类类别**：
- 录音问题
- 蓝牙问题
- ASR 识别问题
- NLU 理解问题
- 服务端问题
- 网络问题
- Android 系统问题

---

## 3. 非功能需求

### 3.1 性能
- 页面加载时间 < 2 秒
- 数据查询响应时间 < 500ms
- 支持 1000+ 条记录的流畅操作

### 3.2 安全性
- 无用户认证（公开访问）
- 数据仅存储在本地浏览器
- API Key 由用户在前端填写（不存储）

### 3.3 可用性
- 直观的用户界面
- 清晰的数据展示
- 快速的操作流程

### 3.4 兼容性
- Chrome 最新版本
- Firefox 最新版本
- Edge 最新版本

---

## 4. 技术栈建议

### 前端框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架（支持渐变）
- **Shadcn/ui** - 现代化组件库

### 数据存储
- **IndexedDB** - 本地数据库
- **Dexie.js** - IndexedDB 包装库

### 数据导出
- **xlsx** - Excel 导出
- **papaparse** - CSV 导出

### API 集成
- **axios** - HTTP 客户端
- **openai** - Azure OpenAI SDK

### 开发工具
- **Vite** - 构建工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化

---

## 5. 核心业务流程

### 5.1 版本测试流程
```
1. 输入版本信息
   ↓
2. AI 分析并推荐用例
   ↓
3. 执行推荐的用例
   ↓
4. 记录测试结果
   ↓
5. 生成测试结论
```

### 5.2 客户问题处理流程
```
1. 输入客户问题信息
   ↓
2. AI 自动分类问题
   ↓
3. 记录问题详情
   ↓
4. 追踪问题状态
   ↓
5. 导出问题报告
```

---

## 6. 数据模型

### 6.1 版本测试记录
```
{
  id: string (UUID)
  versionNumber: string
  modificationContent: string
  modifiedModules: string[]
  riskLevel: 'low' | 'medium' | 'high'
  smokeTestResult: 'pass' | 'fail' | 'pending'
  voiceRegressionResult: 'pass' | 'fail' | 'pending'
  systemRegressionResult: 'pass' | 'fail' | 'pending'
  testConclusion: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 6.2 客户问题
```
{
  id: string (UUID)
  date: timestamp
  tvModel: string
  versionNumber: string
  networkEnvironment: string
  bluetoothDistance: string
  batteryStatus: string
  isReproducible: boolean
  frequency: string
  originalSpeech: string
  recognitionResult: string
  category: string (AI 分类)
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 6.3 语音识别记录
```
{
  id: string (UUID)
  corpusId: string
  originalText: string
  recognizedText: string
  isCorrect: boolean
  versionNumber: string
  createdAt: timestamp
}
```

---

## 7. 用户界面布局

### 主要页面
1. **仪表板** - 概览和快速统计
2. **版本测试记录** - 完整的 CRUD 操作
3. **客户问题追踪** - 问题管理和分类
4. **语音识别记录** - 识别数据管理
5. **AI 推荐** - 用例推荐引擎
6. **设置** - API Key 配置

---

## 8. 批准状态

✅ **需求分析完成**

所有需求已明确，准备进入工作流规划阶段。
