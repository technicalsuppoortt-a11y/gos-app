import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useUILanguage } from '../i18n/display';
import { auth, callBackend } from './firebase';

export function AgencyLandingSeed() {
  const user = useSelector((state: RootState) => state.auth.user);
  const language = useUILanguage();
  const uid = user?.accountType === 'agency' ? user.id : null;
  useEffect(() => {
    if (!uid || auth.currentUser?.uid !== uid) return;
    void callBackend('prepareAgencyWorkspace', { language }).catch(error => {
      console.warn('Could not prepare the Agency user workspace.', error);
    });
  }, [uid, language]);
  return null;
}
