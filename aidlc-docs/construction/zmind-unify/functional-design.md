# Zmind 提交入口统一 - 功能设计

## 1. 整体架构

```
+---------------------------+     +---------------------------+
| VersionIssueList.tsx      |     | CustomerProblemForm.tsx    |
| (QA版本问题)              |     | (问题追踪)                |
+---------------------------+     +---------------------------+
        |         |                       |         |
        v         v                       v         v
+---------------+ +---------------+ +---------------+ +---------------+
| ZmindProject  | | ZmindFile     | | ZmindProject  | | ZmindFile     |
| Tree (共享)   | | Upload (共享) | | Tree (共享)   | | Upload (共享) |
+---------------+ +---------------+ +---------------+ +---------------+
        |                 |                |                 |
        v                 v                v                 v
+---------------------------------------------------------------+
|              ZmindApiService.ts (前端 API 客户端)              |
|  fetchZmindProjects / fetchZmindProjectConfig / uploadToZmind |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
|              后端代理路由 (zmindProxy.ts)                       |
|  GET /api/zmind/projects                                       |
|  GET /api/zmind/projects/:id/config                            |
|  POST /api/zmind/uploads  <-- 新增                             |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
|              zmind.ts (统一工具模块)                            |
|  zmindFetch / uploadFileToZmind <-- 新增                       |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
|              Redmine API (zmind.whaletv.com)                   |
|  POST /uploads.json  →  返回 token                             |
|  POST /issues.json   →  uploads: [{token, filename}]          |
+---------------------------------------------------------------+
```

---

## 2. Redmine 附件上传流程

### 2.1 Redmine Uploads API 规范

```
POST /uploads.json
Content-Type: application/octet-stream
X-Redmine-API-Key: <key>

<binary file data>

Response 201:
{
  "upload": {
    "token": "7167.ed1ccdb093229ca1bd0b043618d88743"
  }
}
```

### 2.2 创建 Issue 时关联附件

```json
{
  "issue": {
    "project_id": 1,
    "subject": "...",
    "uploads": [
      {
        "token": "7167.ed1ccdb093229ca1bd0b043618d88743",
        "filename": "screenshot.png",
        "content_type": "image/png"
      }
    ]
  }
}
```

### 2.3 完整上传流程

```
用户选择文件 → 存入 pendingFiles 状态
     |
用户点击提交
     |
     v
[前端] 逐个文件调用 POST /api/zmind/uploads
     |
     v
[后端] 代理到 POST zmind/uploads.json (Content-Type: application/octet-stream)
     |
     v
[zmind] 返回 { upload: { token } }
     |
     v
[前端] 收集所有 { token, filename, content_type }
     |
     v
[前端/后端] 创建 issue 时在 body 中包含 uploads 数组
     |
     v
[zmind] issue 创建成功，附件已关联
```

---

## 3. 共享组件设计

### 3.1 buildProjectTreeOptions（共享函数）

**来源**: 从 VersionIssueList.tsx 提取到独立文件

**接口**:
```typescript
// src/components/zmind/zmindUtils.ts

export function buildProjectTreeOptions(
  projects: ZmindProject[],
  searchText: string
): Array<ZmindProject & { depth: number }>;
```

**逻辑**: 
- 按 parent.id 构建父子关系
- 递归展平为带 depth 的列表
- 支持文本搜索过滤（匹配 name / identifier / parent.name）

### 3.2 统一描述模板

```typescript
// src/components/zmind/zmindConstants.ts

export const ZMIND_DESCRIPTION_TEMPLATE = `【Tested Environment】

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

`;
```

### 3.3 ZmindApiService 新增方法

```typescript
// src/services/ZmindApiService.ts 新增

export interface ZmindUploadToken {
  token: string;
  filename: string;
  contentType: string;
}

/**
 * 上传文件到 zmind，返回 upload token
 */
export async function uploadFileToZmind(file: File): Promise<ZmindUploadToken>;
```

---

## 4. 自定义字段显示逻辑变更

### 4.1 当前逻辑（VersionIssueList）

```typescript
// 按 tracker 过滤
const visibleCustomFields = (config?.customFields || []).filter(field =>
  !field.trackerIds.length || !selectedTrackerId || field.trackerIds.includes(selectedTrackerId)
);
```

### 4.2 新逻辑（两个入口统一）

```typescript
// 显示所有字段，不按 tracker 过滤
const visibleCustomFields = config?.customFields || [];
```

---

## 5. 后端变更设计

### 5.1 新增路由: POST /api/zmind/uploads

**位置**: `src/server/routes/zmindProxy.ts`

**逻辑**:
1. 验证 API Key
2. 读取请求体（二进制流）
3. 获取文件名（从 header `x-file-name`）
4. 代理到 `POST zmind/uploads.json`（Content-Type: application/octet-stream）
5. 返回 `{ success: true, data: { token } }`

### 5.2 修改 issue 创建逻辑

**位置**: `src/server/routes/versionIssues.ts` 和 `src/server/routes/customerProblems.ts`

**变更**: 
- `createZmindIssueFromVersionIssue` 函数增加 `uploads` 参数
- 如果有 uploads tokens，在 issue body 中包含 `uploads` 数组

### 5.3 zmind.ts 新增工具函数

```typescript
/**
 * 上传文件到 zmind，返回 token
 */
export async function uploadToZmindServer(
  apiKey: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<string>; // 返回 token
```

---

## 6. 前端变更设计

### 6.1 VersionIssueList.tsx 变更

- 移除内联的 `buildProjectTreeOptions` 函数，改为从共享模块导入
- 移除内联的 `ZMIND_DESCRIPTION_TEMPLATE`，改为从共享模块导入
- 自定义字段去掉 tracker 过滤
- 附件上传改为通过 zmind uploads API（而非本地 pre-upload）

### 6.2 CustomerProblemForm.tsx 变更

- 项目选择改为使用 `buildProjectTreeOptions` 层级树
- 新增附件上传 UI（复用与 VersionIssueList 相同的交互）
- 描述模板改为统一的英文模板
- 自定义字段去掉 tracker 过滤（当前已经是显示全部）
- 提交时如果有附件，先上传到 zmind 获取 token，再创建 issue

### 6.3 提交流程变更

```
提交按钮点击
    |
    v
有附件？ ──否──> 直接创建 issue
    |
   是
    |
    v
逐个上传文件到 /api/zmind/uploads
    |
    v
收集 tokens
    |
    v
创建 issue（body 包含 uploads 数组）
```

---

## 7. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/zmind/zmindUtils.ts` | 新建 | 共享 buildProjectTreeOptions |
| `src/components/zmind/zmindConstants.ts` | 新建 | 统一描述模板常量 |
| `src/services/ZmindApiService.ts` | 修改 | 新增 uploadFileToZmind |
| `src/server/utils/zmind.ts` | 修改 | 新增 uploadToZmindServer |
| `src/server/routes/zmindProxy.ts` | 修改 | 新增 POST /api/zmind/uploads |
| `src/server/routes/versionIssues.ts` | 修改 | issue 创建支持 uploads 参数 |
| `src/server/routes/customerProblems.ts` | 修改 | issue 创建支持 uploads 参数 |
| `src/features/versionRecords/components/VersionIssueList.tsx` | 修改 | 使用共享组件、统一模板、去掉 tracker 过滤、zmind 附件上传 |
| `src/features/customerProblems/components/CustomerProblemForm.tsx` | 修改 | 集成项目树、附件上传、统一模板 |

