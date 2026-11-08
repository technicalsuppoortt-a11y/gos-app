import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { readLogoHistory, usedLogoAttempts } from '../services/logoHistory.js';
import type { BrandElementCandidate } from '../data/brandTheme';
import { retrySubscription } from '../services/retrySubscription.js';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

export function useLogoAttempts(uid: string | undefined, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const cache = useRef<{
    uid: string; slots: { requestId: string }[];
    history: { requestIds: string[]; suggestions: BrandElementCandidate[] };
  } | null>(null);
  const [value, setValue] = useState<{
    uid: string; used: number; error: boolean; loading: boolean;
    historyLoading: boolean; historyError: boolean; suggestions: BrandElementCandidate[]; diagnostic: string;
  } | null>(null);
  useEffect(() => {
    if (!uid || !enabled) return;
    let active = true;
    const previous = cache.current?.uid === uid ? cache.current : null;
    let slots: { requestId: string }[] = previous?.slots || [];
    let history = previous?.history || { requestIds: [] as string[], suggestions: [] as BrandElementCandidate[] };
    let loading = true, error = false, historyLoading = true, historyError = false, diagnostic = '';
    const publish = () => {
      if (active) {
        cache.current = { uid, slots, history };
        setValue({ uid, used: usedLogoAttempts(slots, history.requestIds), loading, error,
          historyLoading, historyError, suggestions: history.suggestions, diagnostic });
      }
    };
    publish();
    const stops = [
      retrySubscription<QuerySnapshot<DocumentData>>((success, failure) => onSnapshot(collection(db, 'users', uid, 'logoGenerationCredits'), success, failure), snapshot => {
        slots = snapshot.docs.map(item => item.data() as { requestId: string });
        loading = false; error = false; diagnostic = ''; publish();
      }, failure => { loading = false; error = true; diagnostic = failure.code; publish(); }),
      retrySubscription<QuerySnapshot<DocumentData>>((success, failure) => onSnapshot(query(collection(db, 'users', uid, 'aiJobs'), where('kind', '==', 'generateBrandElement')), success, failure), snapshot => {
        history = readLogoHistory(snapshot.docs.map(item => ({ id: item.id, data: item.data() })));
        historyLoading = false; historyError = false; publish();
      }, () => { historyLoading = false; historyError = true; publish(); }),
    ];
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [uid, enabled, revision]);
  const current = value && value.uid === uid ? value : {
    used: 0, loading: true, error: false, suggestions: [] as BrandElementCandidate[],
    historyLoading: true, historyError: false, diagnostic: '',
  };
  return { ...current, retry: () => setRevision(old => old + 1) };
}
