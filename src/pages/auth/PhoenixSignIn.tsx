import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../backend/firebase';
import { forceSignOut, resolveSession } from '../../backend/session';
import { store } from '../../store';
import { loginSuccess } from '../../store/slices/authSlice';

export default function PhoenixSignIn() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', '/auth/phoenix');
    void (async () => {
      if (!token) throw new Error('افتح منصتك من لوحة Phoenix لتسجيل الدخول.');
      const { user } = await signInWithCustomToken(auth, token);
      const claims = (await user.getIdTokenResult()).claims;
      if (!claims.phoenixUid || !claims.tenantId) throw new Error('Invalid platform session.');
      store.dispatch(loginSuccess(await resolveSession(user)));
      navigate('/dashboard', { replace: true });
    })().catch(async error => {
      await forceSignOut(error);
      setError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول.');
    });
  }, [navigate]);
  return <main className="min-h-screen grid place-content-center gap-5 p-8 text-center" dir="rtl"><h1>{error ? 'تعذر فتح المنصة' : 'جارٍ فتح منصتك…'}</h1>{error && <><p role="alert">{error}</p><a href="https://phoenix-app-8bc7b.web.app/dashboard">الرجوع إلى Phoenix</a><Link to="/auth/login">تسجيل الدخول</Link></>}</main>;
}
