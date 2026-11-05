import { resolveCRMRoute } from './crm-routing.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { validateBooking } from './policy.js';
import { createHash } from 'node:crypto';
import { evaluateQualification, publicScreeningQuestions, validQualificationQuestions } from './booking-qualification.js';

function screeningRules(value) {
  if (value === undefined) return [];
  if (!validQualificationQuestions(value)) throw new HttpsError('failed-precondition', 'This booking page has an invalid screening configuration. Contact the host.');
  return value;
}

function publicQualification(result, questions) {
  return result.status === 'incomplete' ? { status: result.status, screeningQuestions: publicScreeningQuestions(questions) } : { status: result.status };
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
    const questions = screeningRules(initial.qualificationQuestions);
    return publicQualification(evaluateQualification(questions, screeningAnswers), questions);
  }
  if (operation === 'availability') {
    const { password: hidden, notificationWorkflows, qualificationQuestions, ...page } = initial;
    const screeningQuestions = publicScreeningQuestions(screeningRules(qualificationQuestions));
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
      const questions = screeningRules(calendar.qualificationQuestions);
      const result = evaluateQualification(questions, screeningAnswers);
      if (result.status !== 'qualified') return { qualification: publicQualification(result, questions) };
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
      const missing = (calendar.questions ?? []).find(q => q.active !== false && q.required && q.type !== 'text-block' && !String(booking.customAnswers?.[q.id] ?? '').trim());
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
    if (operation !== 'cancel') tx.set(leadRef, { ...(lead ?? { id: leadRef.id, name: saved.name, email: saved.email, source: 'Booking', hasWhatsAppConsent: false, hasEmailConsent: false }), ...(!lead || calendar.crmRouting?.pipelineId ? routing : {}), ...(qualificationResponses?.length ? { qualificationStatus: 'Qualified' } : {}), bookingStatus: 'Booked', followUpState: 'BOOKED', bookingId: booking.id, lastActivity: new Date().toISOString() });
    tx.set(lock, { version: (lockDoc.data()?.version ?? 0) + 1 });
    tx.set(ref, { ...saved, managementTokenHash: digest });
    tx.create(root.collection('events').doc(), { type: `booking.${operation}`, resourceId: booking.id, actorId: 'public', createdAt: FieldValue.serverTimestamp() });
    const { managementTokenHash, ...result } = saved;
    return { booking: result };
  });
});
