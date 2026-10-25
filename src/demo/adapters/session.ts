import type { ReactNode } from 'react';
import { store } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { endDemoSession } from '../mode';
export const demoSession = { user: { id: 'demo-account-user', name: 'Alex Morgan', email: 'alex@demo.example' }, tenant: { id: 'account-demo', name: 'Demo Studio' }, role: 'USER' as const, token: 'local-demo-only-not-a-firebase-token' };
export class SessionError extends Error { code = 'SESSION_FAILED'; }
export type SessionErrorCode = 'SESSION_FAILED' | 'NO_PROFILE' | 'PENDING' | 'DEACTIVATED' | 'NO_WORKSPACE' | 'ACCESS_DENIED';
export const login = async () => demoSession;
export const resolveSession = login;
export const consumeAuthNotice = () => null;
export const beginActivation = () => {};
export const endActivation = () => {};
export const sessionErrorMessage = () => 'Demo session';
export function FirebaseSession({ children }: { children: ReactNode }) { return children; }
export async function logoutFirebase() { store.dispatch(logout()); endDemoSession('/auth/login'); }
export const forceSignOut = logoutFirebase;
