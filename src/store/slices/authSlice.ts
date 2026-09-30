import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, Role, StoredAuth, Tenant, User } from '../../types/auth';

const AUTH_STORAGE_KEY = 'gos.auth';

function loadAuth(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const value = JSON.parse(stored) as StoredAuth;
      if (value.user?.email && value.token && ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(value.role)) {
        return { ...value, isAuthenticated: true };
      }
    }
  } catch {
    // Continue signed out if storage is blocked or contains malformed session data.
  }
  return { isAuthenticated: false, user: null, role: null, tenant: null, token: null };
}

const initialState = loadAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<StoredAuth>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.tenant = action.payload.tenant;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.role = null;
      state.tenant = null;
      state.token = null;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export type { AuthState, Role, Tenant, User };
export { AUTH_STORAGE_KEY };
export default authSlice.reducer;
