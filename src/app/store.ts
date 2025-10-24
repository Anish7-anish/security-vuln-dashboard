import { configureStore } from '@reduxjs/toolkit';
import vulnReducer from '../features/vulns/slice';

export const store = configureStore({
  reducer: {
    vulns: vulnReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // 🚀 disable deep serialization validation
      immutableCheck: false,    // 🚀 disable deep freeze (faster in dev)
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
