import { configureStore } from '@reduxjs/toolkit';
import authSlice from './reducers/auth/authSlice';
import testSlice from './reducers/testSlice';

export const store = configureStore({
  reducer: {
   auth: authSlice,
   test: testSlice
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
