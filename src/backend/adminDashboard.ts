import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { firebaseApp, primaryAuth, backendError } from './firebase';
import type { RootState } from '../store';
export type DashboardHealthItem = { id: string; name: string; kind: string; status: 'healthy' | 'error' | 'unreachable' | 'disabled' | 'unverified'; mode: string; detail: string; latencyMs: number | null };
export type DashboardHealth = { checkedAt: string; services: DashboardHealthItem[]; gateways: DashboardHealthItem[] };
const functions = getFunctions(firebaseApp, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');
const checkStatus = httpsCallable<undefined, DashboardHealth>(functions, 'adminDashboardStatus', { timeout: 30000 });
export function useDashboardHealth(reload: number) {
  const { user, role, impersonation } = useSelector((s: RootState) => s.auth);
  const scope = `${user?.id ?? ''}:${role}:${!!impersonation}:${reload}`;
  const [state, setState] = useState<{ scope: string; data: DashboardHealth | null; loading: boolean; error: string }>({ scope, data: null, loading: true, error: '' });
  useEffect(() => {
    let active = true, generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const empty = { scope, data: null, loading: true, error: '' };
    setState(empty);
    if (!user || impersonation || !['ADMIN', 'SUPER_ADMIN'].includes(role ?? '')) { setState({ ...empty, loading: false, error: 'Administrator access is required.' }); return; }
    const stop = () => { generation++; clearTimeout(timer); };
    const unsubscribe = onAuthStateChanged(primaryAuth, account => {
      stop(); setState(empty);
      if (account?.uid !== user.id) { setState({ ...empty, loading: false, error: 'Waiting for the administrator session.' }); return; }
      const session = generation;
      const check = async () => {
        if (!active || generation !== session) return;
        setState(empty);
        try {
          const result = await checkStatus();
          if (!result.data || typeof result.data.checkedAt !== 'string' || !Array.isArray(result.data.services) || !Array.isArray(result.data.gateways)) throw new Error('The backend returned an invalid health report.');
          if (active && generation === session) setState({ scope, data: result.data, loading: false, error: '' });
        } catch (error) { if (active && generation === session) setState({ ...empty, loading: false, error: backendError(error) }); }
        if (active && generation === session) timer = setTimeout(() => void check(), 60000);
      };
      void check();
    });
    return () => { active = false; stop(); unsubscribe(); };
  }, [scope, reload, user?.id, role, !!impersonation]);
  return state.scope === scope ? state : { data: null, loading: true, error: '' };
}
