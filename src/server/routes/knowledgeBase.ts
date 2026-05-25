/**
 * 知识库 REST API 路由
 * 测试用例管理 + 智能推荐
 */

import {
  getAllTestCases, searchTestCases,
  findTestCaseById,
  createTestCase, updateTestCase, removeTestCase,
  bulkCreateTestCases,
} from '../storage/testCaseStorage';
import { getAllRecords as getAllVersionIssues } from '../storage/versionIssueStorage';
import { getAllRecords as getAllVersionRecords } from '../storage/versionRecordStorage';
import { getAllRecords as getAllCustomerProblems } from '../storage/customerProblemStorage';
import { getAllRecords as getAllReleaseNotes } from '../storage/releaseNoteStorage';
import { getWorkspaceId, recordInWorkspace } from '../workspace';

export function setupKnowledgeBaseRoutes(app: any): void {

  /** GET /api/knowledge-base/test-cases - 获取所有测试用例 */
  app.get('/api/knowledge-base/test-cases', (req: any, res: any) => {
    try {
      const { keyword, category, projectType } = req.query;
      const workspaceId = getWorkspaceId(req);
      let cases;
      if (keyword) {
        cases = searchTestCases(keyword);
      } else {
        cases = getAllTestCases();
      }
      cases = cases.filter((c: any) => recordInWorkspace(c, workspaceId));
      if (category) cases = cases.filter((c: any) => c.category === category);
      if (projectType) cases = cases.filter((c: any) => c.projectType === projectType);
      res.json({ success: true, data: cases, total: cases.length });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/knowledge-base/categories - 获取所有分类 */
  app.get('/api/knowledge-base/categories', (req: any, res: any) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const categories = Array.from(new Set(
        getAllTestCases()
          .filter((c: any) => recordInWorkspace(c, workspaceId))
          .map((c: any) => c.category)
          .filter(Boolean)
      )).sort();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/knowledge-base/release-versions - 获取 Release Note 版本列表（按版本聚合） */
  app.get('/api/knowledge-base/release-versions', (req: any, res: any) => {
    try {
      const { projectType } = req.query;
      const workspaceId = getWorkspaceId(req);
      let notes = getAllReleaseNotes().filter((n: any) => recordInWorkspace(n, workspaceId));
      if (projectType) notes = notes.filter((n: any) => n.projectType === projectType);
      // 按版本号聚合，合并同版本的修改内容和模块
      const versionMap = new Map<string, any>();
      for (const n of notes) {
        const ver = n.version;
        if (!ver) continue;
        if (!versionMap.has(ver)) {
          versionMap.set(ver, {
            version: ver,
            projectType: n.projectType,
            changes: [],
            modules: new Set<string>(),
            severity: n.severity,
            regressionRisk: n.regressionRisk,
            latestDate: n.createdAt,
            noteIds: [],
          });
        }
        const entry = versionMap.get(ver)!;
        entry.changes.push(`[${n.changeType}] ${n.changeDescription}`);
        (n.affectedModules || []).forEach((m: string) => entry.modules.add(m));
        entry.noteIds.push(n.id);
        if (n.createdAt > entry.latestDate) {
          entry.latestDate = n.createdAt;
          entry.severity = n.severity;
          entry.regressionRisk = n.regressionRisk;
        }
      }
      const versions = Array.from(versionMap.values())
        .map((v) => ({ ...v, modules: Array.from(v.modules), changeDescription: v.changes.join('\n') }))
        .sort((a, b) => b.latestDate - a.latestDate);
      res.json({ success: true, data: versions });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/knowledge-base/stats - 知识库统计 */
  app.get('/api/knowledge-base/stats', (req: any, res: any) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const cases = getAllTestCases().filter((c: any) => recordInWorkspace(c, workspaceId));
      const categories = Array.from(new Set(cases.map((c: any) => c.category).filter(Boolean))).sort();
      const releaseNotes = getAllReleaseNotes().filter((n: any) => recordInWorkspace(n, workspaceId));
      const totalCases = cases.length;
      const versionRecordWorkspaceMap = new Map(
        getAllVersionRecords().map((record: any) => [record.id, record.workspaceId || 'AI Voice'])
      );
      const totalIssues = getAllVersionIssues().filter((issue: any) =>
        versionRecordWorkspaceMap.get(issue.versionRecordId) === workspaceId
      ).length;
      const totalProblems = getAllCustomerProblems().filter((p: any) => recordInWorkspace(p, workspaceId)).length;
      const totalReleaseNotes = releaseNotes.length;
      // 统计不同版本数
      const versionSet = new Set(releaseNotes.map((n: any) => n.version).filter(Boolean));
      res.json({ success: true, data: { totalCases, totalCategories: categories.length, categories, totalIssues, totalProblems, totalReleaseNotes, totalVersions: versionSet.size } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/knowledge-base/test-cases - 创建测试用例 */
  app.post('/api/knowledge-base/test-cases', (req: any, res: any) => {
    try {
      const { caseName, description, steps, expectedResult, category, module, priority, projectType, tags, caseId, precondition } = req.body;
      const workspaceId = getWorkspaceId(req);
      if (!caseName) return res.status(400).json({ success: false, message: '用例名称不能为空' });
      const id = createTestCase({
        caseId: caseId || '',
        caseName,
        description: description || '',
        precondition: precondition || '',
        steps: steps || [],
        expectedResult: expectedResult || '',
        category: category || '',
        module: module || '',
        priority: priority || 'L3',
        workspaceId,
        projectType,
        tags: tags || [],
      });
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/knowledge-base/test-cases/bulk - 批量导入测试用例 */
  app.post('/api/knowledge-base/test-cases/bulk', (req: any, res: any) => {
    try {
      const { cases } = req.body;
      const workspaceId = getWorkspaceId(req);
      if (!Array.isArray(cases) || cases.length === 0) {
        return res.status(400).json({ success: false, message: '用例列表不能为空' });
      }
      const count = bulkCreateTestCases(cases.map((c: any) => ({
        caseId: c.caseId || '',
        caseName: c.caseName || c.name || '',
        description: c.description || '',
        precondition: c.precondition || '',
        steps: c.steps || [],
        expectedResult: c.expectedResult || '',
        category: c.category || '',
        module: c.module || '',
        priority: c.priority || 'L3',
        workspaceId,
        projectType: c.projectType,
        tags: c.tags || [],
      })));
      res.status(201).json({ success: true, data: { imported: count } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** PUT /api/knowledge-base/test-cases/:id */
  app.put('/api/knowledge-base/test-cases/:id', (req: any, res: any) => {
    try {
      const current = findTestCaseById(req.params.id);
      if (!current || !recordInWorkspace(current, getWorkspaceId(req))) return res.status(404).json({ success: false, message: '未找到' });
      const data = { ...req.body };
      delete data.workspaceId;
      const ok = updateTestCase(req.params.id, data);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** DELETE /api/knowledge-base/test-cases/:id */
  app.delete('/api/knowledge-base/test-cases/:id', (req: any, res: any) => {
    try {
      const current = findTestCaseById(req.params.id);
      if (!current || !recordInWorkspace(current, getWorkspaceId(req))) return res.status(404).json({ success: false, message: '未找到' });
      const ok = removeTestCase(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: '未找到' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/knowledge-base/recommend - 智能推荐（基于规则 + 可选 AI） */
  app.post('/api/knowledge-base/recommend', async (req: any, res: any) => {
    try {
      const { versionRecordId, versionNumber, changeDescription, modules, riskLevel, projectType, useAI, apiKey, endpoint } = req.body;
      const workspaceId = getWorkspaceId(req);
      if (versionRecordId) {
        const versionRecord = getAllVersionRecords().find((record: any) => record.id === versionRecordId);
        if (!versionRecord || !recordInWorkspace(versionRecord, workspaceId)) {
          return res.status(404).json({ success: false, message: '版本记录不存在' });
        }
      }

      // 1. 获取知识库数据
      const allCases = getAllTestCases().filter((c: any) => recordInWorkspace(c, workspaceId));
      const allIssues = getAllVersionIssues();
      const allProblems = getAllCustomerProblems().filter((p: any) => recordInWorkspace(p, workspaceId));

      // 2. 获取该版本的问题列表
      const versionIssues = versionRecordId
        ? allIssues.filter((i: any) => i.versionRecordId === versionRecordId)
        : [];

      // 3. 获取未解决的问题（需要复测）
      const unresolvedProblems = allProblems.filter((p: any) =>
        p.status !== '已解决' && (projectType ? p.projectType === projectType : true)
      );

      // 4. 基于规则的智能匹配
      const changeWords = (changeDescription || '').toLowerCase().split(/[\s,，、;；。.]+/).filter(Boolean);
      const moduleList = modules || [];

      // 匹配测试用例
      const scoredCases = allCases
        .filter((c: any) => !projectType || !c.projectType || c.projectType === projectType)
        .map((c: any) => {
          let score = 0;
          let reasons: string[] = [];
          // 分类匹配
          for (const word of changeWords) {
            if (c.caseName.toLowerCase().includes(word) || c.description.toLowerCase().includes(word)) {
              score += 10; reasons.push(`关键词"${word}"匹配`);
            }
            if ((c.tags || []).some((t: string) => t.toLowerCase().includes(word))) {
              score += 8; reasons.push(`标签匹配`);
            }
          }
          // 模块匹配
          if (c.module && moduleList.some((m: string) => m.toLowerCase().includes(c.module.toLowerCase()) || c.module.toLowerCase().includes(m.toLowerCase()))) {
            score += 15; reasons.push('模块匹配');
          }
          // 分类匹配
          if (c.category && changeWords.some((w: string) => c.category.toLowerCase().includes(w))) {
            score += 12; reasons.push('分类匹配');
          }
          // 高优先级加分
          if (c.priority === 'L1') score += 8;
          else if (c.priority === 'L2') score += 5;
          else if (c.priority === '高') score += 5;
          // 高风险版本加分
          if (riskLevel === '高') score += 3;
          return { caseId: c.id, caseName: c.caseName, reason: reasons.join('、') || '通用测试', score, category: c.category, priority: c.priority };
        })
        .filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 20);

      // 匹配需要复测的问题
      const scoredRetests = unresolvedProblems.map((p: any) => {
        let score = 0;
        let reasons: string[] = [];
        const desc = (p.description || '').toLowerCase();
        for (const word of changeWords) {
          if (desc.includes(word)) { score += 10; reasons.push(`关键词"${word}"相关`); }
        }
        if (p.classification && changeWords.some((w: string) => p.classification.toLowerCase().includes(w))) {
          score += 12; reasons.push('分类相关');
        }
        if (p.firmwareVersion && versionNumber && p.firmwareVersion.includes(versionNumber)) {
          score += 20; reasons.push('同版本问题');
        }
        if (p.status === '进行中') { score += 5; reasons.push('处理中问题'); }
        return { issueId: p.id, title: p.description?.slice(0, 60) || '未知', reason: reasons.join('、') || '未解决问题', score, status: p.status, classification: p.classification };
      })
        .filter((r: any) => r.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 15);

      // 5. 生成测试计划摘要
      let testPlanSummary = `版本 ${versionNumber || '未知'} 测试计划：\n`;
      testPlanSummary += `• 匹配到 ${scoredCases.length} 个相关测试用例\n`;
      testPlanSummary += `• 发现 ${scoredRetests.length} 个需要复测的问题\n`;
      testPlanSummary += `• 该版本共有 ${versionIssues.length} 个已知问题\n`;
      if (riskLevel === '高') testPlanSummary += `• ⚠️ 高风险版本，建议全链路回归测试\n`;
      else if (riskLevel === '中') testPlanSummary += `• 中风险版本，建议冒烟 + 语音回归测试\n`;
      else testPlanSummary += `• 低风险版本，建议冒烟 + 定向测试\n`;

      let riskAnalysis = '';
      if (versionIssues.filter((i: any) => i.status === '待处理' || i.status === '处理中').length > 0) {
        riskAnalysis += `当前版本有 ${versionIssues.filter((i: any) => i.status !== '已解决' && i.status !== '已关闭').length} 个未解决问题。`;
      }
      if (unresolvedProblems.length > 5) {
        riskAnalysis += `系统中共有 ${unresolvedProblems.length} 个未解决问题，建议重点关注。`;
      }

      let usedAI = false;

      // 6. 如果启用 AI，让 AI 分析全部用例并给出重点测试建议
      const { modelName } = req.body;
      if (useAI && apiKey && endpoint) {
        try {
          // 获取该项目的所有用例供 AI 分析
          const projectCases = allCases.filter((c: any) => !projectType || !c.projectType || c.projectType === projectType);
          const aiPrompt = buildAIPrompt(versionNumber, changeDescription, moduleList, riskLevel, projectCases, scoredRetests, versionIssues, unresolvedProblems);
          const aiResponse = await callAzureOpenAI(endpoint, apiKey, aiPrompt, modelName);
          if (aiResponse) {
            testPlanSummary = aiResponse.testPlan || testPlanSummary;
            riskAnalysis = aiResponse.riskAnalysis || riskAnalysis;
            // AI 可能返回重新排序的用例推荐
            if (aiResponse.focusCases && Array.isArray(aiResponse.focusCases)) {
              for (const aiCase of aiResponse.focusCases.reverse()) {
                const match = projectCases.find((c: any) => c.caseId === aiCase.caseId || c.caseName === aiCase.caseName);
                if (match) {
                  // 移除已有的
                  const idx = scoredCases.findIndex((s: any) => s.caseId === match.id);
                  if (idx >= 0) scoredCases.splice(idx, 1);
                  scoredCases.unshift({
                    caseId: match.id, caseName: match.caseName,
                    reason: aiCase.reason || 'AI 推荐重点测试',
                    score: 100 + (aiCase.priority === 'L1' ? 20 : aiCase.priority === 'L2' ? 10 : 0),
                    category: match.category, priority: match.priority,
                  });
                }
              }
            }
            usedAI = true;
          }
        } catch (aiErr) {
          console.error('AI 增强推荐失败，使用规则推荐:', aiErr);
        }
      }

      res.json({
        success: true,
        data: {
          versionNumber,
          recommendedCases: scoredCases,
          retestIssues: scoredRetests,
          testPlanSummary,
          riskAnalysis: riskAnalysis || '暂无特殊风险提示',
          usedAI,
          createdAt: Date.now(),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** POST /api/knowledge-base/ai-assist - AI 测试助手（自由文本） */
  app.post('/api/knowledge-base/ai-assist', async (req: any, res: any) => {
    try {
      const { query, apiKey, endpoint, modelName, projectType } = req.body;
      const workspaceId = getWorkspaceId(req);
      if (!query) return res.status(400).json({ success: false, message: '请输入内容' });
      if (!apiKey || !endpoint) return res.status(400).json({ success: false, message: '请先在设置中配置 Azure OpenAI' });

      // 获取知识库用例供 AI 参考 — 精简版
      const allCases = getAllTestCases().filter((c: any) =>
        recordInWorkspace(c, workspaceId) && (!projectType || !c.projectType || c.projectType === projectType)
      );
      const cats: Record<string, number> = {};
      for (const c of allCases) { cats[c.category || '未分类'] = (cats[c.category || '未分类'] || 0) + 1; }
      const catSummary = Object.entries(cats).map(([k, v]) => `${k}(${v})`).join('、');

      // 根据用户查询关键词匹配相关用例，最多给20条
      const queryWords = query.toLowerCase().split(/[\s,，、;；。.]+/).filter(Boolean);
      const relevantCases = allCases
        .map((c: any) => {
          let score = 0;
          for (const w of queryWords) {
            if (c.caseName.toLowerCase().includes(w)) score += 10;
            if ((c.category || '').toLowerCase().includes(w)) score += 5;
            if ((c.description || '').toLowerCase().includes(w)) score += 3;
          }
          return { ...c, _score: score };
        })
        .filter((c: any) => c._score > 0)
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, 20);

      // 如果没有匹配到，取前15条L1/L2用例
      const sampleCases = relevantCases.length > 0
        ? relevantCases
        : allCases.filter((c: any) => c.priority === 'L1' || c.priority === 'L2').slice(0, 15);

      const caseRef = sampleCases.map((c: any) => `${c.caseId}[${c.priority}]${c.caseName}`).join('\n');

      const prompt = `你是资深QA测试专家，负责AI Voice智能语音助手测试。

知识库:${allCases.length}条用例，分类:${catSummary}
${relevantCases.length > 0 ? '相关用例' : '高优先级用例'}:
${caseRef}

用户问题:${query}

---
请结合知识库给出专业测试建议。可以：扩展测试点(正向/反向/边界/异常)、给测试方案、分析bug原因、推荐已有用例(引用caseId)、建议补充用例。
新增用例格式：【新增建议】用例名|前置条件|步骤|预期结果|优先级
用中文回答，分点列出。`;

      const body: any = {
        messages: [
          { role: 'system', content: '你是资深QA测试专家，擅长测试用例设计和测试策略。用中文回答。' },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 4000,
        temperature: 1,
      };
      if (modelName) body.model = modelName;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error('AI assist 错误:', response.status, errText);
        return res.status(response.status).json({ success: false, message: `AI 调用失败 (${response.status}): ${errText.slice(0, 200)}` });
      }

      const data = await response.json();
      console.log('AI assist 响应 finish_reason:', data?.choices?.[0]?.finish_reason);
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.error('AI assist 无内容:', JSON.stringify(data).slice(0, 300));
        return res.json({ success: true, data: { response: '⚠️ AI 返回了空内容，请重试', createdAt: Date.now() } });
      }

      res.json({ success: true, data: { response: content, createdAt: Date.now() } });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });
}

/** 构建 AI 提示词 — 精简版，控制总 token 在安全范围内 */
function buildAIPrompt(version: string, changes: string, modules: string[], risk: string, allCases: any[], retests: any[], issues: any[], unresolvedProblems: any[]): string {
  // 按分类分组，只保留名称和优先级
  const casesByCategory: Record<string, any[]> = {};
  for (const c of allCases) {
    const cat = c.category || '未分类';
    if (!casesByCategory[cat]) casesByCategory[cat] = [];
    casesByCategory[cat].push(c);
  }

  // 构建精简用例清单 — 每条只给 caseId + priority + name，严格限制总字符数
  let caseList = '';
  let totalChars = 0;
  const MAX_CASE_CHARS = 4000; // 限制用例部分最多 4000 字符
  for (const [cat, cases] of Object.entries(casesByCategory)) {
    const header = `\n【${cat}】(${cases.length}条)\n`;
    if (totalChars + header.length > MAX_CASE_CHARS) {
      caseList += `\n... 还有更多分类省略\n`;
      break;
    }
    caseList += header;
    totalChars += header.length;
    for (const c of cases) {
      const line = `  ${c.caseId}[${c.priority}]${c.caseName}\n`;
      if (totalChars + line.length > MAX_CASE_CHARS) {
        caseList += `  ... 省略剩余\n`;
        totalChars = MAX_CASE_CHARS;
        break;
      }
      caseList += line;
      totalChars += line.length;
    }
    if (totalChars >= MAX_CASE_CHARS) break;
  }

  const issueList = retests.slice(0, 5).map((r: any) => `  - ${r.title}`).join('\n');
  const problemList = unresolvedProblems.slice(0, 3).map((p: any) => `  - ${(p.description || '').slice(0, 40)}`).join('\n');

  return `你是资深QA测试专家，负责AI Voice智能语音助手测试。根据版本修改分析用例，制定测试计划。

## 版本信息
版本:${version} | 模块:${modules.join(',') || '未指定'} | 风险:${risk}
修改:${(changes || '').slice(0, 500)}

## 用例清单(共${allCases.length}条)
${caseList}

## 相关问题(${retests.length}条)
${issueList || '无'}

## 未解决问题(${unresolvedProblems.length}条)
${problemList || '无'}

## 版本已知问题:${issues.length}个

---
用JSON返回：
{
  "testPlan": "测试计划(含策略、阶段划分、重点、工作量评估)",
  "riskAnalysis": "风险分析(含风险点、影响模块、重点场景)",
  "focusCases": [{"caseId":"TC-XXX","caseName":"名","reason":"原因","priority":"L1"},...]
}
要求：focusCases返回所有需重点测试的用例，不限数量，按重要性排序。L1且相关模块的必须纳入。`;
}

/** 调用 Azure OpenAI */
async function callAzureOpenAI(endpoint: string, apiKey: string, prompt: string, modelName?: string): Promise<any> {
  const body: any = {
    messages: [
      { role: 'system', content: '你是资深 QA 测试专家，擅长测试计划制定和风险分析。请严格按照要求的 JSON 格式返回结果，不要包含 markdown 代码块标记。' },
      { role: 'user', content: prompt },
    ],
    max_completion_tokens: 4000,
    temperature: 1,
  };
  if (modelName) body.model = modelName;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error('Azure OpenAI 错误:', response.status, errText);
    return null;
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    // 尝试提取 JSON（可能被 markdown 包裹）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(content);
  } catch {
    return { testPlan: content, riskAnalysis: '', focusCases: [] };
  }
}
