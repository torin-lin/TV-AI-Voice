# Zmind 提交入口统一 - 代码生成计划

## 单元上下文
- **项目类型**: 棕地（已有代码）
- **工作区根目录**: `d:\aivoice测试规范(ai协助)`
- **涉及需求**: FR-1 ~ FR-5（项目搜索树、附件上传、自定义字段、描述模板、附件随 issue 上传）

---

## 代码生成步骤

### Step 1: 创建共享工具模块
- [x] 创建 `src/components/zmind/zmindUtils.ts` — 提取 `buildProjectTreeOptions` 函数
- [x] 创建 `src/components/zmind/zmindConstants.ts` — 统一描述模板常量

### Step 2: 前端 API 服务扩展
- [x] 修改 `src/services/ZmindApiService.ts` — 新增 `uploadFileToZmind` 方法

### Step 3: 后端工具模块扩展
- [x] 修改 `src/server/utils/zmind.ts` — 新增 `uploadToZmindServer` 函数

### Step 4: 后端路由扩展
- [x] 修改 `src/server/routes/zmindProxy.ts` — 新增 `POST /api/zmind/uploads` 路由

### Step 5: 后端 issue 创建逻辑支持 uploads
- [x] 修改 `src/server/routes/versionIssues.ts` — `createZmindIssueFromVersionIssue` 支持 uploads 参数
- [x] 修改 `src/server/routes/customerProblems.ts` — issue 创建支持 uploads 参数

### Step 6: VersionIssueList.tsx 改造
- [x] 使用共享 `buildProjectTreeOptions` 和 `ZMIND_DESCRIPTION_TEMPLATE`
- [x] 自定义字段去掉 tracker 过滤
- [x] 附件上传改为通过 zmind uploads API

### Step 7: CustomerProblemForm.tsx 改造
- [x] 项目选择改为层级搜索树
- [x] 新增附件上传 UI
- [x] 描述模板改为统一英文模板
- [x] 提交时附件通过 zmind uploads API 上传

### Step 8: 代码生成总结
- [x] 生成 `aidlc-docs/construction/zmind-unify/code-generation-summary.md`

---

## 预计产出
- 2 个新文件（共享工具）
- 7 个修改文件（API 服务、后端路由、前端组件）
- 1 个文档总结

