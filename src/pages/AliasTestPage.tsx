import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/common/Button';
import * as XLSX from 'xlsx';

interface AskResult {
  plannerResponse: any;
  appPkgResponse: any;
  requestInfo: { question: string; productId: string };
}

interface HistoryItem {
  question: string;
  result: AskResult | null;
  error: string | null;
  timestamp: number;
}

interface ImportFeedback {
  type: 'success' | 'error';
  text: string;
}

interface BatchQuestionItem {
  question: string;
  sourceRow: number;
}

interface BatchResultItem {
  question: string;
  sourceRow: number;
  success: boolean;
  env: 'acc' | 'prod';
  langCode: string;
  platform: string;
  expectedSkill: string;
  skill: string;
  action: string;
  standardName: string;
  matchedApps: string;
  error: string;
  rawResult: AskResult | null;
}

interface ValidationResult {
  success: boolean;
  error: string;
  expectedSkill: string;
  actualSkill: string;
  reason: string;
}

function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

const LS_KEY_ENV = 'alias_test_env';
const LS_KEY_LANG = 'alias_test_lang';
const LS_KEY_PLATFORM = 'alias_test_platform';

const PLATFORM_OPTIONS = [
  { value: '', label: '不传 (默认)' },
  { value: 'TV_WhaleOS3_1', label: 'TV_WhaleOS3_1' },
  { value: 'TV_WhaleOS10_1', label: 'TV_WhaleOS10_1' },
  { value: 'PJT_WhaleOS3_1', label: 'PJT_WhaleOS3_1' },
  { value: 'PJT_WhaleOS3_2', label: 'PJT_WhaleOS3_2' },
  { value: 'STB_WhaleOS10_1', label: 'STB_WhaleOS10_1' },
];

const ALLOWED_CATEGORY_ACTIONS: Record<string, string[]> = {
  speaker: ['volumeUp', 'volumeDown', 'mute', 'unmute', 'adjustVolume'],
  power: ['powerOff', 'restart'],
  screen: ['brighten', 'dim', 'adjustBrightness'],
  launcher: ['launch'],
  video: ['play'],
  playback: ['play', 'pause', 'resume', 'forward', 'rewind', 'next', 'previous'],
  settings: ['reset'],
  mode: ['switch'],
};

/** Android 支持的语种列表 */
const ANDROID_LANGUAGES: { code: string; label: string }[] = [
  { code: 'af', label: 'af - Afrikaans' },
  { code: 'am', label: 'am - አማርኛ (Amharic)' },
  { code: 'ar', label: 'ar - العربية (Arabic)' },
  { code: 'az', label: 'az - Azərbaycan (Azerbaijani)' },
  { code: 'be', label: 'be - Беларуская (Belarusian)' },
  { code: 'bg', label: 'bg - Български (Bulgarian)' },
  { code: 'bn', label: 'bn - বাংলা (Bengali)' },
  { code: 'bs', label: 'bs - Bosanski (Bosnian)' },
  { code: 'ca', label: 'ca - Català (Catalan)' },
  { code: 'cs', label: 'cs - Čeština (Czech)' },
  { code: 'da', label: 'da - Dansk (Danish)' },
  { code: 'de', label: 'de - Deutsch (German)' },
  { code: 'el', label: 'el - Ελληνικά (Greek)' },
  { code: 'en', label: 'en - English' },
  { code: 'es', label: 'es - Español (Spanish)' },
  { code: 'et', label: 'et - Eesti (Estonian)' },
  { code: 'eu', label: 'eu - Euskara (Basque)' },
  { code: 'fa', label: 'fa - فارسی (Persian)' },
  { code: 'fi', label: 'fi - Suomi (Finnish)' },
  { code: 'fil', label: 'fil - Filipino' },
  { code: 'fr', label: 'fr - Français (French)' },
  { code: 'gl', label: 'gl - Galego (Galician)' },
  { code: 'gu', label: 'gu - ગુજરાતી (Gujarati)' },
  { code: 'hi', label: 'hi - हिन्दी (Hindi)' },
  { code: 'hr', label: 'hr - Hrvatski (Croatian)' },
  { code: 'hu', label: 'hu - Magyar (Hungarian)' },
  { code: 'hy', label: 'hy - Հայերեն (Armenian)' },
  { code: 'id', label: 'id - Indonesia (Indonesian)' },
  { code: 'is', label: 'is - Íslenska (Icelandic)' },
  { code: 'it', label: 'it - Italiano (Italian)' },
  { code: 'iw', label: 'iw - עברית (Hebrew)' },
  { code: 'ja', label: 'ja - 日本語 (Japanese)' },
  { code: 'ka', label: 'ka - ქართული (Georgian)' },
  { code: 'kk', label: 'kk - Қазақ (Kazakh)' },
  { code: 'km', label: 'km - ខ្មែរ (Khmer)' },
  { code: 'kn', label: 'kn - ಕನ್ನಡ (Kannada)' },
  { code: 'ko', label: 'ko - 한국어 (Korean)' },
  { code: 'ky', label: 'ky - Кыргызча (Kyrgyz)' },
  { code: 'lo', label: 'lo - ລາວ (Lao)' },
  { code: 'lt', label: 'lt - Lietuvių (Lithuanian)' },
  { code: 'lv', label: 'lv - Latviešu (Latvian)' },
  { code: 'mk', label: 'mk - Македонски (Macedonian)' },
  { code: 'ml', label: 'ml - മലയാളം (Malayalam)' },
  { code: 'mn', label: 'mn - Монгол (Mongolian)' },
  { code: 'mr', label: 'mr - मराठी (Marathi)' },
  { code: 'ms', label: 'ms - Bahasa Melayu (Malay)' },
  { code: 'my', label: 'my - မြန်မာ (Burmese)' },
  { code: 'nb', label: 'nb - Norsk bokmål (Norwegian)' },
  { code: 'ne', label: 'ne - नेपाली (Nepali)' },
  { code: 'nl', label: 'nl - Nederlands (Dutch)' },
  { code: 'or', label: 'or - ଓଡ଼ିଆ (Odia)' },
  { code: 'pa', label: 'pa - ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'pl', label: 'pl - Polski (Polish)' },
  { code: 'pt', label: 'pt - Português (Portuguese)' },
  { code: 'ro', label: 'ro - Română (Romanian)' },
  { code: 'ru', label: 'ru - Русский (Russian)' },
  { code: 'si', label: 'si - සිංහල (Sinhala)' },
  { code: 'sk', label: 'sk - Slovenčina (Slovak)' },
  { code: 'sl', label: 'sl - Slovenščina (Slovenian)' },
  { code: 'sq', label: 'sq - Shqip (Albanian)' },
  { code: 'sr', label: 'sr - Српски (Serbian)' },
  { code: 'sv', label: 'sv - Svenska (Swedish)' },
  { code: 'sw', label: 'sw - Kiswahili (Swahili)' },
  { code: 'ta', label: 'ta - தமிழ் (Tamil)' },
  { code: 'te', label: 'te - తెలుగు (Telugu)' },
  { code: 'th', label: 'th - ไทย (Thai)' },
  { code: 'tr', label: 'tr - Türkçe (Turkish)' },
  { code: 'uk', label: 'uk - Українська (Ukrainian)' },
  { code: 'ur', label: 'ur - اردو (Urdu)' },
  { code: 'uz', label: 'uz - Oʻzbek (Uzbek)' },
  { code: 'vi', label: 'vi - Tiếng Việt (Vietnamese)' },
  { code: 'zh', label: 'zh - 中文 (Chinese)' },
  { code: 'zu', label: 'zu - isiZulu (Zulu)' },
];

function getPlannerSkill(result: AskResult | null): string {
  const rawSkill = result?.plannerResponse?.data?.skill || result?.plannerResponse?.data?.intent || result?.plannerResponse?.skill || result?.plannerResponse?.intent;
  if (typeof rawSkill === 'object') {
    return String(rawSkill?.name || '').trim();
  }
  return rawSkill ? String(rawSkill).trim() : '';
}

function getPlannerArguments(result: AskResult | null): Record<string, any> {
  const rawArgs = result?.plannerResponse?.data?.arguments || result?.plannerResponse?.arguments || {};
  return rawArgs && typeof rawArgs === 'object' ? rawArgs : {};
}

function getPlannerSkillMeta(result: AskResult | null): Record<string, any> {
  const rawSkill = result?.plannerResponse?.data?.skill || result?.plannerResponse?.skill || {};
  return rawSkill && typeof rawSkill === 'object' ? rawSkill : {};
}

function normalizeAppName(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function getNonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function getPlannerAction(result: AskResult | null): string {
  const rawAction = result?.plannerResponse?.data?.arguments?.action || result?.plannerResponse?.arguments?.action;
  if (typeof rawAction === 'object') {
    return JSON.stringify(rawAction).trim();
  }
  return rawAction ? String(rawAction).trim() : '';
}

function getPlannerCategory(result: AskResult | null): string {
  const rawCategory = result?.plannerResponse?.data?.arguments?.category || result?.plannerResponse?.arguments?.category;
  if (typeof rawCategory === 'object') {
    return String(rawCategory?.name || '').trim();
  }
  return rawCategory ? String(rawCategory).trim() : '';
}

function normalizeQuestion(value: unknown): string {
  return String(value ?? '')
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferExpectedSkill(question: string): { skill: string; reason: string } {
  const q = normalizeQuestion(question).toLowerCase();
  const hasYoutube = /\byoutube\b/.test(q);
  const hasSearchVerb = /\b(search|find|look up|play)\b/.test(q);
  const usesYoutubeAsTarget = /\b(with|from|on|in)\s+youtube\b/.test(q);
  const hasMovieCue = /\b(movie|film|cinema|episode|title)\b/.test(q);

  if (hasYoutube && hasSearchVerb && usesYoutubeAsTarget) {
    return {
      skill: 'InApp Search Skill',
      reason: '命令显式指定在 YouTube 内搜索/播放内容，按应用内搜索处理更稳定',
    };
  }

  if (hasYoutube && hasMovieCue) {
    return {
      skill: 'Movie Search Skill',
      reason: '命令包含影片类关键词，且目标应用是 YouTube，按影片搜索处理',
    };
  }

  return {
    skill: '',
    reason: '',
  };
}

function validateAliasResult(result: AskResult | null, question = ''): ValidationResult {
  const plannerData = result?.plannerResponse?.data || result?.plannerResponse || {};
  const plannerArgs = getPlannerArguments(result);
  const plannerSkillMeta = getPlannerSkillMeta(result);
  const appPkgData = result?.appPkgResponse?.data || result?.appPkgResponse || {};
  const appList: any[] = Array.isArray(appPkgData.appList) ? appPkgData.appList : [];
  const category = getPlannerCategory(result).trim();
  const skill = getPlannerSkill(result).trim();
  const action = getPlannerAction(result).trim();
  const appName = normalizeAppName(plannerArgs.app);
  const titles = getNonEmptyStringArray(plannerArgs.titles);
  const keyword = String(plannerArgs.keyword || '').trim();
  const endpoint = String(plannerSkillMeta.endpoint || '').trim().toLowerCase();
  const standardName = String(appPkgData.standardName || '').trim();
  const objectType = Number(appPkgData.objectType || 0);
  const matchedApps = appList.map((app) => app.appName || app.pkgName || '').filter(Boolean).join('、');
  const hasSkill = !!skill;
  const expected = inferExpectedSkill(question || result?.requestInfo?.question || '');
  const hasCategory = !!category;
  const hasAction = !!action;
  const hasStandardName = !!standardName;
  const hasMatchedApps = !!matchedApps;
  const allowedActions = hasCategory ? ALLOWED_CATEGORY_ACTIONS[category] || [] : [];
  const hasValidCategory = hasCategory && allowedActions.length > 0;
  const hasValidCategoryAction = hasValidCategory && hasAction && allowedActions.includes(action);
  const requiresAliasMatch = category === 'launcher' && action === 'launch';
  const hasValidAliasObjectType = objectType === 1 || objectType === 2 || objectType === 3;
  const isMovieSearchSkill = skill === 'Movie Search Skill' || endpoint.includes('com.zeasn.search');
  const isInAppSearchSkill = skill === 'InApp Search Skill' || endpoint.includes('com.zeasn.inappsearch');
  const isYouTubeMovieSearch = isMovieSearchSkill && appName === 'youtube';
  const isYouTubeInAppSearch = isInAppSearchSkill && appName === 'youtube';

  let error = '';
  if (!hasSkill) {
    error = 'Skill 为空';
  } else if (expected.skill && skill !== expected.skill) {
    error = `Skill 不符合预期，期望 ${expected.skill}，实际 ${skill}`;
  } else if (isYouTubeMovieSearch && titles.length === 0) {
    error = 'YouTube 影片搜索缺少 titles';
  } else if (isYouTubeInAppSearch && !keyword) {
    error = 'YouTube 应用内搜索缺少 keyword';
  } else if (isYouTubeMovieSearch || isYouTubeInAppSearch) {
    error = '';
  } else if (!hasCategory) {
    error = 'Category 为空';
  } else if (!hasAction) {
    error = 'Action 为空';
  } else if (!hasValidCategory) {
    error = `Category 不支持: ${category}`;
  } else if (!hasValidCategoryAction) {
    error = `Category/Action 不匹配: ${category}/${action}`;
  } else if (category === 'speaker' && action === 'adjustVolume' && plannerData?.arguments?.params?.volume === undefined) {
    error = '缺少目标音量值';
  } else if (category === 'screen' && action === 'adjustBrightness' && plannerData?.arguments?.params?.brightness === undefined) {
    error = '缺少目标亮度值';
  } else if (category === 'launcher' && !plannerData?.arguments?.params?.name) {
    error = '缺少应用名称';
  } else if (category === 'video' && plannerData?.arguments?.params?.number === undefined) {
    error = '缺少视频序号';
  } else if (category === 'mode' && action === 'switch' && (!plannerData?.arguments?.params?.type || !plannerData?.arguments?.params?.name)) {
    error = '缺少模式类型或模式名称';
  } else if (requiresAliasMatch && !result?.appPkgResponse) {
    error = '未返回别名匹配结果';
  } else if (requiresAliasMatch && !hasValidAliasObjectType) {
    error = '未返回合法的对象类型';
  } else if (requiresAliasMatch && !hasStandardName && !hasMatchedApps) {
    error = '未返回标准名称或匹配结果';
  }

  return {
    success: !error,
    error,
    expectedSkill: expected.skill,
    actualSkill: skill,
    reason: expected.reason,
  };
}

function findQuestionValue(row: Record<string, any>): string {
  const keys = Object.keys(row);
  const targetKey = keys.find((key) => {
    const normalized = key.trim().toLowerCase();
    return ['question', '问题', '语句', '指令', 'query', 'utterance'].includes(normalized);
  });
  if (targetKey) return normalizeQuestion(row[targetKey]);

  const firstValue = Object.values(row).find((value) => String(value ?? '').trim());
  return normalizeQuestion(firstValue);
}

function mapBatchResult(
  item: BatchQuestionItem,
  result: AskResult | null,
  env: 'acc' | 'prod',
  langCode: string,
  platform: string,
  error = '',
): BatchResultItem {
  const appPkgData = result?.appPkgResponse?.data || result?.appPkgResponse || {};
  const appList: any[] = Array.isArray(appPkgData.appList) ? appPkgData.appList : [];
  const skill = getPlannerSkill(result).trim();
  const action = getPlannerAction(result).trim();
  const standardName = String(appPkgData.standardName || '').trim();
  const matchedApps = appList.map((app) => app.appName || app.pkgName || '').filter(Boolean).join('、');
  const expected = inferExpectedSkill(item.question);
  const validation = error
    ? { success: false, error, expectedSkill: expected.skill, actualSkill: skill, reason: expected.reason }
    : validateAliasResult(result, item.question);

  return {
    question: item.question,
    sourceRow: item.sourceRow,
    success: !!result && validation.success,
    env,
    langCode,
    platform: platform || '不传 (默认)',
    expectedSkill: validation.expectedSkill,
    skill,
    action,
    standardName,
    matchedApps,
    error: validation.error,
    rawResult: result,
  };
}

function exportBatchResults(results: BatchResultItem[]): void {
  const worksheet = XLSX.utils.json_to_sheet(results.map((item) => ({
    行号: item.sourceRow,
    Question: item.question,
    执行结果: item.success ? '成功' : '失败',
    环境: item.env,
    语言: item.langCode,
    Platform: item.platform,
    期望Skill: item.expectedSkill || '-',
    Skill: item.skill,
    Action: item.action,
    标准名称: item.standardName || '-',
    匹配应用: item.matchedApps || '-',
    错误信息: item.error || '-',
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '批量测试结果');
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 40 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 32 },
    { wch: 40 },
  ];
  XLSX.writeFile(workbook, `alias-batch-results-${Date.now()}.xlsx`);
}

const AliasTestPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [productId] = useState('wm100');
  const [env, setEnv] = useState<'acc' | 'prod'>(() => (localStorage.getItem(LS_KEY_ENV) as 'acc' | 'prod') || 'acc');
  const [langCode, setLangCode] = useState(() => localStorage.getItem(LS_KEY_LANG) || 'en');
  const [platform, setPlatform] = useState(() => localStorage.getItem(LS_KEY_PLATFORM) || '');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userToken, setUserToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState<{ hasUserToken: boolean; tokenPreview: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);
  const [batchQuestions, setBatchQuestions] = useState<BatchQuestionItem[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });

  // 启动时检查服务端是否已有缓存的 token
  useEffect(() => {
    fetch(`${getBaseUrl()}/api/alias-test/status`)
      .then(r => r.json())
      .then(d => { if (d.success) setTokenStatus(d.data); })
      .catch(() => {});
  }, []);

  const handleSaveToken = async () => {
    if (!userToken.trim()) return;
    // 发一个空 question 不行，直接调 status 后标记
    // 实际上 token 会在第一次 ask 时自动保存，这里先本地标记
    setTokenStatus({ hasUserToken: true, tokenPreview: userToken.trim().slice(0, 16) + '...' });
  };

  const handleClearToken = async () => {
    try {
      await fetch(`${getBaseUrl()}/api/alias-test/clear-token`, { method: 'POST' });
      setTokenStatus({ hasUserToken: false, tokenPreview: '' });
      setUserToken('');
    } catch { /* ignore */ }
  };

  const handleAsk = async () => {
    const q = normalizeQuestion(question);
    if (!q) return;
    localStorage.setItem(LS_KEY_ENV, env);
    localStorage.setItem(LS_KEY_LANG, langCode);
    localStorage.setItem(LS_KEY_PLATFORM, platform);
    setLoading(true);
    try {
      const body: any = { question: q, productId, langCode, env, platform: platform || undefined };
      // 如果有新输入的 token，一起发过去（服务端会缓存）
      if (userToken.trim()) {
        body.userToken = userToken.trim();
      }
      const res = await fetch(`${getBaseUrl()}/api/alias-test/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setHistory(prev => [{ question: q, result: json.data, error: null, timestamp: Date.now() }, ...prev]);
        // token 已被服务端缓存，更新状态
        if (userToken.trim()) {
          setTokenStatus({ hasUserToken: true, tokenPreview: userToken.trim().slice(0, 16) + '...' });
          setUserToken(''); // 清空输入框，下次不用再填
        }
      } else {
        setHistory(prev => [{ question: q, result: null, error: json.message || '请求失败', timestamp: Date.now() }, ...prev]);
        if (res.status === 401) {
          setTokenStatus({ hasUserToken: false, tokenPreview: '' });
        }
      }
    } catch (e: any) {
      setHistory(prev => [{ question: q, result: null, error: e.message || '网络错误', timestamp: Date.now() }, ...prev]);
    } finally {
      setLoading(false);
      setQuestion('');
    }
  };

  const handleImportExcel = async (file: File) => {
    setImporting(true);
    setImportFeedback(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      const parsed = rows
        .map((row, index) => ({
          question: normalizeQuestion(findQuestionValue(row)),
          sourceRow: index + 2,
        }))
        .filter((item) => item.question);

      setBatchQuestions(parsed);
      setBatchResults([]);
      setBatchProgress({ completed: 0, total: parsed.length });
      setImportFeedback(parsed.length > 0
        ? { type: 'success', text: `已导入 Excel，共识别 ${parsed.length} 条 question` }
        : { type: 'error', text: 'Excel 中未识别到可执行的 question 列' });
    } catch (e: any) {
      setImportFeedback({ type: 'error', text: e.message || 'Excel 解析失败' });
    } finally {
      setImporting(false);
    }
  };

  const runBatchAsk = async () => {
    if (batchQuestions.length === 0 || batchRunning) return;
    if (!hasToken) {
      setImportFeedback({ type: 'error', text: '请先设置 userToken 再执行批量测试' });
      return;
    }

    localStorage.setItem(LS_KEY_ENV, env);
    localStorage.setItem(LS_KEY_LANG, langCode);
    localStorage.setItem(LS_KEY_PLATFORM, platform);

    setBatchRunning(true);
    setBatchResults([]);
    setBatchProgress({ completed: 0, total: batchQuestions.length });
    setImportFeedback(null);

    const results: BatchResultItem[] = [];
    for (let index = 0; index < batchQuestions.length; index++) {
      const item = batchQuestions[index];
      try {
        const body: any = { question: item.question, productId, langCode, env, platform: platform || undefined };
        if (userToken.trim()) body.userToken = userToken.trim();

        const res = await fetch(`${getBaseUrl()}/api/alias-test/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          results.push(mapBatchResult(item, json.data, env, langCode, platform));
          if (userToken.trim()) {
            setTokenStatus({ hasUserToken: true, tokenPreview: userToken.trim().slice(0, 16) + '...' });
            setUserToken('');
          }
        } else {
          results.push(mapBatchResult(item, null, env, langCode, platform, json.message || `请求失败: ${res.status}`));
          if (res.status === 401) {
            setTokenStatus({ hasUserToken: false, tokenPreview: '' });
          }
        }
      } catch (e: any) {
        results.push(mapBatchResult(item, null, env, langCode, platform, e.message || '网络错误'));
      }

      setBatchResults([...results]);
      setBatchProgress({ completed: index + 1, total: batchQuestions.length });
    }

    setBatchRunning(false);
    setImportFeedback({
      type: 'success',
      text: `批量执行完成，成功 ${results.filter((item) => item.success).length} 条，失败 ${results.filter((item) => !item.success).length} 条`,
    });
  };

  const hasToken = tokenStatus?.hasUserToken || userToken.trim();
  const batchStatusSummary = batchResults.reduce<Record<string, number>>((acc, item) => {
    const key = item.success ? '成功' : item.error || '失败';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">别名管理测试</h1>
          <p className="text-gray-500 mt-1">调用 Planner API，输入 question 查看大模型回复</p>
        </div>

        {importFeedback && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            importFeedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {importFeedback.text}
          </div>
        )}

        {/* Token 配置区 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">🔑 Token 状态:</span>
            {tokenStatus?.hasUserToken ? (
              <span className="text-sm text-green-600">
                ✅ 已缓存 ({tokenStatus.tokenPreview})
                <button onClick={handleClearToken} className="ml-2 text-xs text-red-400 hover:text-red-600">清除</button>
              </span>
            ) : (
              <span className="text-sm text-orange-500">⚠ 未设置</span>
            )}
          </div>

          {!tokenStatus?.hasUserToken && (
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">
                userToken（从设备 logcat 搜索 "userToken" 复制，只需填一次，服务端缓存约30天有效）
              </label>
              <div className="flex gap-2">
                <input value={userToken} onChange={e => setUserToken(e.target.value)}
                  placeholder="粘贴 userToken，如 iHDOK9gYMVOaSF-h_quASmB3..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <button onClick={handleSaveToken} disabled={!userToken.trim()}
                  className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg disabled:opacity-40">
                  确认
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-[auto_auto_auto_1fr] gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">环境</label>
              <select value={env} onChange={e => setEnv(e.target.value as 'acc' | 'prod')}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="acc">ACC (测试)</option>
                <option value="prod">PROD (生产)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">语言</label>
              <SearchableSelect
                value={langCode}
                onChange={setLangCode}
                options={ANDROID_LANGUAGES}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                {PLATFORM_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div />
          </div>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-wrap gap-3">
            <input value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleAsk(); }}
              placeholder="输入 question，如：Go to Settings、Open YouTube、Turn up the volume..."
              className="min-w-[280px] flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <Button onClick={handleAsk} variant="primary" disabled={loading || !question.trim() || !hasToken}>
              {loading ? '请求中...' : '🚀 发送'}
            </Button>
          </div>
        </div>

        {/* 历史记录 */}
        <div className="space-y-4">
          {history.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-400">输入 question 开始测试</p>
            </div>
          )}
          {history.map(item => (
            <div key={item.timestamp} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {(() => {
                const validation = item.result ? validateAliasResult(item.result, item.question) : null;
                const itemFailed = !!item.error || (validation ? !validation.success : false);
                const itemError = item.error || validation?.error || '';

                return (
                  <>
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Q: {item.question}</span>
                  {item.result && !itemFailed && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">成功</span>}
                  {itemFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">失败</span>}
                </div>
                <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleTimeString('zh-CN')}</span>
              </div>
              <div className="p-5">
                {itemError && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    ❌ {itemError}
                  </div>
                )}
                {item.result && (
                  <div className="space-y-4">
                    {validation?.expectedSkill && (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${validation.success ? 'border-green-100 bg-green-50 text-green-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                        期望 Skill: {validation.expectedSkill} | 实际 Skill: {validation.actualSkill || '—'}
                        {validation.reason ? ` | 判断依据: ${validation.reason}` : ''}
                      </div>
                    )}
                    <PlannerSummary data={item.result.plannerResponse} />
                    {item.result.appPkgResponse && (
                      <AppPkgSummary data={item.result.appPkgResponse} />
                    )}
                    <details className="text-xs">
                      <summary className="text-gray-400 cursor-pointer hover:text-gray-600">查看原始 JSON</summary>
                      <pre className="mt-2 bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-64 overflow-y-auto">
                        {JSON.stringify(item.result.plannerResponse, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 mt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Excel 批量测试</h2>
              <p className="text-xs text-gray-500 mt-1">导入 Excel 多行 question，批量调用接口并输出执行结果</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <label className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg text-sm font-medium cursor-pointer">
                {importing ? '导入中...' : '导入 Excel'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={importing || batchRunning}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportExcel(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <Button onClick={runBatchAsk} variant="primary" disabled={batchRunning || batchQuestions.length === 0 || !hasToken}>
                {batchRunning ? `执行中 ${batchProgress.completed}/${batchProgress.total}` : `批量执行 (${batchQuestions.length})`}
              </Button>
              <Button onClick={() => exportBatchResults(batchResults)} variant="secondary" disabled={batchResults.length === 0}>
                导出结果
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-blue-50 px-4 py-3">
              <div className="text-xs text-blue-500">已导入问题</div>
              <div className="text-2xl font-bold text-blue-900">{batchQuestions.length}</div>
            </div>
            <div className="rounded-lg bg-green-50 px-4 py-3">
              <div className="text-xs text-green-500">成功</div>
              <div className="text-2xl font-bold text-green-900">{batchResults.filter((item) => item.success).length}</div>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <div className="text-xs text-red-500">失败</div>
              <div className="text-2xl font-bold text-red-900">{batchResults.filter((item) => !item.success).length}</div>
            </div>
          </div>

          {batchResults.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(batchStatusSummary).map(([label, count]) => (
                <span key={label} className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                  {label}: {count}
                </span>
              ))}
            </div>
          )}

          {batchQuestions.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-xs text-gray-500">
                已识别 {batchQuestions.length} 条问题，默认读取首个 Sheet，并优先匹配 `question / 问题 / 语句 / 指令 / query / utterance` 列。
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">环境: {env}</span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">语言: {langCode}</span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">Platform: {platform || '不传 (默认)'}</span>
              </div>
            </div>
          )}

          {batchResults.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">行号</th>
                    <th className="px-3 py-2 text-left">Question</th>
                    <th className="px-3 py-2 text-left">结果</th>
                    <th className="px-3 py-2 text-left">期望 Skill</th>
                    <th className="px-3 py-2 text-left">实际 Skill</th>
                    <th className="px-3 py-2 text-left">标准名称</th>
                    <th className="px-3 py-2 text-left">匹配应用</th>
                    <th className="px-3 py-2 text-left">错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((item) => (
                    <tr key={`${item.sourceRow}-${item.question}`} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-500">{item.sourceRow}</td>
                      <td className="px-3 py-2 text-gray-900">{item.question}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded text-xs ${item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.success ? '成功' : '失败'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{item.expectedSkill || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{item.skill || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{item.standardName || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{item.matchedApps || '-'}</td>
                      <td className="px-3 py-2 text-red-600">{item.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** 可搜索下拉选择器 */
const SearchableSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { code: string; label: string }[];
}> = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) { setSearch(''); inputRef.current?.focus(); }
  }, [open]);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase()))
    : options;

  const current = options.find(o => o.code === value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[200px] text-left">
        <span className="flex-1 truncate">{current?.label || value}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索语言..."
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">无匹配结果</div>}
            {filtered.map(o => (
              <button key={o.code} type="button"
                onClick={() => { onChange(o.code); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${o.code === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Planner 回复摘要卡片 */
const PlannerSummary: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;
  const d = data.data || data;
  const rawSkill = d.skill || d.intent || '—';
  const skill = typeof rawSkill === 'object' ? (rawSkill.name || JSON.stringify(rawSkill)) : String(rawSkill);
  const args = d.arguments || {};
  const app = String(args.app || '').trim();
  const rawCategory = args.category || '—';
  const category = typeof rawCategory === 'object' ? JSON.stringify(rawCategory) : String(rawCategory);
  const rawAction = args.action || '—';
  const action = typeof rawAction === 'object' ? JSON.stringify(rawAction) : String(rawAction);
  const params = args.params || {};
  const shortcut = d.shortcut || d.deeplink || null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
          <span className="text-gray-500">Skill: </span>
          <span className="font-medium text-blue-700">{skill}</span>
        </div>
        <div className="px-3 py-1.5 bg-purple-50 rounded-lg">
          <span className="text-gray-500">Category: </span>
          <span className="font-medium text-purple-700">{category}</span>
        </div>
        <div className="px-3 py-1.5 bg-green-50 rounded-lg">
          <span className="text-gray-500">Action: </span>
          <span className="font-medium text-green-700">{action}</span>
        </div>
        {app && (
          <div className="px-3 py-1.5 bg-amber-50 rounded-lg">
            <span className="text-gray-500">App: </span>
            <span className="font-medium text-amber-700">{app}</span>
          </div>
        )}
      </div>

      {Object.keys(params).length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">📋 Params</div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            {Object.entries(params).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-gray-500 min-w-[80px]">{k}:</span>
                <span className="text-gray-800 font-mono">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shortcut && (
        <div>
          <div className="text-xs text-gray-500 mb-1">🔗 Shortcut / Deeplink</div>
          <code className="text-xs bg-indigo-50 text-indigo-700 rounded px-2 py-1 break-all">{shortcut}</code>
        </div>
      )}
    </div>
  );
};

const OBJECT_TYPE_MAP: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: '应用别名', color: 'blue', icon: '📱' },
  2: { label: '快捷方式别名', color: 'purple', icon: '⚡' },
  3: { label: '信号源别名', color: 'orange', icon: '📺' },
};

const RS_STATUS_MAP: Record<number, string> = { 1: '未上架', 2: '已上架', 3: '已下架' };

/** getAppPkg 回复格式化展示 */
const AppPkgSummary: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;
  const d = data.data || data;
  const objectType = d.objectType as number;
  const typeInfo = OBJECT_TYPE_MAP[objectType] || { label: `未知类型(${objectType})`, color: 'gray', icon: '❓' };
  const standardName = d.standardName;
  const hasStandardName = !!standardName;
  const appList: any[] = d.appList || [];
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  const tagClass = colorMap[typeInfo.color] || colorMap.gray;

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">📦 getAppPkg 回复</div>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${tagClass}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
          {hasStandardName && (
            <span className="text-sm text-gray-700">
              标准名称: <span className="font-medium text-gray-900">{standardName}</span>
            </span>
          )}
          {!hasStandardName && appList.length === 0 && (
            <span className="text-sm text-red-500 font-medium">❌ 未匹配到标准名称</span>
          )}
          {data.errorCode !== undefined && data.errorCode !== 0 && (
            <span className="text-xs text-red-500">errorCode: {data.errorCode}</span>
          )}
        </div>

        {appList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">匹配应用 ({appList.length})</div>
            <div className="grid gap-2">
              {appList.map((app: any, i: number) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{app.appName || '—'}</div>
                    <div className="text-xs text-gray-500 font-mono truncate mt-0.5">{app.pkgName || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded ${app.resourceStatus === 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {RS_STATUS_MAP[app.resourceStatus] || `status:${app.resourceStatus}`}
                    </span>
                    {app.rsType !== undefined && (
                      <span className="text-xs text-gray-400">rsType: {app.rsType}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {appList.length === 0 && objectType !== 1 && (
          <details className="text-xs">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-600">查看原始数据</summary>
            <pre className="mt-2 bg-white rounded-lg p-3 overflow-x-auto text-gray-600 border border-gray-200">
              {JSON.stringify(d, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default AliasTestPage;
