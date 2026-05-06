export interface SkillInferenceResult {
  skill: string;
  reason: string;
}

interface LanguagePatternGroup {
  codes: string[];
  search: RegExp[];
  target?: RegExp[];
}

const YOUTUBE_INAPP_SEARCH_PATTERNS: LanguagePatternGroup[] = [
  {
    codes: ['zh'],
    search: [/搜索/, /搜一下/, /查找/, /查一下/, /播放/, /搜/, /查/],
    target: [/在\s*youtube/, /youtube\s*(里|内|中)/, /从\s*youtube/],
  },
  {
    codes: ['ja'],
    search: [/検索/, /探して/, /探す/, /再生/],
    target: [/youtube\s*で/, /youtube\s*から/, /youtube\s*内/],
  },
  {
    codes: ['ko'],
    search: [/검색/, /찾아/, /재생/],
    target: [/youtube\s*에서/, /youtube\s*내/, /youtube\s*로/],
  },
  {
    codes: ['ru'],
    search: [/поиск/, /найди/, /искать/, /воспроизведи/],
    target: [/на\s*youtube/, /в\s*youtube/, /из\s*youtube/],
  },
  {
    codes: ['ar'],
    search: [/ابحث/, /بحث/, /شغل/, /تشغيل/],
    target: [/على\s*youtube/, /في\s*youtube/, /من\s*youtube/],
  },
  {
    codes: ['hi'],
    search: [/खोजो/, /खोज/, /ढूंढो/, /चलाओ/, /प्ले/],
    target: [/youtube\s*पर/, /youtube\s*में/, /youtube\s*से/],
  },
  {
    codes: ['th'],
    search: [/ค้นหา/, /หา/, /เล่น/],
    target: [/ใน\s*youtube/, /จาก\s*youtube/, /บน\s*youtube/],
  },
  {
    codes: ['iw'],
    search: [/חפש/, /חיפוש/, /נגן/, /הפעל/],
    target: [/ביוטיוב/, /ב\s*youtube/, /מ\s*youtube/],
  },
  {
    codes: ['uk'],
    search: [/знайди/, /пошук/, /шукати/, /відтвори/],
    target: [/на\s*youtube/, /в\s*youtube/, /з\s*youtube/],
  },
  {
    codes: ['el'],
    search: [/αναζήτησε/, /αναζήτηση/, /βρες/, /παίξε/],
    target: [/στο\s*youtube/, /από\s*youtube/, /με\s*youtube/],
  },
  {
    codes: ['cs', 'sk'],
    search: [/hledej/, /vyhledej/, /najdi/, /prehraj/],
    target: [/na\s*youtube/, /v\s*youtube/, /z\s*youtube/],
  },
  {
    codes: ['da', 'nb', 'sv'],
    search: [/søg/, /sok/, /finn/, /spil/, /spill/, /spela/],
    target: [/på\s*youtube/, /i\s*youtube/, /fra\s*youtube/],
  },
  {
    codes: ['fi'],
    search: [/hae/, /etsi/, /toista/],
    target: [/youtube\s*ssa/, /youtube\s*sta/],
  },
  {
    codes: ['hu'],
    search: [/keresd/, /keresés/, /játssz/],
    target: [/youtube\s*on/, /youtube\s*ból/, /youtube\s*ben/],
  },
  {
    codes: ['ro'],
    search: [/caută/, /cauta/, /găsește/, /redă/],
    target: [/pe\s*youtube/, /din\s*youtube/, /în\s*youtube/],
  },
  {
    codes: ['bg', 'sr', 'mk', 'be'],
    search: [/търси/, /намери/, /пусни/, /претрага/, /пусти/, /пушти/, /знайдзі/],
    target: [/в\s*youtube/, /на\s*youtube/, /от\s*youtube/, /из\s*youtube/],
  },
  {
    codes: ['hr', 'bs', 'sl'],
    search: [/pretraži/, /trazi/, /traži/, /nađi/, /pronadji/, /predvajaj/, /pusti/],
    target: [/na\s*youtube/, /u\s*youtube/, /iz\s*youtube/],
  },
  {
    codes: ['ca', 'gl', 'eu'],
    search: [/cerca/, /buscar/, /bilatu/, /erreproduzitu/],
    target: [/a\s*youtube/, /en\s*youtube/, /des\s*youtube/, /de\s*youtube/],
  },
  {
    codes: ['lt', 'lv'],
    search: [/ieškok/, /ieslēdz/, /meklē/, /atskaņo/],
    target: [/youtube\s*e/, /no\s*youtube/, /iš\s*youtube/],
  },
  {
    codes: ['et', 'is'],
    search: [/otsi/, /leia/, /mängi/, /leita/, /spila/],
    target: [/youtube\s*is/, /youtube\s*ist/, /á\s*youtube/],
  },
  {
    codes: ['sw', 'zu', 'af'],
    search: [/tafuta/, /cheza/, /sesha/, /soek/, /speel/],
    target: [/kwenye\s*youtube/, /kutoka\s*youtube/, /ku\s*youtube/, /op\s*youtube/, /van\s*youtube/],
  },
  {
    codes: ['fa', 'ur'],
    search: [/جستجو/, /بگرد/, /پخش/, /تلاش/, /چلاؤ/],
    target: [/در\s*youtube/, /از\s*youtube/, /پر\s*youtube/, /سے\s*youtube/],
  },
  {
    codes: ['bn', 'gu', 'mr', 'ne', 'pa', 'si'],
    search: [/খুঁজ/, /চালাও/, /શોધ/, /ચાલુ/, /शोध/, /शोधा/, /चलवा/, /खोज/, /चलाऊ/, /ਖੋਜ/, /ਚਲਾ/, /සොයන්න/, /වාදනය/],
    target: [/youtube\s*এ/, /youtube\s*માં/, /youtube\s*वर/, /youtube\s*मा/, /youtube\s*ਵਿੱਚ/, /youtube\s*में/, /youtube\s*තුළ/],
  },
  {
    codes: ['kn', 'ml', 'or'],
    search: [/ಹುಡುಕು/, /ಪ್ಲೇ/, /തിരയ/, /പ്ലേ/, /ଖୋଜ/, /ଚଳାଅ/],
    target: [/youtube\s*ನಲ್ಲಿ/, /youtube\s*ൽ/, /youtube\s*ରେ/],
  },
  {
    codes: ['km', 'lo', 'my'],
    search: [/ស្វែងរក/, /ចាក់/, /ຄົ້ນ/, /ຫຼິ້ນ/, /ရှာ/, /ဖွင့်/],
    target: [/youtube/, /ពី\s*youtube/, /ໃນ\s*youtube/, /ຈາກ\s*youtube/, /တွင်\s*youtube/],
  },
  {
    codes: ['ka', 'hy', 'az', 'kk', 'ky', 'uz'],
    search: [/მოძებნე/, /იპოვე/, /დაუკარი/, /որոնիր/, /գտիր/, /çal/, /axtar/, /ізде/, /тауып/, /ойнат/, /изде/, /ойнот/, /qidir/, /o'ynat/],
    target: [/youtube/, /на\s*youtube/, /в\s*youtube/, /из\s*youtube/, /დან\s*youtube/],
  },
  {
    codes: ['am'],
    search: [/ፈልግ/, /አግኝ/, /አጫውት/],
    target: [/በ\s*youtube/, /ከ\s*youtube/],
  },
  {
    codes: ['ms'],
    search: [/cari/, /mainkan/],
    target: [/di\s*youtube/, /dari\s*youtube/],
  },
  {
    codes: ['ta'],
    search: [/தேடு/, /தேடல்/, /இயக்கு/, /ப்ளே/],
    target: [/youtube\s*இல்/, /youtube\s*ல்/, /youtube\s*இருந்து/],
  },
  {
    codes: ['te'],
    search: [/వెతుకు/, /శోధించు/, /ప్లే/, /ఆడించు/],
    target: [/youtube\s*లో/, /youtube\s*నుండి/, /youtube\s*పై/],
  },
  {
    codes: ['es', 'pt', 'it', 'fr', 'de', 'nl', 'tr', 'pl', 'id', 'vi'],
    search: [
      /\bsearch\b/, /\bfind\b/, /\blook up\b/, /\bplay\b/,
      /\bbusca(?:r)?\b/, /\bbusque\b/, /\bbuscar\b/, /\breproduc(?:e|ir)\b/,
      /\bprocurar\b/, /\bpesquisar\b/, /\bjoue(?:r)?\b/, /\brechercher\b/,
      /\bsuchen\b/, /\bsuche\b/, /\bcerca\b/, /\bcerca(?:re)?\b/,
      /\bara\b/, /\barama\b/, /\bzoek\b/, /\bzoeken\b/, /\bszukaj\b/,
      /\bcari\b/, /\btim kiem\b/,
    ],
    target: [/\b(?:with|from|on|in|en|sur|auf|su|em|no|na|de|da|di)\s+youtube\b/],
  },
];

const MOVIE_PATTERNS: RegExp[] = [
  /\bmovies?\b/, /\bfilms?\b/, /\bcinema\b/, /\bepisodes?\b/, /\btitles?\b/,
  /电影/, /影片/, /片名/, /映画/, /영화/, /фильм/,
  /فيلم/, /फिल्म/, /ภาพยนตร์/, /סרט/, /фільм/, /filem/, /filmklipp/,
  /திரைப்படம்/, /సినిమా/,
  /ταινία/, /filmov/, /filme/, /película/, /pelicula/, /pel·lícula/,
  /movieklipp/, /filmat/, /filmă/, /filmul/, /филм/, /филмът/,
  /filmovi/, /filmova/, /filmas/, /filma/, /kvikmynd/, /sinema/,
  /සිනමා/, /ਫਿਲਮ/, /ચલચિત્ર/, /চলচ্চিত্র/, /ಫಿಲ್ಮ್/, /സിനിമ/,
  /ຮູບເງົາ/, /ភាពយន្ត/, /ရုပ်ရှင်/, /կինո/, /ფილმი/,
];

const VIDEO_SEARCH_PATTERNS: RegExp[] = [
  /\b(recommend|suggest|find|search|show me|looking for|watch|popular|hottest|top|trending)\b/,
  /(推荐|建议|找一部|搜一部|想看)/,
  /(おすすめ|探して|見たい)/,
  /(추천|찾아줘|보고 싶어)/,
];

const LLM_CHAT_PATTERNS: RegExp[] = [
  /\?$/,
  /^\s*(who|what|when|where|why|how|which|whose|whom)\b/,
  /^\s*(describe|explain|introduce|compare|summarize|list|recommend|suggest|calculate|compute)\b/,
  /\b(do you know|tell me|explain|introduce|describe|compare|summarize|recommend|suggest|any suggestions|what is|who is|where is|how does|can you)\b/,
  /(是什么|是谁|是什么地方|介绍一下|描述一下|解释一下|推荐一下|建议|你知道|你了解|告诉我|聊聊|科普一下|怎么做|怎么算)/,
  /(とは|って何|知っていますか|教えて|説明して|おすすめ|どうやって)/,
  /(뭐야|무엇|알아|설명해|소개해|추천해|어떻게)/,
];

const LLM_CHAT_TOPIC_PATTERNS: RegExp[] = [
  /\b(highest|lowest|largest|smallest|best|worst|capital|headquarters|history|museum|city|country|mountain|beer|weekend|party)\b/,
  /(总部|首都|最高|最大|最小|历史|城市|国家|啤酒|周末|聚会)/,
];

const LLM_CHAT_CALCULATION_PATTERN = /\b\d+(?:\.\d+)?\s*(?:plus|minus|times|multiplied by|divided by|over)\s*\d+/;

function normalizeQuestion(value: unknown): string {
  return String(value ?? '')
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferExpectedSkill(question: string, langCode = ''): SkillInferenceResult {
  const q = normalizeQuestion(question).toLowerCase();
  const lang = String(langCode || '').trim().toLowerCase();
  const hasYoutube = q.includes('youtube');
  const hasMovieCue = MOVIE_PATTERNS.some((pattern) => pattern.test(q));
  const matchesChatPattern = LLM_CHAT_PATTERNS.some((pattern) => pattern.test(q));
  const hasChatTopic = LLM_CHAT_TOPIC_PATTERNS.some((pattern) => pattern.test(q));
  const looksLikeCalculation = LLM_CHAT_CALCULATION_PATTERN.test(q);

  let hasSearchVerb = false;
  let usesYoutubeAsTarget = false;

  for (const group of YOUTUBE_INAPP_SEARCH_PATTERNS) {
    if (group.codes.length > 0 && lang && !group.codes.includes(lang)) {
      continue;
    }
    if (!hasSearchVerb) {
      hasSearchVerb = group.search.some((pattern) => pattern.test(q));
    }
    if (!usesYoutubeAsTarget && group.target) {
      usesYoutubeAsTarget = group.target.some((pattern) => pattern.test(q));
    }
  }

  if (!hasSearchVerb) {
    hasSearchVerb = /\b(search|find|look up|play)\b/.test(q);
  }
  if (!usesYoutubeAsTarget) {
    usesYoutubeAsTarget = /\b(with|from|on|in)\s+youtube\b/.test(q) || /youtube\s*(里|内|中|で|에서)/.test(q);
  }

  if (hasYoutube && hasSearchVerb && usesYoutubeAsTarget) {
    return {
      skill: 'InApp Search Skill',
      reason: '命令显式指定在 YouTube 内搜索/播放内容，按多语言应用内搜索规则匹配为 InApp Search Skill',
    };
  }

  if (hasYoutube && hasMovieCue) {
    return {
      skill: 'Movie Search Skill',
      reason: '命令包含影片类关键词，且目标应用是 YouTube，按影片搜索处理',
    };
  }

  if (hasMovieCue && VIDEO_SEARCH_PATTERNS.some((pattern) => pattern.test(q))) {
    return {
      skill: 'Movie Search Skill',
      reason: '命令包含影片类关键词，且带有推荐/搜索/观看意图，按影片搜索处理',
    };
  }

  if (matchesChatPattern || looksLikeCalculation || (/\?$/.test(q) && hasChatTopic)) {
    return {
      skill: 'LLM Chat',
      reason: '问题更像开放式问答/知识聊天，且未命中应用内搜索或影片搜索规则，按大模型聊天链路处理',
    };
  }

  return {
    skill: '',
    reason: '',
  };
}
