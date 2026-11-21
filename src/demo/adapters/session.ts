import { useEffect, type ReactNode } from 'react';
import { store } from '../../store';
import { loginSuccess, logout } from '../../store/slices/authSlice';
import type { StoredAuth } from '../../types/auth';
import { endDemoSession } from '../mode';
import { entries, write } from '../store';

export const demoSession: StoredAuth = {
  user: { id: 'demo-account-user', name: 'Alex Morgan', email: 'alex@demo.example' },
  tenant: { id: 'account-demo', name: 'Demo Studio' },
  role: 'USER',
  token: 'local-demo-only-not-a-firebase-token',
};

function readDemoOverride(): StoredAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem('gos.demo-customer-session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email) return null;
    const mustChange = Boolean(parsed.mustChangePassword);
    return {
      user: {
        id: String(parsed.id || 'customer_demo_buyer'),
        name: String(parsed.name || parsed.email.split('@')[0] || 'Customer'),
        email: String(parsed.email).trim().toLowerCase(),
        mustChangePassword: mustChange,
        ...(mustChange ? { requiresPasswordChange: true } : { requiresPasswordChange: false }),
      },
      role: 'CUSTOMER',
      tenant: null,
      token: 'local-demo-customer-token',
    };
  } catch {
    return null;
  }
}

export class SessionError extends Error {
  code = 'SESSION_FAILED';
}
export type SessionErrorCode =
  | 'SESSION_FAILED'
  | 'NO_PROFILE'
  | 'PENDING'
  | 'DEACTIVATED'
  | 'NO_WORKSPACE'
  | 'ACCESS_DENIED';

export const login = async (): Promise<StoredAuth> => readDemoOverride() || demoSession;
export const resolveSession = login;
export const consumeAuthNotice = () => null;
export const beginActivation = () => {};
export const endActivation = () => {};
export const sessionErrorMessage = () => 'Demo session';

export async function completeCustomerFirstLoginPasswordChange(newPassword: string): Promise<StoredAuth> {
  if (!newPassword || newPassword.length < 8 || newPassword === '12345678') {
    throw new Error('Choose a new password of at least 8 characters that is different from your initial password.');
  }
  const current = readDemoOverride() || store.getState().auth;
  const email = String(current.user?.email || 'customer@demo.example').trim().toLowerCase();
  const nowIso = new Date().toISOString();
  for (const [key, val] of entries('doc:settings/portalRoute_')) {
    write(key, { ...(val as Record<string, unknown>), mustChangePassword: false, passwordChangedAt: nowIso });
  }
  const nextSession: StoredAuth = {
    user: {
      id: current.user?.id || 'customer_demo_buyer',
      name: current.user?.name || email.split('@')[0] || 'Customer',
      email,
      mustChangePassword: false,
      requiresPasswordChange: false,
    },
    role: 'CUSTOMER',
    tenant: null,
    token: 'local-demo-customer-token',
  };
  try {
    window.sessionStorage.setItem(
      'gos.demo-customer-session',
      JSON.stringify({ id: nextSession.user.id, name: nextSession.user.name, email, mustChangePassword: false })
    );
  } catch {
    /* noop */
  }
  store.dispatch(loginSuccess(nextSession));
  return nextSession;
}

export function FirebaseSession({ children }: { children: ReactNode }) {
  useEffect(() => {
    const override = readDemoOverride();
    if (override) {
      store.dispatch(loginSuccess(override));
    }
  }, []);
  return children;
}

export async function logoutFirebase() {
  try {
    window.sessionStorage.removeItem('gos.demo-customer-session');
  } catch {
    /* noop */
  }
  store.dispatch(logout());
  endDemoSession('/auth/login');
}
export const forceSignOut = logoutFirebase;
