# TV AI Voice 测试全流程体系 Web 网页

一个现代化的 Web 应用，用于管理 TV AI Voice 的测试全流程，包括版本测试记录、AI 用例推荐、客户问题追踪和语音识别记录。

## 🎯 项目特性

- ✅ **无账号管理** - 公开访问，无需登录
- ✅ **现代化设计** - 蓝色系渐变，专业科技感
- ✅ **AI 驱动** - 集成 Azure OpenAI API 进行用例推荐和问题分类
- ✅ **本地数据库** - 使用 IndexedDB 存储数据，完全本地化
- ✅ **完整功能** - CRUD、搜索、筛选、排序、导出
- ✅ **响应式设计** - 支持桌面浏览器

## 📋 核心功能

### 1. 版本测试记录管理
- 添加、编辑、删除版本记录
- 搜索、筛选、排序功能
- 导出为 Excel/CSV 格式
- 分页加载支持

### 2. AI 用例推荐
- 基于版本信息自动推荐测试用例
- 三层推荐策略：版本分析 + 风险等级 + 历史问题
- 推荐结果缓存
- 推荐历史记录

### 3. 客户问题追踪
- 记录客户问题详细信息
- AI 自动分类问题
- 问题状态管理
- 搜索、筛选、排序功能
- 导出为 Excel/CSV 格式

### 4. 语音识别记录
- 记录语音识别测试结果
- 准确率统计
- 数据导入功能

### 5. 仪表板
- 版本测试统计
- 客户问题统计
- 语音识别准确率
- 活动趋势分析
- 快速操作

### 6. 设置
- Azure OpenAI API Key 配置
- 数据备份和恢复
- 存储使用情况监控

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Router** - 路由管理

### 状态管理
- **Redux Toolkit** - 全局状态管理
- **React Context** - 局部状态管理

### UI 和样式
- **Tailwind CSS** - 样式框架
- **Shadcn/ui** - 组件库
- **Chart.js / Recharts** - 图表库

### 数据存储
- **IndexedDB** - 本地数据库
- **Dexie.js** - IndexedDB 包装库

### API 集成
- **axios** - HTTP 客户端
- **Azure OpenAI SDK** - AI 集成

### 数据导出
- **xlsx** - Excel 导出
- **papaparse** - CSV 导出

### 开发工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Vitest** - 单元测试

## 📦 项目结构

```
project/
├── src/
│   ├── types/                 # 类型定义
│   ├── db/                    # 数据库层
│   │   ├── database.ts
│   │   ├── operations/
│   │   ├── utils/
│   │   └── index.ts
│   ├── features/              # 功能模块
│   │   ├── versionRecords/
│   │   ├── customerProblems/
│   │   ├── voiceRecords/
│   │   ├── recommendations/
│   │   └── settings/
│   ├── components/            # 通用组件
│   ├── pages/                 # 页面
│   ├── store/                 # Redux Store
│   ├── services/              # 服务层
│   ├── styles/                # 全局样式
│   ├── App.tsx
│   └── main.tsx
├── aidlc-docs/                # AI-DLC 文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🚀 快速开始

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173`

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

## 🌐 部署指南

### 快速部署（本地网络）

1. **构建应用**
   ```bash
   npm run build
   ```

2. **启动 HTTP 服务器**
   ```bash
   cd dist
   python -m http.server 8080
   ```

3. **访问应用**
   - 本地: `http://localhost:8080`
   - 局域网: `http://your-local-ip:8080`

### 外网部署

详见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

**推荐方案**:
1. **最简单**: Python HTTP 服务器 + 防火墙配置
2. **推荐**: Nginx 反向代理
3. **最佳**: Docker 容器化 + 云服务

### Docker 部署

```bash
# 构建镜像
docker build -t tv-ai-voice:latest .

# 运行容器
docker run -d -p 80:80 --restart always tv-ai-voice:latest

# 访问应用
# http://localhost
```

### 使用 Docker Compose

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 查看日志
docker-compose logs -f
```

### 快速部署脚本

**Linux/Mac**:
```bash
bash deploy.sh build
bash deploy.sh start
```

**Windows**:
```bash
deploy.bat build
deploy.bat start
```

## 📖 使用指南

### 配置 Azure OpenAI API

1. 打开应用
2. 进入 **设置** 页面
3. 输入 Azure OpenAI API Key
4. 点击 **测试连接** 验证
5. 保存配置

**API 配置**:
- 区域: eastus
- 端点: https://fz-test-qa.openai.azure.com/openai/v1/chat/completions

### 添加版本记录

1. 进入 **版本记录** 页面
2. 点击 **添加新记录**
3. 填写版本信息
4. 点击 **保存**

### 获取 AI 推荐

1. 进入 **AI 推荐** 页面
2. 输入版本信息
3. 点击 **获取推荐**
4. 查看推荐的测试用例

### 追踪客户问题

1. 进入 **问题追踪** 页面
2. 点击 **添加问题**
3. 填写问题信息
4. AI 自动分类问题
5. 点击 **保存**

### 导出数据

1. 在任何列表页面
2. 点击 **导出** 按钮
3. 选择导出格式（Excel/CSV）
4. 选择导出范围
5. 点击 **导出**

## 📊 数据模型

### 版本记录
```typescript
{
  id: string;
  versionNumber: string;
  modificationContent: string;
  modifiedModules: string[];
  riskLevel: 'low' | 'medium' | 'high';
  smokeTestResult: 'pass' | 'fail' | 'pending';
  voiceRegressionResult: 'pass' | 'fail' | 'pending';
  systemRegressionResult: 'pass' | 'fail' | 'pending';
  testConclusion: string;
  createdAt: number;
  updatedAt: number;
}
```

### 客户问题
```typescript
{
  id: string;
  date: number;
  tvModel: string;
  versionNumber: string;
  networkEnvironment: string;
  bluetoothDistance: string;
  batteryStatus: string;
  isReproducible: boolean;
  frequency: string;
  originalSpeech: string;
  recognitionResult: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
  updatedAt: number;
}
```

### 语音识别记录
```typescript
{
  id: string;
  corpusId: string;
  originalText: string;
  recognizedText: string;
  isCorrect: boolean;
  versionNumber: string;
  createdAt: number;
}
```

## 🔒 数据隐私

- 所有数据存储在本地浏览器（IndexedDB）
- 不上传到任何服务器
- 用户可以随时清除所有数据
- 支持数据备份和恢复

## 🎨 设计风格

- **颜色方案**: 蓝色系渐变（#0066CC → #00CCFF）
- **设计风格**: 现代化（卡片、圆角、阴影）
- **响应式**: 仅支持桌面浏览器（1920x1080+）

## 📝 API 文档

详见 `aidlc-docs/` 目录中的详细文档。

## 🧪 测试

### 运行所有测试

```bash
npm run test
```

### 运行特定测试

```bash
npm run test -- src/db/__tests__/crud.test.ts
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

## 🐛 常见问题

### Q: 如何重置所有数据？
A: 进入 **设置** 页面，点击 **清除所有数据**。

### Q: 如何导出数据？
A: 在任何列表页面，点击 **导出** 按钮，选择格式和范围。

### Q: 如何导入数据？
A: 进入 **设置** 页面，点击 **导入数据**，选择备份文件。

### Q: 如何配置 API Key？
A: 进入 **设置** 页面，输入 API Key，点击 **测试连接**。

## 📞 支持

如有问题或建议，请提交 Issue 或 Pull Request。

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**最后更新**: 2026-02-28
**版本**: 1.0.0-alpha
