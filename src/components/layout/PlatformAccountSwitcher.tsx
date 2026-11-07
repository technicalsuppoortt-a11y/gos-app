import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { backendError, primaryDb } from '../../backend/firebase';
import { WorkspaceSwitcher, type SwitchableAccount } from './SubAccountSwitcher';

export function PlatformAccountSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
  const [source, setSource] = useState<{ accounts: SwitchableAccount[]; message: string }>({ accounts: [], message: 'Loading workspaces…' });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    return onSnapshot(query(collection(primaryDb, 'users'), where('role', 'in', ['ADMIN', 'USER'])), snapshot => {
      const accounts = snapshot.docs.flatMap(row => {
        const { role, status, tenantId, name, email, contactEmail, activatedUid, deletedAt, accountType } = row.data();
        const workspaceId = typeof tenantId === 'string' && tenantId ? tenantId : role === 'ADMIN' ? row.id : '';
        if ((role !== 'ADMIN' && role !== 'USER') || !/^(active|activated)$/i.test(status) || !workspaceId || activatedUid || deletedAt) return [];
        const address = typeof email === 'string' ? email : typeof contactEmail === 'string' ? contactEmail : '';
        return [{ id: row.id, name: typeof name === 'string' ? name : address, email: address, tenantId: workspaceId, role, status: 'Active', accountType: accountType === 'agency' ? 'agency' : undefined } satisfies SwitchableAccount];
      });
      accounts.sort((a, b) => a.name.localeCompare(b.name));
      setSource({ accounts, message: '' });
    }, cause => setSource({ accounts: [], message: backendError(cause) }));
  }, [open]);
  return <WorkspaceSwitcher platform isCollapsed={isCollapsed} liveInvites={source.accounts} sourceMessage={source.message} onOpenChange={setOpen}/>;
}
