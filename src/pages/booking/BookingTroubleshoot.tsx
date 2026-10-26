import { cloudStorage } from '../../backend/workspace';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';

import { useEffect, useId, useState } from 'react';
import { Activity, Info } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { dateKey, formatTime, KEYS, subscribeStored } from './model';
import type { Appointment, BookingPage, TroubleshootSlot } from './model';

type SyncState = {syncStatus:'connecting'|'synced'|'error';lastSyncedTime:string};
// The reference monitors Firestore. Upclick currently synchronizes through browser storage.
export function readBookingSync():SyncState {
  try {
    for(const key of [KEYS.pages,KEYS.appointments]){
      const raw=cloudStorage.getItem(key);
      if(raw!==null&&!Array.isArray(JSON.parse(raw)))throw new Error('Invalid booking storage');
    }
    return {syncStatus:'synced',lastSyncedTime:new Date().toLocaleTimeString()};
  }catch{return {syncStatus:'error',lastSyncedTime:''}}
}
export function TroubleshootControls({page,bookings,checked,change}:{page:BookingPage;bookings:Appointment[];checked:boolean;change:(value:boolean)=>void}) {
  useUILanguage();
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
    <button type="button" className="bk-troubleshoot-toggle" role="switch" aria-checked={checked} aria-controls={panelId} aria-label={translateText("Troubleshoot")} onClick={()=>change(!checked)}><Activity size={13}/><span>{translateText("Troubleshoot")}</span><span className="bk-switch-track" aria-hidden="true"><span/></span></button>
    {localizeNode(checked&&<section className="bk-diagnostic-panel" id={panelId} aria-label={translateText("Availability diagnostics")}><header><b>{translateText("Sync Monitor")}</b><span className={'bk-sync-dot '+sync.syncStatus} aria-hidden="true"/></header><dl>
      <div><dt>{translateText("Sync status")}</dt><dd aria-live="polite">{localizeNode(sync.syncStatus)}</dd></div><div><dt>{translateText("Last synced")}</dt><dd>{localizeNode(sync.lastSyncedTime||'N/A')}</dd></div>
      <div><dt>{translateText("Storage")}</dt><dd>{translateText("This browser")}</dd></div><div><dt>{translateText("Calendar")}</dt><dd>{localizeNode(page.name||'N/A')}</dd></div><div><dt>{translateText("Bookings")}</dt><dd>{localizeNode(bookings.filter(b=>b.calendarId===page.id).length)}</dd></div>
      <div><dt>{translateText("Language")}</dt><dd>{localizeNode(page.language)}</dd></div><div><dt>{translateText("Layout")}</dt><dd>{localizeNode(page.language==='ar'?'RTL':'LTR')}</dd></div><div><dt>{translateText("Durations")}</dt><dd>{localizeNode(page.durationOptions.join(', '))}{translateText(" min")}</dd></div>
      <div><dt>{translateText("Host timezone")}</dt><dd>{localizeNode(page.hostTimezone)}</dd></div><div><dt>{translateText("Minimum notice")}</dt><dd>{localizeNode(page.minNotice)}{translateText(" min")}</dd></div><div><dt>{translateText("Buffer")}</dt><dd>{localizeNode(page.bufferTime)}{translateText(" min")}</dd></div>
    </dl><p>{translateText("Choose any day to inspect availability. Unavailable slots show the reference’s reason code; use Details to see the explanation.")}</p></section>)}
  </div>;
}
export function TroubleshootTimeSlots({slots,checked,selected,select,timezone,date,showSpots}:{slots:TroubleshootSlot[];checked:boolean;selected:string;select:(start:string)=>void;timezone:string;date:string;showSpots:boolean}) {
  useUILanguage();
  return <>{localizeNode(slots.map(s=>{
    const label=formatTime(s.start,timezone);
    const rollover=dateKey(new Date(s.start),timezone)!==date?<small>{localizeNode(new Date(s.start).toLocaleDateString('en-US',{timeZone:timezone,month:'short',day:'numeric'}))}</small>:null;
    if(checked&&s.busy)return <div className="bk-diagnostic-slot" key={s.start}><div className="bk-diagnostic-slot-header"><span>{translateText("Unavailable")}</span><button type="button" className="bk-icon" aria-label={translateText('Conflict details for '+label+': '+s.reason)} title={translateText('Conflict Details: '+s.reason)} onClick={()=>showToast.info('Reason: '+s.reason,s.detail)}><Info size={13}/></button></div><s>{localizeNode(label)}</s>{localizeNode(rollover)}<span className="bk-diagnostic-reason" title={translateText(s.detail)}>{localizeNode(s.reason)}</span><small className="bk-diagnostic-explanation">{localizeNode(s.detail)}</small></div>;
    return <button key={s.start} className={selected===s.start?'selected':''} aria-pressed={selected===s.start} disabled={s.busy} onClick={()=>select(s.start)}>{localizeNode(label)}{localizeNode(showSpots&&!s.busy&&<small className="bk-spots">{localizeNode(s.spotsLeft)}{translateText(" spots left")}</small>)}{localizeNode(rollover)}</button>;
  }))}</>;
}

