# MITM 代理模块 - 功能设计

## 核心架构
- MITM Proxy Server (Node.js, 端口 8888)
- 动态证书签发 (node-forge, Root CA + 域名证书 LRU 缓存)
- ADB 设备管理 (adb 命令行封装)
- 规则引擎 (URL/包名匹配 → 修改响应)
- WebSocket 实时推送
- SQLite 存储 (规则 + 请求历史)
- React 前端页面

## 详细设计见上一轮确认内容，此处为索引文件。
