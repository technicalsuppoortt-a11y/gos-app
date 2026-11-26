import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../backend/firebase';
import {
  PHOENIX_HANDOFF_TOKEN_KEY,
  beginActivation,
  endActivation,
  forceSignOut,
  resolveSession,
} from '../../backend/session';
import { routeForRole } from '../../router/ProtectedRoute';
import { store } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';

const PHOENIX_PLATFORM_ENDPOINT = `${import.meta.env.VITE_GOS_FUNCTIONS_ORIGIN || 'https://us-central1-gos-app-3c7fb.cloudfunctions.net'}/phoenixPlatform`;

function readInitialHandoffToken(): string {
  if (typeof window === 'undefined') return '';
  const hashToken = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
  if (hashToken) {
    try {
      window.sessionStorage.setItem(PHOENIX_HANDOFF_TOKEN_KEY, hashToken);
    } catch {
      /* ignore restricted storage */
    }
    return hashToken;
  }
  try {
    return window.sessionStorage.getItem(PHOENIX_HANDOFF_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

const moduleCapturedToken = readInitialHandoffToken();

export default function PhoenixSignIn() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const initialToken = readInitialHandoffToken() || moduleCapturedToken;
    if (window.location.hash) {
      window.history.replaceState(null, '', '/auth/phoenix');
    }

    beginActivation();
    void (async () => {
      let token = initialToken;

      if (!token) {
        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
        const existingUser = auth.currentUser;
        if (existingUser) {
          const existingClaims = (await existingUser.getIdTokenResult()).claims;
          if (existingClaims.launchBrand === true) {
            const response = await fetch(PHOENIX_PLATFORM_ENDPOINT, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${await existingUser.getIdToken()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'open' }),
              signal: AbortSignal.timeout(120000),
            });
            const result = (await response.json().catch(() => ({}))) as { customToken?: string; error?: string };
            if (!response.ok || !result.customToken) {
              throw new Error(result.error || 'تعذر تسجيل الدخول إلى المنصة.');
            }
            token = result.customToken;
          } else {
            const session = await resolveSession(existingUser);
            store.dispatch(loginSuccess(session));
            navigate(routeForRole(session.role, session.user.allowedTabs), { replace: true });
            return;
          }
        }
      }

      if (!token) throw new Error('افتح منصتك من لوحة Phoenix لتسجيل الدخول.');

      const { user } = await signInWithCustomToken(auth, token);
      try {
        window.sessionStorage.removeItem(PHOENIX_HANDOFF_TOKEN_KEY);
      } catch {
        /* noop */
      }
      const claims = (await user.getIdTokenResult(true)).claims;
      if (!claims.phoenixUid || !claims.tenantId) throw new Error('Invalid platform session.');
      const session = await resolveSession(user);
      store.dispatch(loginSuccess(session));
      navigate(routeForRole(session.role, session.user.allowedTabs), { replace: true });
    })()
      .catch(async err => {
        try {
          window.sessionStorage.removeItem(PHOENIX_HANDOFF_TOKEN_KEY);
        } catch {
          /* noop */
        }
        await forceSignOut(err);
        setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.');
      })
      .finally(() => {
        void endActivation();
      });
  }, [navigate]);

  if (!error) return null;
  return (
    <main data-platform-entry-error className="min-h-screen grid place-content-center gap-5 p-8 text-center" dir="rtl">
      <h1>تعذر فتح المنصة</h1>
      <p role="alert">{error}</p>
      <a href="https://academy.mohamedjoe.com/dashboard">الرجوع إلى Phoenix</a>
      <Link to="/auth/login">تسجيل الدخول</Link>
    </main>
  );
}
