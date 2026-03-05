/**
 * 版本记录 Redux Slice - 服务端 API 模式
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VersionRecord, QueryFilter, PaginationOptions } from '../../../types/database';
import {
  apiQueryVersionRecords,
  apiSearchVersionRecords,
  apiCreateVersionRecord,
  apiUpdateVersionRecord,
  apiDeleteVersionRecord,
} from '../../../services/VersionRecordApiClient';

interface VersionRecordsState {
  items: VersionRecord[];
  loading: boolean;
  error: string | null;
  filters: QueryFilter;
  pagination: { page: number; pageSize: number; total: number };
  sorting: { field: string; order: 'asc' | 'desc' };
}

const initialState: VersionRecordsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
  pagination: { page: 1, pageSize: 20, total: 0 },
  sorting: { field: 'createdAt', order: 'desc' },
};

export const fetchVersionRecords = createAsyncThunk(
  'versionRecords/fetchVersionRecords',
  async ({ filters, pagination }: { filters: QueryFilter; pagination: PaginationOptions }, { rejectWithValue }) => {
    try {
      return await apiQueryVersionRecords(filters, pagination);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createVersionRecord = createAsyncThunk(
  'versionRecords/createVersionRecord',
  async (data: Omit<VersionRecord, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const id = await apiCreateVersionRecord(data);
      return { ...data, id, createdAt: Date.now(), updatedAt: Date.now() };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateVersionRecord = createAsyncThunk(
  'versionRecords/updateVersionRecord',
  async ({ id, data }: { id: string; data: Partial<VersionRecord> }, { rejectWithValue }) => {
    try {
      await apiUpdateVersionRecord(id, data);
      return { id, data };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteVersionRecord = createAsyncThunk(
  'versionRecords/deleteVersionRecord',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiDeleteVersionRecord(id);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const searchVersionRecords = createAsyncThunk(
  'versionRecords/searchVersionRecords',
  async ({ keyword, pagination }: { keyword: string; pagination: PaginationOptions }, { rejectWithValue }) => {
    try {
      return await apiSearchVersionRecords(keyword, pagination);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const versionRecordsSlice = createSlice({
  name: 'versionRecords',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<QueryFilter>) => {
      state.filters = action.payload;
      state.pagination.page = 1;
    },
    setPagination: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.pagination.page = action.payload.page;
      state.pagination.pageSize = action.payload.pageSize;
    },
    setSorting: (state, action: PayloadAction<{ field: string; order: 'asc' | 'desc' }>) => {
      state.sorting = action.payload;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVersionRecords.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVersionRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchVersionRecords.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createVersionRecord.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createVersionRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload as VersionRecord);
      })
      .addCase(createVersionRecord.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateVersionRecord.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateVersionRecord.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.items.findIndex((item) => item.id === action.payload.id);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload.data };
      })
      .addCase(updateVersionRecord.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteVersionRecord.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteVersionRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteVersionRecord.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(searchVersionRecords.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(searchVersionRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination.total = action.payload.total;
      })
      .addCase(searchVersionRecords.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { setFilters, setPagination, setSorting, clearError } = versionRecordsSlice.actions;
export default versionRecordsSlice.reducer;
