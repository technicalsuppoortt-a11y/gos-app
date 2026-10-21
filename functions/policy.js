export function mayManageUser(actor, target) {
  if (target.id === actor.uid || target.role === 'SUPER_ADMIN') return false;
  return actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN' && target.role === 'USER';
}
export function maySend({ lead, conversation, integration, ai = false }) {
  if (lead.optedOut || ['STOPPED_INELIGIBLE', 'HUMAN_HANDOFF'].includes(lead.followUpState) && ai) return { allowed: false, reason: 'Automation is paused or the contact is ineligible.' };
  if (ai && (conversation.takenOver || conversation.aiMode === 'off')) return { allowed: false, reason: 'A human owns this conversation.' };
  if (lead.optedOut) return { allowed: false, reason: 'This contact opted out.' };
  if (integration?.status !== 'CONNECTED') return { allowed: false, reason: 'Connect this channel before sending.' };
  const channel = conversation.channel;
  if (channel === 'whatsapp' && !lead.hasWhatsAppConsent) return { allowed: false, reason: 'WhatsApp opt-in is required.' };
  if (channel === 'email' && !lead.hasEmailConsent) return { allowed: false, reason: 'Email consent is required.' };
  if (channel === 'whatsapp' && (!conversation.lastInboundAt || Date.now() - Date.parse(conversation.lastInboundAt) > 86400000)) return { allowed: false, reason: 'An approved WhatsApp template is required outside the service window.' };
  return { allowed: true };
}

export function validateBooking(page, booking, existing, now = Date.now()) {
  const start = Date.parse(booking.start), duration = Number(booking.duration);
  if (!page.active || !Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0 || !(page.durationOptions ?? [page.duration]).includes(duration)) return 'Choose an active calendar and valid duration.';
  if (start < now + (page.minNotice ?? 0) * 60000 || start > now + (page.maxAdvanceBooking ?? 60) * 86400000) return 'This time is outside the booking window.';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: page.hostTimezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(start)).map(part => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const time = value => { const [hour, min] = String(value).split(':').map(Number); return hour * 60 + min; };
  const fixed = page.fixedDateRange ?? {};
  if (fixed.start && date < fixed.start || fixed.end && date > fixed.end) return 'This date is outside the calendar date range.';
  const overrides = (page.specificDateAvailability ?? []).filter(row => { const [from, to] = row.date.split('_to_'); return to ? date >= from && date <= to : row.date === date; });
  const weekdayMatches = value => value === day || String(value).toLowerCase() === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
  const intervals = overrides.length ? overrides : [...(page.availability ?? []).filter(row => row.day === day && row.enabled), ...(page.additionalWeekdayAvailability ?? []).filter(row => weekdayMatches(row.day))];
  if (!intervals.some(row => minute >= time(row.start) && minute + duration <= time(row.end))) return 'This time is outside the configured availability.';
  if ((page.breaks ?? []).some(row => (!row.date || row.date === date) && minute < time(row.end) && minute + duration > time(row.start))) return 'This time overlaps a calendar break.';
  const records = existing.filter(row => row.id !== booking.id && row.status !== 'Canceled');
  const before = (page.bufferBefore ?? page.bufferTime ?? 0) * 60000, after = (page.bufferAfter ?? page.bufferTime ?? 0) * 60000;
  const overlaps = records.filter(row => start < Date.parse(row.start) + row.duration * 60000 + after && start + duration * 60000 + before > Date.parse(row.start));
  if (overlaps.some(row => row.calendarId !== booking.calendarId) || overlaps.length >= (page.groupCapacity ?? 1)) return 'This time is already booked. Choose another slot.';
  if (records.filter(row => row.calendarId === booking.calendarId && row.date === date).length >= (page.dailyLimit ?? 100)) return 'The daily booking limit has been reached.';
  if (booking.date !== date) return 'The booking date does not match the calendar timezone.';
  return null;
}
