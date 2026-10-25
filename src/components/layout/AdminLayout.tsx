import { logoutFirebase } from '../../backend/session';
import { showToast as authToast } from '../../utils/toast';
import { useUILanguage } from '../../i18n/display';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { X, ShieldCheck, LogOut, Radio } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { Header } from './Header';

import { modules } from '../../pages/admin/catalog';
import '../../pages/admin/admin-workspace.css';
export function AdminLayout() {
 const language=useUILanguage(); const ar=language.startsWith('ar'); const location=useLocation(); const navigate=useNavigate(); const dispatch=useDispatch(); const [open,setOpen]=useState(false);
 const user=useSelector((s:RootState)=>s.auth.user); const active=modules.find(m=>location.pathname.replace(/\/$/,'')===`/admin/${m.id==='funnels-websites'?'funnels':m.id}`||location.pathname.replace(/\/$/,'')===`/admin/${m.id}`)??modules[0];
 const [collapsed,setCollapsed]=useState(false);
 const sidebarRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const nodes=()=>Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button')??[]).filter(n=>n.getClientRects().length);nodes()[0]?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const controls=nodes(),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};const resize=()=>{if(window.innerWidth>768)setOpen(false);};document.addEventListener('keydown',key);window.addEventListener('resize',resize);return()=>{document.removeEventListener('keydown',key);window.removeEventListener('resize',resize);previous?.focus();};},[open]);
 return <div className="adm-shell" dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'}>
 {open&&<button className="adm-scrim" aria-label={ar?'إغلاق القائمة':'Close navigation'} onClick={()=>setOpen(false)}/>}
 <aside ref={sidebarRef} role={open?"dialog":undefined} aria-modal={open?true:undefined} aria-label={ar?"إدارة المنصة":"Admin navigation"} className={`adm-sidebar ${open?'is-open':''} ${collapsed?'is-collapsed':''}`}><div className="adm-brand"><strong>GOS<span>.</span></strong><button className="adm-mobile" onClick={()=>setOpen(false)} aria-label={ar?'إغلاق':'Close'}><X size={18}/></button></div><div className="adm-admin-label"><ShieldCheck size={14}/>{ar?'إدارة المنصة':'PLATFORM ADMIN'}</div><nav aria-label={ar?'إدارة المنصة':'Admin navigation'}>{modules.filter(m=>m.id!=='leads').map(m=><NavLink key={m.id} aria-label={m.title[ar?1:0]} title={m.title[ar?1:0]} to={`/admin/${m.id==='funnels-websites'?'funnels':m.id}`} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'active':''}><m.icon size={17}/><span>{m.title[ar?1:0]}</span></NavLink>)}<NavLink to="/admin/marketing-tracking" onClick={()=>setOpen(false)} className={({isActive})=>isActive?'active':''}><Radio size={17}/><span>{ar?'تتبع التسويق':'Marketing Tracking'}</span></NavLink></nav><footer><span className="adm-avatar">{user?.name?.slice(0,2)??'AD'}</span><div><b>{user?.name??(ar?'المسؤول':'Administrator')}</b><small>{ar?'مسؤول المنصة':'Platform administrator'}</small></div><button title={ar?'تسجيل الخروج':'Sign out'} onClick={()=>{void logoutFirebase().catch(error => authToast.error(error.message));navigate('/auth/login');}}><LogOut size={16}/></button></footer></aside>
 <div className="adm-body"><div className="adm-shared-header"><Header title={location.pathname === '/admin/marketing-tracking' ? (ar ? 'تتبع التسويق' : 'Marketing Tracking') : active.title[ar?1:0]} onMenu={()=>{if(window.innerWidth<=768)setOpen(true);else setCollapsed(value=>!value);}}/></div><main className="adm-main"><Outlet/></main></div>
 </div>;
}
