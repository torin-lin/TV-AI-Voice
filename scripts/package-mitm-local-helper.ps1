$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$outRoot = Join-Path $root "dist"
$workDir = Join-Path $outRoot "mitm-local-helper"
$zipPath = Join-Path $outRoot "mitm-local-helper.zip"

if (Test-Path $workDir) {
  Remove-Item -LiteralPath $workDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $workDir "src\server") | Out-Null

Copy-Item -LiteralPath (Join-Path $root "src\server\localMitmHelper.ts") -Destination (Join-Path $workDir "src\server\localMitmHelper.ts")
Copy-Item -LiteralPath (Join-Path $root "src\server\mitm") -Destination (Join-Path $workDir "src\server\mitm") -Recurse
Copy-Item -LiteralPath (Join-Path $root "src\server\routes") -Destination (Join-Path $workDir "src\server\routes") -Recurse
Copy-Item -LiteralPath (Join-Path $root "src\server\storage") -Destination (Join-Path $workDir "src\server\storage") -Recurse

Get-ChildItem -LiteralPath (Join-Path $workDir "src\server\routes") -File | Where-Object { $_.Name -ne "mitmProxy.ts" } | Remove-Item -Force
Get-ChildItem -LiteralPath (Join-Path $workDir "src\server\storage") -File | Where-Object { $_.Name -ne "sqlite.ts" } | Remove-Item -Force

@'
{
  "name": "mitm-local-helper",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node --import tsx src/server/localMitmHelper.ts"
  },
  "dependencies": {
    "better-sqlite3": "^12.6.2",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "node-forge": "^1.4.0",
    "tsx": "^4.21.0",
    "uuid": "^9.0.1",
    "ws": "^8.20.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.5"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
'@ | Set-Content -LiteralPath (Join-Path $workDir "package.json") -Encoding UTF8

@'
@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js。
  echo 请先安装 Node.js LTS: https://nodejs.org/
  pause
  exit /b 1
)

where adb >nul 2>nul
if errorlevel 1 (
  echo 警告：未检测到 adb。助手可以启动，但网页可能看不到设备。
  echo 请安装 Android Platform Tools，并把 adb 加入 PATH。
  echo.
)

if not exist node_modules (
  echo 首次启动，正在安装本机助手依赖...
  npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络或 npm 环境。
    pause
    exit /b 1
  )
)

echo 本机助手启动中，请不要关闭此窗口。
echo 网页里的本机助手地址使用：http://127.0.0.1:3131
npm run start
pause
'@ | Set-Content -LiteralPath (Join-Path $workDir "启动本机ADB助手.cmd") -Encoding ASCII

@'
# 抓包代理本机 ADB 助手

用途：远程/内网穿透访问服务器网页时，让网页读取当前电脑连接的 ADB 设备。

使用步骤：

1. 解压这个 zip。
2. 双击 `启动本机ADB助手.cmd`。
3. 保持黑色窗口不要关闭。
4. 打开服务器网页 -> 抓包代理。
5. 右上角选择 `本机 ADB`。
6. 本机助手地址保持 `http://127.0.0.1:3131`。

电脑要求：

- 已安装 Node.js LTS。
- 已安装 Android Platform Tools，并且命令行能执行 `adb devices`。
- TV 已通过 USB 或 WiFi ADB 连接到这台电脑。

说明：

- 助手只监听 `127.0.0.1`，不会把本机 ADB 控制接口暴露到局域网。
- 首次启动会自动执行 `npm install`，需要网络。
- 代理、证书安装、设备刷新都作用于当前这台电脑。
'@ | Set-Content -LiteralPath (Join-Path $workDir "README.md") -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $workDir "*") -DestinationPath $zipPath -Force

Write-Host "已生成本机助手分发包: $zipPath"
