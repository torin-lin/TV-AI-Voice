# Zmind 提交入口统一 - 需求分析

## 意图分析

- **用户请求**: 统一 VersionIssueList.tsx 和 CustomerProblemForm.tsx 两个 zmind 提交入口的功能体验
- **请求类型**: Enhancement（增强现有功能）
- **范围**: Multiple Components（前端 2 个组件 + 后端路由 + 共享服务）
- **复杂度**: Moderate（功能对齐 + 新增 Redmine 附件上传 API 集成）

---

## 功能需求

### FR-1: 项目搜索树对齐

**现状**: VersionIssueList 有层级项目搜索树（`buildProjectTreeOptions`），CustomerProblemForm 只有扁平文本过滤。

**目标**: CustomerProblemForm 的 zmind 项目选择区域使用与 VersionIssueList 相同的层级搜索树组件。

**验收标准**:
- 问题追踪表单中 zmind 项目选择展示父子层级关系
- 支持文本搜索过滤
- 选中项目后显示项目名称
- 交互体验与 VersionIssueList 一致

### FR-2: 附件上传（真正上传到 zmind）

**现状**: VersionIssueList 附件只存本地服务器。CustomerProblemForm 无附件功能。

**目标**: 两个入口都支持附件上传，且附件通过 Redmine uploads API 真正上传到 zmind 服务器，创建 issue 时关联附件。

**验收标准**:
- 两个入口都有文件选择器（支持多文件）
- 显示待上传文件列表（文件名、大小、删除按钮）
- 提交时先通过 Redmine `POST /uploads.json` 上传文件获取 token
- 创建 issue 时在 `uploads` 字段关联附件 token
- 上传失败有错误提示，不阻塞 issue 创建（附件可选）
- 支持的文件类型：图片、视频、日志、其他

### FR-3: 自定义字段全量显示

**现状**: VersionIssueList 按 tracker 过滤自定义字段。CustomerProblemForm 也有类似过滤。

**目标**: 两个入口都显示项目下所有自定义字段（不按 tracker 过滤，不只显示 required）。

**验收标准**:
- 选择项目后，显示该项目所有自定义字段
- 不再按 tracker 过滤字段
- 必填字段有红色星号标记
- 有 possibleValues 的字段渲染为下拉选择
- 无 possibleValues 的字段根据 fieldFormat 渲染（string→文本框，date→日期选择等）
- 非必填字段可留空

### FR-4: 描述模板统一

**现状**: 两个入口使用不同的中文模板。

**目标**: 统一使用以下英文模板：

```
【Tested Environment】

【Initial Situation】

【Operation Steps】

  [Step1]

  [Step2]

  [Step3]

  [Step4]

【 Actual Result 】

【Expect Result】

【Frequency Details】
 
【Recovery Method】

```

**验收标准**:
- 两个入口的描述字段默认填充此模板
- 用户可编辑模板内容
- 提交时保留用户编辑后的内容

### FR-5: 问题追踪附件随 issue 上传到 zmind

**现状**: 问题追踪无附件功能。

**目标**: CustomerProblemForm 提交时，如果启用了 zmind 同步且有附件，附件随 issue 一起上传到 zmind。

**验收标准**:
- 附件通过 Redmine uploads API 上传
- 创建 issue 时通过 `uploads` 参数关联已上传的附件
- 上传进度有视觉反馈
- 单个文件上传失败不影响其他文件和 issue 创建

---

## 非功能需求

### NFR-1: 性能
- 项目列表加载使用已有的 5 分钟缓存机制
- 附件上传支持最大 500MB 单文件（与现有限制一致）
- 上传过程不阻塞 UI

### NFR-2: 错误处理
- zmind API 不可用时，附件上传失败有明确提示
- 附件上传失败不阻塞 issue 创建（issue 可以不带附件创建成功）

### NFR-3: 代码复用
- 项目搜索树逻辑提取为共享组件/函数
- 附件上传逻辑提取为共享组件
- 描述模板定义为共享常量

---

## 技术方案概要

### 后端新增
- `POST /api/zmind/uploads` — 代理 Redmine `POST /uploads.json`，接收文件二进制流，返回 upload token
- 修改 issue 创建逻辑，支持 `uploads` 参数

### 前端改动
- 提取 `ZmindProjectTree` 共享组件（从 VersionIssueList 中抽取）
- 提取 `ZmindFileUpload` 共享组件
- 统一描述模板常量
- CustomerProblemForm 集成项目搜索树 + 附件上传
- 两个入口的自定义字段渲染去掉 tracker 过滤

---

## 影响范围

| 文件 | 改动类型 |
|------|----------|
| `src/server/routes/zmindProxy.ts` | 新增 uploads 代理路由 |
| `src/server/routes/versionIssues.ts` | 修改 issue 创建支持 zmind 附件 |
| `src/server/routes/customerProblems.ts` | 修改 issue 创建支持 zmind 附件 |
| `src/services/ZmindApiService.ts` | 新增 uploadToZmind 方法 |
| `src/features/versionRecords/components/VersionIssueList.tsx` | 提取共享组件、统一模板、去掉 tracker 过滤 |
| `src/features/customerProblems/components/CustomerProblemForm.tsx` | 集成项目树、附件上传、统一模板、去掉 tracker 过滤 |
| 新增共享组件 | ZmindProjectTree、ZmindFileUpload |

