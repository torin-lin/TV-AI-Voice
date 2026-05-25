# MITM 代理模块 - 代码生成计划

## 执行步骤

### Step 1: 安装依赖
- [ ] 添加 `node-forge`, `ws` 到 package.json

### Step 2: 证书管理模块
- [ ] 创建 `src/server/mitm/certManager.ts` — Root CA 生成 + 动态域名证书签发

### Step 3: ADB 设备管理模块
- [ ] 创建 `src/server/mitm/adbManager.ts` — 设备列表、连接、代理设置、证书安装

### Step 4: 规则引擎
- [ ] 创建 `src/server/mitm/ruleEngine.ts` — 规则匹配 + 响应修改

### Step 5: 请求存储
- [ ] 创建 `src/server/mitm/requestStore.ts` — SQLite 表初始化 + CRUD

### Step 6: MITM 代理核心
- [ ] 创建 `src/server/mitm/proxyServer.ts` — HTTPS MITM 代理服务器

### Step 7: 后端 API 路由
- [ ] 创建 `src/server/routes/mitmProxy.ts` — REST API + WebSocket

### Step 8: 前端 API 服务
- [ ] 创建 `src/services/MitmApiService.ts` — 前端 API 客户端

### Step 9: 前端页面
- [ ] 创建 `src/features/mitmProxy/components/MitmProxyPage.tsx` — 主页面
- [ ] 创建 `src/features/mitmProxy/components/DevicePanel.tsx` — 设备管理
- [ ] 创建 `src/features/mitmProxy/components/RequestList.tsx` — 请求列表
- [ ] 创建 `src/features/mitmProxy/components/RequestDetail.tsx` — 请求详情
- [ ] 创建 `src/features/mitmProxy/components/RuleManager.tsx` — 规则管理

### Step 10: 系统集成
- [ ] 修改 `server.ts` — 注册 MITM 路由和 WebSocket
- [ ] 修改 `src/App.tsx` — 添加路由
- [ ] 修改 `src/components/layout/MainLayout.tsx` — 添加侧边栏入口

### Step 11: 编译验证
- [ ] TypeScript 编译通过

