import axios from 'axios';

/**
 * AI 问题分类服务
 * 调用 Azure OpenAI API 进行问题分类
 */

interface ClassificationResult {
  classification: string;
  confidence: number;
  reasoning: string;
}

const CLASSIFICATION_CATEGORIES = [
  '录音',
  '蓝牙',
  'ASR',
  'NLU',
  '服务端',
  '网络',
  'Android',
];

/**
 * 获取 API Key（从 LocalStorage）
 */
const getApiKey = (): string | null => {
  return localStorage.getItem('azure_openai_api_key');
};

/**
 * 获取 API 端点（从 LocalStorage）
 */
const getApiEndpoint = (): string => {
  return (
    localStorage.getItem('azure_openai_endpoint') ||
    'https://your-resource.openai.azure.com/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-15-preview'
  );
};

/**
 * 分类问题
 */
export const classifyProblem = async (
  description: string
): Promise<ClassificationResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('未配置 Azure OpenAI API Key');
  }

  try {
    const systemPrompt = `你是一个 TV AI Voice 测试问题分类专家。
根据用户提供的问题描述，将其分类到以下类别之一：${CLASSIFICATION_CATEGORIES.join('、')}。

请按照以下格式返回结果（JSON 格式）：
{
  "classification": "分类名称",
  "confidence": 0.95,
  "reasoning": "分类理由"
}

分类规则：
- 录音：与录音功能、录音质量、录音设备相关的问题
- 蓝牙：与蓝牙连接、蓝牙设备、蓝牙传输相关的问题
- ASR：与语音识别、语音转文字相关的问题
- NLU：与自然语言理解、语义理解相关的问题
- 服务端：与后端服务、API、数据处理相关的问题
- 网络：与网络连接、网络延迟、网络错误相关的问题
- Android：与 Android 系统、Android 应用相关的问题`;

    const response = await axios.post(
      getApiEndpoint(),
      {
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `请分类以下问题：\n${description}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    // 解析响应
    const content = response.data.choices[0].message.content;
    const result = parseClassificationResult(content);

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('API Key 无效或已过期');
      }
      if (error.response?.status === 429) {
        throw new Error('API 请求过于频繁，请稍后再试');
      }
      throw new Error(`API 调用失败: ${error.response?.statusText || error.message}`);
    }
    throw error;
  }
};

/**
 * 解析分类结果
 */
export const parseClassificationResult = (content: string): ClassificationResult => {
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析分类结果');
    }

    const result = JSON.parse(jsonMatch[0]);

    // 验证结果
    if (!result.classification || typeof result.confidence !== 'number') {
      throw new Error('分类结果格式不正确');
    }

    // 确保分类在允许的类别中
    if (!CLASSIFICATION_CATEGORIES.includes(result.classification)) {
      throw new Error(`未知的分类: ${result.classification}`);
    }

    // 确保置信度在 0-1 之间
    if (result.confidence < 0 || result.confidence > 1) {
      result.confidence = Math.max(0, Math.min(1, result.confidence));
    }

    return {
      classification: result.classification,
      confidence: result.confidence,
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('解析分类结果失败:', error);
    throw new Error('解析分类结果失败');
  }
};

/**
 * 获取分类类别列表
 */
export const getClassificationCategories = (): string[] => {
  return CLASSIFICATION_CATEGORIES;
};

/**
 * 验证 API 配置
 */
export const validateApiConfig = async (): Promise<boolean> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('未配置 API Key');
  }

  try {
    const response = await axios.post(
      getApiEndpoint(),
      {
        messages: [
          {
            role: 'user',
            content: '你好',
          },
        ],
        max_tokens: 10,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`API 验证失败: ${error.response?.statusText || error.message}`);
    }
    throw error;
  }
};
