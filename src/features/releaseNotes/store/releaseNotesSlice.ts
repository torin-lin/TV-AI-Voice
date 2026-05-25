/**
 * Release Note Redux Slice - 服务端 API 模式
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ReleaseNote, QueryFilter, PaginationOptions } from '../../../types/database';
import {
  apiCreateReleaseNote,
  apiUpdateReleaseNote,
  apiDeleteReleaseNote,
  apiQueryReleaseNotes,
  apiSearchReleaseNotes,
} from '../../../services/ReleaseNoteApiClient';

interface ReleaseNotesState {
  items: ReleaseNote[];
  loading: boolean;
  error: string | null;
  activeWorkspaceId: string;
  filters: QueryFilter;
  pagination: { page: number; pageSize: number; total: number };
  sorting: { field: string; order: 'asc' | 'desc' };
}

const initialState: ReleaseNotesState = {
  items: [],
  loading: false,
  error: null,
  activeWorkspaceId: '',
  filters: {},
  pagination: { page: 1, pageSize: 20, total: 0 },
  sorting: { field: 'createdAt', order: 'desc' },
};

export const fetchReleaseNotes = createAsyncThunk(
  'releaseNotes/fetchReleaseNotes',
  async ({ filters, pagination }: { filters: QueryFilter; pagination: PaginationOptions; workspaceId?: string }, { rejectWithValue }) => {
    try { return await apiQueryReleaseNotes(filters, pagination); }
    catch (error) { return rejectWithValue((error as Error).message); }
  }
);

export const createReleaseNote = createAsyncThunk(
  'releaseNotes/createReleaseNote',
  async (data: Omit<ReleaseNote, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const id = await apiCreateReleaseNote(data);
      return { ...data, id, createdAt: Date.now(), updatedAt: Date.now() };
    } catch (error) { return rejectWithValue((error as Error).message); }
  }
);

export const updateReleaseNote = createAsyncThunk(
  'releaseNotes/updateReleaseNote',
  async ({ id, data }: { id: string; data: Partial<ReleaseNote> }, { rejectWithValue }) => {
    try { await apiUpdateReleaseNote(id, data); return { id, data }; }
    catch (error) { return rejectWithValue((error as Error).message); }
  }
);

export const deleteReleaseNote = createAsyncThunk(
  'releaseNotes/deleteReleaseNote',
  async (id: string, { rejectWithValue }) => {
    try { await apiDeleteReleaseNote(id); return id; }
    catch (error) { return rejectWithValue((error as Error).message); }
  }
);

export const searchReleaseNotes = createAsyncThunk(
  'releaseNotes/searchReleaseNotes',
  async ({ keyword, pagination }: { keyword: string; pagination: PaginationOptions }, { rejectWithValue }) => {
    try { return await apiSearchReleaseNotes(keyword, pagination); }
    catch (error) { return rejectWithValue((error as Error).message); }
  }
);

const releaseNotesSlice = createSlice({
  name: 'releaseNotes',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<QueryFilter>) => { state.filters = action.payload; state.pagination.page = 1; },
    setPagination: (state, action: PayloadAction<{ page: number; pageSize: number }>) => { state.pagination.page = action.payload.page; state.pagination.pageSize = action.payload.pageSize; },
    setSorting: (state, action: PayloadAction<{ field: string; order: 'asc' | 'desc' }>) => { state.sorting = action.payload; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReleaseNotes.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.activeWorkspaceId = action.meta.arg.workspaceId || '';
        state.items = [];
        state.pagination.total = 0;
      })
      .addCase(fetchReleaseNotes.fulfilled, (state, action) => {
        if ((action.meta.arg.workspaceId || '') !== state.activeWorkspaceId) return;
        state.loading = false;
        state.items = action.payload.data;
        state.pagination.total = action.payload.total;
      })
      .addCase(fetchReleaseNotes.rejected, (state, action) => {
        if ((action.meta.arg.workspaceId || '') !== state.activeWorkspaceId) return;
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createReleaseNote.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createReleaseNote.fulfilled, (state, action) => { state.loading = false; state.items.unshift(action.payload as ReleaseNote); })
      .addCase(createReleaseNote.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateReleaseNote.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateReleaseNote.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.items.findIndex((item) => item.id === action.payload.id);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload.data };
      })
      .addCase(updateReleaseNote.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteReleaseNote.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteReleaseNote.fulfilled, (state, action) => { state.loading = false; state.items = state.items.filter((item) => item.id !== action.payload); })
      .addCase(deleteReleaseNote.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(searchReleaseNotes.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(searchReleaseNotes.fulfilled, (state, action) => { state.loading = false; state.items = action.payload.data; state.pagination.total = action.payload.total; })
      .addCase(searchReleaseNotes.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { setFilters, setPagination, setSorting, clearError } = releaseNotesSlice.actions;
export default releaseNotesSlice.reducer;
