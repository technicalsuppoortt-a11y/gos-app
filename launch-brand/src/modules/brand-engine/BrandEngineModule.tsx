import { useEffect, useLayoutEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { useStore } from '../../store/useStore';
import JoeAcademyLoader from '../../components/ui/JoeAcademyLoader';
import { auth } from './firebase';
import { store } from './store';
import { actions } from './store/brandSlice';
import { bindDisplayPreferences, syncDisplayPreferences } from './store/syncDisplayPreferences';
import { usePhoenixTheme } from './hooks/usePhoenixTheme';
import { loadBrandDraft, loadPhoenixPreparation } from './services/brandDraft';
import { bindBrandDraftLifecycle } from './services/brandDraftLifecycle';
import { saveFailureCode, saveFailureMessage } from './data/saveFailure';
import { AppShell } from './components/brandengine/AppShell';
import { preloadWorkspacePage } from './pages/workspacePages';
import { fingerprintBrandPages } from './data/brandPages';
import './academy-theme.css';

export default function BrandEngineModule({ headerTarget }: { headerTarget?: HTMLElement | null }) {
  const user = useStore(state => state.user);
  const language = useStore(state => state.language);
  const theme = usePhoenixTheme();
  const [owner, setOwner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useLayoutEffect(() => bindDisplayPreferences(store, useStore), []);
  useEffect(() => {
    let current = true;
    setOwner(null);
    setError(null);
    store.dispatch(actions.resetUserDraft());
    if (!user?.uid) return;
    const uid = user.uid;
    preloadWorkspacePage();
    void loadBrandDraft(uid, { workspaceOnly: true, progress: useStore.getState().userProfile?.brandEngineProgress }).then(draft => {
      if (!current || auth.currentUser?.uid !== uid) return;
      store.dispatch(actions.hydrateUserDraft(draft));
      // A saved draft must not override the current Phoenix display preferences.
      const preferences = useStore.getState();
      syncDisplayPreferences(store, preferences);
      store.dispatch(actions.setUserProfile({ uid, displayName: user.displayName || '', email: user.email || '' }));
      const { mode, activeStep } = store.getState().brand;
      preloadWorkspacePage(mode, activeStep);
      setOwner(uid);
      // Preparation depends on the loaded draft revision. It must neither race
      // that read nor hold the entire workspace behind a second request.
      void loadPhoenixPreparation(uid).then(preparation => {
        if (current && auth.currentUser?.uid === uid && preparation &&
            store.getState().brand.phoenixPreparation.state === 'idle' &&
            fingerprintBrandPages(store.getState().brand) === preparation.fingerprint)
          store.dispatch(actions.setPhoenixPreparation(preparation));
      }).catch(error => {
        if (current) console.warn('[Launch Brand] Could not restore preparation', { code: saveFailureCode(error) });
      });
    }).catch(error => {
      if (current) {
        console.warn('[Launch Brand] Could not load saved workspace', { code: saveFailureCode(error), reason: error instanceof Error ? error.message : 'Unknown load error' });
        setError(saveFailureCode(error));
      }
    });
    return () => {
      current = false;
    };
  }, [user?.uid, attempt]);
  useEffect(() => {
    if (owner && owner === user?.uid) return bindBrandDraftLifecycle(owner);
    return undefined;
  }, [owner, user?.uid]);
  useEffect(() => {
    syncDisplayPreferences(store, { language, theme });
  }, [language, theme, owner]);
  return <Provider store={store}>
    <section className={`brand-engine-module ${theme}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {error ? <div className="launch-brand-load-error" role="alert">
        <h1>{language === 'ar' ? 'تعذّر تحميل مساحة البراند' : 'Could not load your brand workspace'}</h1>
        <p>{saveFailureMessage(error, language === 'ar')}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
      </div>
        : owner !== user?.uid || !owner ? <JoeAcademyLoader /> : <AppShell headerTarget={headerTarget} />}
    </section>
  </Provider>;
}
