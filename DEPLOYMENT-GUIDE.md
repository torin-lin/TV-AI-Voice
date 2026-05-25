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

### 抓包代理访问本机 ADB

远程/内网穿透访问「抓包代理」时，网页需要访问使用者自己电脑上的 ADB 代理。使用者无需克隆项目，在抓包代理页面点击「下载 ADB 代理」即可直接下载 Windows 代理。

首次部署或代理代码更新后，在服务器项目目录执行以下命令生成自己的 Windows 代理。构建机需要安装 Go 1.22+：

```bash
npm run adb-agent:build
```

生成文件会放到 `public/downloads/adb-agent-windows.exe`，公开下载页会自动使用这个文件。

用户下载后双击运行 `adb-agent-windows.exe`，按提示允许管理员权限。代理会安装为 Windows 后台服务并开机自启，在网页右上角选择「本机 ADB」，点击「测试连接/刷新」即可。默认 ADB 代理地址为 `http://127.0.0.1:3131`。

### 手动安装抓包 CA 证书

如果「装证书」无法一键安装，可以在抓包代理页面点击「手动安装证书」，下载 `mitm-ca.crt` 后自行安装：

1. 将 `mitm-ca.crt` 传到 TV，例如浏览器下载、U 盘拷贝，或执行 `adb push mitm-ca.crt /sdcard/Download/`。
2. 在 TV 设置中进入「安全 / 加密与凭据 / 从存储安装」（不同系统名称可能略有差异）。
3. 选择 `mitm-ca.crt`，安装为「VPN 和应用证书」。
4. 安装完成后重启被测 App 或重启设备，再回抓包代理页面刷新设备状态。

如果 App 启用了证书固定（certificate pinning），即使安装 CA 证书也可能拒绝代理连接，需要额外关闭 pinning 或使用测试包。

高级维护命令：

```bash
adb-agent-windows.exe install-start
adb-agent-windows.exe status
adb-agent-windows.exe stop
adb-agent-windows.exe uninstall
```

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
