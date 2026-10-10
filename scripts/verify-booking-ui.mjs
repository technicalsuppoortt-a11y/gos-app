process.on('uncaughtException', error=>{ console.error(error.message); process.exit(1); });

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { createElement as h } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
const renderToStaticMarkup = (element, userName) => renderMarkup(h(Provider,{store:configureStore({reducer:(state)=>state,preloadedState:{auth:{isAuthenticated:!!userName,user:userName?{name:userName}:null}}})},element));

const memo = new Map();
async function moduleUrl(file) {
 if(memo.has(file))return memo.get(file);
 let source = await fs.readFile(file,'utf8');
 let compiled = ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 compiled = compiled.replace(/import\s+['"][^'"]+\.css['"];?/g,'');
 const matches = [...compiled.matchAll(/from\s+['"]([^'"]+)['"]/g)];
 for(const match of matches){
  const spec=match[1];
  let url;
  if(spec.startsWith('.')){
   const base=path.resolve(path.dirname(file),spec);
   let target;
   for(const ext of ['.tsx','.ts'])try{await fs.access(base+ext);target=base+ext;break}catch{}
   if(!target)throw Error('Missing '+spec);
   url=await moduleUrl(target);
  } else url=import.meta.resolve(spec);
  compiled=compiled.replaceAll(match[0],"from '"+url+"'");
 }
 const url='data:text/javascript;base64,'+Buffer.from(compiled).toString('base64');
 memo.set(file,url);return url;
}
const module = async name=>import(await moduleUrl(path.resolve('src/pages/booking',name)));
const { blankPage } = await module('model.ts');
const { InviteeFields } = await module('InviteeFields.tsx');
const { AppointmentEditor } = await module('SystemCalendar.tsx');
const { BookingBuilder } = await module('BookingBuilder.tsx');
const base={...blankPage(),name:'Discovery',id:'discovery'};
const first={...base,questions:[...base.questions,{id:'budget',label:'Project budget',type:'select',required:true,options:['Under 1k','Over 1k']},{id:'goals',label:'Project goals',type:'textarea',required:false,options:[]},{id:'hidden',label:'Inactive question',type:'text',active:false,required:true,options:[]},{id:'info',label:'Before we meet',type:'text-block',text:'Bring your brief.',required:false,options:[]}]};
const second={...base,id:'coaching',name:'Coaching',questions:[...base.questions,{id:'topic',label:'Coaching topic',type:'radio',required:true,options:['Leadership','Strategy']}]};
const renderFields=page=>renderToStaticMarkup(h(InviteeFields,{page,answers:{budget:'Over 1k'},setAnswers:()=>{},guests:[],setGuests:()=>{}}));
const firstHtml=renderFields(first);
assert.match(firstHtml,/Project budget/);assert.match(firstHtml,/Project goals/);assert.match(firstHtml,/Over 1k/);
assert.match(firstHtml,/Before we meet/);assert.match(firstHtml,/Bring your brief/);assert.doesNotMatch(firstHtml,/Inactive question/);
const secondHtml=renderFields(second);
assert.match(secondHtml,/Coaching topic/);assert.match(secondHtml,/Leadership/);assert.doesNotMatch(secondHtml,/Project budget/);
const split={...first,formSettings:{...first.formSettings,nameType:'firstlast',firstNameLabel:'Given name',lastNameLabel:'Family name',guestsActive:false}};
const splitHtml=renderFields(split);
assert.match(splitHtml,/Given name/);assert.match(splitHtml,/Family name/);assert.doesNotMatch(splitHtml,/Add guest/);
const manual=page=>renderToStaticMarkup(h(AppointmentEditor,{pages:[first,second],bookings:[],value:{id:'existing',calendarId:page.id,name:'Jane',email:'jane@example.com',whatsapp:'123',date:'2026-10-12',time:'09:00',start:'2026-10-12T07:00:00Z',duration:30,location:'Zoom',status:'Confirmed',customAnswers:{budget:'Over 1k',topic:'Leadership'},guests:[]},save:()=>{},close:()=>{}}));
assert.match(manual(first),/Project budget/);assert.doesNotMatch(manual(first),/Coaching topic/);
assert.match(manual(second),/Coaching topic/);assert.doesNotMatch(manual(second),/Project budget/);
const builderHtml=renderToStaticMarkup(h(BookingBuilder,{pages:[first],save:()=>{},close:()=>{}}));
assert.doesNotMatch(builderHtml,/<dialog/);
assert.match(builderHtml,/bk-editor-split/);assert.match(builderHtml,/Live preview/);assert.match(builderHtml,/Desktop preview/);assert.match(builderHtml,/Mobile preview/);
assert.equal((builderHtml.match(/class="bk-configurator-card/g)||[]).length,10,'nine intact reference sections plus hosts');
for(const label of ['Booking page','Hosts &amp; Resources','Location','Appointment types','Group / class','Availability','Booking form &amp; questions','Notifications','Templates','After booking'])assert.ok(builderHtml.includes(label),'Missing section '+label);
console.log('Booking UI: page layout, all configurator sections, preview controls, selected-page questions, inactive fields, split names and responses passed.');




const {BookingBrandingFooter}=await module('BookingBrandingFooter.tsx');
const footer=(hostName,userName,visible=true)=>renderToStaticMarkup(h(BookingBrandingFooter,{hostName,visible}),userName);
assert.match(footer('  Mohamed Joe  ','Signed-in Admin'),/Powered by Mohamed Joe/);
assert.match(footer('   ','Signed-in Admin'),/Powered by Signed-in Admin/);
assert.match(footer(undefined,undefined),/Powered by GOS/);
assert.equal(footer('Mohamed Joe','Signed-in Admin',false),'','branding visibility is preserved');
const {default:PublicBookingPage}=await module('PublicBookingPage.tsx');
const {BookingWorkspace}=await module('BookingWorkspace.tsx');
const bookingModel=await module('model.ts');
const records=new Map();
globalThis.localStorage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};
globalThis.window=new EventTarget();window.location={origin:'https://gos.example'};
const publicPage={...base,id:'sync-page',slug:'sync-public',hostName:'Mohamed Joe',afterBooking:{...base.afterBooking,scheduleAnother:false}};
records.set(bookingModel.KEYS.pages,JSON.stringify([publicPage]));
records.set(bookingModel.KEYS.appointments,'[]');
const futureStart=new Date(Date.now()+2*86400000).toISOString();
const newBooking={id:'new-public',calendarId:publicPage.id,serviceName:publicPage.name,name:'Public Client',email:'public@example.com',whatsapp:'123',date:bookingModel.dateKey(new Date(futureStart)),time:'10:00',start:futureStart,duration:30,timezone:'Africa/Cairo',location:'Zoom',status:'Confirmed',source:'',fromAd:null,customAnswers:{},guests:[]};
bookingModel.persistAppointment(newBooking);
const publicView=(query='')=>renderToStaticMarkup(h(MemoryRouter,{initialEntries:['/book/sync-public'+query]},h(Routes,null,h(Route,{path:'/book/:slug',element:h(PublicBookingPage)}))));
const confirmation=publicView('?bookingId=new-public');
assert.match(confirmation,/You’re booked!/);assert.match(confirmation,/Powered by Mohamed Joe/);
assert.match(confirmation,/href="\/book\/sync-public"/);assert.match(confirmation,/Book another appointment/,'CTA remains present when the legacy schedule-another setting is off');
assert.match(confirmation,/Reschedule/);assert.match(confirmation,/Cancel appointment/);
const calendar=publicView();
assert.match(calendar,/Select a date &amp; time/);assert.match(calendar,/Powered by Mohamed Joe/);assert.doesNotMatch(calendar,/You’re booked!/);
assert.match(confirmation, /href="\/dashboard\/booking\?tab=bookings"[^>]*>Go to Dashboard<\/a>/, 'dashboard action targets the internal Bookings tab');
const initialDate = bookingModel.firstAvailableDate(publicPage, [newBooking]);
assert.ok(initialDate, 'the fixture has available dates');
assert.ok(calendar.includes('aria-label="' + bookingModel.formatDay(initialDate) + '" aria-pressed="true"'), 'the first bookable date is visibly selected on the first render');
assert.doesNotMatch(calendar, /Choose a highlighted date/, 'time slots render without a date click');
const firstSlot = bookingModel.availableSlots(publicPage, initialDate, publicPage.duration, [newBooking])[0];
assert.ok(calendar.includes(bookingModel.formatTime(firstSlot.start, Intl.DateTimeFormat().resolvedOptions().timeZone)), 'the selected date has a rendered time slot');
const laterMonth = new Date(); laterMonth.setMonth(laterMonth.getMonth() + 1, 1);
const futurePage = {...publicPage, fixedDateRange: {start: bookingModel.dateKey(laterMonth), end: ''}};
records.set(bookingModel.KEYS.pages, JSON.stringify([futurePage]));
const futureCalendar = publicView();
const futureDate = bookingModel.firstAvailableDate(futurePage, [newBooking]);
assert.ok(futureCalendar.includes(bookingModel.parseDate(futureDate).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})), 'the calendar opens to the selected date month');
assert.ok(futureCalendar.includes('aria-label="' + bookingModel.formatDay(futureDate) + '" aria-pressed="true"'));
records.set(bookingModel.KEYS.pages, JSON.stringify([{...publicPage, availability: [], additionalWeekdayAvailability: [], specificDateAvailability: []}]));
const emptyCalendar = publicView();
assert.doesNotMatch(emptyCalendar, /aria-pressed="true"/, 'no date is falsely selected when nothing is bookable');
records.set(bookingModel.KEYS.pages, JSON.stringify([publicPage]));
const workspace=tab=>renderToStaticMarkup(h(MemoryRouter,{initialEntries:['/dashboard/booking?tab='+tab]},h(BookingWorkspace,{notify:()=>{}})));
assert.match(workspace('dashboard'),/1 bookings/,'the page badge reflects the public booking');
const upcoming=workspace('bookings');
assert.match(upcoming,/Public Client/);assert.match(upcoming,/public@example.com/);assert.match(upcoming,/Discovery/);
bookingModel.persistAppointment({...newBooking,id:'pending-public',name:'Pending Client',email:'pending@example.com',status:'Pending'});
assert.match(workspace('dashboard'),/2 bookings/);
assert.match(workspace('bookings'),/Pending Client/,'pending public bookings appear in Upcoming');
records.set(bookingModel.KEYS.pages,JSON.stringify([{...publicPage,hostName:''}]));
assert.match(publicView('?bookingId=new-public'),/Powered by GOS/,'anonymous visitors get the fallback');
console.log('Public flow renders: host footer, confirmation CTA, calendar return route, dashboard counts and Upcoming confirmed/pending bookings passed.');


const {TroubleshootControls,TroubleshootTimeSlots,readBookingSync}=await module('BookingTroubleshoot.tsx');
const controls=checked=>renderToStaticMarkup(h(TroubleshootControls,{page:publicPage,bookings:[newBooking],checked,change:()=>{}}));
assert.match(controls(false),/role="switch"/);assert.match(controls(false),/aria-checked="false"/);assert.doesNotMatch(controls(false),/Sync Monitor/);
assert.match(controls(true),/aria-checked="true"/);assert.match(controls(true),/Sync Monitor/);assert.match(controls(true),/This browser/);assert.match(controls(true),/Minimum notice/);
const diagnosticSlot={time:'10:00',start:newBooking.start,busy:true,spotsLeft:0,reason:'BUFFER',detail:'Within the configured booking buffer.'};
const renderSlots=checked=>renderToStaticMarkup(h(TroubleshootTimeSlots,{slots:[diagnosticSlot],checked,selected:'',select:()=>{},timezone:'Africa/Cairo',date:newBooking.date,showSpots:false}));
assert.match(renderSlots(true),/Unavailable/);assert.match(renderSlots(true),/BUFFER/);assert.match(renderSlots(true),/Conflict details/);assert.match(renderSlots(true),/Within the configured booking buffer/);
assert.doesNotMatch(renderSlots(true),/aria-pressed/,'blocked diagnostic slots have no booking-selection action');
assert.doesNotMatch(renderSlots(false),/bk-diagnostic-slot/);assert.match(renderSlots(false),/disabled=""/);
assert.equal(readBookingSync().syncStatus,'synced');
const originalAppointments=records.get(bookingModel.KEYS.appointments);
records.set(bookingModel.KEYS.appointments,'invalid-json');assert.equal(readBookingSync().syncStatus,'error');
records.set(bookingModel.KEYS.appointments,'{}');assert.equal(readBookingSync().syncStatus,'error');
records.set(bookingModel.KEYS.appointments,originalAppointments);
assert.match(publicView(),/aria-label="Troubleshoot"/);assert.doesNotMatch(publicView(),/Sync Monitor/,'diagnostics start off in the standard public view');
console.log('Troubleshoot UI: default-off switch, monitor, unavailable reason cards, readonly blocked slots and storage error detection passed.');


