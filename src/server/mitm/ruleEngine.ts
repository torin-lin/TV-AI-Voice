/**
 * MITM 拦截规则引擎
 * - 规则匹配（URL/包名/方法）
 * - 响应修改（替换 body、修改 JSON 字段、改状态码、加延迟）
 */

export interface MitmRule {
  id: string;
  ownerId?: string | null;
  name: string;
  enabled: boolean;
  priority: number;
  deviceScope: string; // 'all' 或设备 ID
  isPublic: boolean;

  conditions: {
    urlContains?: string;
    urlRegex?: string;
    packageName?: string;
    method?: string;
  };

  action: {
    type: 'replaceBody' | 'modifyJson' | 'modifyStatus' | 'delay' | 'breakpoint';
    replaceBody?: string;
    jsonModifications?: Array<{ path: string; value: any }>;
    statusCode?: number;
    delayMs?: number;
    // breakpoint: 拦截阶段
    breakpointOn?: 'request' | 'response' | 'both';
  };

  description?: string;
  createdAt: number;
  updatedAt: number;
  hitCount: number;
}

export interface MatchContext {
  url: string;
  method: string;
  packageName?: string;
  deviceId?: string;
}

export interface MatchResult {
  matched: boolean;
  rule?: MitmRule;
}

/**
 * 匹配规则（返回第一条命中的规则）
 */
export function matchRule(rules: MitmRule[], ctx: MatchContext): MatchResult {
  // 按 priority 排序（数字越小优先级越高）
  const sorted = [...rules]
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    // 检查设备范围
    if (rule.deviceScope !== 'all' && ctx.deviceId && rule.deviceScope !== ctx.deviceId) {
      continue;
    }

    // 检查所有条件（AND 关系）
    if (!checkConditions(rule.conditions, ctx)) {
      continue;
    }

    return { matched: true, rule };
  }

  return { matched: false };
}

function checkConditions(conditions: MitmRule['conditions'], ctx: MatchContext): boolean {
  if (conditions.urlContains) {
    if (!ctx.url.toLowerCase().includes(conditions.urlContains.toLowerCase())) {
      return false;
    }
  }

  if (conditions.urlRegex) {
    try {
      if (!new RegExp(conditions.urlRegex, 'i').test(ctx.url)) {
        return false;
      }
    } catch {
      return false; // 无效正则，跳过
    }
  }

  if (conditions.packageName) {
    if (ctx.packageName !== conditions.packageName) {
      return false;
    }
  }

  if (conditions.method) {
    if (ctx.method.toUpperCase() !== conditions.method.toUpperCase()) {
      return false;
    }
  }

  return true;
}

/**
 * 应用规则动作修改响应 body
 */
export function applyAction(rule: MitmRule, responseBody: string, responseStatus: number): { body: string; status: number } {
  let body = responseBody;
  let status = responseStatus;

  switch (rule.action.type) {
    case 'replaceBody':
      if (rule.action.replaceBody !== undefined) {
        body = rule.action.replaceBody;
      }
      break;

    case 'modifyJson':
      if (rule.action.jsonModifications && rule.action.jsonModifications.length > 0) {
        try {
          const obj = JSON.parse(body);
          for (const mod of rule.action.jsonModifications) {
            setByPath(obj, mod.path, mod.value);
          }
          body = JSON.stringify(obj);
        } catch {
          // JSON 解析失败，不修改
        }
      }
      break;

    case 'modifyStatus':
      if (rule.action.statusCode) {
        status = rule.action.statusCode;
      }
      break;

    case 'delay':
      // 延迟在代理层处理，这里不做
      break;
  }

  return { body, status };
}

/**
 * 获取规则的延迟时间
 */
export function getDelay(rule: MitmRule): number {
  if (rule.action.type === 'delay' && rule.action.delayMs) {
    return rule.action.delayMs;
  }
  return 0;
}

/**
 * 通过 JSON path 设置值
 * 支持: "a.b.c", "a[0].b", "errorCode"
 */
function setByPath(obj: any, path: string, value: any): void {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || current[key] === null) {
      current[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[key];
  }

  const lastKey = parts[parts.length - 1];
  current[lastKey] = value;
}
