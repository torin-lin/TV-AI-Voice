import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

/**
 * AI 推荐引擎 Redux 状态管理
 */

export interface Recommendation {
  id?: string;
  versionNumber: string;
  changeDescription: string;
  riskLevel: '低' | '中' | '高';
  recommendedTestCases: string[];
  recommendedRegressions: string[];
  reasoning: string;
  confidence: number;
  createdAt: number;
}

interface RecommendationsState {
  currentRecommendation: Recommendation | null;
  history: Recommendation[];
  loading: boolean;
  error: string | null;
  cache: Map<string, Recommendation>;
}

const initialState: RecommendationsState = {
  currentRecommendation: null,
  history: [],
  loading: false,
  error: null,
  cache: new Map(),
};

/**
 * 生成推荐
 */
export const generateRecommendation = createAsyncThunk(
  'recommendations/generateRecommendation',
  async (
    params: {
      versionNumber: string;
      changeDescription: string;
      riskLevel: '低' | '中' | '高';
    },
    { rejectWithValue }
  ) => {
    try {
      // 模拟 AI 推荐逻辑
      const { versionNumber, changeDescription, riskLevel } = params;

      // 根据风险等级生成推荐
      let recommendedTestCases: string[] = [];
      let recommendedRegressions: string[] = [];

      if (riskLevel === '低') {
        recommendedTestCases = ['冒烟测试', '基础功能测试'];
        recommendedRegressions = ['定向回归测试'];
      } else if (riskLevel === '中') {
        recommendedTestCases = ['冒烟测试', '功能测试', '边界测试'];
        recommendedRegressions = ['语音专项回归', '定向回归测试'];
      } else {
        recommendedTestCases = ['冒烟测试', '功能测试', '边界测试', '压力测试'];
        recommendedRegressions = ['全链路回归', '语音专项回归', '系统回归'];
      }

      // 分析修改内容
      const keywords = changeDescription.toLowerCase();
      if (keywords.includes('蓝牙')) {
        recommendedRegressions.push('蓝牙连接回归');
      }
      if (keywords.includes('录音')) {
        recommendedRegressions.push('录音功能回归');
      }
      if (keywords.includes('asr')) {
        recommendedRegressions.push('ASR 识别回归');
      }
      if (keywords.includes('nlu')) {
        recommendedRegressions.push('NLU 理解回归');
      }

      const recommendation: Recommendation = {
        id: `rec_${Date.now()}`,
        versionNumber,
        changeDescription,
        riskLevel,
        recommendedTestCases,
        recommendedRegressions: [...new Set(recommendedRegressions)],
        reasoning: `基于版本 ${versionNumber} 的修改内容和 ${riskLevel} 风险等级，推荐以上测试用例和回归测试。`,
        confidence: 0.85 + Math.random() * 0.15,
        createdAt: Date.now(),
      };

      return recommendation;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * 从缓存获取推荐
 */
export const getRecommendationFromCache = createAsyncThunk(
  'recommendations/getRecommendationFromCache',
  async (cacheKey: string, { rejectWithValue }) => {
    try {
      // 从 localStorage 获取缓存
      const cached = localStorage.getItem(`recommendation_${cacheKey}`);
      if (cached) {
        return JSON.parse(cached);
      }
      throw new Error('缓存不存在');
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Redux Slice
 */
const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    setCurrentRecommendation: (state, action: PayloadAction<Recommendation | null>) => {
      state.currentRecommendation = action.payload;
    },
    addToHistory: (state, action: PayloadAction<Recommendation>) => {
      state.history.unshift(action.payload);
      // 只保留最近 20 条记录
      if (state.history.length > 20) {
        state.history.pop();
      }
    },
    clearHistory: (state) => {
      state.history = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // generateRecommendation
    builder
      .addCase(generateRecommendation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateRecommendation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecommendation = action.payload;
        state.history.unshift(action.payload);
        if (state.history.length > 20) {
          state.history.pop();
        }
        // 缓存推荐结果
        const cacheKey = `${action.payload.versionNumber}_${action.payload.riskLevel}`;
        localStorage.setItem(`recommendation_${cacheKey}`, JSON.stringify(action.payload));
      })
      .addCase(generateRecommendation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // getRecommendationFromCache
    builder
      .addCase(getRecommendationFromCache.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecommendationFromCache.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRecommendation = action.payload;
      })
      .addCase(getRecommendationFromCache.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentRecommendation, addToHistory, clearHistory, clearError } =
  recommendationsSlice.actions;

// Selectors
export const selectCurrentRecommendation = (state: any) =>
  state.recommendations.currentRecommendation;
export const selectRecommendationHistory = (state: any) => state.recommendations.history;
export const selectRecommendationLoading = (state: any) => state.recommendations.loading;
export const selectRecommendationError = (state: any) => state.recommendations.error;

export default recommendationsSlice.reducer;
