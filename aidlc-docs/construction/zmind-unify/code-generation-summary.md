# Zmind 提交入口统一 - 代码生成总结

## 完成时间
2026-05-13

## 变更文件清单

### 新建文件（2 个）
| 文件 | 说明 |
|------|------|
| `src/components/zmind/zmindUtils.ts` | 共享 `buildProjectTreeOptions` 函数 |
| `src/components/zmind/zmindConstants.ts` | 统一描述模板 `ZMIND_DESCRIPTION_TEMPLATE` |

### 修改文件（7 个）
| 文件 | 变更内容 |
|------|----------|
| `src/services/ZmindApiService.ts` | 新增 `uploadFileToZmind` 方法和 `ZmindUploadToken` 接口 |
| `src/server/utils/zmind.ts` | 新增 `uploadToZmindServer` 函数（代理 Redmine uploads API） |
| `src/server/routes/zmindProxy.ts` | 新增 `POST /api/zmind/uploads` 路由 |
| `src/server/routes/versionIssues.ts` | `createZmindIssueFromVersionIssue` 支持 `uploads` 参数 |
| `src/server/routes/customerProblems.ts` | zmind issue 创建支持 `uploads` 参数 |
| `src/features/versionRecords/components/VersionIssueList.tsx` | 使用共享组件、统一模板、去掉 tracker 过滤、zmind 附件上传 |
| `src/features/customerProblems/components/CustomerProblemForm.tsx` | 集成项目搜索树、附件上传、统一模板 |

## 需求覆盖

| 需求 | 状态 | 实现方式 |
|------|------|----------|
| FR-1: 项目搜索树对齐 | ✅ | CustomerProblemForm 使用 `buildProjectTreeOptions` 层级树 |
| FR-2: 附件上传到 zmind | ✅ | 通过 `POST /api/zmind/uploads` 代理 Redmine uploads API |
| FR-3: 自定义字段全量显示 | ✅ | 两个入口去掉 tracker 过滤，显示所有字段 |
| FR-4: 描述模板统一 | ✅ | 统一使用英文模板（Tested Environment / Operation Steps 等） |
| FR-5: 附件随 issue 上传 | ✅ | 创建 issue 时 body 包含 `uploads` 数组（token + filename） |

## 编译验证
- TypeScript 编译：✅ 零错误
- 所有 9 个文件诊断检查通过

