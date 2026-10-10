
import { CalendarDays } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { resolveBrandingName } from './model';

export function BookingBrandingFooter({hostName,visible=true}:{hostName?:string;visible?:boolean}) {
  const userName=useSelector((state:RootState)=>state.auth.isAuthenticated?state.auth.user?.name:undefined);
  if(!visible)return null;
  return <footer className="bk-powered"><CalendarDays size={13}/>Powered by {resolveBrandingName(hostName,userName)}</footer>;
}

