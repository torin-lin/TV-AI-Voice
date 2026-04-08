/**
 * 知识库 Redux 状态管理
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TestCase, KBRecommendation } from '../../../types/database';
import {
  apiGetTestCases, apiGetKBStats, apiCreateTestCase,
  apiBulkImportTestCases, apiDeleteTestCase, apiUpdateTestCase,
  apiGetRecommendation, apiGetCategories,
} from '../../../services/KnowledgeBaseApiClient';

interface KBStats {
  totalCases: number;
  totalCategories: number;
  categories: string[];
  totalIssues: number;
  totalProblems: number;
  totalReleaseNotes: number;
  totalVersions: number;
}

interface RecommendationsState {
  testCases: TestCase[];
  categories: string[];
  stats: KBStats | null;
  currentRecommendation: KBRecommendation | null;
  history: KBRecommendation[];
  loading: boolean;
  importLoading: boolean;
  recommendLoading: boolean;
  error: string | null;
}

const initialState: RecommendationsState = {
  testCases: [],
  categories: [],
  stats: null,
  currentRecommendation: null,
  history: [],
  loading: false,
  importLoading: false,
  recommendLoading: false,
  error: null,
};

/** 获取测试用例 */
export const fetchTestCases = createAsyncThunk(
  'recommendations/fetchTestCases',
  async (params?: { keyword?: string; category?: string; projectType?: string }) => {
    return await apiGetTestCases(params);
  }
);

/** 获取分类 */
export const fetchCategories = createAsyncThunk(
  'recommendations/fetchCategories',
  async () => await apiGetCategories()
);

/** 获取统计 */
export const fetchKBStats = createAsyncThunk(
  'recommendations/fetchKBStats',
  async () => await apiGetKBStats()
);

/** 创建测试用例 */
export const addTestCase = createAsyncThunk(
  'recommendations/addTestCase',
  async (data: Partial<TestCase>) => {
    await apiCreateTestCase(data);
    return await apiGetTestCases();
  }
);

/** 批量导入 */
export const bulkImport = createAsyncThunk(
  'recommendations/bulkImport',
  async (cases: Partial<TestCase>[]) => {
    const count = await apiBulkImportTestCases(cases);
    const updated = await apiGetTestCases();
    return { count, cases: updated };
  }
);

/** 删除测试用例 */
export const deleteTestCase = createAsyncThunk(
  'recommendations/deleteTestCase',
  async (id: string) => {
    await apiDeleteTestCase(id);
    return id;
  }
);

/** 更新测试用例 */
export const editTestCase = createAsyncThunk(
  'recommendations/editTestCase',
  async ({ id, data }: { id: string; data: Partial<TestCase> }) => {
    await apiUpdateTestCase(id, data);
    return await apiGetTestCases();
  }
);

/** 生成推荐 */
export const generateRecommendation = createAsyncThunk(
  'recommendations/generateRecommendation',
  async (params: {
    versionRecordId?: string;
    versionNumber: string;
    changeDescription: string;
    modules?: string[];
    riskLevel?: string;
    projectType?: string;
    useAI?: boolean;
    apiKey?: string;
    endpoint?: string;
    modelName?: string;
  }) => {
    return await apiGetRecommendation(params);
  }
);

const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearRecommendation: (state) => { state.currentRecommendation = null; },
    clearHistory: (state) => { state.history = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTestCases.pending, (state) => { state.loading = true; })
      .addCase(fetchTestCases.fulfilled, (state, action) => { state.loading = false; state.testCases = action.payload; })
      .addCase(fetchTestCases.rejected, (state, action) => { state.loading = false; state.error = action.error.message || '加载失败'; })

      .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload; })

      .addCase(fetchKBStats.fulfilled, (state, action) => { state.stats = action.payload; })

      .addCase(addTestCase.fulfilled, (state, action) => { state.testCases = action.payload; })

      .addCase(bulkImport.pending, (state) => { state.importLoading = true; })
      .addCase(bulkImport.fulfilled, (state, action) => { state.importLoading = false; state.testCases = action.payload.cases; })
      .addCase(bulkImport.rejected, (state, action) => { state.importLoading = false; state.error = action.error.message || '导入失败'; })

      .addCase(deleteTestCase.fulfilled, (state, action) => { state.testCases = state.testCases.filter((c) => c.id !== action.payload); })

      .addCase(editTestCase.fulfilled, (state, action) => { state.testCases = action.payload; })

      .addCase(generateRecommendation.pending, (state) => { state.recommendLoading = true; state.error = null; })
      .addCase(generateRecommendation.fulfilled, (state, action) => {
        state.recommendLoading = false;
        state.currentRecommendation = action.payload;
        state.history.unshift(action.payload);
        if (state.history.length > 20) state.history.pop();
      })
      .addCase(generateRecommendation.rejected, (state, action) => { state.recommendLoading = false; state.error = action.error.message || '推荐失败'; });
  },
});

export const { clearError, clearRecommendation, clearHistory } = recommendationsSlice.actions;
export default recommendationsSlice.reducer;
