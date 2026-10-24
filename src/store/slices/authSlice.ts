import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, Role, StoredAuth, Tenant, User } from '../../types/auth';

const AUTH_STORAGE_KEY = 'gos.auth';


const initialState: AuthState = { isAuthenticated: false, user: null, role: null, tenant: null, token: null, impersonation: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<StoredAuth>) => {
      if (state.impersonation && state.impersonation.user.id === action.payload.user.id && ['ADMIN', 'SUPER_ADMIN'].includes(action.payload.role)) {
        state.impersonation = action.payload;
        return;
      }
      state.impersonation = null;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.tenant = action.payload.tenant;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.impersonation = null;
      state.isAuthenticated = false;
      state.user = null;
      state.role = null;
      state.tenant = null;
      state.token = null;
    },
    startImpersonation: (state, action: PayloadAction<StoredAuth>) => {
      if (!state.isAuthenticated || state.impersonation || !state.user || !state.token || !['ADMIN', 'SUPER_ADMIN'].includes(state.role ?? '') || action.payload.role !== 'USER') return;
      state.impersonation = { user: state.user, role: state.role!, tenant: state.tenant, token: state.token };
      Object.assign(state, action.payload);
    },
    stopImpersonation: state => {
      if (!state.impersonation) return;
      Object.assign(state, state.impersonation);
      state.impersonation = null;
    },
  },
});

export const { loginSuccess, logout, startImpersonation, stopImpersonation } = authSlice.actions;
export type { AuthState, Role, Tenant, User };
export { AUTH_STORAGE_KEY };
export default authSlice.reducer;
