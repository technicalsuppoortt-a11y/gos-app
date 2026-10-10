
import { useEffect, useId, useState } from 'react';
import { Activity, Info } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { dateKey, formatTime, KEYS, subscribeStored } from './model';
import type { Appointment, BookingPage, TroubleshootSlot } from './model';

type SyncState = {syncStatus:'connecting'|'synced'|'error';lastSyncedTime:string};
// The reference monitors Firestore. GOS currently synchronizes through browser storage.
export function readBookingSync():SyncState {
  try {
    for(const key of [KEYS.pages,KEYS.appointments]){
      const raw=localStorage.getItem(key);
      if(raw!==null&&!Array.isArray(JSON.parse(raw)))throw new Error('Invalid booking storage');
    }
    return {syncStatus:'synced',lastSyncedTime:new Date().toLocaleTimeString()};
  }catch{return {syncStatus:'error',lastSyncedTime:''}}
}
export function TroubleshootControls({page,bookings,checked,change}:{page:BookingPage;bookings:Appointment[];checked:boolean;change:(value:boolean)=>void}) {
  const panelId=useId();
  const [sync,setSync]=useState<SyncState>({syncStatus:'connecting',lastSyncedTime:''});
  useEffect(()=>{
    setSync({syncStatus:'connecting',lastSyncedTime:''});
    const refresh=()=>setSync(previous=>{const next=readBookingSync();return next.syncStatus==='error'?{...next,lastSyncedTime:previous.lastSyncedTime}:next});
    const stops=[subscribeStored(KEYS.pages,refresh),subscribeStored(KEYS.appointments,refresh)];
    refresh();
    return ()=>stops.forEach(stop=>stop());
  },[page.id]);
  return <div className="bk-troubleshoot-controls">
    <button type="button" className="bk-troubleshoot-toggle" role="switch" aria-checked={checked} aria-controls={panelId} aria-label="Troubleshoot" onClick={()=>change(!checked)}><Activity size={13}/><span>Troubleshoot</span><span className="bk-switch-track" aria-hidden="true"><span/></span></button>
    {checked&&<section className="bk-diagnostic-panel" id={panelId} aria-label="Availability diagnostics"><header><b>Sync Monitor</b><span className={'bk-sync-dot '+sync.syncStatus} aria-hidden="true"/></header><dl>
      <div><dt>Sync status</dt><dd aria-live="polite">{sync.syncStatus}</dd></div><div><dt>Last synced</dt><dd>{sync.lastSyncedTime||'N/A'}</dd></div>
      <div><dt>Storage</dt><dd>This browser</dd></div><div><dt>Calendar</dt><dd>{page.name||'N/A'}</dd></div><div><dt>Bookings</dt><dd>{bookings.filter(b=>b.calendarId===page.id).length}</dd></div>
      <div><dt>Language</dt><dd>{page.language}</dd></div><div><dt>Layout</dt><dd>{page.language==='ar'?'RTL':'LTR'}</dd></div><div><dt>Durations</dt><dd>{page.durationOptions.join(', ')} min</dd></div>
      <div><dt>Host timezone</dt><dd>{page.hostTimezone}</dd></div><div><dt>Minimum notice</dt><dd>{page.minNotice} min</dd></div><div><dt>Buffer</dt><dd>{page.bufferTime} min</dd></div>
    </dl><p>Choose any day to inspect availability. Unavailable slots show the reference’s reason code; use Details to see the explanation.</p></section>}
  </div>;
}
export function TroubleshootTimeSlots({slots,checked,selected,select,timezone,date,showSpots}:{slots:TroubleshootSlot[];checked:boolean;selected:string;select:(start:string)=>void;timezone:string;date:string;showSpots:boolean}) {
  return <>{slots.map(s=>{
    const label=formatTime(s.start,timezone);
    const rollover=dateKey(new Date(s.start),timezone)!==date?<small>{new Date(s.start).toLocaleDateString('en-US',{timeZone:timezone,month:'short',day:'numeric'})}</small>:null;
    if(checked&&s.busy)return <div className="bk-diagnostic-slot" key={s.start}><div className="bk-diagnostic-slot-header"><span>Unavailable</span><button type="button" className="bk-icon" aria-label={'Conflict details for '+label+': '+s.reason} title={'Conflict Details: '+s.reason} onClick={()=>showToast.info('Reason: '+s.reason,s.detail)}><Info size={13}/></button></div><s>{label}</s>{rollover}<span className="bk-diagnostic-reason" title={s.detail}>{s.reason}</span><small className="bk-diagnostic-explanation">{s.detail}</small></div>;
    return <button key={s.start} className={selected===s.start?'selected':''} aria-pressed={selected===s.start} disabled={s.busy} onClick={()=>select(s.start)}>{label}{showSpots&&!s.busy&&<small className="bk-spots">{s.spotsLeft} spots left</small>}{rollover}</button>;
  })}</>;
}

