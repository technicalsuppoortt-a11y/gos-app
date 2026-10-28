import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { RootState } from '../store';
export function useCredits() {
  const { tenant, user } = useSelector((state: RootState) => state.auth);
  const scope = `${tenant?.id ?? ''}:${user?.id ?? ''}`;
  const [value, setValue] = useState<{ scope: string; balance: number | null }>({ scope: '', balance: null });
  // Billing-engine wallet (plans & subscriptions). When present it is the authoritative credit balance.
  const [wallet, setWallet] = useState<{ scope: string; balance: number | null }>({ scope: '', balance: null });
  useEffect(() => {
    if (!tenant?.id || !user?.id) return;
    const key = `gos-settings-v1:${tenant.id}:${user.id}`;
    return onSnapshot(doc(db, 'tenants', tenant.id, 'workspaceState', encodeURIComponent(key)), snapshot => {
      const balance = snapshot.data()?.value?.balance;
      setValue({ scope, balance: typeof balance === 'number' && Number.isFinite(balance) && balance >= 0 ? balance : null });
    }, () => setValue({ scope, balance: null }));
  }, [tenant?.id, user?.id, scope]);
  useEffect(() => {
    if (!user?.id) return;
    return onSnapshot(doc(db, 'billingWallets', user.id), snapshot => {
      const balance = snapshot.exists() ? snapshot.data()?.balance : undefined;
      setWallet({ scope, balance: typeof balance === 'number' && Number.isFinite(balance) ? balance : null });
    }, () => setWallet({ scope, balance: null }));
  }, [user?.id, scope]);
  if (wallet.scope === scope && wallet.balance !== null) return wallet.balance;
  return value.scope === scope ? value.balance : null;
}
