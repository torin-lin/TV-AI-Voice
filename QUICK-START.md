# 快速开始指南

## 🎯 5 分钟快速部署

### 方案 1: 本地开发（最快）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器
# http://localhost:5173
```

---

### 方案 2: 局域网访问（推荐）

```bash
# 1. 构建生产版本
npm run build

# 2. 启动 HTTP 服务器
cd dist
python -m http.server 8080

# 3. 访问应用
# 本地: http://localhost:8080
# 局域网: http://192.168.x.x:8080
```

---

### 方案 3: Docker 部署（推荐生产）

```bash
# 1. 构建镜像
docker build -t tv-ai-voice:latest .

# 2. 运行容器
docker run -d -p 80:80 --restart always tv-ai-voice:latest

# 3. 访问应用
# http://localhost
```

---

### 方案 4: Docker Compose（最简单）

```bash
# 1. 启动
docker-compose up -d

# 2. 访问应用
# http://localhost

# 3. 查看日志
docker-compose logs -f

# 4. 停止
docker-compose down
```

---

## 🔧 常用命令

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 开发模式 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产版本 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |
| `npm run test` | 运行测试 |

---

## 🌐 访问方式

| 方式 | 地址 | 说明 |
|------|------|------|
| 本地 | `http://localhost:5173` | 开发模式 |
| 本地 | `http://localhost:8080` | HTTP 服务器 |
| 本地 | `http://localhost` | Docker |
| 局域网 | `http://192.168.x.x:8080` | 需要防火墙配置 |
| 外网 | `http://your-public-ip` | 需要路由器配置 |

---

## 🔑 Azure OpenAI 配置

1. 打开应用 → 设置
2. 输入 API Key
3. 输入 API 端点：
   ```
   https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview
   ```
4. 点击"测试连接"

详见 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)

---

## 📊 功能概览

| 功能 | 说明 |
|------|------|
| 仪表板 | 统计和趋势分析 |
| 版本记录 | 管理测试版本 |
| 问题追踪 | 追踪客户问题 |
| 语音记录 | 记录识别结果 |
| AI 推荐 | 获取测试建议 |
| 设置 | 配置 API 和数据 |

---

## 🚀 外网部署

详见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

**快速方案**:
1. 构建: `npm run build`
2. 部署: 使用 Nginx、Docker 或云服务
3. 配置: 防火墙、路由器、域名

---

## 📁 项目结构

```
project/
├── src/                    # 源代码
│   ├── components/         # 组件
│   ├── features/           # 功能模块
│   ├── pages/              # 页面
│   ├── db/                 # 数据库
│   ├── store/              # Redux
│   └── styles/             # 样式
├── dist/                   # 构建输出
├── aidlc-docs/             # 文档
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker Compose
├── nginx.conf              # Nginx 配置
├── deploy.sh               # Linux 部署脚本
├── deploy.bat              # Windows 部署脚本
└── package.json            # 依赖配置
```

---

## 🆘 常见问题

### Q: 如何在外网访问？
A: 见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

### Q: 如何配置 Azure OpenAI？
A: 见 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)

### Q: 如何导出数据？
A: 设置 → 数据管理 → 导出数据

### Q: 如何清除数据？
A: 设置 → 数据管理 → 清除所有数据

### Q: 支持移动端吗？
A: 不支持，仅支持桌面浏览器（1920x1080+）

---

## 📞 获取帮助

- 查看 [README.md](./README.md)
- 查看 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- 查看 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)
- 查看 [aidlc-docs/](./aidlc-docs/)

---

**最后更新**: 2026-02-28
