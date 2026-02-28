# 部署文档索引

## 📚 文档导航

### 🚀 快速开始
- **[QUICK-START.md](./QUICK-START.md)** - 5 分钟快速部署指南
  - 4 种部署方案
  - 常用命令
  - 常见问题

### 📖 详细指南
- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - 完整部署指南
  - 4 种部署方案详解
  - 性能优化
  - 安全建议
  - 故障排查

- **[DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md)** - 部署方案总结
  - 方案对比表
  - 推荐流程
  - 检查清单
  - 最佳实践

### 🔧 配置文件
- **[nginx.conf](./nginx.conf)** - Nginx 配置模板
  - 开箱即用
  - 包含 HTTPS 配置
  - 性能优化

- **[Dockerfile](./Dockerfile)** - Docker 镜像配置
  - 多阶段构建
  - 优化镜像大小

- **[docker-compose.yml](./docker-compose.yml)** - Docker Compose 配置
  - 一键启动
  - 包含健康检查

### 🛠️ 部署脚本
- **[deploy.sh](./deploy.sh)** - Linux/Mac 部署脚本
  - 自动化部署
  - 支持多个命令

- **[deploy.bat](./deploy.bat)** - Windows 部署脚本
  - 自动化部署
  - 支持多个命令

### 🔑 API 配置
- **[AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)** - Azure OpenAI 配置指南
  - 详细配置步骤
  - 常见错误排查
  - 安全建议

### 📋 项目文档
- **[README.md](./README.md)** - 项目说明
  - 项目特性
  - 技术栈
  - 使用指南

---

## 🎯 按场景选择文档

### 我想快速上线
1. 阅读 [QUICK-START.md](./QUICK-START.md)
2. 选择方案 1-4
3. 按步骤操作

### 我想在局域网使用
1. 阅读 [QUICK-START.md](./QUICK-START.md) - 方案 2
2. 或阅读 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 方案 2

### 我想在外网部署
1. 阅读 [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md)
2. 选择合适方案
3. 阅读 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

### 我想使用 Docker
1. 阅读 [QUICK-START.md](./QUICK-START.md) - 方案 3/4
2. 查看 [Dockerfile](./Dockerfile)
3. 查看 [docker-compose.yml](./docker-compose.yml)

### 我想使用 Nginx
1. 阅读 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 方案 2
2. 查看 [nginx.conf](./nginx.conf)
3. 按步骤配置

### 我想配置 Azure OpenAI
1. 阅读 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md)
2. 按步骤配置
3. 测试连接

---

## 📊 部署方案速查表

| 方案 | 文档 | 配置文件 | 脚本 | 难度 |
|------|------|---------|------|------|
| Python HTTP | [QUICK-START.md](./QUICK-START.md) | - | - | ⭐ |
| Nginx | [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | [nginx.conf](./nginx.conf) | - | ⭐⭐ |
| Docker | [QUICK-START.md](./QUICK-START.md) | [Dockerfile](./Dockerfile) | [deploy.sh](./deploy.sh) | ⭐⭐ |
| Docker Compose | [QUICK-START.md](./QUICK-START.md) | [docker-compose.yml](./docker-compose.yml) | [deploy.sh](./deploy.sh) | ⭐ |
| Vercel | [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | - | - | ⭐ |
| AWS | [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | - | - | ⭐⭐⭐ |

---

## 🔄 部署流程

```
开发
  ↓
npm run dev (本地测试)
  ↓
npm run build (构建)
  ↓
选择部署方案
  ├→ Python HTTP (快速测试)
  ├→ Nginx (生产环境)
  ├→ Docker (容器化)
  ├→ Vercel (云部署)
  └→ AWS (大规模)
  ↓
配置 Azure OpenAI (可选)
  ↓
部署完成
  ↓
监控和维护
```

---

## 📝 常用命令速查

### 开发
```bash
npm install          # 安装依赖
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
```

### 部署
```bash
# Python HTTP
cd dist && python -m http.server 8080

# Docker
docker build -t tv-ai-voice:latest .
docker run -d -p 80:80 tv-ai-voice:latest

# Docker Compose
docker-compose up -d
docker-compose down

# 部署脚本
bash deploy.sh build    # Linux/Mac
deploy.bat build        # Windows
```

### 维护
```bash
npm run lint         # 代码检查
npm run format       # 代码格式化
npm run test         # 运行测试
npm run test:coverage # 覆盖率报告
```

---

## 🆘 快速问题排查

### 应用无法访问
→ 查看 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 常见问题

### Azure OpenAI 连接失败
→ 查看 [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md) - 常见错误排查

### 性能问题
→ 查看 [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 性能优化

### 数据丢失
→ 查看 [README.md](./README.md) - 常见问题

---

## 📞 获取帮助

1. **查看相关文档** - 大多数问题都有文档说明
2. **查看日志** - 检查应用和服务器日志
3. **检查配置** - 确认所有配置正确
4. **测试连接** - 使用测试工具验证连接

---

## ✅ 部署检查清单

### 部署前
- [ ] 代码已提交
- [ ] 依赖已安装
- [ ] 本地测试通过
- [ ] 选择部署方案

### 部署中
- [ ] 构建成功
- [ ] 服务启动成功
- [ ] 端口已开放
- [ ] 日志无错误

### 部署后
- [ ] 应用可访问
- [ ] 功能正常
- [ ] 性能满足要求
- [ ] 监控已配置

---

## 🎓 推荐阅读顺序

### 第一次部署
1. [QUICK-START.md](./QUICK-START.md) - 了解基本方案
2. [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md) - 选择合适方案
3. [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 详细步骤

### 生产部署
1. [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md) - 方案对比
2. [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 详细指南
3. 相关配置文件 - 根据选择的方案

### 问题排查
1. [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - 常见问题
2. [AZURE-OPENAI-SETUP.md](./AZURE-OPENAI-SETUP.md) - API 问题
3. 查看日志 - 具体错误信息

---

## 📈 文档更新日志

| 日期 | 文档 | 更新内容 |
|------|------|---------|
| 2026-02-28 | 全部 | 初始版本 |

---

**最后更新**: 2026-02-28
**版本**: 1.0.0
