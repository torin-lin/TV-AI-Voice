# MITM 代理模块 - 需求分析

## 意图分析

- **用户请求**: 集成一个 MITM 代理模块到现有系统，抓取 TV 设备 HTTPS 请求并支持修改响应
- **请求类型**: New Feature（新功能模块）
- **范围**: System-wide（新增后端代理服务 + 前端页面 + ADB 交互 + 证书管理）
- **复杂度**: Complex（HTTPS 解密、动态证书签发、ADB 设备管理、WebSocket 实时推送、多设备支持）

---

## 功能需求

### FR-1: 设备连接管理

**描述**: 通过 ADB 连接和管理 TV 设备

**验收标准**:
- 列出当前 ADB 可见的所有设备（USB + WiFi）
- 支持通过 IP:PORT 连接远程设备
- 显示设备状态（在线/离线/未授权）
- 一键设置 TV 的 HTTP 代理指向本服务器
- 一键清除 TV 的 HTTP 代理
- 显示设备基本信息（型号、Android 版本、IP 地址）

### FR-2: CA 证书管理

**描述**: 生成自签 CA 证书并安装到 TV 系统信任区

**验收标准**:
- 首次启动自动生成 Root CA 证书（如不存在）
- 一键通过 `adb root` + `adb remount` 推送证书到 `/system/etc/security/cacerts/`
- 显示证书安装状态
- 支持重新生成证书（旧证书失效时）
- 支持 Android 13 和 16

### FR-3: HTTPS 代理与请求抓取

**描述**: 启动 MITM 代理服务器，解密并记录经过的 HTTPS 请求

**验收标准**:
- 代理服务器监听指定端口（默认 8888）
- 动态为每个域名签发 TLS 证书（使用 Root CA 签名）
- 记录请求：方法、URL、请求头、请求体、响应状态码、响应头、响应体
- 通过 WebSocket 实时推送新请求到前端
- 支持按 URL 关键词筛选
- 支持按包名筛选（通过 iptables owner 模块获取 UID → 包名映射）
- 请求历史持久化到 SQLite（可配置保留条数）
- 支持清空历史

### FR-4: 拦截规则引擎

**描述**: 配置规则，匹配请求后修改响应内容

**验收标准**:
- 规则匹配条件：
  - URL 包含指定字符串
  - URL 正则匹配
  - 包名匹配（精确）
  - 以上条件可组合（AND）
- 规则动作：
  - 替换整个响应 body（JSON 编辑器）
  - 修改响应 body 中的指定字段（JSON Path）
  - 修改响应状态码
  - 添加响应延迟（毫秒）
- 规则管理：
  - CRUD 操作
  - 启用/禁用开关
  - 规则优先级排序
  - 规则命名和备注
- 示例规则：URL 包含 `/api/check` → body 改为 `{"errorCode":2,"errorMsg":"123","timestamp":...}`

### FR-5: 前端页面

**描述**: 集成到现有系统的 MITM 代理管理页面

**验收标准**:
- 新增侧边栏入口「抓包代理」
- 页面布局：
  - 顶部：设备连接区（设备列表、连接/断开、代理开关、证书状态）
  - 左侧：请求列表（实时滚动、筛选、搜索）
  - 右侧：请求详情（请求/响应 tab 切换）
  - 底部/侧边：拦截规则管理面板
- 请求列表列：序号、方法、URL（截断）、状态码、包名、大小、耗时、是否被规则命中
- 被规则修改的请求高亮标记
- 响应 body 支持 JSON 格式化显示
- 规则编辑器支持 JSON 语法高亮

### FR-6: 多设备支持

**描述**: 支持同时管理多台 TV 设备

**验收标准**:
- 每台设备独立的代理开关
- 每台设备独立的请求历史
- 拦截规则可设置作用范围（全局 / 指定设备）
- 设备切换时请求列表跟随切换

---

## 非功能需求

### NFR-1: 性能
- 代理转发延迟 < 50ms（不含规则处理）
- 支持同时处理 100+ 并发连接
- 请求历史默认保留最近 5000 条
- WebSocket 推送不阻塞代理转发

### NFR-2: 安全
- CA 私钥仅存储在服务器本地，不通过 API 暴露
- 代理端口仅监听内网地址
- 不记录敏感 header（如 Authorization）的完整值（可配置）

### NFR-3: 可靠性
- 代理服务崩溃不影响主 Express 服务
- 设备断开连接时自动清理代理设置（尽力而为）
- 规则配置错误不导致代理崩溃（降级为透传）

### NFR-4: 兼容性
- Android 13 (API 33) 和 Android 16 系统证书安装
- 支持 HTTP/1.1 和 HTTP/2 代理
- 支持 gzip/br 压缩响应的解码和重编码

---

## 技术方案

### 依赖库
| 库 | 用途 |
|---|---|
| `http-mitm-proxy` 或自建 | MITM 代理核心 |
| `node-forge` | CA 证书生成、动态证书签发 |
| `adbkit` | Node.js ADB 客户端 |
| `ws` | WebSocket 实时推送 |
| SQLite（复用） | 规则和请求历史存储 |

### 文件结构预估
```
src/
├── server/
│   ├── mitm/
│   │   ├── proxyServer.ts      — MITM 代理核心
│   │   ├── certManager.ts      — CA 证书生成和管理
│   │   ├── ruleEngine.ts       — 拦截规则匹配引擎
│   │   ├── adbManager.ts       — ADB 设备管理
│   │   └── requestStore.ts     — 请求历史存储
│   ├── routes/
│   │   └── mitmProxy.ts        — REST API 路由
│   └── storage/
│       └── mitmStorage.ts      — SQLite 表定义
├── features/
│   └── mitmProxy/
│       └── components/
│           ├── MitmProxyPage.tsx    — 主页面
│           ├── DevicePanel.tsx      — 设备管理面板
│           ├── RequestList.tsx      — 请求列表
│           ├── RequestDetail.tsx    — 请求详情
│           └── RuleManager.tsx      — 规则管理
├── services/
│   └── MitmApiService.ts       — 前端 API 客户端
```

---

## 影响范围

| 文件 | 操作 |
|------|------|
| `server.ts` | 修改 — 注册 MITM 路由和 WebSocket |
| `src/App.tsx` | 修改 — 添加路由 |
| `src/components/layout/MainLayout.tsx` | 修改 — 添加侧边栏入口 |
| `package.json` | 修改 — 新增依赖 |
| `src/server/mitm/*` | 新建 — 代理核心模块 |
| `src/server/routes/mitmProxy.ts` | 新建 — API 路由 |
| `src/features/mitmProxy/*` | 新建 — 前端页面 |
| `src/services/MitmApiService.ts` | 新建 — 前端 API |

