# 部署速查表

## 🚀 一键部署命令

### 本地开发
```bash
npm install && npm run dev
```
→ 访问 `http://localhost:5173`

### 局域网部署
```bash
npm run build && cd dist && python -m http.server 8080
```
→ 访问 `http://192.168.x.x:8080`

### Docker 部署
```bash
docker build -t tv-ai-voice . && docker run -d -p 80:80 tv-ai-voice
```
→ 访问 `http://localhost`

### Docker Compose 部署
```bash
docker-compose up -d
```
→ 访问 `http://localhost`

---

## 📋 部署方案速查

| 方案 | 命令 | 访问地址 | 难度 |
|------|------|---------|------|
| 开发 | `npm run dev` | `http://localhost:5173` | ⭐ |
| HTTP | `npm run build && cd dist && python -m http.server 8080` | `http://localhost:8080` | ⭐ |
| Docker | `docker build -t tv-ai-voice . && docker run -d -p 80:80 tv-ai-voice` | `http://localhost` | ⭐⭐ |
| Compose | `docker-compose up -d` | `http://localhost` | ⭐ |
| Nginx | 见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | `http://localhost` | ⭐⭐ |
| Vercel | 见 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | `https://your-domain.vercel.app` | ⭐ |

---

## 🔧 常用命令

```bash
# 安装和构建
npm install                    # 安装依赖
npm run build                  # 构建生产版本
npm run preview                # 预览生产版本

# 开发
npm run dev                    # 开发模式
npm run lint                   # 代码检查
npm run format                 # 代码格式化

# 测试
npm run test                   # 运行测试
npm run test:coverage          # 覆盖率报告

# Docker
docker build -t tv-ai-voice .  # 构建镜像
docker run -d -p 80:80 tv-ai-voice  # 运行容器
docker-compose up -d           # 启动 Compose
docker-compose down            # 停止 Compose
docker logs -f <container-id>  # 查看日志

# 部署脚本
bash deploy.sh build           # Linux/Mac 构建
bash deploy.sh start           # Linux/Mac 启动
deploy.bat build               # Windows 构建
deploy.bat start               # Windows 启动
```

---

## 🌐 访问地址

| 环境 | 地址 | 说明 |
|------|------|------|
| 本地开发 | `http://localhost:5173` | Vite 开发服务器 |
| 本地 HTTP | `http://localhost:8080` | Python HTTP 服务器 |
| 本地 Docker | `http://localhost` | Docker 容器 |
| 局域网 | `http://192.168.x.x:8080` | 需要防火墙配置 |
| 外网 | `http://your-public-ip` | 需要路由器配置 |
| 云服务 | `https://your-domain.com` | Vercel/AWS 等 |

---

## 🔑 Azure OpenAI 配置

### 快速配置
1. 打开应用 → 设置
2. 输入 API Key
3. 输入端点：
   ```
   https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview
   ```
4. 点击"测试连接"

### 端点格式
```
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-02-15-preview
```

### 常见错误
- `400 Bad Request` → 检查端点格式
- `401 Unauthorized` → 检查 API Key
- `404 Not Found` → 检查部署名称

详见 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)

---

## 📁 项目结构

```
project/
├── src/                    # 源代码
├── dist/                   # 构建输出
├── aidlc-docs/             # 文档
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker Compose
├── nginx.conf              # Nginx 配置
├── deploy.sh               # Linux 脚本
├── deploy.bat              # Windows 脚本
├── package.json            # 依赖
└── README.md               # 说明
```

---

## ✅ 部署检查清单

### 部署前
- [ ] `npm install` 成功
- [ ] `npm run build` 成功
- [ ] 本地测试通过
- [ ] 选择部署方案

### 部署中
- [ ] 构建/镜像创建成功
- [ ] 服务启动成功
- [ ] 端口已开放
- [ ] 日志无错误

### 部署后
- [ ] 应用可访问
- [ ] 功能正常
- [ ] 性能满足要求
- [ ] 监控已配置

---

## 🆘 快速问题排查

### 应用无法访问
```bash
# 检查服务是否运行
docker ps                    # Docker
netstat -tlnp | grep 80      # Linux
netstat -ano | findstr :80   # Windows

# 检查防火墙
# Windows: 允许端口通过防火墙
# Linux: sudo ufw allow 80
```

### 构建失败
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Docker 问题
```bash
# 查看日志
docker logs <container-id>

# 重启容器
docker restart <container-id>

# 清理资源
docker system prune
```

### Azure OpenAI 连接失败
1. 检查 API Key 是否正确
2. 检查端点格式是否正确
3. 检查部署名称是否存在
4. 查看 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)

---

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| [QUICK-START.md](./QUICK-START.md) | 5分钟快速开始 |
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | 详细部署指南 |
| [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md) | 方案对比 |
| [DEPLOYMENT-INDEX.md](./DEPLOYMENT-INDEX.md) | 文档索引 |
| [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md) | API 配置 |
| [README.md](./README.md) | 项目说明 |

---

## 💡 最佳实践

### 开发
- 使用 `npm run dev` 开发
- 使用 ESLint 检查代码
- 使用 Prettier 格式化代码

### 部署
- 先在本地测试
- 使用 Docker 保证环境一致
- 配置监控和日志

### 运维
- 定期备份数据
- 监控应用性能
- 定期更新依赖

---

## 🎯 推荐流程

```
1. 本地开发
   npm run dev

2. 构建测试
   npm run build
   npm run preview

3. 选择部署方案
   ├─ 快速: Python HTTP
   ├─ 推荐: Docker
   └─ 最佳: Vercel/AWS

4. 部署
   按选择的方案执行命令

5. 配置 Azure OpenAI
   设置 → 输入 API Key 和端点

6. 监控和维护
   定期检查日志和性能
```

---

**最后更新**: 2026-02-28
**版本**: 1.0.0
