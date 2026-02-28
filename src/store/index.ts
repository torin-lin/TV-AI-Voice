import { configureStore } from '@reduxjs/toolkit';
import versionRecordsReducer from '../features/versionRecords/store/versionRecordsSlice';
import customerProblemsReducer from '../features/customerProblems/store/customerProblemsSlice';
import recommendationsReducer from '../features/recommendations/store/recommendationsSlice';

/**
 * Redux 存储配置
 */
export const store = configureStore({
  reducer: {
    versionRecords: versionRecordsReducer,
    customerProblems: customerProblemsReducer,
    recommendations: recommendationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
