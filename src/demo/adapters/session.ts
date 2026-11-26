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

export type DemoAdminTrialSeed = {
  id: string;
  tenantId: string;
  name: string;
  workspaceName: string;
  email: string;
  phone?: string;
  language?: string;
  trialDays?: number;
  credits?: number;
};

export function readAdminTrialSeed(): DemoAdminTrialSeed | null {
  if (typeof window === 'undefined') return null;
  try {
    const adminRaw = window.sessionStorage.getItem('gos.demo-admin-trial-session');
    if (!adminRaw) return null;
    const parsed = JSON.parse(adminRaw);
    if (!parsed?.email) return null;
    const id = String(parsed.id || 'demo-trial-admin');
    return {
      id,
      tenantId: String(parsed.tenantId || `agency-${id}`),
      name: String(parsed.name || parsed.email.split('@')[0] || 'Admin'),
      workspaceName: String(parsed.workspaceName || 'Trial Workspace'),
      email: String(parsed.email).trim().toLowerCase(),
      phone: parsed.phone ? String(parsed.phone) : undefined,
      language: parsed.language === 'ar' ? 'ar' : 'en',
      trialDays: Number(parsed.trialDays) || 14,
      credits: Number(parsed.credits) || 1000,
    };
  } catch {
    return null;
  }
}

function readDemoOverride(): StoredAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsedAdmin = readAdminTrialSeed();
    if (parsedAdmin) {
      return {
        user: {
          id: parsedAdmin.id,
          name: parsedAdmin.name,
          email: parsedAdmin.email,
          accountType: 'agency',
          mustChangePassword: false,
          cashWalletRestricted: true,
        },
        role: 'ADMIN',
        tenant: {
          id: parsedAdmin.tenantId,
          name: parsedAdmin.workspaceName,
        },
        token: 'local-demo-admin-token',
      };
    }
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

export const activeDemoSession = (): StoredAuth => readDemoOverride() || demoSession;
export const login = async (): Promise<StoredAuth> => activeDemoSession();
export const resolveSession = login;
export const consumeAuthNotice = () => null;
export const PHOENIX_HANDOFF_TOKEN_KEY = 'gos.phoenix.handoff_token';
export const isPhoenixHandoffPending = () => false;
export const beginActivation = () => {};
export const endActivation = async () => {};
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
    window.sessionStorage.removeItem('gos.demo-admin-trial-session');
  } catch {
    /* noop */
  }
  store.dispatch(logout());
  endDemoSession('/auth/login');
}
export const forceSignOut = logoutFirebase;
