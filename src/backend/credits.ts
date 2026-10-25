import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { RootState } from '../store';
export function useCredits() {
  const { tenant, user } = useSelector((state: RootState) => state.auth);
  const scope = `${tenant?.id ?? ''}:${user?.id ?? ''}`;
  const [value, setValue] = useState<{ scope: string; balance: number | null }>({ scope: '', balance: null });
  useEffect(() => {
    if (!tenant?.id || !user?.id) return;
    const key = `gos-settings-v1:${tenant.id}:${user.id}`;
    return onSnapshot(doc(db, 'tenants', tenant.id, 'workspaceState', encodeURIComponent(key)), snapshot => {
      const balance = snapshot.data()?.value?.balance;
      setValue({ scope, balance: typeof balance === 'number' && Number.isFinite(balance) && balance >= 0 ? balance : null });
    }, () => setValue({ scope, balance: null }));
  }, [tenant?.id, user?.id, scope]);
  return value.scope === scope ? value.balance : null;
}
