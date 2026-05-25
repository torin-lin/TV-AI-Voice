import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CustomerProblem } from '../../../types/database';
import {
  apiQueryProblems,
  apiCreateProblem,
  apiUpdateProblem,
  apiDeleteProblem,
  ProblemQueryParams,
} from '../../../services/CustomerProblemApiClient';

/**
 * 客户问题/QA问题 Redux 状态管理
 * 使用服务端 API 存储，支持多人共享
 */

interface CustomerProblemsState {
  /** 客户问题列表 */
  customerItems: CustomerProblem[];
  /** QA问题列表 */
  qaItems: CustomerProblem[];
  loading: boolean;
  error: string | null;
  activeCustomerWorkspaceId: string;
  activeQaWorkspaceId: string;
  filters: {
    keyword?: string;
    classification?: string;
    status?: string;
    firmwareVersion?: string;
    startDate?: number;
    endDate?: number;
  };
  customerPagination: { page: number; pageSize: number; total: number };
  qaPagination: { page: number; pageSize: number; total: number };
  sorting: { field: string; order: 'asc' | 'desc' };
}

const initialState: CustomerProblemsState = {
  customerItems: [],
  qaItems: [],
  loading: false,
  error: null,
  activeCustomerWorkspaceId: '',
  activeQaWorkspaceId: '',
  filters: {},
  customerPagination: { page: 1, pageSize: 10, total: 0 },
  qaPagination: { page: 1, pageSize: 10, total: 0 },
  sorting: { field: 'createdAt', order: 'desc' },
};

/** 获取客户问题列表 */
export const fetchCustomerProblems = createAsyncThunk(
  'customerProblems/fetchCustomerProblems',
  async (params: ProblemQueryParams & { workspaceId?: string }, { rejectWithValue }) => {
    try {
      return await apiQueryProblems({ ...params, problemType: 'customer' });
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/** 获取QA问题列表 */
export const fetchQaProblems = createAsyncThunk(
  'customerProblems/fetchQaProblems',
  async (params: ProblemQueryParams & { workspaceId?: string }, { rejectWithValue }) => {
    try {
      return await apiQueryProblems({ ...params, problemType: 'qa' });
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/** 创建问题（客户或QA） */
export const createProblem = createAsyncThunk(
  'customerProblems/createProblem',
  async (data: Partial<CustomerProblem>, { rejectWithValue }) => {
    try {
      const id = await apiCreateProblem(data);
      const now = Date.now();
      return { ...data, id, createdAt: now, updatedAt: now } as CustomerProblem;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/** 更新问题 */
export const updateProblem = createAsyncThunk(
  'customerProblems/updateProblem',
  async (params: { id: string; data: Partial<CustomerProblem> }, { rejectWithValue }) => {
    try {
      await apiUpdateProblem(params.id, params.data);
      return { id: params.id, ...params.data, updatedAt: Date.now() };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/** 删除问题 */
export const deleteProblem = createAsyncThunk(
  'customerProblems/deleteProblem',
  async (params: { id: string; problemType: 'customer' | 'qa' }, { rejectWithValue }) => {
    try {
      await apiDeleteProblem(params.id);
      return params;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const customerProblemsSlice = createSlice({
  name: 'customerProblems',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<any>) => {
      state.filters = action.payload;
    },
    setCustomerPagination: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.customerPagination = { ...state.customerPagination, ...action.payload };
    },
    setQaPagination: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.qaPagination = { ...state.qaPagination, ...action.payload };
    },
    setSorting: (state, action: PayloadAction<{ field: string; order: 'asc' | 'desc' }>) => {
      state.sorting = action.payload;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerProblems.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.activeCustomerWorkspaceId = action.meta.arg.workspaceId || '';
        state.customerItems = [];
        state.customerPagination.total = 0;
      })
      .addCase(fetchCustomerProblems.fulfilled, (state, action) => {
        if ((action.meta.arg.workspaceId || '') !== state.activeCustomerWorkspaceId) return;
        state.loading = false;
        state.customerItems = action.payload.data;
        state.customerPagination.total = action.payload.total;
      })
      .addCase(fetchCustomerProblems.rejected, (state, action) => {
        if ((action.meta.arg.workspaceId || '') !== state.activeCustomerWorkspaceId) return;
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchQaProblems.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.activeQaWorkspaceId = action.meta.arg.workspaceId || '';
        state.qaItems = [];
        state.qaPagination.total = 0;
      })
      .addCase(fetchQaProblems.fulfilled, (state, action) => {
        if ((action.meta.arg.workspaceId || '') !== state.activeQaWorkspaceId) return;
        state.loading = false;
        state.qaItems = action.payload.data;
        state.qaPagination.total = action.payload.total;
      })
      .addCase(fetchQaProblems.rejected, (state, action) => {
        if ((action.meta.arg.workspaceId || '') !== state.activeQaWorkspaceId) return;
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createProblem.fulfilled, (state, action) => {
        if (action.payload.problemType === 'customer') {
          state.customerItems.unshift(action.payload);
          state.customerPagination.total += 1;
        } else {
          state.qaItems.unshift(action.payload);
          state.qaPagination.total += 1;
        }
      })
      .addCase(createProblem.rejected, (state, action) => { state.error = action.payload as string; })

      .addCase(updateProblem.fulfilled, (state, action) => {
        const { id } = action.payload;
        const cIdx = state.customerItems.findIndex((i) => i.id === id);
        if (cIdx !== -1) state.customerItems[cIdx] = { ...state.customerItems[cIdx], ...action.payload };
        const qIdx = state.qaItems.findIndex((i) => i.id === id);
        if (qIdx !== -1) state.qaItems[qIdx] = { ...state.qaItems[qIdx], ...action.payload };
      })
      .addCase(updateProblem.rejected, (state, action) => { state.error = action.payload as string; })

      .addCase(deleteProblem.fulfilled, (state, action) => {
        const { id, problemType } = action.payload;
        if (problemType === 'customer') {
          state.customerItems = state.customerItems.filter((i) => i.id !== id);
          state.customerPagination.total -= 1;
        } else {
          state.qaItems = state.qaItems.filter((i) => i.id !== id);
          state.qaPagination.total -= 1;
        }
      })
      .addCase(deleteProblem.rejected, (state, action) => { state.error = action.payload as string; });
  },
});

export const { setFilters, setCustomerPagination, setQaPagination, setSorting, clearError } = customerProblemsSlice.actions;
export default customerProblemsSlice.reducer;
