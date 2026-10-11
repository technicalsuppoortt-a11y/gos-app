import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { settingsApiEnabled, settingsRequest } from './data';
import { readTeam } from './localState';
import type { Member } from './localState';
export function useModuleAccess() {
 const auth = useSelector((state: RootState) => state.auth);
 const [members, setMembers] = useState<Member[]>(() => settingsApiEnabled ? [] : readTeam().members);
 useEffect(() => {
   let disposed = false;
   const refresh = () => {
     if (!settingsApiEnabled) { setMembers(readTeam().members); return; }
     void settingsRequest<{ members: Member[] }>('/team').then(result => { if (!disposed) setMembers(result.members); }).catch(() => { /* Route and API authorization remain owned by the backend. */ });
   };
   refresh(); window.addEventListener('gos-settings-changed', refresh); window.addEventListener('storage', refresh);
   return () => { disposed = true; window.removeEventListener('gos-settings-changed', refresh); window.removeEventListener('storage', refresh); };
 }, [auth.tenant?.id, auth.user?.id]);
 const member = members.find(member => member.id === auth.user?.id || member.email.toLowerCase() === auth.user?.email?.toLowerCase());
 return (module: string) => !member || member.role === 'Owner' || (member.active && (member.permissions?.includes(module) ?? true));
}
export function moduleForPath(path: string) {
 const section = path.replace(/^\/dashboard\/?/, '').replace(/^\//, '').split('/')[0];
 return section === 'knowledge' ? 'copilot' : section === 'websites' || section === 'domains' ? 'funnels' : section === 'products-payments' ? 'products' : section === '' ? 'home' : section;
}
