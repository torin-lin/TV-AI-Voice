# 快速开始指南

## 环境要求

- Node.js 16+
- npm 8+
- 现代浏览器（Chrome / Firefox / Edge）

## 一键启动

```bash
# 安装依赖
npm install

# 开发模式（前端 + 服务端同时启动）
npm run dev
```

- 前端：http://localhost:5173
- API：http://localhost:3000

生产模式：
```bash
npm run prod    # 构建 + 启动
npm run start   # 仅启动（需先 build）
```

## 功能说明

### 项目组切换
左侧导航栏顶部切换：全部 / TV AI Voice / Projector AI Voice / STB AI Voice。

### QA版本记录
- 固件版本号、关联 PR/CR（点击跳转 zmind）
- 修改模块（标签式选择 + 自定义）、语言模型
- 冒烟测试 / 语音回归 / 系统回归结果
- 测试周期、原型来源（链接或上传文档）
- 导出 Excel / CSV

### Release Note (RD)
- 研发修改记录，受影响模块和功能（标签式选择）
- APK 文件上传（服务端存储）
- 服务端 JSON 存储，局域网多人共享

### 问题追踪
- 上半区：客户问题（PR号自动获取 zmind 固件版本和主题）
- 下半区：QA 问题
- 客户问题可关联 QA 问题，带追责时间轴

### AI 用例推荐
- 需在设置页面配置 Azure OpenAI API Key
- 基于版本信息推荐测试用例

### 筛选和搜索
- 搜索框支持模糊搜索
- 点击「条件筛选」展开标签式筛选条件

## Azure OpenAI 配置

详见 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)

## 部署

详见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
