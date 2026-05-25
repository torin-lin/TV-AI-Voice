$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$downloadDir = Join-Path $root "public\downloads"
$exePath = Join-Path $downloadDir "adb-agent-windows.exe"
$agentDir = Join-Path $root "tools\adb-agent-go"

New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null

$go = Get-Command go -ErrorAction SilentlyContinue
if (-not $go) {
  throw "未检测到 Go。请安装 Go 1.22+ 后重新执行 npm run adb-agent:build。下载地址: https://go.dev/dl/"
}

Write-Host "正在使用 Go 构建 Windows ADB Agent..."
Push-Location $agentDir
try {
  Write-Host "正在同步 Go 依赖..."
  go mod tidy
  if ($LASTEXITCODE -ne 0) {
    throw "go mod tidy 失败"
  }

  $env:GOOS = "windows"
  $env:GOARCH = "amd64"
  $env:CGO_ENABLED = "0"
  go build -trimpath -ldflags "-s -w -H windowsgui" -o "$exePath" .
  if ($LASTEXITCODE -ne 0) {
    throw "go build 失败"
  }
} finally {
  Pop-Location
}

Write-Host "已生成: $exePath"
