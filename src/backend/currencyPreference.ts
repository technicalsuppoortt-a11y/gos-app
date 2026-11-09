import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { isCurrencyCode, type CurrencyCode } from '../utils/currency';
import { browserStorage } from '../utils/browserStorage';
import { showToast } from '../utils/toast';
import { auth, backendError, db } from './firebase';

type CachedPreference = { value: CurrencyCode | null; pending?: string };
const keyFor = (uid: string) => `preferred_currency:${uid}`;

function readPreference(uid: string): CachedPreference | undefined {
  try {
    const entry = JSON.parse(browserStorage.getItem(keyFor(uid)) ?? 'null');
    if (entry?.value === null || isCurrencyCode(entry?.value)) {
      return { value: entry.value, pending: typeof entry.pending === 'string' ? entry.pending : undefined };
    }
  } catch { /* Fall back to the workspace preference. */ }
}

export function useCurrencyPreference(uid: string) {
  const [cached, setCached] = useState<{ uid: string; entry?: CachedPreference }>();
  const entry = uid ? cached?.uid === uid ? cached.entry : readPreference(uid) : undefined;

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      const remote = snapshot.data()?.preferredCurrency;
      const value = remote === null || isCurrencyCode(remote) ? remote : undefined;
      const current = readPreference(uid);
      if (current?.pending && current.value !== value) return;
      if (value === undefined) browserStorage.removeItem(keyFor(uid));
      else browserStorage.setItem(keyFor(uid), JSON.stringify({ value }));
      setCached(cached => cached?.uid === uid && cached.entry?.value === value && !cached.entry?.pending
        ? cached : { uid, entry: value === undefined ? undefined : { value } });
    }, error => console.warn('Currency preference could not be loaded', backendError(error)));
  }, [uid]);

  const pending = entry?.pending;
  const value = entry?.value;
  useEffect(() => {
    if (!uid || !pending || value === undefined || auth.currentUser?.uid !== uid) return;
    let active = true;
    void updateDoc(doc(db, 'users', uid), { preferredCurrency: value }).then(() => {
      if (readPreference(uid)?.pending !== pending) return;
      const confirmed = { value };
      browserStorage.setItem(keyFor(uid), JSON.stringify(confirmed));
      if (active) setCached({ uid, entry: confirmed });
    }, error => {
      if (active) showToast.error(backendError(error));
    });
    return () => { active = false; };
  }, [uid, pending, value]);

  return {
    value,
    setCurrencyPreference(value: CurrencyCode | null) {
      if (!uid) return;
      const entry = { value, pending: crypto.randomUUID() };
      browserStorage.setItem(keyFor(uid), JSON.stringify(entry));
      setCached({ uid, entry });
    },
  };
}
