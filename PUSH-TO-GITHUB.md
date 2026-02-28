# 快速推送到 GitHub

## 📋 前置准备

### 1. 生成 GitHub Personal Access Token (PAT)

1. 登录 GitHub: https://github.com
2. 点击右上角头像 → **Settings**
3. 左侧菜单 → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token (classic)**
6. 配置：
   - **Note**: `TV AI Voice Project`
   - **Expiration**: 90 days
   - **Scopes**: 勾选 `repo`
7. 点击 **Generate token**
8. **复制 token**（只显示一次！）

---

## 🚀 推送步骤

### 方式 1: 使用 GitHub CLI（最简单）

```bash
# 1. 安装 GitHub CLI
# 从 https://cli.github.com/ 下载安装

# 2. 登录
gh auth login

# 3. 推送
git push -u origin main
```

### 方式 2: 使用 PAT（推荐）

```bash
# 1. 设置 Git 凭证存储
git config --global credential.helper wincred

# 2. 推送
git push -u origin main

# 3. 当提示输入时：
#    用户名: your-github-username
#    密码: 粘贴你的 PAT（不是 GitHub 密码）
```

### 方式 3: 直接使用 PAT URL

```bash
git remote set-url origin https://your-username:your-pat@github.com/torin-lin/TV-AI-Voice.git
git push -u origin main
```

**注意**: 不要在公开地方分享这个 URL（包含 PAT）

---

## ✅ 验证推送成功

推送完成后，访问：
```
https://github.com/torin-lin/TV-AI-Voice
```

应该能看到所有文件已上传。

---

## 🔄 后续更新

修改文件后，使用以下命令更新：

```bash
# 1. 查看修改
git status

# 2. 添加修改
git add .

# 3. 提交
git commit -m "描述你的修改"

# 4. 推送
git push
```

---

## 🆘 常见问题

### 推送失败：Authentication failed

**原因**: 密码或 PAT 错误

**解决**:
```bash
# 清除保存的凭证
git config --global --unset credential.helper

# 重新推送，输入正确的 PAT
git push -u origin main
```

### 推送失败：fatal: 'origin' does not appear to be a 'git' repository

**原因**: 远程仓库未配置

**解决**:
```bash
git remote add origin https://github.com/torin-lin/TV-AI-Voice.git
git push -u origin main
```

### 如何检查当前配置？

```bash
git remote -v
git config --global credential.helper
```

---

## 📝 完整推送命令

一次性执行所有步骤：

```bash
# 1. 初始化（已完成）
# git init

# 2. 添加文件（已完成）
# git add .

# 3. 提交（已完成）
# git commit -m "Initial commit"

# 4. 添加远程（已完成）
# git remote add origin https://github.com/torin-lin/TV-AI-Voice.git

# 5. 推送（需要执行）
git branch -M main
git push -u origin main
```

---

## 💡 推荐流程

1. **生成 PAT** - 在 GitHub 生成个人访问令牌
2. **配置凭证** - `git config --global credential.helper wincred`
3. **推送** - `git push -u origin main`
4. **验证** - 访问 GitHub 仓库检查

---

**最后更新**: 2026-02-28
