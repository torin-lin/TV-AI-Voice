/**
 * zmind API 代理路由
 * 解决前端直接调用 zmind API 的 CORS 问题
 */

const ZMIND_API_KEY = '4428437a4b5c8b4e32fa093ba67a67d46f66a0f2';
const ZMIND_BASE_URL = 'https://zmind.whaletv.com';

export function setupZmindProxyRoutes(app: any): void {
  /**
   * GET /api/zmind/issues/:id
   * 获取 zmind issue 详情
   */
  app.get('/api/zmind/issues/:id', async (req: any, res: any) => {
    try {
      const issueId = req.params.id;
      const url = `${ZMIND_BASE_URL}/issues/${issueId}.json`;

      const response = await fetch(url, {
        headers: {
          'X-Redmine-API-Key': ZMIND_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `zmind API 返回错误: ${response.status}`,
        });
      }

      const data = await response.json();
      res.json({ success: true, data });
    } catch (error) {
      console.error('zmind 代理请求失败:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/zmind/issues/:id/firmware
   * 获取 issue 的固件版本号（解析 Tested Environment）
   */
  app.get('/api/zmind/issues/:id/firmware', async (req: any, res: any) => {
    try {
      const issueId = req.params.id;
      const url = `${ZMIND_BASE_URL}/issues/${issueId}.json`;

      const response = await fetch(url, {
        headers: {
          'X-Redmine-API-Key': ZMIND_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `zmind API 返回错误: ${response.status}`,
        });
      }

      const data = await response.json();
      const issue = data?.issue;
      const description = issue?.description || '';

      // 解析固件版本：优先 Tested Environment，其次 Issue Version (fixed_version)
      let firmwareVersion = parseFirmwareVersion(description);
      if (!firmwareVersion && issue?.fixed_version?.name) {
        firmwareVersion = issue.fixed_version.name;
      }
      // 也检查 custom_fields 中的 Version 字段
      if (!firmwareVersion && issue?.custom_fields) {
        const versionField = issue.custom_fields.find((f: any) =>
          /version/i.test(f.name)
        );
        if (versionField?.value) firmwareVersion = versionField.value;
      }

      res.json({
        success: true,
        data: {
          issueId,
          subject: issue?.subject || '',
          firmwareVersion,
          description,
          issueCreatedAt: issue?.created_on || '',
        },
      });
    } catch (error) {
      console.error('获取固件版本失败:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message,
      });
    }
  });
}

/**
 * 从 issue 描述中解析固件版本号
 * 查找 "Tested Environment" 后面一行的内容
 */
function parseFirmwareVersion(description: string): string {
  if (!description) return '';

  const lines = description.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/tested\s*environment/i.test(line)) {
      // 取下一行非空内容
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine) {
          return nextLine;
        }
      }
    }
  }
  return '';
}
