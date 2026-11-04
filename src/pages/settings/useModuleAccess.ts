import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { settingsApiEnabled } from './data';
import { readTeam } from './localState';
import type { Member } from './localState';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/firebase';

export function useModuleAccess() {
  const auth = useSelector((state: RootState) => state.auth);
  const [members, setMembers] = useState<Member[]>(() => (settingsApiEnabled ? [] : readTeam().members));
  useEffect(() => {
    setMembers([]);
    if (!auth.user || !auth.tenant) return;
    return onSnapshot(
      doc(db, 'tenants', auth.tenant.id, 'members', auth.user.id),
      snapshot => {
        setMembers(
          snapshot.exists()
            ? [{ ...snapshot.data(), id: auth.user!.id, name: auth.user!.name, email: auth.user!.email } as Member]
            : []
        );
      },
      () => setMembers([])
    );
  }, [auth.tenant?.id, auth.user?.id]);
  const member = members.find(
    m => m.id === auth.user?.id || m.email?.toLowerCase() === auth.user?.email?.toLowerCase()
  );
  return (module: string) => {
    if (!member) return true;
    if (member.role === 'Owner' || member.permissions?.includes('*') || member.permissions?.includes(module)) {
      return true;
    }
    return !Array.isArray(member.permissions) || member.permissions.length === 0;
  };
}

export function moduleForPath(path: string) {
  const section = path.replace(/^\/dashboard\/?/, '').replace(/^\//, '').split('/')[0];
  return section === 'marketing-tracking'
    ? 'settings'
    : section === 'knowledge'
    ? 'copilot'
    : section === 'contacts'
    ? 'crm'
    : section === 'websites' || section === 'forms' || section === 'domains'
    ? 'funnels'
    : section === 'products-payments'
    ? 'products'
    : section === ''
    ? 'home'
    : section;
}
