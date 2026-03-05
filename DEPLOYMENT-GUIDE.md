# 部署指南

## 环境要求

- Node.js 16+
- npm 8+

## 快速启动

### 开发模式

```bash
npm install
npm run dev
```

同时启动：
- Vite 前端开发服务器（http://localhost:5173）
- Express API 服务器（http://localhost:3000）

Vite 自动代理 `/api` 请求到 Express 服务器。

### 生产模式

```bash
npm install
npm run prod
```

执行 `vite build` 后启动 Express 服务器，同时托管前端静态文件和 API。
访问 http://localhost:3000 即可。

### 仅启动服务器（已构建过）

```bash
npm run start
```

## 数据存储

- Release Note 数据：`data/release-notes.json`
- 客户问题数据：`data/customer-problems.json`
- APK 文件：`uploads/apk/`
- 文档文件：`uploads/docs/`

首次启动会自动创建这些目录和文件。

## 内网穿透访问

项目已配置 Vite `allowedHosts` 支持穿透域名。生产模式下直接通过 Express 3000 端口访问，无需额外配置。

## 局域网共享

Express 服务器监听 `0.0.0.0:3000`，同局域网设备可直接通过 IP 访问：
- 开发模式：`http://<IP>:5173`（Vite 代理到 3000）
- 生产模式：`http://<IP>:3000`

## API 端点

| 端点 | 说明 |
|------|------|
| `GET /api/release-notes` | Release Note 列表 |
| `POST /api/release-notes` | 创建 Release Note |
| `GET /api/customer-problems` | 客户问题列表 |
| `POST /api/customer-problems` | 创建客户问题 |
| `POST /api/apk/upload` | APK 上传 |
| `POST /api/docs/upload` | 文档上传 |
| `GET /api/zmind/issues/:id` | zmind 问题代理 |
| `GET /health` | 健康检查 |
