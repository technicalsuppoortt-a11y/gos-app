import { browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithCustomToken, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { normalizeRole } from '../shared/permissions';
import { PLATFORM_ENDPOINT } from './config';
import { requestGosPlatform } from '../services/gosPlatform';
import { serviceEntitlementFromClaims } from '../features/access/servicePeriod';

// Launch Brand opens only from Joe Academy's "Build brand" button. Joe Academy
// asks gos-app for a one-time ticket (60 seconds, single use) and opens
// /launch-brand#ticket=... ; this file trades it once for a gos sign-in.
// The sign-in lasts for this browser tab only, so a copied link never works.

type SessionError = 'expired' | 'failed' | null;
let sessionError: SessionError = null;
const errorListeners = new Set<() => void>();
export const getSessionError = () => sessionError;
export function subscribeSessionError(listener: () => void) {
  errorListeners.add(listener);
  return () => { errorListeners.delete(listener); };
}
function setSessionError(error: SessionError) {
  sessionError = error;
  errorListeners.forEach(listener => listener());
}

async function exchangeTicket(ticket: string) {
  const response = await fetch(PLATFORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'launch-brand-exchange', ticket }),
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => ({}));
  if (response.ok && result.platformDeployed === true) return { platformDeployed: true } as const;
  if (!response.ok || !result.customToken) {
    const error = new Error(result.error || 'Could not open Launch Brand.');
    (error as Error & { code?: string }).code = result.code;
    throw error;
  }
  return result as { customToken: string; language?: 'ar' | 'en'; theme?: 'light' | 'dark' };
}

function accountUser(user: User, claims: Record<string, unknown>, profile: Record<string, any> | null) {
  // Joe Academy stores its Firebase User here. The gos sign-in has no email of
  // its own, so the Joe Academy identity from the ticket fills those fields.
  return {
    uid: user.uid,
    email: (claims.sourceEmail as string | undefined) || profile?.email || null,
    emailVerified: claims.sourceEmailVerified === true,
    displayName: profile?.displayName || profile?.name || (claims.sourceName as string | undefined) || '',
    photoURL: profile?.photoURL || profile?.avatar || null,
    // Signed claims from the Joe Academy ticket; the profile copy is only a record.
    serviceEntitlement: serviceEntitlementFromClaims(claims),
    getIdToken: (forceRefresh?: boolean) => user.getIdToken(forceRefresh),
  };
}

// Local preview only: `npm run dev:launch-brand` with the Firebase Auth and
// Firestore emulators running, opened as /launch-brand/?devpreview=1. The Auth
// emulator accepts an unsigned custom token, so no Joe Academy ticket is needed.
// import.meta.env.DEV is false in production builds, so none of this ships.
const devPreview = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true'
  && new URLSearchParams(window.location.search).get('devpreview') === '1';
function devPreviewToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    iss: 'firebase-auth-emulator@example.com', sub: 'dev-preview-user', aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now, exp: now + 3600, uid: 'dev-preview-user',
    claims: { launchBrand: true, sourceName: 'Preview User', sourceEmail: 'preview@example.test' },
  })}.`;
}

export function startLaunchBrandSession() {
  const store = useStore.getState();
  store.setIsAuthLoading(true);
  const params = new URLSearchParams(window.location.hash.slice(1));
  const ticket = params.get('ticket');
  if (ticket) window.history.replaceState(null, '', window.location.pathname + window.location.search);

  // Restoring from the back-forward cache skips auth initialization.
  window.addEventListener('pagehide', event => {
    if (event.persisted) document.documentElement.style.visibility = 'hidden';
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) window.location.reload();
  });

  let leavingForPlatform = false;
  const leaveForPlatform = () => {
    leavingForPlatform = true;
    window.location.replace('/dashboard');
  };
  const signIn = (async () => {
    await setPersistence(auth, browserSessionPersistence);
    if (devPreview) { await signInWithCustomToken(auth, devPreviewToken()); return; }
    if (!ticket) return;
    const result = await exchangeTicket(ticket);
    if ('platformDeployed' in result) { leaveForPlatform(); return; }
    if (result.language === 'ar' || result.language === 'en') useStore.getState().setLanguage(result.language);
    if (result.theme === 'light' || result.theme === 'dark') useStore.getState().setTheme(result.theme);
    await signInWithCustomToken(auth, result.customToken);
  })();

  void signIn.catch(async error => {
    console.warn('[Launch Brand] Could not open from Joe Academy', { code: (error as { code?: string }).code });
    setSessionError((error as { code?: string }).code === 'launch-brand/ticket-invalid' ? 'expired' : 'failed');
    await signOut(auth).catch(() => undefined);
  }).finally(() => {
    if (leavingForPlatform) return;
    onAuthStateChanged(auth, async user => {
      const state = useStore.getState();
      if (!user) {
        state.setUser(null);
        state.setUserProfile(null);
        state.setAccountAccess(null);
        state.setAuthenticated(false);
        state.setIsAuthLoading(false);
        return;
      }
      try {
        const claims = (await user.getIdTokenResult()).claims as Record<string, unknown>;
        if (claims.launchBrand !== true) throw new Error('Not a Launch Brand session.');
        if (!devPreview) {
          const { deployed } = await requestGosPlatform('platform-status');
          if (auth.currentUser?.uid !== user.uid) return;
          if (deployed === true) { leaveForPlatform(); return; }
          if (deployed !== false) throw new Error('Could not verify Launch Brand access.');
        }
        const profile = devPreview ? null : (await getDoc(doc(db, 'users', user.uid))).data() ?? null;
        state.setUser(accountUser(user, claims, profile));
        state.setUserProfile(profile ? { id: user.uid, ...profile } : null);
        state.setRole(normalizeRole(profile?.role));
        state.setAccountAccess(null);
        state.setAuthenticated(true);
      } catch (error) {
        console.warn('[Launch Brand] Session rejected', { reason: error instanceof Error ? error.message : 'unknown' });
        setSessionError('failed');
        await signOut(auth).catch(() => undefined);
        return;
      }
      state.setIsAuthLoading(false);
    });
  });
}
