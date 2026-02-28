#!/bin/bash

# Bash 脚本：推送到 GitHub
# 使用方法: bash push-to-github.sh

echo "========================================"
echo "TV AI Voice - GitHub 推送脚本"
echo "========================================"
echo ""

# 检查 Git 是否安装
if ! command -v git &> /dev/null; then
    echo "[ERROR] Git 未安装"
    exit 1
fi

echo "[INFO] Git 已安装"

# 检查是否在 Git 仓库中
if [ ! -d .git ]; then
    echo "[ERROR] 不在 Git 仓库中"
    exit 1
fi

echo "[INFO] Git 仓库已初始化"
echo ""

# 显示当前状态
echo "当前 Git 状态:"
git status --short
echo ""

# 检查远程仓库
REMOTE_URL=$(git config --get remote.origin.url)
if [ -z "$REMOTE_URL" ]; then
    echo "[ERROR] 未配置远程仓库"
    exit 1
fi

echo "[INFO] 远程仓库: $REMOTE_URL"
echo ""

# 提示用户
echo "准备推送到 GitHub..."
echo ""
echo "需要 GitHub Personal Access Token (PAT)"
echo "获取方式: GitHub Settings → Developer settings → Personal access tokens"
echo ""

# 配置凭证存储
echo "[INFO] 配置 Git 凭证存储..."
git config --global credential.helper store

echo ""
echo "执行推送..."
echo ""

# 推送
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ 推送成功！"
    echo "========================================"
    echo ""
    echo "访问仓库: https://github.com/torin-lin/TV-AI-Voice"
    echo ""
else
    echo ""
    echo "========================================"
    echo "❌ 推送失败"
    echo "========================================"
    echo ""
    echo "常见原因:"
    echo "1. PAT 错误或过期"
    echo "2. 网络连接问题"
    echo "3. 仓库权限问题"
    echo ""
    echo "解决方案:"
    echo "1. 检查 PAT 是否正确"
    echo "2. 清除凭证: git config --global --unset credential.helper"
    echo "3. 重新推送: git push -u origin main"
    echo ""
fi
