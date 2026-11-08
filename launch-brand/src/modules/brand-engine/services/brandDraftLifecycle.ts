import { store } from '../store';
import { activityActions } from '../store/activitySlice';
import { saveFailureCode } from '../data/saveFailure';
import { hasUnsavedBrandDraft, saveBrandDraft } from './brandDraft';

// Flush React navigation and backgrounding; protect edits still awaiting the server.
export function bindBrandDraftLifecycle(uid: string) {
  const flush = () => {
    if (!hasUnsavedBrandDraft(uid)) return;
    void saveBrandDraft().catch(error => {
      if (store.getState().brand.userProfile?.uid === uid)
        store.dispatch(activityActions.saveFailed(saveFailureCode(error)));
    });
  };
  const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsavedBrandDraft(uid)) return;
    flush();
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', beforeUnload);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    window.removeEventListener('pagehide', flush);
    window.removeEventListener('beforeunload', beforeUnload);
    document.removeEventListener('visibilitychange', visibility);
    flush();
  };
}
