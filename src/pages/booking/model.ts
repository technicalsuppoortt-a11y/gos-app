import { cloudStorage } from '../../backend/workspace';
import { useCallback, useEffect, useState } from 'react';
import { locationFromLabel, sectionDefaults, weekdayMatches } from './booking-section-schema';
import type { AfterBooking, SectionSettings } from './booking-section-schema';

export type Question = { id: string; label: string; type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'radio' | 'text-block'; required: boolean; options: string[]; active?: boolean; text?: string };
export type Hours = { day: number; enabled: boolean; start: string; end: string };
export type BookingPage = {
  id: string; name: string; slug: string; duration: number; durationOptions: number[];
  location: string; locationOptions: string[]; active: boolean; color: string; note: string;
  description: string; hostName: string; hostTimezone: string; availability: Hours[];
  minNotice: number; maxAdvanceBooking: number; bufferTime: number; startIncrement: number | 'use-duration';
  groupCapacity: number; dailyLimit: number; fixedDateRange: { start: string; end: string };
  questions: Question[]; requireApproval: boolean;
  afterBooking: AfterBooking;
} & SectionSettings;
export type Appointment = {
  id: string; calendarId: string; serviceName: string; name: string; email: string; whatsapp: string;
  date: string; time: string; start: string; duration: number; timezone: string; location: string;
  status: 'Confirmed' | 'Pending' | 'Canceled'; source: string; fromAd: boolean | null;
  customAnswers: Record<string, string>; guests: { name: string; email: string }[]; payment?: { amount: number; currency: string; status: 'Pending' };
};
export type Contact = { id: string; name: string; email: string; phone: string; company: string };
export type Member = { id: string; name: string; email: string; role: 'Admin' | 'Member'; status: 'Active' | 'Invited' };
export const KEYS = { pages: 'gos.booking-links.v1', appointments: 'gos.booking.appointments.v2', contacts: 'gos.booking.contacts.v2', members: 'gos.booking.members.v2' };
export const COLORS: Record<string, string> = { violet: '#7960e9', mint: '#10a993', purple: '#a855d9', blue: '#488ce1', rose: '#ef7186', amber: '#d99a32' };
export const bookingColor = (value: string) => COLORS[value] || (/^#[0-9a-f]{6}$/i.test(value) ? value : COLORS.violet);
export const TIMEZONES = ['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'Europe/Paris', 'Europe/Bucharest', 'Europe/Istanbul', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'];
export const uid = () => crypto.randomUUID();
export const slugify = (name: string) => name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
export function blankPage(): BookingPage {
  return {
    ...sectionDefaults(), locations: [locationFromLabel('None', 'default-location')],
    id: uid(), name: '', slug: '', duration: 30, durationOptions: [30], location: 'None',
    locationOptions: ['None'], active: true, color: 'violet', note: '', description: "Let's discuss your goals and how we can work together.",
    hostName: '', hostTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    availability: Array.from({ length: 7 }, (_, day) => ({ day, enabled: day > 0 && day < 6, start: '09:00', end: '17:00' })),
    minNotice: 30, maxAdvanceBooking: 60, bufferTime: 15, startIncrement: 'use-duration', groupCapacity: 1, dailyLimit: 12,
    fixedDateRange: { start: '', end: '' }, requireApproval: false,
    questions: [
      { id: 'name', label: 'Name', type: 'text', required: true, options: [] },
      { id: 'email', label: 'Email', type: 'email', required: true, options: [] },
      { id: 'whatsapp', label: 'Phone / WhatsApp', type: 'tel', required: true, options: [] },
    ],
    afterBooking: { confirmationBody: 'Your booking is confirmed. We look forward to meeting you.', allowCancelReschedule: true, scheduleAnother: false, prefill: true, redirectEnabled: false, redirectUrl: '', webhookEnabled: false, webhookUrl: '' },
  };
}
const defaults: BookingPage[] = [];
export function load<T>(key: string, fallback: T): T {
  try { const raw = cloudStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T; } catch { return fallback; }
}
export function write<T>(key: string, value: T) {
  return cloudStorage.setItem(key, JSON.stringify(value));
}
export function readPages(): BookingPage[] {
  const items = load<Partial<BookingPage>[]>(KEYS.pages, []);
  if (!Array.isArray(items)) return [];
  return items.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string').map(p => {
    return normalizeBookingPage(p);
  });
}

export function normalizeBookingPage(p: Partial<BookingPage>): BookingPage {
    const base = blankPage();
    return { ...base, ...p, hostName: typeof p.hostName === 'string' ? p.hostName : '', durationOptions: p.durationOptions || [p.duration || 30], locationOptions: p.locationOptions || [p.location || 'Zoom'], afterBooking: { ...base.afterBooking, ...p.afterBooking }, locations: p.locations?.length ? p.locations : (p.locationOptions || [p.location || 'None']).map((label, index) => locationFromLabel(label, 'location-' + index)), formSettings: { ...base.formSettings, ...p.formSettings }, notificationWorkflows: { ...base.notificationWorkflows, ...p.notificationWorkflows }, templateSettings: { ...base.templateSettings, ...p.templateSettings } };
}

export function subscribeStored(key: string, refresh: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
  const onChange = (event: Event) => { if ((event as CustomEvent).detail === key) refresh(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener('gos-booking-change', onChange);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('gos-booking-change', onChange);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('focus', refresh);
  };
}

export function useStored<T>(key: string, initial: () => T) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const refresh = () => setValue(initial());
    const unsubscribe = subscribeStored(key, refresh);
    // Re-read after subscribing so a write between render and effect is not missed.
    refresh();
    return unsubscribe;
    // The initializer reads this key; refresh only when the storage key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = useCallback((next: T) => { const pending = write(key, next).then(() => { setValue(next); }); void pending.catch(() => {}); return pending; }, [key]);
  return [value, save] as const;
}
const dtfCache = new Map<string, Intl.DateTimeFormat>();
export function getDTF(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let dtf = dtfCache.get(key);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat(locale, options);
    dtfCache.set(key, dtf);
  }
  return dtf;
}

export function dateKey(date: Date, timezone?: string): string {
  if (timezone) {
    const parts = getDTF('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)?.value).join('-');
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const parseDate = (date: string) => new Date(date + 'T12:00:00');
export const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
export const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

const hostInstantCache = new Map<string, Date>();
export function hostInstant(date: string, time: string, timezone: string): Date {
  const cacheKey = `${date}_${time}_${timezone}`;
  const cached = hostInstantCache.get(cacheKey);
  if (cached) return cached;

  const desired = Date.parse(date + 'T' + time + ':00Z');
  let instant = desired;
  const dtf = getDTF('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 3; i++) {
    const parts = dtf.formatToParts(new Date(instant));
    const get = (name: string) => Number(parts.find(p => p.type === name)?.value);
    const observed = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    instant += desired - observed;
  }
  const result = new Date(instant);
  if (hostInstantCache.size > 2000) hostInstantCache.clear();
  hostInstantCache.set(cacheKey, result);
  return result;
}

export const formatTime = (start: string | Date, timezone: string) =>
  getDTF('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(start));

const formatDayCache = new Map<string, string>();
export const formatDay = (key: string) => {
  let res = formatDayCache.get(key);
  if (!res) {
    res = parseDate(key).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (formatDayCache.size > 500) formatDayCache.clear();
    formatDayCache.set(key, res);
  }
  return res;
};
export function bookingLimitReached(page: BookingPage, date: string, records: Appointment[], email = '', excludeId?: string) {
  const start = parseDate(date); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return page.bookingLimits.some(limit => {
    if (limit.scope === 'email' && !email.trim()) return false;
    return records.filter(b => b.calendarId === page.id && b.status !== 'Canceled' && b.id !== excludeId && (limit.scope === 'all' || b.email.toLowerCase() === email.trim().toLowerCase())).filter(b => {
      const day = dateKey(new Date(b.start), page.hostTimezone);
      return limit.period === 'total' || (limit.period === 'day' && day === date) || (limit.period === 'week' && day >= dateKey(start) && day <= dateKey(end)) || (limit.period === 'month' && day.slice(0, 7) === date.slice(0, 7));
    }).length >= limit.limit;
  });
}
export function availableSlots(page: BookingPage, date: string, duration: number, bookings: Appointment[], now = new Date(), excludeId?: string, email = '') {
  const today = dateKey(now, page.hostTimezone);
  const max = parseDate(today); max.setDate(max.getDate() + page.maxAdvanceBooking);
  if (!page.active || date < today || date > dateKey(max) || (page.fixedDateRange.start && date < page.fixedDateRange.start) || (page.fixedDateRange.end && date > page.fixedDateRange.end)) return [];
  const existing = bookings.filter(b => b.calendarId === page.id && b.status !== 'Canceled' && b.id !== excludeId);
  if (existing.filter(b => dateKey(new Date(b.start), page.hostTimezone) === date).length >= page.dailyLimit || bookingLimitReached(page, date, bookings, email, excludeId)) return [];
  const intervals = availabilityIntervals(page,date);
  const candidates = new Set<number>();
  const increment = page.startIncrement === 'use-duration' ? duration : Math.max(5, page.startIncrement);
  for (const hours of intervals) for (let minute = minutes(hours.start); minute + duration <= minutes(hours.end); minute += increment) candidates.add(minute);
  let slots: { time: string; start: string }[] = [];
  for (const minute of [...candidates].sort((a, b) => a - b)) {
    const start = hostInstant(date, clock(minute), page.hostTimezone);
    if (start.getTime() < now.getTime() + page.minNotice * 60000) continue;
    const end = start.getTime() + duration * 60000;
    if (page.breaks.some(b => (!b.date || b.date === date) && minute < minutes(b.end) && minute + duration > minutes(b.start))) continue;
    const collisions = existing.filter(b => {
      const bStart = Date.parse(b.start);
      return start.getTime() < bStart + (b.duration + page.bufferTime) * 60000 && end + page.bufferTime * 60000 > bStart;
    });
    if (collisions.length >= page.groupCapacity) continue;
    slots.push({ time: clock(minute), start: start.toISOString() });
  }
  if (page.lookBusy.enabled && slots.length > 1) {
    const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const percentage = page.lookBusy.min + seed % (page.lookBusy.max - page.lookBusy.min + 1);
    const hidden = Math.min(slots.length - 1, Math.floor(slots.length * percentage / 100));
    const indices = new Set(Array.from({ length: hidden }, (_, i) => (seed + i) % slots.length));
    slots = slots.filter((_, i) => !indices.has(i));
  }
  return slots;
}
export function firstAvailableDate(page: BookingPage, bookings: Appointment[], duration = page.duration, now = new Date()) {
  if (!page.active || !Number.isFinite(duration) || duration <= 0) return '';
  const today = dateKey(now, page.hostTimezone);
  const last = parseDate(today);
  last.setDate(last.getDate() + page.maxAdvanceBooking);
  const end = page.fixedDateRange.end && page.fixedDateRange.end < dateKey(last) ? page.fixedDateRange.end : dateKey(last);
  const start = page.fixedDateRange.start && page.fixedDateRange.start > today ? page.fixedDateRange.start : today;
  const candidate = parseDate(start);
  for (let key = dateKey(candidate); key <= end; candidate.setDate(candidate.getDate() + 1), key = dateKey(candidate)) {
    if (availableSlots(page, key, duration, bookings, now).length) return key;
  }
  return '';
}
export function remainingSpots(page: BookingPage, start: string, duration: number, bookings: Appointment[], excludeId?: string) {
  const instant = Date.parse(start);
  const end = instant + duration * 60000;
  const used = bookings.filter(b => b.calendarId === page.id && b.status !== 'Canceled' && b.id !== excludeId && instant < Date.parse(b.start) + (b.duration + page.bufferTime) * 60000 && end + page.bufferTime * 60000 > Date.parse(b.start)).length;
  return Math.max(0, page.groupCapacity - used);
}
export function displayedSlots(page: BookingPage, date: string, duration: number, bookings: Appointment[], now = new Date(), excludeId?: string) {
  const available = availableSlots(page, date, duration, bookings, now, excludeId);
  if (!page.grayOutBusy) return available.map(s => ({ ...s, busy: false }));
  const candidates = availableSlots({ ...page, lookBusy: { ...page.lookBusy, enabled: false } }, date, duration, [], now);
  return candidates.map(s => ({ ...s, busy: !available.some(a => a.start === s.start) }));
}

const seedDate = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return dateKey(d); };
export const defaultAppointments: Appointment[] = [];
export const defaultContacts: Contact[] = [];
export const defaultMembers: Member[] = [];
export const readAppointments = () => load<Appointment[]>(KEYS.appointments, []);
export const readContacts = () => load<Contact[]>(KEYS.contacts, []);
export const readMembers = () => load<Member[]>(KEYS.members, []);
export const publicUrl = (page: BookingPage) => new URL('/book/' + encodeURIComponent(page.slug), window.location.origin).href;

// RFC 4180-style CSV, including quoted commas, escaped quotes and multiline cells.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}


export const resolveBrandingName = (hostName?: string | null, userName?: string | null) => hostName?.trim() || userName?.trim() || 'GOS';
export const isUpcomingAppointment = (booking: Appointment, now = Date.now()) => booking.status !== 'Canceled' && Date.parse(booking.start) + booking.duration * 60000 > now;
// Use the latest shared snapshot; rescheduling replaces a record instead of incrementing counts.
export function persistAppointment(booking: Appointment) {
  write(KEYS.appointments, [...readAppointments().filter(item => item.id !== booking.id), booking]);
}



export type TroubleshootReason = 'FIXED_DATE' | 'MAX_ADVANCE' | 'AVAILABILITY' | 'LIMIT' | 'BREAK' | 'BOOKING' | 'DURATION' | 'BUFFER' | 'BUSY';
export type TroubleshootSlot = { time:string; start:string; busy:boolean; spotsLeft:number; reason?:TroubleshootReason; detail:string };
export function availabilityIntervals(page: BookingPage, date: string) {
  const day = parseDate(date).getDay();
  const hours = page.availability.find(h => h.day === day);
  const overrides = page.specificDateAvailability.filter(h => {
    if (!h.date.includes('_to_')) return h.date === date;
    const [start,end] = h.date.split('_to_');
    return date >= start && date <= end;
  });
  return overrides.length ? overrides : [
    ...(hours?.enabled ? [hours] : []),
    ...page.additionalWeekdayAvailability.filter(h => weekdayMatches(h.day, day)),
  ];
}
// PublicBooking.tsx source: reveal blocked slots, keep its reason precedence, and
// use the 10:00–18:00 diagnostic fallback for days without availability.
// Each decision uses the same timezone, capacity and rules as the GOS booking engine.
export function troubleshootSlots(page: BookingPage, date: string, duration: number, bookings: Appointment[], now = new Date(), excludeId?:string, email=''):TroubleshootSlot[] {
  const configured = availabilityIntervals(page,date);
  const intervals = configured.length ? configured : [{start:'10:00',end:'18:00'}];
  const increment = page.startIncrement === 'use-duration' ? duration : Math.max(5,page.startIncrement);
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(increment)) return [];
  const candidates = new Set<number>();
  for (const interval of intervals) for(let minute=minutes(interval.start);minute+duration<=minutes(interval.end);minute+=increment)candidates.add(minute);
  const records=bookings.filter(b=>b.calendarId===page.id&&b.status!=='Canceled'&&b.id!==excludeId);
  const today=dateKey(now,page.hostTimezone);
  const max=parseDate(today);max.setDate(max.getDate()+page.maxAdvanceBooking);
  const limit=records.filter(b=>dateKey(new Date(b.start),page.hostTimezone)===date).length>=page.dailyLimit||bookingLimitReached(page,date,bookings,email,excludeId);
  const available=new Set(availableSlots(page,date,duration,bookings,now,excludeId,email).map(s=>s.start));
  return [...candidates].sort((a,b)=>a-b).map(minute=>{
    const time=clock(minute), start=hostInstant(date,time,page.hostTimezone).toISOString();
    const instant=Date.parse(start), end=instant+duration*60000;
    const overlaps=records.filter(b=>instant<Date.parse(b.start)+b.duration*60000&&end>Date.parse(b.start));
    const buffered=records.filter(b=>instant<Date.parse(b.start)+(b.duration+page.bufferTime)*60000&&end+page.bufferTime*60000>Date.parse(b.start));
    const spotsLeft=remainingSpots(page,start,duration,bookings,excludeId);
    let reason:TroubleshootReason|undefined, detail='';
    if((page.fixedDateRange.start&&date<page.fixedDateRange.start)||(page.fixedDateRange.end&&date>page.fixedDateRange.end)){
      reason='FIXED_DATE';detail='This date is outside the configured booking date range.';
    }else if(date>dateKey(max)){
      reason='MAX_ADVANCE';detail='Bookings can only be made '+page.maxAdvanceBooking+' days in advance.';
    }else if(date<today){
      reason='AVAILABILITY';detail='This date is in the past in the host’s timezone.';
    }else if(limit){
      reason='LIMIT';detail='The daily or configured booking limit has been reached.';
    }else if(!page.active||!configured.length||instant<now.getTime()+page.minNotice*60000){
      reason='AVAILABILITY';detail=!page.active?'This booking page is turned off.':!configured.length?'No working hours are configured for this weekday or date.':'This time is in the past or within the '+page.minNotice+' minute minimum-notice window.';
    }else if(page.breaks.some(b=>(!b.date||b.date===date)&&minute<minutes(b.end)&&minute+duration>minutes(b.start))){
      reason='BREAK';detail='This appointment would overlap a configured break.';
    }else if(buffered.length>=page.groupCapacity){
      if(overlaps.filter(b=>Date.parse(b.start)===instant).length>=page.groupCapacity){
        reason='BOOKING';detail='This start time is already booked; no places remain.';
      }else if(overlaps.length>=page.groupCapacity){
        reason='DURATION';detail='The appointment duration overlaps another booking.';
      }else{
        reason='BUFFER';detail='This time falls within a booking’s before/after buffer of '+page.bufferTime+' minutes.';
      }
    }else if(!available.has(start)){
      reason='BUSY';detail='This slot is hidden by the configured Look busy setting.';
    }
    return {time,start,busy:!!reason,spotsLeft,reason,detail};
  });
}

