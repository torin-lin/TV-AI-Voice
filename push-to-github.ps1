# PowerShell 脚本：推送到 GitHub
# 使用方法: .\push-to-github.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TV AI Voice - GitHub 推送脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 是否安装
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git 未安装" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Git 已安装" -ForegroundColor Green

# 检查是否在 Git 仓库中
if (-not (Test-Path .git)) {
    Write-Host "[ERROR] 不在 Git 仓库中" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Git 仓库已初始化" -ForegroundColor Green
Write-Host ""

# 显示当前状态
Write-Host "当前 Git 状态:" -ForegroundColor Yellow
git status --short
Write-Host ""

# 检查远程仓库
$remoteUrl = git config --get remote.origin.url
if ($remoteUrl) {
    Write-Host "[INFO] 远程仓库: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "[ERROR] 未配置远程仓库" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 提示用户
Write-Host "准备推送到 GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "需要 GitHub Personal Access Token (PAT)" -ForegroundColor Cyan
Write-Host "获取方式: GitHub Settings → Developer settings → Personal access tokens" -ForegroundColor Cyan
Write-Host ""

# 配置凭证存储
Write-Host "[INFO] 配置 Git 凭证存储..." -ForegroundColor Green
git config --global credential.helper wincred

Write-Host ""
Write-Host "执行推送..." -ForegroundColor Yellow
Write-Host ""

# 推送
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ 推送成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问仓库: https://github.com/torin-lin/TV-AI-Voice" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ 推送失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "常见原因:" -ForegroundColor Yellow
    Write-Host "1. PAT 错误或过期" -ForegroundColor Yellow
    Write-Host "2. 网络连接问题" -ForegroundColor Yellow
    Write-Host "3. 仓库权限问题" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "解决方案:" -ForegroundColor Yellow
    Write-Host "1. 检查 PAT 是否正确" -ForegroundColor Yellow
    Write-Host "2. 清除凭证: git config --global --unset credential.helper" -ForegroundColor Yellow
    Write-Host "3. 重新推送: git push -u origin main" -ForegroundColor Yellow
    Write-Host ""
}
