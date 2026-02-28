import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CustomerProblem } from '../../../types/database';
import { getDatabase } from '../../../db';

/**
 * 客户问题追踪 Redux 状态管理
 */

interface CustomerProblemsState {
  items: CustomerProblem[];
  loading: boolean;
  error: string | null;
  filters: {
    keyword?: string;
    classification?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  sorting: {
    field: string;
    order: 'asc' | 'desc';
  };
}

const initialState: CustomerProblemsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
  },
  sorting: {
    field: 'createdAt',
    order: 'desc',
  },
};

/**
 * 获取客户问题列表
 */
export const fetchCustomerProblems = createAsyncThunk(
  'customerProblems/fetchCustomerProblems',
  async (
    params: {
      filters: Record<string, any>;
      pagination: { page: number; pageSize: number };
      sorting: { field: string; order: 'asc' | 'desc' };
    },
    { rejectWithValue }
  ) => {
    try {
      const { filters, pagination, sorting } = params;
      const { page, pageSize } = pagination;

      // 构建查询条件
      let query = getDatabase().customerProblems.toCollection();

      // 应用筛选条件
      if (filters.keyword) {
        query = query.filter(
          (item) =>
            item.description.includes(filters.keyword) ||
            item.classification?.includes(filters.keyword)
        );
      }

      if (filters.classification !== undefined && filters.classification !== null) {
        query = query.filter((item) => item.classification === filters.classification);
      }

      if (filters.status !== undefined && filters.status !== null) {
        query = query.filter((item) => item.status === filters.status);
      }

      if (filters.startDate !== undefined && filters.startDate !== null) {
        query = query.filter((item) => item.createdAt >= filters.startDate);
      }

      if (filters.endDate !== undefined && filters.endDate !== null) {
        query = query.filter((item) => item.createdAt <= filters.endDate);
      }

      // 获取总数
      const total = await query.count();

      // 应用排序
      let sorted = await query.toArray();
      sorted.sort((a, b) => {
        const aVal = a[sorting.field as keyof CustomerProblem] as any;
        const bVal = b[sorting.field as keyof CustomerProblem] as any;

        if (aVal && bVal) {
          if (aVal < bVal) return sorting.order === 'asc' ? -1 : 1;
          if (aVal > bVal) return sorting.order === 'asc' ? 1 : -1;
        }
        return 0;
      });

      // 应用分页
      const items = sorted.slice((page - 1) * pageSize, page * pageSize);

      return { items, total };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * 创建客户问题
 */
export const createCustomerProblem = createAsyncThunk(
  'customerProblems/createCustomerProblem',
  async (data: Partial<CustomerProblem>, { rejectWithValue }) => {
    try {
      const now = Date.now();
      const problem: CustomerProblem = {
        id: `problem_${now}`,
        description: data.description || '',
        classification: data.classification,
        confidence: data.confidence || 0,
        status: data.status || '开放',
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      };

      await getDatabase().customerProblems.add(problem);
      return problem;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * 更新客户问题
 */
export const updateCustomerProblem = createAsyncThunk(
  'customerProblems/updateCustomerProblem',
  async (
    params: { id: string; data: Partial<CustomerProblem> },
    { rejectWithValue }
  ) => {
    try {
      const { id, data } = params;
      const updated = {
        ...data,
        updatedAt: Date.now(),
      };

      await getDatabase().customerProblems.update(id, updated);

      const problem = await getDatabase().customerProblems.get(id);
      return problem;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * 删除客户问题
 */
export const deleteCustomerProblem = createAsyncThunk(
  'customerProblems/deleteCustomerProblem',
  async (id: string, { rejectWithValue }) => {
    try {
      await getDatabase().customerProblems.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * 搜索客户问题
 */
export const searchCustomerProblems = createAsyncThunk(
  'customerProblems/searchCustomerProblems',
  async (
    params: {
      keyword: string;
      pagination: { page: number; pageSize: number };
    },
    { rejectWithValue }
  ) => {
    try {
      const { keyword, pagination } = params;
      const { page, pageSize } = pagination;

      const allProblems = await getDatabase().customerProblems.toArray();
      const filtered = allProblems.filter(
        (item) =>
          item.description.includes(keyword) ||
          item.classification?.includes(keyword)
      );

      const total = filtered.length;
      const items = filtered.slice((page - 1) * pageSize, page * pageSize);

      return { items, total };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Redux Slice
 */
const customerProblemsSlice = createSlice({
  name: 'customerProblems',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<any>) => {
      state.filters = action.payload;
    },
    setPagination: (
      state,
      action: PayloadAction<{ page: number; pageSize: number }>
    ) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setSorting: (
      state,
      action: PayloadAction<{ field: string; order: 'asc' | 'desc' }>
    ) => {
      state.sorting = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchCustomerProblems
    builder
      .addCase(fetchCustomerProblems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerProblems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchCustomerProblems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createCustomerProblem
    builder
      .addCase(createCustomerProblem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomerProblem.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createCustomerProblem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // updateCustomerProblem
    builder
      .addCase(updateCustomerProblem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomerProblem.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.items.findIndex((item) => item.id === action.payload!.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          }
        }
      })
      .addCase(updateCustomerProblem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // deleteCustomerProblem
    builder
      .addCase(deleteCustomerProblem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomerProblem.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.pagination.total -= 1;
      })
      .addCase(deleteCustomerProblem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // searchCustomerProblems
    builder
      .addCase(searchCustomerProblems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchCustomerProblems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination.total = action.payload.total;
      })
      .addCase(searchCustomerProblems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, setPagination, setSorting, clearError } =
  customerProblemsSlice.actions;

// Selectors
export const selectCustomerProblems = (state: any) => state.customerProblems.items;
export const selectCustomerProblemsLoading = (state: any) =>
  state.customerProblems.loading;
export const selectCustomerProblemsError = (state: any) =>
  state.customerProblems.error;
export const selectCustomerProblemsFilters = (state: any) =>
  state.customerProblems.filters;
export const selectCustomerProblemsPagination = (state: any) =>
  state.customerProblems.pagination;
export const selectCustomerProblemsSorting = (state: any) =>
  state.customerProblems.sorting;

export default customerProblemsSlice.reducer;
