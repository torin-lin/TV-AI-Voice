# TV AI Voice 测试全流程体系

面向 `TV / Projector / STB AI Voice` 团队的测试协作系统，用来串起 `RD 提测`、`QA 回归`、`问题闭环`、`版本结论` 和 `AI 用例推荐`。

当前系统已经从“多个独立页面”演进为一条可落地的业务主线：

- `Release Note (RD)` 负责记录研发变更和提测前自检
- `QA 版本记录` 负责对关联 RD 版本进行固件维度回归
- `版本工作台` 负责聚合版本范围内的 RD、QA、问题和结论
- `问题追踪` 负责客户问题 / QA 问题闭环
- `知识库推荐` 负责基于版本信息给出测试建议

## 当前能力

### 1. Release Note (RD)
- 记录研发版本、分支、作者、修改内容
- 管理受影响模块、功能、回归风险、迁移类型、修复 PR
- 支持 `RD 冒烟测试`、提测备注、APK 上传
- 反向显示该 RD 版本下的 QA 记录数和已测固件数

### 2. QA 版本记录
- 以 `关联 RD 版本` 为主入口创建 QA 记录
- 只有 `RD 冒烟通过` 的版本才能创建 QA 测试记录
- 支持同一个 RD 版本在多个固件上创建多条测试记录
- 记录 `语音功能回归`、`系统集成回归`、风险、状态、附件和结论

### 3. 版本工作台
- 以版本为中心聚合：
  - 版本记录
  - Release Note
  - 版本问题
  - 追踪问题
  - AI 推荐
  - 发布结论
- 支持版本状态机和结论卡保存
- 提供 RD 提测信息、阻塞提醒、推荐状态和发布前引导

### 4. 问题追踪
- 管理客户问题和 QA 问题
- 支持 PR 号关联、分类、状态、时间轴
- 支持与 QA 测试记录链路打通

### 5. 国际化与体验
- 支持中英文切换
- 关键表单和工作台已接入统一翻译
- 通用提示已统一为 toast，避免 `alert` 打断操作

## 当前业务主线

```text
Release Note (RD)
  -> RD 冒烟通过
  -> QA 版本记录（同一 RD 版本可对应多个固件）
  -> 版本问题 / 问题追踪
  -> 版本工作台聚合
  -> 版本结论
  -> 可发布 / 已发布
```

## 技术栈

- React 18 + TypeScript + Vite
- Redux Toolkit
- Tailwind CSS
- Express.js
- better-sqlite3
- axios
- xlsx / papaparse

## 项目结构

```text
src/
├── components/          # 通用组件与布局
├── config/              # 字典中心、统一选项
├── features/
│   ├── versionRecords/  # QA 版本记录
│   ├── releaseNotes/    # Release Note (RD)
│   ├── customerProblems/# 问题追踪
│   └── recommendations/ # AI 测试推荐
├── i18n/                # 中英文切换
├── pages/               # 仪表板、工作台、设置等页面
├── server/              # Express 路由与 SQLite 存储
├── services/            # 前端 API Client / 上传服务
├── store/               # Redux Store
└── types/               # 核心数据模型
```

## 核心数据关系

- `ReleaseNote`
  - 研发版本记录
  - 含 `rdSmokeStatus`
- `VersionRecord`
  - QA 测试记录
  - 通过 `releaseNoteId` 关联 `ReleaseNote`
  - 一个 RD 版本可关联多条 QA 记录
- `VersionIssue`
  - QA 在版本测试过程中提出的问题
- `CustomerProblem`
  - 客户问题 / QA 问题追踪
- `KBRecommendation`
  - 基于版本记录生成的测试建议

## 当前关键规则

- `RD 冒烟通过` 的 Release Note 才能被 QA 选中创建记录
- QA 以 `关联 RD 版本` 为主，不再单独维护平行版本入口
- 一个 RD 版本可以在多个固件上重复测试
- 版本状态按状态机流转：
  - `待测试 -> 测试中 / 阻塞`
  - `测试中 -> 阻塞 / 待结论`
  - `阻塞 -> 测试中 / 待结论`
  - `待结论 -> 阻塞 / 可发布`
  - `可发布 -> 已发布 / 阻塞`
- `可发布 / 已发布` 时必须补齐结论摘要和负责人

## 快速开始

```bash
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- API：`http://localhost:3000`

其他命令：

```bash
npm run dev:frontend
npm run dev:server
npm run type-check
npm run build
```

## 文档

- [快速开始](./GETTING-STARTED.md)
- [部署说明](./DEPLOYMENT-GUIDE.md)
- [Azure OpenAI 配置](./AZURE-OPENAI-SETUP.md)
- [系统蓝图与排期](./aidlc-docs/CURRENT-SYSTEM-BLUEPRINT.md)

## 下一阶段计划

当前项目优先级已经收敛为三条主线：

1. 把 `版本工作台` 继续补成真正的版本闭环页面
2. 把 `字典中心 + 状态机 + 国际化` 做成统一底座
3. 把 `测试管理系统` 逐步升级成更合理的 `项目协同系统`

下一步建议优先做：

1. 版本状态变更时间轴
2. 发布前检查清单
3. Release Note / QA / 问题三方跳转闭环
