import { resolveCRMRoute } from './crm-routing.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { validateBooking } from './policy.js';
import { createHash } from 'node:crypto';
import {
  evaluateQualification,
  extractCalendarQualificationRules,
  publicScreeningQuestions,
  sanitizePublicFormQuestions,
  validQualificationQuestions,
} from './booking-qualification.js';

function screeningRules(calendar) {
  const value = extractCalendarQualificationRules(calendar);
  if (value === undefined) return [];
  if (!validQualificationQuestions(value)) throw new HttpsError('failed-precondition', 'This booking page has an invalid screening configuration. Contact the host.');
  return value;
}

function publicQualification(result, questions) {
  return result.status === 'incomplete' ? { status: result.status, screeningQuestions: publicScreeningQuestions(questions) } : { status: result.status };
}

function buildLeadCustomFields(calendar, customAnswers, responses = []) {
  const fields = {}, labels = {};
  const questionList = Array.isArray(calendar?.questions) ? calendar.questions : [];
  if (customAnswers && typeof customAnswers === 'object' && !Array.isArray(customAnswers)) {
    for (const [key, raw] of Object.entries(customAnswers)) {
      const val = String(raw ?? '').trim().slice(0, 500);
      if (!val) continue;
      fields[key] = val;
      const match = questionList.find(q => q?.id === key);
      if (match?.label) labels[key] = String(match.label).slice(0, 160);
    }
  }
  for (const item of responses) {
    if (!item?.id || !item?.answer) continue;
    fields[item.id] = String(item.answer).slice(0, 500);
    if (item.label) labels[item.id] = String(item.label).slice(0, 160);
  }
  return { fields, labels };
}

// Public callers get calendar presentation and anonymous busy intervals only.
export const publicBooking = onCall({ region: 'us-central1', serviceAccount: 'gos-app-3c7fb@appspot.gserviceaccount.com', maxInstances: 5 }, async request => {
  const db = getFirestore();
  const { slug, password = '', operation = 'availability', booking, token, bookingId, screeningAnswers } = request.data ?? {};
  if (typeof slug !== 'string' || !/^[\p{L}\p{N}_-]{1,150}$/u.test(slug)) throw new HttpsError('invalid-argument', 'Invalid booking link.');
  const matches = await db.collectionGroup('calendars').where('slug', '==', slug).limit(2).get();
  if (matches.size !== 1 || !matches.docs[0].data().active) throw new HttpsError('not-found', 'Booking page not found.');
  const calendarRef = matches.docs[0].ref, root = calendarRef.parent.parent;
  const initial = matches.docs[0].data();
  if (initial.passwordProtect && password !== initial.password) throw new HttpsError('permission-denied', 'Enter the page password.');
  if (operation === 'qualify') {
    const questions = screeningRules(initial);
    return publicQualification(evaluateQualification(questions, screeningAnswers), questions);
  }
  if (operation === 'availability') {
    const { password: hidden, notificationWorkflows, qualificationQuestions: _qq, ...page } = initial;
    const screeningQuestions = publicScreeningQuestions(screeningRules(initial));
    page.questions = sanitizePublicFormQuestions(page.questions);
    const records = await root.collection('bookings').where('status', 'in', ['Confirmed', 'Pending']).get();
    page.afterBooking = { ...page.afterBooking, webhookEnabled: false, webhookUrl: '' };
    const bookings = records.docs.map(row => {
      const b = row.data(); return { id: row.id, calendarId: b.calendarId, start: b.start, duration: b.duration, date: b.date, status: b.status };
    });
    if (typeof bookingId === 'string' && /^[\w-]{1,150}$/.test(bookingId) && typeof token === 'string') {
      const own = (await root.collection('bookings').doc(bookingId).get()).data();
      if (own?.calendarId === calendarRef.id && own.managementTokenHash === createHash('sha256').update(token).digest('hex')) {
        const { managementTokenHash, ...confirmation } = own;
        return { page: { ...page, id: calendarRef.id }, bookings: [...bookings.filter(b => b.id !== bookingId), confirmation], screeningQuestions };
      }
    }
    return { page: { ...page, id: calendarRef.id }, bookings, screeningQuestions };
  }
  if (!['create', 'cancel', 'reschedule'].includes(operation) || !booking || !/^[\w-]{1,150}$/.test(booking.id) || typeof token !== 'string' || token.length < 32 || token.length > 200) throw new HttpsError('invalid-argument', 'Invalid booking request.');
  const digest = createHash('sha256').update(token).digest('hex');
  return db.runTransaction(async tx => {
    const lock = root.collection('bookingLocks').doc('schedule');
    const lockDoc = await tx.get(lock);
    const calendar = (await tx.get(calendarRef)).data();
    if (!calendar?.active || calendar.slug !== slug || calendar.passwordProtect && password !== calendar.password) throw new HttpsError('permission-denied', 'This booking page is unavailable.');
    const ref = root.collection('bookings').doc(booking.id);
    const old = (await tx.get(ref)).data();
    if (old && (old.managementTokenHash !== digest || old.calendarId !== calendarRef.id) || !old && operation !== 'create') throw new HttpsError('permission-denied', 'Open the original booking confirmation to manage it.');
    if (old && operation !== 'create' && !calendar.afterBooking?.allowCancelReschedule) throw new HttpsError('failed-precondition', 'Contact the host to change this booking.');
    if (old && operation !== 'create' && calendar.cancellationHours > 0 && Date.parse(old.start) - Date.now() < calendar.cancellationHours * 3600000) throw new HttpsError('failed-precondition', 'The cancellation or rescheduling notice period has passed. Contact the host.');
    if (old && operation === 'create') return { booking: Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'managementTokenHash')) };
    let qualificationResponses = old?.qualificationResponses;
    if (operation === 'create') {
      const questions = screeningRules(calendar);
      const mergedAnswers = Object.assign(
        Object.create(null),
        booking.customAnswers && typeof booking.customAnswers === 'object' && !Array.isArray(booking.customAnswers) ? booking.customAnswers : {},
        screeningAnswers && typeof screeningAnswers === 'object' && !Array.isArray(screeningAnswers) ? screeningAnswers : {},
      );
      const result = evaluateQualification(questions, questions.length ? mergedAnswers : screeningAnswers);
      if (result.status === 'incomplete') return { qualification: publicQualification(result, questions) };
      if (result.status === 'ineligible') {
        if (typeof booking.name === 'string' && booking.name.trim() && booking.name.length <= 150 && typeof booking.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
          const email = booking.email.trim().toLowerCase();
          const name = booking.name.trim();
          const now = new Date().toISOString();
          const leadRef = root.collection('leads').doc(createHash('sha256').update(email).digest('hex').slice(0, 32));
          const lead = (await tx.get(leadRef)).data();
          const routing = await resolveCRMRoute(tx, root, calendar.crmRouting, 'LEAD_CAPTURED');
          const { fields, labels } = buildLeadCustomFields(calendar, booking.customAnswers, result.responses);
          const existingTags = Array.isArray(lead?.tags) ? lead.tags : [];
          const keepBooked = lead?.bookingStatus === 'Booked' || lead?.bookingStatus === 'Completed';
          const nextTags = keepBooked ? existingTags : [...new Set(['Pending Booking', ...existingTags.filter(t => t !== 'Booked')])];
          const activity = {
            id: `act-${Date.now().toString(36)}`,
            type: 'booking',
            title: 'Pending booking (screening)',
            detail: `${calendar.name || 'Booking page'} · Screening criteria not met${booking.date ? ` (${booking.date}${booking.time ? ` ${booking.time}` : ''})` : ''}`,
            at: now,
          };
          tx.set(leadRef, {
            ...(lead ?? { id: leadRef.id, source: 'Booking', hasWhatsAppConsent: false, hasMessagingConsent: false, hasEmailConsent: false, createdAt: now }),
            name,
            email,
            phone: String(booking.whatsapp || lead?.phone || '').slice(0, 80),
            interest: calendar.name || lead?.interest || 'Booking inquiry',
            ...(!lead || calendar.crmRouting?.pipelineId ? routing : {}),
            qualificationStatus: 'Unqualified',
            bookingStatus: keepBooked ? lead.bookingStatus : 'Pending Booking',
            followUpState: keepBooked ? (lead.followUpState || 'BOOKED') : (lead?.followUpState || 'QUALIFYING'),
            tags: nextTags,
            ...(Object.keys(fields).length ? { customFields: { ...(lead?.customFields || {}), ...fields }, customFieldLabels: { ...(lead?.customFieldLabels || {}), ...labels } } : {}),
            activities: [activity, ...(Array.isArray(lead?.activities) ? lead.activities : [])].slice(0, 50),
            lastMessage: 'Pending booking — screening criteria not met',
            lastActivity: now,
            updatedAt: now,
          });
          tx.create(root.collection('events').doc(), { type: 'booking.pending_screening', resourceId: leadRef.id, actorId: 'public', createdAt: FieldValue.serverTimestamp() });
        }
        return { qualification: publicQualification(result, questions) };
      }
      qualificationResponses = result.responses;
    }
    const busy = (await tx.get(root.collection('bookings'))).docs.map(row => ({ ...row.data(), id: row.id }));
    let saved;
    if (operation === 'cancel') saved = { ...old, status: 'Canceled' };
    else {
      if (typeof booking.name !== 'string' || !booking.name.trim() || booking.name.length > 150 || typeof booking.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) throw new HttpsError('invalid-argument', 'Enter your name and email.');
      const candidate = { ...booking, calendarId: calendarRef.id };
      const failure = validateBooking(calendar, candidate, busy);
      if (failure) throw new HttpsError('failed-precondition', failure);
      const missing = (calendar.questions ?? []).find(q => q.active !== false && q.required && q.type !== 'text-block' && !q.isScreening && !String(booking.customAnswers?.[q.id] ?? '').trim());
      if (missing) throw new HttpsError('invalid-argument', `Please answer: ${missing.label}`);
      saved = Object.fromEntries(['id', 'name', 'email', 'whatsapp', 'date', 'time', 'start', 'duration', 'timezone', 'location', 'source', 'fromAd', 'customAnswers', 'guests'].map(key => [key, booking[key] ?? null]));
      saved.calendarId = calendarRef.id; saved.serviceName = calendar.name;
      if (qualificationResponses?.length) saved.qualificationResponses = qualificationResponses;
      saved.email = booking.email.trim().toLowerCase();
      saved.status = calendar.requireApproval || !calendar.free ? 'Pending' : 'Confirmed';
      if (!calendar.free) saved.payment = { amount: calendar.priceType === 'hourly' ? calendar.price * booking.duration / 60 : calendar.priceType === 'per_attendee' ? calendar.price * (1 + (booking.guests?.length ?? 0)) : calendar.price, currency: calendar.currency, status: 'Pending' };
    }
    const leadRef = root.collection('leads').doc(createHash('sha256').update(saved.email).digest('hex').slice(0, 32));
    const lead = (await tx.get(leadRef)).data();
    const routing = await resolveCRMRoute(tx, root, calendar.crmRouting, 'BOOKING');
    if (operation !== 'cancel') {
      const now = new Date().toISOString();
      const { fields, labels } = buildLeadCustomFields(calendar, saved.customAnswers, qualificationResponses);
      const existingTags = Array.isArray(lead?.tags) ? lead.tags.filter(t => t !== 'Pending Booking') : [];
      tx.set(leadRef, {
        ...(lead ?? { id: leadRef.id, name: saved.name, email: saved.email, source: 'Booking', hasWhatsAppConsent: false, hasEmailConsent: false, createdAt: now }),
        name: saved.name,
        email: saved.email,
        phone: String(saved.whatsapp || lead?.phone || '').slice(0, 80),
        ...(!lead || calendar.crmRouting?.pipelineId ? routing : {}),
        ...(qualificationResponses?.length ? { qualificationStatus: 'Qualified' } : {}),
        ...(Object.keys(fields).length ? { customFields: { ...(lead?.customFields || {}), ...fields }, customFieldLabels: { ...(lead?.customFieldLabels || {}), ...labels } } : {}),
        tags: existingTags,
        bookingStatus: 'Booked',
        followUpState: 'BOOKED',
        bookingId: booking.id,
        lastActivity: now,
        updatedAt: now,
      });
    }
    tx.set(lock, { version: (lockDoc.data()?.version ?? 0) + 1 });
    tx.set(ref, { ...saved, managementTokenHash: digest });
    tx.create(root.collection('events').doc(), { type: `booking.${operation}`, resourceId: booking.id, actorId: 'public', createdAt: FieldValue.serverTimestamp() });
    const { managementTokenHash, ...result } = saved;
    return { booking: result };
  });
});
