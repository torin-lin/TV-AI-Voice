/**
 * 项目组 Redux Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ProjectType = string;

interface ProjectState {
  currentWorkspace: string;
  currentProject: ProjectType;
}

const initialState: ProjectState = {
  currentWorkspace: typeof localStorage !== 'undefined' ? localStorage.getItem('current_workspace_id') || 'AI Voice' : 'AI Voice',
  currentProject: '全部',
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<ProjectType>) => {
      state.currentProject = action.payload;
    },
    setCurrentWorkspace: (state, action: PayloadAction<string>) => {
      state.currentWorkspace = action.payload;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('current_workspace_id', action.payload);
      }
    },
  },
});

export const { setCurrentProject, setCurrentWorkspace } = projectSlice.actions;
export default projectSlice.reducer;
