# 外网部署指南

## 方案对比

### 方案 1: 本地构建 + 静态文件服务（推荐快速部署）

#### 步骤 1: 构建生产版本

```bash
npm run build
```

这会生成 `dist` 文件夹，包含所有静态文件。

#### 步骤 2: 使用 Python 简单 HTTP 服务器

```bash
cd dist
python -m http.server 8080
```

然后通过 `http://your-ip:8080` 访问。

#### 步骤 3: 配置防火墙

- Windows: 允许 8080 端口通过防火墙
- Linux: `sudo ufw allow 8080`

---

### 方案 2: 使用 Nginx 反向代理（推荐生产环境）

#### 步骤 1: 构建生产版本

```bash
npm run build
```

#### 步骤 2: 安装 Nginx

**Windows:**
- 下载: https://nginx.org/en/download.html
- 解压到 `C:\nginx`

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install nginx
```

#### 步骤 3: 配置 Nginx

创建 `nginx.conf` 文件（Windows 在 `C:\nginx\conf\nginx.conf`，Linux 在 `/etc/nginx/sites-available/default`）：

```nginx
server {
    listen 80;
    server_name _;

    # 设置根目录为 dist 文件夹
    root /path/to/your/project/dist;
    index index.html;

    # 所有请求都指向 index.html（支持 React Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 步骤 4: 启动 Nginx

**Windows:**
```bash
cd C:\nginx
nginx.exe
```

**Linux:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 步骤 5: 验证

访问 `http://your-ip` 或 `http://your-domain`

---

### 方案 3: 使用云服务部署（推荐长期运营）

#### 选项 A: Vercel（最简单）

1. 在 GitHub 上创建仓库
2. 访问 https://vercel.com
3. 导入你的 GitHub 仓库
4. 自动部署，获得免费域名

#### 选项 B: Netlify

1. 在 GitHub 上创建仓库
2. 访问 https://netlify.com
3. 连接 GitHub 仓库
4. 自动部署

#### 选项 C: Azure Static Web Apps

1. 构建项目：`npm run build`
2. 在 Azure 门户创建 Static Web Apps
3. 连接 GitHub 仓库
4. 自动部署

#### 选项 D: AWS S3 + CloudFront

1. 构建项目：`npm run build`
2. 上传 `dist` 文件夹到 S3
3. 配置 CloudFront CDN
4. 获得全球加速访问

---

### 方案 4: Docker 容器化部署

#### 步骤 1: 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 运行阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 步骤 2: 构建 Docker 镜像

```bash
docker build -t tv-ai-voice:latest .
```

#### 步骤 3: 运行容器

```bash
docker run -d -p 80:80 tv-ai-voice:latest
```

#### 步骤 4: 访问应用

访问 `http://your-ip`

---

## 获取外网 IP 和域名

### 获取公网 IP

```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
# 或
curl ifconfig.me
```

### 配置域名（可选）

1. 购买域名（如 godaddy.com、阿里云等）
2. 配置 DNS 指向你的公网 IP
3. 等待 DNS 生效（通常 24 小时内）

### 使用动态 DNS（如果 IP 经常变化）

- 使用 DDNS 服务（如 No-IP、Cloudflare）
- 自动更新域名指向

---

## 性能优化

### 1. 启用 Gzip 压缩

**Nginx 配置：**
```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json;
gzip_min_length 1000;
```

### 2. 启用 HTTPS（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 使用 Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. 配置 CDN

使用 Cloudflare 免费 CDN：
1. 访问 https://cloudflare.com
2. 添加你的域名
3. 更新 DNS 指向 Cloudflare
4. 自动获得 HTTPS 和 CDN 加速

---

## 常见问题

### Q: 如何在 Windows 上允许外网访问？

A: 
1. 打开 Windows Defender 防火墙
2. 点击"允许应用通过防火墙"
3. 找到你的应用或端口，允许通过

### Q: 如何检查端口是否开放？

A:
```bash
# Windows
netstat -ano | findstr :8080

# Linux
sudo netstat -tlnp | grep 8080
```

### Q: 如何在路由器上配置端口转发？

A:
1. 登录路由器管理界面（通常是 192.168.1.1）
2. 找到"端口转发"设置
3. 将外网端口转发到你的本地 IP 和端口
4. 例如：外网 8080 → 本地 192.168.1.100:8080

### Q: 如何保持应用持续运行？

A:
- **Windows**: 使用 NSSM 或 Task Scheduler
- **Linux**: 使用 systemd 或 supervisor
- **Docker**: 使用 `--restart=always` 参数

---

## 推荐部署流程

1. **开发阶段**: 使用 `npm run dev` 本地开发
2. **测试阶段**: 使用 `npm run build` 构建，本地测试
3. **局域网测试**: 使用 `npm run dev` 配置 `host: 0.0.0.0`
4. **外网部署**: 
   - 快速: 使用 Python HTTP 服务器
   - 推荐: 使用 Nginx
   - 最佳: 使用云服务（Vercel/Netlify）或 Docker

---

## 安全建议

1. **启用 HTTPS** - 保护 API Key 传输
2. **配置 CORS** - 限制跨域请求来源
3. **使用环境变量** - 不要在代码中硬编码敏感信息
4. **定期更新依赖** - 修复安全漏洞
5. **监控日志** - 检测异常访问

---

## 快速开始（最简单方案）

```bash
# 1. 构建
npm run build

# 2. 进入 dist 目录
cd dist

# 3. 启动 HTTP 服务器
python -m http.server 8080

# 4. 访问
# 本地: http://localhost:8080
# 局域网: http://your-local-ip:8080
# 外网: http://your-public-ip:8080 (需要防火墙和路由器配置)
```

---

## 获取帮助

- Nginx 文档: https://nginx.org/en/docs/
- Vercel 文档: https://vercel.com/docs
- Docker 文档: https://docs.docker.com/
- Let's Encrypt: https://letsencrypt.org/
