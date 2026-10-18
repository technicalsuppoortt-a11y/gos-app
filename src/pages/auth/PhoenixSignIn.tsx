import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { gosFirebase } from '../../lib/firebase';
import { store } from '../../store';
import { loginSuccess, logout } from '../../store/slices/authSlice';
import { setLanguage, toggleTheme } from '../../store/slices/uiSlice';
import { saveSetup } from '../onboarding/onboarding-store';
import { readSettings, settingsKey } from '../settings/data';

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
      store.dispatch(logout());
      const { auth, db } = await gosFirebase();
      try {
        const { user } = await signInWithCustomToken(auth, token);
        const claims = (await user.getIdTokenResult()).claims;
        if (!claims.phoenixUid || !claims.tenantId) throw new Error('Invalid platform session.');
        const current = (await getDoc(doc(db, 'users', user.uid, 'brandEngine', 'current'))).data();
        if (current?.status !== 'prepared' || current.sourceUid !== claims.phoenixUid || current.tenantId !== claims.tenantId) throw new Error('لم يكتمل تجهيز منصتك. أعد المحاولة من Phoenix.');
        const snapshotRef = doc(db, 'users', user.uid, 'brandEngineSnapshots', current.snapshotId);
        const [pagesResult, assetsResult] = await Promise.all([
          getDocs(collection(snapshotRef, 'pages')),
          getDocs(collection(snapshotRef, 'assets')),
        ]);
        const pages = Object.fromEntries(pagesResult.docs.map(page => [page.id, page.data()]));
        if (current.pageIds.some((id: string) => !pages[id] || pages[id].revision !== current.sourceRevision)) throw new Error('Your saved configuration is incomplete.');
        const assets = Object.fromEntries(assetsResult.docs.map(asset => [asset.id, asset.data()]));
        const brand = current.brand;
        let logo = '';
        const asset = assets[brand.logoAssetId];
        if (asset) {
          logo = asset.encoding === 'chunked-data-url-v1'
            ? Array.from({ length: asset.chunkCount }, (_, index) => assets[`${brand.logoAssetId}-part-${index}`]?.dataUrl || '').join('')
            : asset.dataUrl || '';
          if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo)) logo = '';
        }
        const email = user.email || '';
        // Apply the confirmed server-owned identity; source settings cannot grant admin access.
        store.dispatch(loginSuccess({ user: { id: user.uid, email, name: user.displayName || email.split('@')[0] }, role: 'USER', tenant: { id: String(claims.tenantId), name: brand.name, logo }, token: await user.getIdToken() }));
        // Full pages and image chunks stay in Firestore; browser storage has a small quota.
        try { localStorage.setItem(`gos.phoenix:${user.uid}`, JSON.stringify(current)); } catch { /* The confirmed configuration remains in Firestore. */ }
        const settingsLogo = logo.length < 200000 ? logo : '';
        saveSetup(email, { onboarding_completed: true, step: 5, name: brand.name, description: brand.description, industry: brand.business, logo: settingsLogo, color: brand.theme?.light?.primary || '#7546f5', language: brand.language });
        const settings = readSettings();
        try { localStorage.setItem(settingsKey(), JSON.stringify({ ...settings, profile: { ...settings.profile, name: user.displayName || '', email, photo: '', phone: '', bio: '', language: brand.language }, business: { ...settings.business, name: brand.name, description: brand.description, type: brand.business, email, logo: settingsLogo, phone: '', color: brand.theme?.light?.primary || '#7546f5' } })); } catch { /* Keep the server-owned configuration available when browser storage is full. */ }
        store.dispatch(setLanguage(brand.language));
        if (store.getState().ui.theme !== brand.mode) store.dispatch(toggleTheme());
        navigate('/dashboard', { replace: true });
      } catch (error) {
        store.dispatch(logout());
        await signOut(auth);
        throw error;
      }
    })().catch(error => setError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول.'));
  }, [navigate]);
  return <main className="min-h-screen grid place-content-center gap-5 p-8 text-center" dir="rtl"><h1>{error ? 'تعذر فتح المنصة' : 'جارٍ فتح منصتك…'}</h1>{error && <><p role="alert">{error}</p><a href="https://phoenix-app-8bc7b.web.app/dashboard">الرجوع إلى Phoenix</a><Link to="/auth/login">تسجيل الدخول</Link></>}</main>;
}
