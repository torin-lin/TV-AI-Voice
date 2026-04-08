/**
 * 别名管理测试 — 代理 planner API
 * userToken 由前端提供（从设备 logcat 复制），持久化到 SQLite
 */

import { getDb } from '../storage/sqlite.js';

const URLS = {
  acc: {
    planner: 'https://acc-planner.zeasn.tv/api/ask',
    appPkg: 'https://acc-saas.zeasn.tv/sp/api/device/v1/app/voice/getAppPkg',
    deviceSign: 'https://acc-saas.zeasn.tv/auth-api/api/v1/auth/deviceSign',
  },
  prod: {
    planner: 'https://planner.zeasn.tv/api/ask',
    appPkg: 'https://saas.zeasn.tv/sp/api/device/v1/app/voice/getAppPkg',
    deviceSign: 'https://saas.zeasn.tv/auth-api/api/v1/auth/deviceSign',
  },
};

const USER_AGENT = 'ZeasnAOSP/13 (EUI64=E8519Efffe28EA60;DeviceType=WHALEOS_CVTE_CAIXUN_AML950D4_2K_P1028;ProductID=wm100;DeviceSetID=;BrandID=12;ClientPKG=com.zeasn.asrself;ClientVersion=1.4.1.9-MP;ClientVersionNum=14000109;UserAgentVersion=1.0)';

// deviceToken 仍用内存缓存（短期有效，重启重新获取即可）
let cachedDeviceToken = '';

/** 从数据库读取设置 */
function getSetting(key: string): string {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
  return row?.value || '';
}

/** 写入设置到数据库 */
function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)').run(key, value, Date.now());
}

/** 删除设置 */
function deleteSetting(key: string): void {
  getDb().prepare('DELETE FROM app_settings WHERE key = ?').run(key);
}

/** 调用 deviceSign 获取 deviceToken */
async function getDeviceToken(productId: string, env: 'acc' | 'prod' = 'acc'): Promise<string> {
  const body = new URLSearchParams({
    productId,
    brandId: '12',
    deviceSetId: '',
    mac: 'E8:51:9E:28:EA:60',
    deviceType: 'WHALEOS_CVTE_CAIXUN_AML950D4_2K_P1028',
    functionType: 'TvLauncher',
    ifGetTvDetail: '1',
    iconResolution: '96*96',
    terminalType: '',
    sn: '',
    osVersion: 'WhaleOsA',
    appVersion: '14000109',
    countryCode: 'US',
    androidVersion: '13',
    langCode: 'en',
    osType: 'AOSP',
  });
  try {
    const res = await fetch(URLS[env].deviceSign, {      method: 'POST',
      headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.data?.token || '';
  } catch { return ''; }
}

/** Android langCode → voiceLangCode (BCP 47 locale) 映射 */
const LANG_TO_LOCALE: Record<string, string> = {
  af: 'af-ZA', am: 'am-ET', ar: 'ar-SA', az: 'az-AZ', be: 'be-BY',
  bg: 'bg-BG', bn: 'bn-BD', bs: 'bs-BA', ca: 'ca-ES', cs: 'cs-CZ',
  da: 'da-DK', de: 'de-DE', el: 'el-GR', en: 'en-US', es: 'es-ES',
  et: 'et-EE', eu: 'eu-ES', fa: 'fa-IR', fi: 'fi-FI', fil: 'fil-PH',
  fr: 'fr-FR', gl: 'gl-ES', gu: 'gu-IN', hi: 'hi-IN', hr: 'hr-HR',
  hu: 'hu-HU', hy: 'hy-AM', id: 'id-ID', is: 'is-IS', it: 'it-IT',
  iw: 'iw-IL', ja: 'ja-JP', ka: 'ka-GE', kk: 'kk-KZ', km: 'km-KH',
  kn: 'kn-IN', ko: 'ko-KR', ky: 'ky-KG', lo: 'lo-LA', lt: 'lt-LT',
  lv: 'lv-LV', mk: 'mk-MK', ml: 'ml-IN', mn: 'mn-MN', mr: 'mr-IN',
  ms: 'ms-MY', my: 'my-MM', nb: 'nb-NO', ne: 'ne-NP', nl: 'nl-NL',
  or: 'or-IN', pa: 'pa-IN', pl: 'pl-PL', pt: 'pt-BR', ro: 'ro-RO',
  ru: 'ru-RU', si: 'si-LK', sk: 'sk-SK', sl: 'sl-SI', sq: 'sq-AL',
  sr: 'sr-RS', sv: 'sv-SE', sw: 'sw-TZ', ta: 'ta-IN', te: 'te-IN',
  th: 'th-TH', tr: 'tr-TR', uk: 'uk-UA', ur: 'ur-PK', uz: 'uz-UZ',
  vi: 'vi-VN', zh: 'zh-CN', zu: 'zu-ZA',
};

export function setupAliasTestRoutes(app: any): void {

  /** POST /api/alias-test/ask */
  app.post('/api/alias-test/ask', async (req: any, res: any) => {
    try {
      const { question, productId, userToken, langCode, env: reqEnv, platform } = req.body;
      if (!question) return res.status(400).json({ success: false, message: '请输入 question' });

      const env: 'acc' | 'prod' = reqEnv === 'prod' ? 'prod' : 'acc';

      if (userToken?.trim()) {
        setSetting('userToken', userToken.trim());
      }

      const storedToken = getSetting('userToken');
      if (!storedToken) {
        return res.status(400).json({ success: false, message: '请先填写 userToken（从设备 logcat 复制，只需填一次）' });
      }

      const pid = productId || 'wm100';

      // 确保有 deviceToken
      if (!cachedDeviceToken) {
        cachedDeviceToken = await getDeviceToken(pid, env);
      }

      const askUrl = `${URLS[env].planner}?userToken=${encodeURIComponent(storedToken)}&productId=${encodeURIComponent(pid)}&question=${encodeURIComponent(question)}`;

      const askRes = await fetch(askUrl, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Length': '0' },
      });

      if (!askRes.ok) {
        const errText = await askRes.text();
        if (askRes.status === 401 || askRes.status === 403) {
          deleteSetting('userToken');
          return res.status(401).json({ success: false, message: 'userToken 已过期，请重新从 logcat 复制' });
        }
        return res.status(askRes.status).json({ success: false, message: `planner 请求失败: ${askRes.status}`, detail: errText.slice(0, 500) });
      }

      const askData = await askRes.json();

      // 如果有 skill 返回，尝试调用 getAppPkg
      let appPkgData = null;
      if (askData.data?.arguments?.params?.name && cachedDeviceToken) {
        try {
          const txt = askData.data.arguments.params.name;
          const voiceLangCode = LANG_TO_LOCALE[langCode] || `${langCode}-US`;
          const appPkgUrl = `${URLS[env].appPkg}?token=${encodeURIComponent(cachedDeviceToken)}&txt=${encodeURIComponent(txt)}&voiceLangCode=${encodeURIComponent(voiceLangCode)}${platform ? `&platform=${encodeURIComponent(platform)}` : ''}`;
          const appRes = await fetch(appPkgUrl, {
            headers: { 'User-Agent': USER_AGENT, 'userToken': storedToken },
          });
          if (appRes.ok) appPkgData = await appRes.json();
        } catch { /* ignore */ }
      }

      res.json({
        success: true,
        data: {
          plannerResponse: askData,
          appPkgResponse: appPkgData,
          requestInfo: { question, productId: pid },
        },
      });
    } catch (error) {
      console.error('[alias-test] ask 错误:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  /** GET /api/alias-test/status */
  app.get('/api/alias-test/status', (_req: any, res: any) => {
    const token = getSetting('userToken');
    res.json({
      success: true,
      data: {
        hasUserToken: !!token,
        tokenPreview: token ? token.slice(0, 16) + '...' : '',
      },
    });
  });

  /** POST /api/alias-test/clear-token */
  app.post('/api/alias-test/clear-token', (_req: any, res: any) => {
    deleteSetting('userToken');
    cachedDeviceToken = '';
    res.json({ success: true });
  });
}
