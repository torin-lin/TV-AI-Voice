/**
 * 项目组 Redux Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ProjectType = string;

interface ProjectState {
  currentProject: ProjectType;
}

const initialState: ProjectState = {
  currentProject: '全部',
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<ProjectType>) => {
      state.currentProject = action.payload;
    },
  },
});

export const { setCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;
