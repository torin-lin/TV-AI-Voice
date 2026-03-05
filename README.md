# TV AI Voice 测试全流程体系

现代化 Web 应用，用于管理 TV / Projector / STB AI Voice 的测试全流程。

## 项目特性

- 无账号管理，公开访问
- 项目组切换（TV / Projector / STB / 全部）
- 服务端数据存储，支持局域网多人共享
- AI 驱动的测试用例推荐（Azure OpenAI）
- 蓝色渐变设计风格，桌面端 1920x1080+

## 核心功能

### QA版本记录
- 版本号、固件版本号、项目类型
- 关联 PR/CR（点击跳转 zmind）
- 修改模块（标签式选择 + 自定义添加）
- 冒烟测试 / 语音回归 / 系统回归结果
- 测试周期、原型来源（链接或上传文档）
- 导出 Excel / CSV

### Release Note (RD)
- 手动填写研发修改记录（无 Git 同步）
- 受影响模块和功能（标签式选择 + 自定义）
- APK 文件上传（服务端存储）
- 服务端 JSON 存储，多人共享
- 导出 Excel / CSV

### 客户问题追踪
- 问题记录 CRUD
- AI 自动分类（Azure OpenAI）
- 状态管理、搜索筛选、导出

### AI 用例推荐
- 基于版本信息推荐测试用例
- 三层推荐策略
- 推荐历史记录

### 仪表板
- 版本测试统计、问题统计
- 语音识别准确率、活动趋势

## 技术栈

- React 18 + TypeScript + Vite
- Redux Toolkit 状态管理
- Tailwind CSS 样式
- IndexedDB (Dexie.js) 本地存储
- Express.js 服务端 API（Release Note 共享数据）
- Azure OpenAI API 集成
- xlsx / papaparse 数据导出

## 快速开始

```bash
# 安装依赖
npm install

# 一键启动（前端 + 服务端同时启动）
npm run dev
```

- 前端：http://localhost:5173
- 服务端 API：http://localhost:3000

单独启动：
```bash
npm run dev:frontend   # 仅前端
npm run dev:server     # 仅服务端
```

构建并启动生产版本：
```bash
npm run prod
```

Express 服务器同时托管前端和 API（http://localhost:3000）。

## 项目结构

```
src/
├── components/          # 通用组件 (Button, Input, Select, Tag...)
│   ├── common/
│   └── layout/          # 布局 (MainLayout, ProjectSwitcher)
├── features/
│   ├── versionRecords/  # QA版本记录
│   ├── releaseNotes/    # Release Note (RD)
│   ├── customerProblems/# 客户问题追踪
│   └── recommendations/ # AI 用例推荐
├── db/                  # IndexedDB 数据库层
├── server/              # 服务端路由和存储
│   ├── routes/          # API 路由 (releaseNotes, apkUpload, docUpload)
│   └── storage/         # JSON 文件存储
├── services/            # 前端服务 (API客户端, 上传服务)
├── store/               # Redux Store (projectSlice)
├── pages/               # 页面 (Dashboard, Settings, VoiceRecords)
├── types/               # TypeScript 类型定义
└── styles/              # 全局样式
```

## 部署

详见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

推荐方案：`npm run prod` 一键构建 + 启动 Express 服务器

## Azure OpenAI 配置

详见 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)

端点格式：
```
https://fz-test-qa.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-02-15-preview
```

## 设计风格

- 主色：蓝色渐变 (#0066CC → #00CCFF)
- 风险等级：绿(低) / 黄(中) / 红(高)
- 测试状态：绿(通过) / 红(失败) / 灰(未测试)
- 仅桌面端，无移动端适配
