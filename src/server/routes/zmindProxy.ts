/**
 * zmind API 代理路由
 * 解决前端直接调用 zmind API 的 CORS 问题
 */

import { getZmindApiKey, zmindFetch, safeZmindJson, ZMIND_BASE_URL, uploadToZmindServer } from '../utils/zmind';

let projectCache: { data: any[]; expiresAt: number; apiKey: string } | null = null;

async function readZmindJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function normalizeOptions(items: any[] | undefined): { id: number; name: string }[] {
  return (items || [])
    .filter((item) => item?.id && item?.name)
    .map((item) => ({ id: Number(item.id), name: String(item.name) }));
}

function normalizeMembershipUsers(items: any[] | undefined): { id: number; name: string }[] {
  const users = new Map<number, string>();
  for (const item of items || []) {
    const user = item?.user || item?.group;
    if (!user?.id || !user?.name) continue;
    users.set(Number(user.id), String(user.name));
  }
  return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
}

function normalizeCustomFields(items: any[] | undefined): any[] {
  return (items || [])
    .filter((field) => field?.id && field?.name)
    .map((field) => ({
      id: Number(field.id),
      name: String(field.name),
      fieldFormat: String(field.field_format || 'string'),
      required: Boolean(field.is_required),
      possibleValues: (field.possible_values || []).map((value: any, index: number) => {
        if (typeof value === 'string') return { id: index + 1, name: value };
        return { id: Number(value.id || index + 1), name: String(value.name || value.value || '') };
      }).filter((value: any) => value.name),
      trackerIds: (field.trackers || []).map((tracker: any) => Number(tracker.id)).filter(Boolean),
    }));
}

async function fetchAllProjects(apiKey: string): Promise<any[]> {
  if (projectCache && projectCache.expiresAt > Date.now() && projectCache.apiKey === apiKey) {
    return projectCache.data;
  }

  const limit = 100;
  let offset = 0;
  let projects: any[] = [];

  while (true) {
    const response = await zmindFetch(`/projects.json?limit=${limit}&offset=${offset}`, apiKey, {}, 120000);
    if (!response.ok) {
      const err = await readZmindJson(response);
      throw new Error(err?.errors?.join('；') || `zmind API 返回错误: ${response.status}`);
    }
    const data = await response.json();
    projects = projects.concat(data.projects || []);
    const total = Number(data.total_count || projects.length);
    offset += limit;
    if (projects.length >= total || !(data.projects || []).length) break;
  }

  projectCache = { data: projects, expiresAt: Date.now() + 5 * 60 * 1000, apiKey };
  return projects;
}

async function searchProjects(query: string, apiKey: string): Promise<any[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  if (projectCache && projectCache.expiresAt > Date.now() && projectCache.apiKey === apiKey) {
    return projectCache.data.filter((project) =>
      `${project.name || ''} ${project.identifier || ''}`.toLowerCase().includes(normalized)
    ).slice(0, 50);
  }

  try {
    const response = await zmindFetch(`/projects.json?limit=100&name=${encodeURIComponent(query.trim())}`, apiKey, {}, 30000);
    if (!response.ok) return [];
    const data = await response.json();
    const projects = data.projects || [];
    return projects.filter((project: any) =>
      `${project.name || ''} ${project.identifier || ''}`.toLowerCase().includes(normalized)
    ).slice(0, 50);
  } catch {
    return [];
  }
}

export function setupZmindProxyRoutes(app: any): void {
  /**
   * GET /api/zmind/projects
   * 获取当前 API Key 可访问的全部 zmind 项目
   */
  app.get('/api/zmind/projects', async (req: any, res: any) => {
    try {
      const apiKey = getZmindApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
      }
      const q = String(req.query.q || '').trim();
      const projects = q ? await searchProjects(q, apiKey) : await fetchAllProjects(apiKey);
      res.json({
        success: true,
        data: projects.map((project) => ({
          id: Number(project.id),
          name: String(project.name || ''),
          identifier: project.identifier || '',
          parent: project.parent ? {
            id: Number(project.parent.id),
            name: String(project.parent.name || ''),
          } : undefined,
        })),
      });
    } catch (error) {
      console.error('获取 zmind 项目失败:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * GET /api/zmind/projects/:id/config
   * 获取项目下创建 issue 需要的配置列表
   */
  app.get('/api/zmind/projects/:id/config', async (req: any, res: any) => {
    try {
      const apiKey = getZmindApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
      }
      const projectId = encodeURIComponent(req.params.id);
      const projectRes = await zmindFetch(`/projects/${projectId}.json?include=trackers,issue_custom_fields`, apiKey);

      if (!projectRes.ok) {
        return res.status(projectRes.status).json({
          success: false,
          message: `zmind 项目配置返回错误: ${projectRes.status}`,
        });
      }

      const projectData = await projectRes.json();
      const [currentUserData, statusesData, prioritiesData, membershipsData, categoriesData, versionsData, customFieldsData] = await Promise.all([
        safeZmindJson('/users/current.json', apiKey, {}, 25000),
        safeZmindJson('/issue_statuses.json', apiKey, { issue_statuses: [] }, 25000),
        safeZmindJson('/enumerations/issue_priorities.json', apiKey, { issue_priorities: [] }, 25000),
        safeZmindJson(`/projects/${projectId}/memberships.json?limit=100`, apiKey, { memberships: [] }, 25000),
        safeZmindJson(`/projects/${projectId}/issue_categories.json`, apiKey, { issue_categories: [] }, 25000),
        safeZmindJson(`/projects/${projectId}/versions.json`, apiKey, { versions: [] }, 25000),
        safeZmindJson('/custom_fields.json', apiKey, { custom_fields: [] }, 25000),
      ]);
      const project = projectData.project || {};
      const currentUser = currentUserData.user;

      // 合并自定义字段：项目级 issue_custom_fields + 全局 custom_fields 补充 possible_values
      const projectCustomFields = project.issue_custom_fields || [];
      const globalCustomFields = customFieldsData.custom_fields || customFieldsData.issue_custom_fields || [];
      const globalFieldMap = new Map<number, any>();
      for (const f of globalCustomFields) {
        if (f?.id) globalFieldMap.set(Number(f.id), f);
      }
      // 用项目级字段为基础，从全局补充 possible_values
      const mergedCustomFields = projectCustomFields.map((pf: any) => {
        const gf = globalFieldMap.get(Number(pf.id));
        return {
          ...pf,
          possible_values: pf.possible_values || gf?.possible_values || [],
          is_required: pf.is_required ?? gf?.is_required ?? false,
          field_format: pf.field_format || gf?.field_format || 'string',
          trackers: pf.trackers || gf?.trackers || [],
        };
      });

      res.json({
        success: true,
        data: {
          project: {
            id: Number(project.id),
            name: String(project.name || ''),
            identifier: project.identifier || '',
          },
          currentUser: currentUser ? {
            id: Number(currentUser.id),
            name: String([currentUser.firstname, currentUser.lastname].filter(Boolean).join(' ') || currentUser.login || currentUser.mail || ''),
          } : undefined,
          trackers: normalizeOptions(project.trackers),
          statuses: normalizeOptions(statusesData.issue_statuses),
          priorities: normalizeOptions(prioritiesData.issue_priorities),
          assignees: normalizeMembershipUsers(membershipsData.memberships),
          categories: normalizeOptions(categoriesData.issue_categories),
          versions: normalizeOptions(versionsData.versions),
          customFields: normalizeCustomFields(mergedCustomFields),
        },
      });
    } catch (error) {
      console.error('获取 zmind 配置失败:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * POST /api/zmind/issues
   * 创建 zmind issue
   */
  app.post('/api/zmind/issues', async (req: any, res: any) => {
    try {
      const apiKey = getZmindApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
      }
      const { projectId, trackerId, statusId, priorityId, assignedToId, categoryId, fixedVersionId, subject, description } = req.body;
      if (!projectId || !subject) {
        return res.status(400).json({ success: false, message: '缺少 projectId 或 subject' });
      }

      const issue: Record<string, any> = {
        project_id: Number(projectId),
        subject: String(subject),
        description: description || '',
      };
      if (trackerId) issue.tracker_id = Number(trackerId);
      if (statusId) issue.status_id = Number(statusId);
      if (priorityId) issue.priority_id = Number(priorityId);
      if (assignedToId) issue.assigned_to_id = Number(assignedToId);
      if (categoryId) issue.category_id = Number(categoryId);
      if (fixedVersionId) issue.fixed_version_id = Number(fixedVersionId);

      const response = await zmindFetch('/issues.json', apiKey, {
        method: 'POST',
        body: JSON.stringify({ issue }),
      });
      const data = await readZmindJson(response);

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: data?.errors?.join('；') || `zmind API 返回错误: ${response.status}`,
        });
      }

      const created = data.issue;
      res.status(201).json({
        success: true,
        data: {
          id: created?.id,
          subject: created?.subject || subject,
          url: `${ZMIND_BASE_URL}/issues/${created?.id}`,
        },
      });
    } catch (error) {
      console.error('创建 zmind issue 失败:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * POST /api/zmind/uploads
   * 代理 Redmine uploads API，上传文件并返回 token
   */
  app.post('/api/zmind/uploads', async (req: any, res: any) => {
    try {
      const apiKey = getZmindApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
      }
      const fileName = decodeURIComponent(req.headers['x-file-name'] || 'attachment');
      const chunks: Buffer[] = [];
      let total = 0;
      const MAX_SIZE = 500 * 1024 * 1024; // 500MB

      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_SIZE) { reject(new Error('文件大小超过 500MB 限制')); return; }
          chunks.push(chunk);
        });
        req.on('end', resolve);
        req.on('error', reject);
      });

      const buf = Buffer.concat(chunks);
      if (buf.length === 0) {
        return res.status(400).json({ success: false, message: '上传文件为空' });
      }

      const token = await uploadToZmindServer(apiKey, buf, fileName);
      res.json({ success: true, data: { token, fileName } });
    } catch (error) {
      console.error('zmind 附件上传失败:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /**
   * GET /api/zmind/issues/:id
   * 获取 zmind issue 详情
   */
  app.get('/api/zmind/issues/:id', async (req: any, res: any) => {
    try {
      const apiKey = getZmindApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
      }
      const issueId = req.params.id;

      const response = await zmindFetch(`/issues/${issueId}.json`, apiKey);

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
      const apiKey = getZmindApiKey(req);
      if (!apiKey) {
        return res.status(400).json({ success: false, message: '未配置 zmind API Key，请前往「个人中心」配置' });
      }
      const issueId = req.params.id;

      const response = await zmindFetch(`/issues/${issueId}.json`, apiKey);

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

