# Azure OpenAI 配置指南

## 问题排查

如果在设置页面测试连接时出现错误，请按照以下步骤检查配置。

## 常见错误排查

### ❌ 部署不存在 (The API deployment for this resource does not exist)
- **原因**: 部署名称不正确或部署还未创建
- **解决**:
  1. 登录 [Azure 门户](https://portal.azure.com)
  2. 找到你的 OpenAI 资源
  3. 在左侧菜单中点击"模型部署" (Model deployments)
  4. 查看已部署的模型列表，复制正确的部署名称
  5. 更新应用中的 API 端点

### 400 Bad Request
- **原因**: 请求格式不正确或缺少必要参数
- **解决**:
  - 确保 API 端点包含 `/deployments/` 路径
  - 确保 API 端点包含 `api-version` 参数
  - 检查 API Key 是否正确

### 401 Unauthorized
- **原因**: API Key 无效或已过期
- **解决**:
  - 重新获取 API Key
  - 确保 API Key 没有被复制错误

### 404 Not Found
- **原因**: 资源名称错误或资源不存在
- **解决**:
  - 检查资源名称是否正确
  - 确认资源在正确的区域

## 正确的 API 端点格式

Azure OpenAI 的 API 端点应该包含部署名称（deployment-id），格式如下：

```
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-02-15-preview
```

**示例**（假设你的部署名称是 `my-gpt-35`）：
```
https://fz-test-qa.openai.azure.com/openai/deployments/my-gpt-35/chat/completions?api-version=2024-02-15-preview
```

## 配置步骤

### 1. 获取 Azure OpenAI 资源信息

1. 登录 [Azure 门户](https://portal.azure.com)
2. 找到你的 OpenAI 资源
3. 在"密钥和终结点"中获取：
   - **资源名称**: 如 `fz-test-qa`（从 URL 中可以看到）
   - **API Key**: 复制"密钥 1"或"密钥 2"
   - **区域**: 如 `eastus`

### 2. 查找部署名称

1. 在 Azure 门户中打开你的 OpenAI 资源
2. 在左侧菜单中点击"模型部署" (Model deployments)
3. 查看已部署的模型列表
4. 复制你要使用的部署名称（如 `gpt-35-turbo`、`gpt-4` 等）

### 3. 在应用中配置

1. 打开应用的"设置"页面
2. 在"Azure OpenAI 配置"部分填入：
   - **API Key**: 你的 Azure OpenAI API Key
   - **API 端点**: 完整的部署端点 URL
     ```
     https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-02-15-preview
     ```

### 4. 测试连接

1. 点击"测试连接"按钮
2. 如果显示 ✅ 连接成功，说明配置正确
3. 如果显示 ❌ 错误，按照上面的"常见错误排查"部分解决

## API 版本

当前应用支持的 API 版本：
- `2024-02-15-preview` (推荐)
- `2023-12-01-preview`
- `2023-08-01-preview`

如需使用其他版本，修改 API 端点中的 `api-version` 参数即可。

## 功能说明

配置完成后，以下功能将使用 Azure OpenAI：

1. **问题分类** - 自动将客户问题分类到以下类别：
   - 录音
   - 蓝牙
   - ASR
   - NLU
   - 服务端
   - 网络
   - Android

2. **测试用例推荐** - 基于版本修改内容和风险等级推荐测试用例

## 安全说明

- API Key 仅保存在本地浏览器的 localStorage 中
- 不会上传到任何服务器
- 每次请求都直接从浏览器发送到 Azure OpenAI
- 建议定期更换 API Key

## 更多帮助

如需更多帮助，请参考：
- [Azure OpenAI 官方文档](https://learn.microsoft.com/zh-cn/azure/ai-services/openai/)
- [Chat Completions API 文档](https://learn.microsoft.com/zh-cn/azure/ai-services/openai/reference)
- [部署模型指南](https://learn.microsoft.com/zh-cn/azure/ai-services/openai/how-to/create-resource)
