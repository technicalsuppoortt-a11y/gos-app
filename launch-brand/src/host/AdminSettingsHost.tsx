import { useEffect, useState } from 'react';
import { inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { PLATFORM_ENDPOINT } from './config';
import AICenterManagementTab from '../pages/admin/tabs/AICenterManagementTab';
import BusinessDiscoveryManagementTab from '../pages/admin/tabs/BusinessDiscoveryManagementTab';

export default function AdminSettingsHost() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const page = new URLSearchParams(window.location.search).get('tab');
  useEffect(() => {
    let active = true;
    let busy = false;
    const announce = () => window.parent.postMessage({ type: 'launch-brand-admin-ready' }, window.location.origin);
    const receive = async (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin || window.parent === window) return;
      if (event.data?.type === 'launch-brand-admin-connect') { announce(); return; }
      if (event.data?.type !== 'launch-brand-admin-session' || typeof event.data.token !== 'string' || busy) return;
      busy = true;
      setReady(false); setError('');
      try {
        await setPersistence(auth, inMemoryPersistence);
        const response = await fetch(PLATFORM_ENDPOINT, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${event.data.token}` },
          body: JSON.stringify({ action: 'launch-brand-admin-session' }), signal: AbortSignal.timeout(60000),
        });
        const result = await response.json();
        if (!response.ok || !result.customToken) throw new Error(result.error || 'Could not open Launch Brand settings.');
        if (!active) return;
        const { user } = await signInWithCustomToken(auth, result.customToken);
        const claims = (await user.getIdTokenResult()).claims;
        if (claims.launchBrandAdmin !== true) throw new Error('Platform administrator access required.');
        const profile = (await getDoc(doc(db, 'users', user.uid))).data();
        if (!active) return;
        const state = useStore.getState();
        state.setUser(user); state.setUserProfile(profile ? { id: user.uid, ...profile } : null);
        state.setRole('admin'); state.setLanguage(event.data.language === 'ar' ? 'ar' : 'en');
        state.setTheme(event.data.theme === 'dark' ? 'dark' : 'light');
        state.setAuthenticated(true); state.setIsAuthLoading(false);
        document.documentElement.dir = event.data.language === 'ar' ? 'rtl' : 'ltr';
        setReady(true);
      } catch (cause) {
        await signOut(auth).catch(() => undefined);
        if (active) setError(cause instanceof Error ? cause.message : 'Could not open settings.');
      } finally { busy = false; }
    };
    window.addEventListener('message', receive);
    if (window.parent !== window) announce();
    else setError('Open Launch Brand Settings from the GOS admin dashboard.');
    return () => { active = false; window.removeEventListener('message', receive); };
  }, []);
  if (error) return <p role="alert" style={{ padding: 24 }}>{error}</p>;
  if (!ready) return <p role="status" style={{ padding: 24 }}>Loading Launch Brand Settings…</p>;
  return <div style={{ padding: 20 }}>{page === 'business-discovery' ? <BusinessDiscoveryManagementTab /> : <AICenterManagementTab />}</div>;
}
