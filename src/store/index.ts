import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { AUTH_STORAGE_KEY } from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import crmReducer from './slices/crmSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    crm: crmReducer,
  },
});

// Firebase Auth owns session persistence; workspace listeners own CRM persistence.

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
