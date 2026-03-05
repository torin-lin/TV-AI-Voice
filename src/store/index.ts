import { configureStore } from '@reduxjs/toolkit';
import versionRecordsReducer from '../features/versionRecords/store/versionRecordsSlice';
import releaseNotesReducer from '../features/releaseNotes/store/releaseNotesSlice';
import customerProblemsReducer from '../features/customerProblems/store/customerProblemsSlice';
import recommendationsReducer from '../features/recommendations/store/recommendationsSlice';
import projectReducer from './projectSlice';

/**
 * Redux 存储配置
 */
export const store = configureStore({
  reducer: {
    versionRecords: versionRecordsReducer,
    releaseNotes: releaseNotesReducer,
    customerProblems: customerProblemsReducer,
    recommendations: recommendationsReducer,
    project: projectReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
