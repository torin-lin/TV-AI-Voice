# GitHub 推送指南

## 问题说明

GitHub 不再支持密码认证，需要使用个人访问令牌（Personal Access Token, PAT）。

## 解决方案

### 方案 1: 使用 GitHub CLI（推荐）

#### 1. 安装 GitHub CLI
- Windows: https://cli.github.com/
- 或使用 Chocolatey: `choco install gh`

#### 2. 登录 GitHub
```bash
gh auth login
```

按提示选择：
- What is your preferred protocol for Git operations? → HTTPS
- Authenticate Git with your GitHub credentials? → Y
- How would you like to authenticate GitHub CLI? → Paste an authentication token

#### 3. 推送项目
```bash
git push -u origin main
```

---

### 方案 2: 使用个人访问令牌（PAT）

#### 1. 生成 PAT

1. 登录 GitHub: https://github.com
2. 点击右上角头像 → Settings
3. 左侧菜单 → Developer settings
4. Personal access tokens → Tokens (classic)
5. Generate new token (classic)
6. 配置：
   - Note: `TV AI Voice Project`
   - Expiration: 90 days
   - Scopes: 勾选 `repo`（完整控制私有仓库）
7. 点击 Generate token
8. **复制 token**（只显示一次）

#### 2. 使用 PAT 推送

```bash
git push -u origin main
```

当提示输入密码时，粘贴 PAT（不是 GitHub 密码）。

#### 3. 保存凭证（可选）

**Windows:**
```bash
git config --global credential.helper wincred
```

**Linux/Mac:**
```bash
git config --global credential.helper store
```

这样下次就不需要输入 PAT 了。

---

### 方案 3: 使用 SSH 密钥

#### 1. 生成 SSH 密钥

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

按 Enter 接受默认位置，设置密码（可选）。

#### 2. 添加 SSH 密钥到 GitHub

1. 复制公钥内容：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. 登录 GitHub → Settings → SSH and GPG keys
3. New SSH key
4. 粘贴公钥内容
5. Add SSH key

#### 3. 修改 Git 远程 URL

```bash
git remote set-url origin git@github.com:torin-lin/TV-AI-Voice.git
```

#### 4. 推送项目

```bash
git push -u origin main
```

---

## 快速推送步骤

### 使用 GitHub CLI（最简单）

```bash
# 1. 安装 GitHub CLI
# 从 https://cli.github.com/ 下载安装

# 2. 登录
gh auth login

# 3. 推送
git push -u origin main
```

### 使用 PAT

```bash
# 1. 生成 PAT（见上面步骤）

# 2. 推送
git push -u origin main
# 输入用户名: your-github-username
# 输入密码: 粘贴 PAT

# 3. 保存凭证（可选）
git config --global credential.helper wincred  # Windows
git config --global credential.helper store    # Linux/Mac
```

### 使用 SSH

```bash
# 1. 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your-email@example.com"

# 2. 添加到 GitHub（见上面步骤）

# 3. 修改 URL
git remote set-url origin git@github.com:torin-lin/TV-AI-Voice.git

# 4. 推送
git push -u origin main
```

---

## 验证推送成功

推送完成后，访问：
```
https://github.com/torin-lin/TV-AI-Voice
```

应该能看到所有文件已上传。

---

## 常见问题

### Q: 如何重新生成 PAT？
A: 
1. GitHub Settings → Developer settings → Personal access tokens
2. 点击旧 token 的 Delete
3. 生成新 token

### Q: PAT 过期了怎么办？
A:
1. 生成新 PAT
2. 更新本地凭证：`git config --global credential.reject`
3. 重新推送

### Q: 如何检查当前使用的认证方式？
A:
```bash
git remote -v
# 显示 https:// 表示使用 HTTPS/PAT
# 显示 git@github.com 表示使用 SSH
```

### Q: 推送后如何更新？
A:
```bash
# 修改文件后
git add .
git commit -m "描述修改内容"
git push
```

---

## 推荐方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| GitHub CLI | 最简单，官方工具 | 需要安装 | ⭐⭐⭐⭐⭐ |
| PAT | 无需额外工具 | 需要管理 token | ⭐⭐⭐⭐ |
| SSH | 安全，无需 token | 配置复杂 | ⭐⭐⭐ |

---

## 获取帮助

- GitHub 文档: https://docs.github.com/
- GitHub CLI 文档: https://cli.github.com/manual
- SSH 密钥指南: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

**最后更新**: 2026-02-28
