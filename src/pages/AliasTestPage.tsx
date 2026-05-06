import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/common/Button';
import * as XLSX from 'xlsx';
import { inferExpectedSkill } from '../config/aliasTestSkillRules';

interface AskResult {
  plannerResponse: any;
  chatResponse: any;
  appPkgResponse: any;
  movieSearchResponse?: any;
  requestInfo: { question: string; productId: string; includeMovieSearch?: boolean };
}

interface HistoryItem {
  question: string;
  langCode: string;
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
  env?: 'acc' | 'prod';
  productId?: string;
  langCode?: string;
  platform?: string;
  userToken?: string;
  deviceSetId?: string;
  countryCode?: string;
}

interface BatchResultItem {
  question: string;
  sourceRow: number;
  success: boolean;
  env: 'acc' | 'prod';
  productId: string;
  langCode: string;
  platform: string;
  deviceSetId: string;
  countryCode: string;
  expectedSkill: string;
  skill: string;
  action: string;
  llmReply: string;
  movieResultCount: number;
  topMovieName: string;
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
const LS_KEY_PRODUCT_ID = 'alias_test_product_id';

const PLATFORM_OPTIONS = [
  { value: '', label: '不传 (默认)' },
  { value: 'TV_WhaleOS3_1', label: 'TV_WhaleOS3_1' },
  { value: 'TV_WhaleOS10_1', label: 'TV_WhaleOS10_1' },
  { value: 'PJT_WhaleOS3_1', label: 'PJT_WhaleOS3_1' },
  { value: 'PJT_WhaleOS3_2', label: 'PJT_WhaleOS3_2' },
  { value: 'STB_WhaleOS10_1', label: 'STB_WhaleOS10_1' },
];

const PRODUCT_ID_OPTIONS = ['wstb10', 'wm100', 'wtv10'];

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

function getPlannerShortcut(result: AskResult | null): string {
  const rawShortcut = result?.plannerResponse?.data?.shortcut || result?.plannerResponse?.shortcut || result?.plannerResponse?.data?.deeplink || result?.plannerResponse?.deeplink;
  if (typeof rawShortcut === 'object') {
    return JSON.stringify(rawShortcut).trim();
  }
  return rawShortcut ? String(rawShortcut).trim() : '';
}

function getChatReplyText(result: AskResult | null): string {
  const rawText = result?.chatResponse?.data?.text || result?.chatResponse?.text;
  return rawText ? String(rawText).trim() : '';
}

function getMovieSearchItems(result: AskResult | null): any[] {
  const data = result?.movieSearchResponse?.data;
  return Array.isArray(data) ? data : [];
}

function normalizeQuestion(value: unknown): string {
  return String(value ?? '')
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateAliasResult(result: AskResult | null, question = '', langCode = ''): ValidationResult {
  const plannerData = result?.plannerResponse?.data || result?.plannerResponse || {};
  const plannerArgs = getPlannerArguments(result);
  const plannerSkillMeta = getPlannerSkillMeta(result);
  const appPkgData = result?.appPkgResponse?.data || result?.appPkgResponse || {};
  const appList: any[] = Array.isArray(appPkgData.appList) ? appPkgData.appList : [];
  const category = getPlannerCategory(result).trim();
  const skill = getPlannerSkill(result).trim();
  const action = getPlannerAction(result).trim();
  const shortcut = getPlannerShortcut(result).trim();
  const chatReplyText = getChatReplyText(result);
  const appName = normalizeAppName(plannerArgs.app);
  const titles = getNonEmptyStringArray(plannerArgs.titles);
  const keyword = String(plannerArgs.keyword || '').trim();
  const plannerQuestion = normalizeQuestion(plannerArgs.question);
  const endpoint = String(plannerSkillMeta.endpoint || '').trim().toLowerCase();
  const standardName = String(appPkgData.standardName || '').trim();
  const objectType = Number(appPkgData.objectType || 0);
  const matchedApps = appList.map((app) => app.appName || app.pkgName || '').filter(Boolean).join('、');
  const hasSkill = !!skill;
  const expected = inferExpectedSkill(question || result?.requestInfo?.question || '', langCode);
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
  const isGenericMovieSearch = isMovieSearchSkill && action === 'search';
  const movieSearchItems = getMovieSearchItems(result);
  const shouldValidateMovieSearchData = result?.requestInfo?.includeMovieSearch !== false;
  const isLlmChatExpected = expected.skill === 'LLM Chat';
  const isLlmChatRoute = isLlmChatExpected
    && !hasSkill
    && !hasCategory
    && !hasAction
    && !shortcut
    && plannerQuestion === normalizeQuestion(question || result?.requestInfo?.question || '')
    && !!chatReplyText;

  let error = '';
  if (isLlmChatExpected && !isLlmChatRoute) {
    error = '未命中大模型聊天规则：应返回 question，且 skill/category/action/shortcut 为空，并返回 chat/talk 文本';
  } else if (isLlmChatRoute) {
    error = '';
  } else if (!hasSkill) {
    error = 'Skill 为空';
  } else if (expected.skill && skill !== expected.skill) {
    error = `Skill 不符合预期，期望 ${expected.skill}，实际 ${skill}`;
  } else if (isYouTubeMovieSearch && titles.length === 0) {
    error = 'YouTube 影片搜索缺少 titles';
  } else if (isYouTubeInAppSearch && !keyword) {
    error = 'YouTube 应用内搜索缺少 keyword';
  } else if (isMovieSearchSkill && shouldValidateMovieSearchData && movieSearchItems.length === 0) {
    error = '影片搜索未返回结果';
  } else if (isYouTubeMovieSearch || isYouTubeInAppSearch || isGenericMovieSearch || isMovieSearchSkill) {
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

function findOptionalRowValue(row: Record<string, any>, aliases: string[]): string {
  const keys = Object.keys(row);
  const targetKey = keys.find((key) => aliases.includes(key.trim().toLowerCase()));
  return targetKey ? normalizeQuestion(row[targetKey]) : '';
}

function normalizeBatchEnv(value: string): 'acc' | 'prod' | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'prod' || normalized === '生产') return 'prod';
  if (normalized === 'acc' || normalized === 'test' || normalized === '测试') return 'acc';
  return undefined;
}

function normalizeBatchProductId(value: string): string | undefined {
  return PRODUCT_ID_OPTIONS.includes(value) ? value : undefined;
}

function mapBatchResult(
  item: BatchQuestionItem,
  result: AskResult | null,
  params: { env: 'acc' | 'prod'; productId: string; langCode: string; platform: string; deviceSetId: string; countryCode: string },
  error = '',
): BatchResultItem {
  const appPkgData = result?.appPkgResponse?.data || result?.appPkgResponse || {};
  const appList: any[] = Array.isArray(appPkgData.appList) ? appPkgData.appList : [];
  const skill = getPlannerSkill(result).trim();
  const action = getPlannerAction(result).trim();
  const llmReply = getChatReplyText(result);
  const movieSearchItems = getMovieSearchItems(result);
  const standardName = String(appPkgData.standardName || '').trim();
  const matchedApps = appList.map((app) => app.appName || app.pkgName || '').filter(Boolean).join('、');
  const expected = inferExpectedSkill(item.question, params.langCode);
  const validation = error
    ? { success: false, error, expectedSkill: expected.skill, actualSkill: skill, reason: expected.reason }
    : validateAliasResult(result, item.question, params.langCode);

  return {
    question: item.question,
    sourceRow: item.sourceRow,
    success: !!result && validation.success,
    env: params.env,
    productId: params.productId,
    langCode: params.langCode,
    platform: params.platform || '不传 (默认)',
    deviceSetId: params.deviceSetId,
    countryCode: params.countryCode,
    expectedSkill: validation.expectedSkill,
    skill,
    action,
    llmReply,
    movieResultCount: movieSearchItems.length,
    topMovieName: String(movieSearchItems[0]?.name || ''),
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
    ProductID: item.productId,
    语言: item.langCode,
    Platform: item.platform,
    DeviceSetID: item.deviceSetId || '-',
    CountryCode: item.countryCode || '-',
    期望Skill: item.expectedSkill || '-',
    Skill: item.skill,
    Action: item.action,
    大模型回复: item.llmReply || '-',
    影片结果数: item.movieResultCount,
    首个影片: item.topMovieName || '-',
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
    { wch: 60 },
    { wch: 24 },
    { wch: 32 },
    { wch: 40 },
  ];
  XLSX.writeFile(workbook, `alias-batch-results-${Date.now()}.xlsx`);
}

const AliasTestPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [productId, setProductId] = useState(() => {
    const saved = localStorage.getItem(LS_KEY_PRODUCT_ID) || 'wtv10';
    return PRODUCT_ID_OPTIONS.includes(saved) ? saved : 'wtv10';
  });
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
    localStorage.setItem(LS_KEY_PRODUCT_ID, productId);
    setLoading(true);
    try {
      const body: any = { question: q, productId, langCode, env, platform: platform || undefined, includeMovieSearch: true };
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
        setHistory(prev => [{ question: q, langCode, result: json.data, error: null, timestamp: Date.now() }, ...prev]);
        // token 已被服务端缓存，更新状态
        if (userToken.trim()) {
          setTokenStatus({ hasUserToken: true, tokenPreview: userToken.trim().slice(0, 16) + '...' });
          setUserToken(''); // 清空输入框，下次不用再填
        }
      } else {
        setHistory(prev => [{ question: q, langCode, result: null, error: json.message || '请求失败', timestamp: Date.now() }, ...prev]);
        if (res.status === 401) {
          setTokenStatus({ hasUserToken: false, tokenPreview: '' });
        }
      }
    } catch (e: any) {
      setHistory(prev => [{ question: q, langCode, result: null, error: e.message || '网络错误', timestamp: Date.now() }, ...prev]);
    } finally {
      setLoading(false);
      setQuestion('');
    }
  };

  const getBatchParams = (item: BatchQuestionItem) => ({
    env: item.env || env,
    productId: item.productId || productId,
    langCode: item.langCode || langCode,
    platform: item.platform ?? platform,
    userToken: item.userToken || userToken.trim(),
    deviceSetId: item.deviceSetId || '',
    countryCode: item.countryCode || 'US',
  });

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
        .map((row, index) => {
          const rowEnv = normalizeBatchEnv(findOptionalRowValue(row, ['env', '环境']));
          const rowProductId = normalizeBatchProductId(findOptionalRowValue(row, ['productid', 'product id', '产品id', '产品 id']));
          const rowLangCode = findOptionalRowValue(row, ['langcode', 'lang code', 'language', '语言', '语种']);
          const rowPlatform = findOptionalRowValue(row, ['platform', '平台']);
          const rowUserToken = findOptionalRowValue(row, ['usertoken', 'user token', 'token']);
          const rowDeviceSetId = findOptionalRowValue(row, ['devicesetid', 'deviceset id', 'device set id', '设备集id']);
          const rowCountryCode = findOptionalRowValue(row, ['countrycode', 'country code', '国家', '国家码']);

          return {
            question: normalizeQuestion(findQuestionValue(row)),
            sourceRow: index + 2,
            env: rowEnv,
            productId: rowProductId,
            langCode: rowLangCode || undefined,
            platform: rowPlatform || undefined,
            userToken: rowUserToken || undefined,
            deviceSetId: rowDeviceSetId || undefined,
            countryCode: rowCountryCode || undefined,
          };
        })
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
    localStorage.setItem(LS_KEY_PRODUCT_ID, productId);

    setBatchRunning(true);
    setBatchResults([]);
    setBatchProgress({ completed: 0, total: batchQuestions.length });
    setImportFeedback(null);

    const results: BatchResultItem[] = [];
    for (let index = 0; index < batchQuestions.length; index++) {
      const item = batchQuestions[index];
      const params = getBatchParams(item);
      try {
        const body: any = {
          question: item.question,
          productId: params.productId,
          langCode: params.langCode,
          env: params.env,
          platform: params.platform || undefined,
          deviceSetId: params.deviceSetId || undefined,
          countryCode: params.countryCode || undefined,
          includeMovieSearch: false,
        };
        if (params.userToken) body.userToken = params.userToken;

        const res = await fetch(`${getBaseUrl()}/api/alias-test/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          results.push(mapBatchResult(item, json.data, params));
          if (params.userToken) {
            setTokenStatus({ hasUserToken: true, tokenPreview: params.userToken.slice(0, 16) + '...' });
            setUserToken('');
          }
        } else {
          results.push(mapBatchResult(item, null, params, json.message || `请求失败: ${res.status}`));
          if (res.status === 401) {
            setTokenStatus({ hasUserToken: false, tokenPreview: '' });
          }
        }
      } catch (e: any) {
        results.push(mapBatchResult(item, null, params, e.message || '网络错误'));
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
          }`} data-i18n-ignore={importFeedback.type === 'success' ? undefined : 'true'}>
            {importFeedback.text}
          </div>
        )}

        {/* Token 配置区 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">🔑 Token 状态:</span>
            {tokenStatus?.hasUserToken ? (
              <span className="text-sm text-green-600">
                ✅ 已缓存 (<span data-i18n-ignore="true">{tokenStatus.tokenPreview}</span>)
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

          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_auto_auto_1fr] gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Product ID</label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                {PRODUCT_ID_OPTIONS.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
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
              data-i18n-ignore="true"
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
                const validation = item.result ? validateAliasResult(item.result, item.question, item.langCode) : null;
                const itemFailed = !!item.error || (validation ? !validation.success : false);
                const itemError = item.error || validation?.error || '';

                return (
                  <>
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900" data-i18n-ignore="true">Q: {item.question}</span>
                  {item.result && !itemFailed && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">成功</span>}
                  {itemFailed && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">失败</span>}
                </div>
                <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleTimeString('zh-CN')}</span>
              </div>
              <div className="p-5">
                {itemError && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span data-i18n-ignore="true">❌ {itemError}</span>
                  </div>
                )}
                {item.result && (
                  <div className="space-y-4">
                    {validation?.expectedSkill && (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${validation.success ? 'border-green-100 bg-green-50 text-green-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`} data-i18n-ignore="true">
                        期望 Skill: {validation.expectedSkill} | 实际 Skill: {validation.actualSkill || '—'}
                        {validation.reason ? ` | 判断依据: ${validation.reason}` : ''}
                      </div>
                    )}
                    <PlannerSummary data={item.result.plannerResponse} />
                    {item.result.chatResponse && (
                      <ChatReplySummary data={item.result.chatResponse} />
                    )}
                    {item.result.appPkgResponse && (
                      <AppPkgSummary data={item.result.appPkgResponse} />
                    )}
                    {item.result.movieSearchResponse && (
                      <MovieSearchSummary data={item.result.movieSearchResponse} />
                    )}
                    <details className="text-xs">
                      <summary className="text-gray-400 cursor-pointer hover:text-gray-600">查看原始 JSON</summary>
                      <div className="mt-2 space-y-3">
                        <div>
                          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-blue-500">
                            大模型 Planner 回复
                          </div>
                          <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-64 overflow-y-auto" data-i18n-ignore="true">
                            {JSON.stringify(item.result.plannerResponse, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-cyan-500">
                            大模型聊天回复
                          </div>
                          <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-64 overflow-y-auto" data-i18n-ignore="true">
                            {JSON.stringify(item.result.chatResponse ?? { message: '未触发 chat/talk 或接口无返回' }, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-emerald-500">
                            getAppPkg 接口回复
                          </div>
                          <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-64 overflow-y-auto" data-i18n-ignore="true">
                            {JSON.stringify(item.result.appPkgResponse ?? { message: '未触发 getAppPkg 或接口无返回' }, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-violet-500">
                            影片搜索接口回复
                          </div>
                          <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-64 overflow-y-auto" data-i18n-ignore="true">
                            {JSON.stringify(item.result.movieSearchResponse ?? { message: '未触发 gpt/search 或接口无返回' }, null, 2)}
                          </pre>
                        </div>
                      </div>
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
                <span key={label} className="rounded-full bg-gray-100 px-3 py-1 text-gray-700" data-i18n-ignore="true">
                  {label}: {count}
                </span>
              ))}
            </div>
          )}

          {batchQuestions.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-xs text-gray-500">
                已识别 {batchQuestions.length} 条问题，默认读取首个 Sheet；支持 question、env、productId、langCode、platform、userToken、deviceSetId、countryCode 列。
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">Product ID: {productId}</span>
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
                    <th className="px-3 py-2 text-left">Product ID</th>
                    <th className="px-3 py-2 text-left">语言</th>
                    <th className="px-3 py-2 text-left">Platform</th>
                    <th className="px-3 py-2 text-left">结果</th>
                    <th className="px-3 py-2 text-left">期望 Skill</th>
                    <th className="px-3 py-2 text-left">实际 Skill</th>
                    <th className="px-3 py-2 text-left">影片结果</th>
                    <th className="px-3 py-2 text-left">标准名称</th>
                    <th className="px-3 py-2 text-left">匹配应用</th>
                    <th className="px-3 py-2 text-left">错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((item) => (
                    <tr key={`${item.sourceRow}-${item.question}`} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-500">{item.sourceRow}</td>
                      <td className="px-3 py-2 text-gray-900" data-i18n-ignore="true">{item.question}</td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.productId}</td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.langCode}</td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.platform}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded text-xs ${item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.success ? '成功' : '失败'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.expectedSkill || '-'}</td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.skill || '-'}</td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">
                        {item.movieResultCount > 0 ? `${item.movieResultCount} 条 / ${item.topMovieName || '-'}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.standardName || '-'}</td>
                      <td className="px-3 py-2 text-gray-700" data-i18n-ignore="true">{item.matchedApps || '-'}</td>
                      <td className="px-3 py-2 text-red-600" data-i18n-ignore="true">{item.error || '-'}</td>
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
        <span className="flex-1 truncate" data-i18n-ignore="true">{current?.label || value}</span>
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
                <span data-i18n-ignore="true">{o.label}</span>
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
          <span className="font-medium text-blue-700" data-i18n-ignore="true">{skill}</span>
        </div>
        <div className="px-3 py-1.5 bg-purple-50 rounded-lg">
          <span className="text-gray-500">Category: </span>
          <span className="font-medium text-purple-700" data-i18n-ignore="true">{category}</span>
        </div>
        <div className="px-3 py-1.5 bg-green-50 rounded-lg">
          <span className="text-gray-500">Action: </span>
          <span className="font-medium text-green-700" data-i18n-ignore="true">{action}</span>
        </div>
        {app && (
          <div className="px-3 py-1.5 bg-amber-50 rounded-lg">
            <span className="text-gray-500">App: </span>
            <span className="font-medium text-amber-700" data-i18n-ignore="true">{app}</span>
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
                <span className="text-gray-800 font-mono" data-i18n-ignore="true">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shortcut && (
        <div>
          <div className="text-xs text-gray-500 mb-1">🔗 Shortcut / Deeplink</div>
          <code className="text-xs bg-indigo-50 text-indigo-700 rounded px-2 py-1 break-all" data-i18n-ignore="true">{shortcut}</code>
        </div>
      )}
    </div>
  );
};

const ChatReplySummary: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;
  const d = data.data || data;
  const replyText = String(d.text || '').trim();
  const replyType = String(d.type || '—');
  const replyLanguage = String(d.language || '—');

  if (!replyText) return null;

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">💬 大模型聊天回复</div>
      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4 space-y-2">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-white text-cyan-700 border border-cyan-200" data-i18n-ignore="true">
            Type: {replyType}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white text-cyan-700 border border-cyan-200" data-i18n-ignore="true">
            Language: {replyLanguage}
          </span>
        </div>
        <div className="text-sm leading-6 text-gray-800 whitespace-pre-wrap" data-i18n-ignore="true">
          {replyText}
        </div>
      </div>
    </div>
  );
};

const MovieSearchSummary: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;
  const items: any[] = Array.isArray(data.data) ? data.data : [];
  const errorCode = data.errorCode;

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">🎬 影片搜索结果</div>
      <div className="rounded-lg border border-violet-100 bg-violet-50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-violet-800" data-i18n-ignore="true">返回 {items.length} 条</span>
          {errorCode !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded ${errorCode === 0 ? 'bg-white text-violet-700' : 'bg-red-100 text-red-700'}`} data-i18n-ignore="true">
              errorCode: {errorCode}
            </span>
          )}
        </div>

        {items.length === 0 && (
          <div className="rounded-lg bg-white px-3 py-2 text-sm text-gray-500">未返回影片数据</div>
        )}

        <div className="grid gap-3">
          {items.slice(0, 10).map((movie, index) => {
            const verticalUrl = movie.icon || movie.poster || '';
            const landscapeUrl = movie.poster && movie.poster !== verticalUrl ? movie.poster : '';
            const categories = Array.isArray(movie.moreInfo?.categories) ? movie.moreInfo.categories.filter((item: any) => item?.name) : [];
            const contributors = Array.isArray(movie.moreInfo?.contributors) ? movie.moreInfo.contributors.filter((item: any) => item?.contrName) : [];
            const scores = Array.isArray(movie.moreInfo?.videoScores) ? movie.moreInfo.videoScores.filter((item: any) => item?.type || item?.value) : [];
            const awards = Array.isArray(movie.awardInfo) ? movie.awardInfo.filter((item: any) => item?.name || item?.awardNm || item?.categoryName) : [];
            const sourceDeeplinks = Array.isArray(movie.sourceDeeplinks) ? movie.sourceDeeplinks : [];
            const categoryText = categories.map((item: any) => item.name).join(' / ');
            const scoreText = scores.map((item: any) => `${item.type}:${item.value}`).join('  ');
            const directorText = contributors.filter((item: any) => item.role === 'DIRECTOR').map((item: any) => item.contrName).join(' / ');
            const starringText = contributors.filter((item: any) => item.role === 'STARRING').map((item: any) => item.contrName).slice(0, 5).join(' / ');
            const durationMinutes = movie.moreInfo?.duration ? Math.round(Number(movie.moreInfo.duration) / 60) : 0;
            const releaseYear = movie.releaseTime ? new Date(Number(movie.releaseTime)).getFullYear() : '';
            const detailDescription = movie.moreInfo?.description || movie.briefDesc || '';
            const originLangs = Array.isArray(movie.moreInfo?.originLangs) ? movie.moreInfo.originLangs.join(' / ') : '';

            return (
              <details key={`${movie.value || movie.name || index}`} className="group min-w-0 rounded-lg border border-violet-100 bg-white">
                <summary className="flex cursor-pointer list-none gap-3 p-3 hover:bg-violet-50">
                  {verticalUrl ? (
                    <img
                      src={verticalUrl}
                      alt=""
                      className="h-24 w-16 rounded object-cover bg-gray-100 flex-shrink-0"
                      data-i18n-ignore="true"
                    />
                  ) : (
                    <div className="h-24 w-16 rounded bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900" data-i18n-ignore="true">{index + 1}. {movie.name || '—'}</span>
                      {releaseYear && <span className="text-xs rounded bg-gray-100 px-2 py-0.5 text-gray-600" data-i18n-ignore="true">{releaseYear}</span>}
                      {movie.views && <span className="text-xs rounded bg-amber-50 px-2 py-0.5 text-amber-700" data-i18n-ignore="true">views: {movie.views}</span>}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 break-words" data-i18n-ignore="true">
                      {[categoryText, durationMinutes ? `${durationMinutes} min` : '', scoreText].filter(Boolean).join(' · ') || movie.sourceName || '-'}
                    </div>
                    <div className="mt-2 max-h-10 overflow-hidden text-sm leading-5 text-gray-700 break-words" data-i18n-ignore="true">
                      {movie.briefDesc || movie.moreInfo?.description || '-'}
                    </div>
                  </div>
                  <span className="text-xs text-violet-500 self-start group-open:hidden">展开</span>
                  <span className="text-xs text-violet-500 self-start hidden group-open:inline">收起</span>
                </summary>
                <div className="min-w-0 overflow-hidden border-t border-violet-100 p-3 text-xs text-gray-600 space-y-2">
                  {landscapeUrl && (
                    <img
                      src={landscapeUrl}
                      alt=""
                      className="max-h-72 w-full rounded object-cover bg-gray-100"
                      data-i18n-ignore="true"
                    />
                  )}
                  {detailDescription && (
                    <div className="rounded bg-white p-3 text-sm leading-6 text-gray-700 break-words" data-i18n-ignore="true">
                      {detailDescription}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-i18n-ignore="true">
                    {categoryText && <div className="min-w-0 break-words">分类: {categoryText}</div>}
                    {scoreText && <div className="min-w-0 break-words">评分: {scoreText}</div>}
                    {durationMinutes > 0 && <div className="min-w-0 break-words">时长: {durationMinutes} min</div>}
                    {releaseYear && <div className="min-w-0 break-words">年份: {releaseYear}</div>}
                    {originLangs && <div className="min-w-0 break-words">原始语言: {originLangs}</div>}
                    {movie.moreInfo?.defaultLangCode && <div className="min-w-0 break-words">默认语言: {movie.moreInfo.defaultLangCode}</div>}
                    {directorText && <div className="min-w-0 break-words">导演: {directorText}</div>}
                    {starringText && <div className="min-w-0 break-words">主演: {starringText}</div>}
                    <div className="min-w-0 break-words">source: {movie.sourceName || '-'}</div>
                    <div className="min-w-0 break-words">sourceId: {movie.sourceId ?? '-'}</div>
                    <div className="min-w-0 break-words">resourceStatus: {movie.resourceStatus ?? '-'}</div>
                    <div className="min-w-0 break-words">rsType: {movie.rsType ?? '-'}</div>
                    <div className="min-w-0 break-words">adultLock: {String(movie.adultLock ?? '-')}</div>
                    <div className="min-w-0 break-all">value: {movie.value || '-'}</div>
                  </div>
                  {contributors.length > 0 && (
                    <div className="rounded bg-white p-3">
                      <div className="mb-2 text-xs font-medium text-gray-500">演职员</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-i18n-ignore="true">
                        {contributors.slice(0, 10).map((person: any, personIndex: number) => (
                          <div key={`${person.contrId || person.contrName}-${personIndex}`} className="flex min-w-0 items-center gap-2">
                            {person.icon && <img src={person.icon} alt="" className="h-8 w-8 rounded-full object-cover bg-gray-100" />}
                            <div className="min-w-0">
                              <div className="truncate text-gray-800">{person.contrName}</div>
                              <div className="text-[11px] text-gray-400">{person.role || '-'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {awards.length > 0 && (
                    <div className="rounded bg-white p-3">
                      <div className="mb-2 text-xs font-medium text-gray-500">奖项</div>
                      <div className="flex flex-wrap gap-2" data-i18n-ignore="true">
                        {awards.slice(0, 8).map((award: any, awardIndex: number) => (
                          <span key={`${award.id || award.categoryName}-${awardIndex}`} className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                            {(award.name || award.awardNm || 'Award')} {award.year ? `${award.year}` : ''} · {award.winnerNominee || '-'} · {award.categoryName || '-'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {sourceDeeplinks.length > 0 && (
                    <div className="rounded bg-white p-3">
                      <div className="mb-2 text-xs font-medium text-gray-500">片源 Deeplink</div>
                      <pre className="max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-[11px]" data-i18n-ignore="true">
                        {JSON.stringify(sourceDeeplinks, null, 2)}
                      </pre>
                    </div>
                  )}
                  {movie.deeplink && (
                    <pre className="max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-[11px]" data-i18n-ignore="true">
                      {JSON.stringify(movie.deeplink, null, 2)}
                    </pre>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
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
            <span data-i18n-ignore="true">{typeInfo.icon} {typeInfo.label}</span>
          </span>
          {hasStandardName && (
            <span className="text-sm text-gray-700">
              标准名称: <span className="font-medium text-gray-900" data-i18n-ignore="true">{standardName}</span>
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
                    <div className="text-sm font-medium text-gray-900 truncate" data-i18n-ignore="true">{app.appName || '—'}</div>
                    <div className="text-xs text-gray-500 font-mono truncate mt-0.5" data-i18n-ignore="true">{app.pkgName || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded ${app.resourceStatus === 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      <span data-i18n-ignore="true">{RS_STATUS_MAP[app.resourceStatus] || `status:${app.resourceStatus}`}</span>
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
            <pre className="mt-2 bg-white rounded-lg p-3 overflow-x-auto text-gray-600 border border-gray-200" data-i18n-ignore="true">
              {JSON.stringify(d, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default AliasTestPage;
