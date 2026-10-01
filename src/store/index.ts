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

store.subscribe(() => {
  const { isAuthenticated, user, role, tenant, token } = store.getState().auth;
  try {
    if (isAuthenticated && user && role && token) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, role, tenant, token }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Authentication remains available in memory if browser storage is unavailable.
  }
  try {
    localStorage.setItem('gos-crm-leads-v1', JSON.stringify(store.getState().crm.leads));
  } catch {
    // Canonical lead updates remain available in memory when storage is unavailable.
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
