import { SupportQuickChat } from '../../pages/support/SupportQuickChat';
import { logoutFirebase } from '../../backend/session';
import { showToast as authToast } from '../../utils/toast';
import { useUILanguage } from '../../i18n/display';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { X, ShieldCheck, LogOut, Grid2X2, MessagesSquare, Lock } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Header } from './Header';
import { SubAccountSwitcher } from './SubAccountSwitcher';
import { useSubscription, isLive } from '../../backend/billing';

import { modules } from '../../pages/admin/catalog';
import '../../pages/admin/admin-workspace.css';
import { AdminGroupNav, dashboardModules } from '../../pages/admin/AdminGroups';
export function AdminLayout() {
 const language=useUILanguage(); const ar=language.startsWith('ar'); const location=useLocation(); const navigate=useNavigate(); const dispatch=useDispatch(); const [open,setOpen]=useState(false);
 const user=useSelector((s:RootState)=>s.auth.user); const role=useSelector((s:RootState)=>s.auth.role);
 const { data: sub, loading: subLoading } = useSubscription(user?.id ?? null);
 const live = isLive(sub);
 const isLocked = role === 'ADMIN' && !subLoading && !live;

 useEffect(() => {
   if (isLocked) {
     const isAllowed = location.pathname === '/admin/plans' || location.pathname.startsWith('/admin/plans/') || location.pathname === '/admin/support';
     if (!isAllowed) {
       navigate('/admin/plans?area=mine', { replace: true });
     }
   }
 }, [isLocked, location.pathname, navigate]);

 const active=modules.find(m=>location.pathname.replace(/\/$/,'')===`/admin/${m.id==='funnels-websites'?'funnels':m.id}`||location.pathname.replace(/\/$/,'')===`/admin/${m.id}`)??modules[0];
 const [collapsed,setCollapsed]=useState(false);
 const sidebarRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const nodes=()=>Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button')??[]).filter(n=>n.getClientRects().length);nodes()[0]?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const controls=nodes(),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};const resize=()=>{if(window.innerWidth>768)setOpen(false);};document.addEventListener('keydown',key);window.addEventListener('resize',resize);return()=>{document.removeEventListener('keydown',key);window.removeEventListener('resize',resize);previous?.focus();};},[open]);
 return <div className="adm-shell" dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'}>
 {open&&<button className="adm-scrim" aria-label={ar?'إغلاق القائمة':'Close navigation'} onClick={()=>setOpen(false)}/>}
 <aside ref={sidebarRef} role={open?"dialog":undefined} aria-modal={open?true:undefined} aria-label={ar?"إدارة المنصة":"Admin navigation"} className={`adm-sidebar ${open?'is-open':''} ${collapsed?'is-collapsed':''}`}><div className="layout-brand-row adm-brand-row" style={{ padding: '0 4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><NavLink to="/admin" className="layout-brand" onClick={()=>setOpen(false)} title={collapsed ? 'Upclick' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}><span className="layout-brand-icon"><img src="/upclick-mark.svg" alt="" width="32" height="32" /></span>{!collapsed && <div className="layout-brand-copy"><span className="layout-brand-wordmark"><b>Upclick</b></span><small>Ideas to impact</small></div>}</NavLink><button className="adm-mobile" onClick={()=>setOpen(false)} aria-label={ar?'إغلاق':'Close'}><X size={18}/></button></div><div className="adm-admin-label"><ShieldCheck size={14}/>{ar?'إدارة المنصة':'PLATFORM ADMIN'}</div><div className="adm-switcher-wrap" style={{ padding: '0 4px 12px' }}><SubAccountSwitcher isCollapsed={collapsed} /></div><nav aria-label={ar?'إدارة المنصة':'Admin navigation'}>{modules.filter(m=>!['leads','domains','onboarding','transactions','ai-usage','integrations',...dashboardModules].includes(m.id)).map(m=>{
   const itemDisabled = isLocked && m.id !== 'plans';
   return <NavLink key={m.id} aria-label={m.title[ar?1:0]} title={itemDisabled ? (ar ? 'يلزم الاشتراك' : 'Subscription required') : m.title[ar?1:0]} to={itemDisabled ? '/admin/plans?area=mine' : `/admin/${m.id==='funnels-websites'?'funnels':m.id}`} onClick={e=>{ if (itemDisabled) { authToast.info(ar ? 'يلزم الاشتراك في باقة للوصول إلى هذه الميزة.' : 'Subscription required to access this feature.'); } setOpen(false); }} className={({isActive})=>`${isActive?'active':''}${itemDisabled?' opacity-50':''}`}><m.icon size={17}/><span>{m.title[ar?1:0]}</span>{itemDisabled && <Lock size={12} className="ml-auto opacity-70" />}</NavLink>;
 })}<NavLink to={isLocked ? '/admin/plans?area=mine' : '/admin/funnels'} onClick={e=>{ if (isLocked) { authToast.info(ar ? 'يلزم الاشتراك في باقة للوصول إلى هذه الميزة.' : 'Subscription required to access this feature.'); } setOpen(false); }} className={isLocked ? 'opacity-50' : ''}><Grid2X2 size={17}/><span>{ar?'إدارة لوحة التحكم':'Dashboard Management'}</span>{isLocked && <Lock size={12} className="ml-auto opacity-70" />}</NavLink><NavLink to="/admin/support" onClick={()=>setOpen(false)}><MessagesSquare size={17}/><span>{ar?'الدعم':'Support'}</span></NavLink></nav><footer><span className="adm-avatar">{user?.name?.slice(0,2)??'AD'}</span><div><b>{user?.name??(ar?'المسؤول':'Administrator')}</b><small>{ar?'مسؤول المنصة':'Platform administrator'}</small></div><button title={ar?'تسجيل الخروج':'Sign out'} onClick={()=>{void logoutFirebase().catch(error => authToast.error(error.message));navigate('/auth/login');}}><LogOut size={16}/></button></footer></aside>
 <div className="adm-body"><div className="adm-shared-header"><Header title={location.pathname === '/admin/support' ? (ar ? 'الدعم' : 'Support') : location.pathname === '/admin/marketing-tracking' ? (ar ? 'تتبع التسويق' : 'Marketing Tracking') : active.title[ar?1:0]} onMenu={()=>{if(window.innerWidth<=768)setOpen(true);else setCollapsed(value=>!value);}}/></div><main className="adm-main">{isLocked && location.pathname !== '/admin/plans' && location.pathname !== '/admin/support' ? <div style={{ padding: '40px 24px', maxWidth: 600, margin: '40px auto', textAlign: 'center', background: 'var(--bl-card-bg, #fff)', border: '1px solid var(--bl-card-border, #e2e8f0)', borderRadius: 16 }}><div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Lock size={28} /></div><h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>{ar ? 'يلزم الاشتراك لتفعيل لوحة التحكم' : 'Subscription Required'}</h2><p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 14, lineHeight: 1.5 }}>{ar ? 'لم يتم تفعيل باقة مجانية لحسابك. يرجى الاشتراك في إحدى باقات المنصة لفتح جميع الأدوات والمزايا.' : 'No active free plan is available for your account. Please subscribe to a platform plan to unlock all tools and features.'}</p><button type="button" onClick={() => navigate('/admin/plans?area=mine')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#7C3AED', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>{ar ? 'الانتقال إلى الباقات والاشتراك' : 'Go to Plans & Checkout'}</button></div> : <>{dashboardModules.includes(active.id)&&<AdminGroupNav group="management"/>}{['settings','integrations','ai-usage','transactions'].includes(active.id)&&<AdminGroupNav group="settings"/>}<Outlet/></>}</main></div>
 <SupportQuickChat/></div>;
}

