# GitHub 快速参考卡

## 🚀 一键推送

### Windows
```bash
.\push-to-github.ps1
```

### Linux/Mac
```bash
bash push-to-github.sh
```

---

## 📋 手动推送（3 步）

### 1️⃣ 生成 PAT
- GitHub Settings → Developer settings → Personal access tokens
- Generate new token (classic)
- 勾选 `repo`，复制 token

### 2️⃣ 配置凭证
```bash
git config --global credential.helper wincred
```

### 3️⃣ 推送
```bash
git push -u origin main
```

---

## ✅ 验证

访问: https://github.com/torin-lin/TV-AI-Voice

---

## 📚 文档

| 文档 | 用途 |
|------|------|
| [READY-TO-PUSH.md](./READY-TO-PUSH.md) | 推送说明 |
| [PUSH-TO-GITHUB.md](./PUSH-TO-GITHUB.md) | 快速指南 |
| [GITHUB-PUSH-GUIDE.md](./GITHUB-PUSH-GUIDE.md) | 详细指南 |

---

**最后更新**: 2026-02-28
