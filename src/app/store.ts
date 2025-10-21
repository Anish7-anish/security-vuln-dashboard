import { configureStore } from '@reduxjs/toolkit';
import vulnReducer from '../features/vulns/slice';

export const store = configureStore({
  reducer: {
    vulns: vulnReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;