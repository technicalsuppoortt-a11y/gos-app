import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { evaluateQualification, validQualificationQuestions } from '../booking-qualification.js';
import { publicBooking } from '../public-booking.js';

const rules = [
  { id: 'budget', label: 'Budget in USD', type: 'minimum', minimum: 1500 },
  { id: 'scope', label: 'Project scope', type: 'choice', options: ['Strategy', 'One-off task'], accepted: ['Strategy'] },
];
const eligible = { budget: '1500.00', scope: 'Strategy' };

test('requires valid answers to every configured rule and treats the threshold as inclusive', () => {
  assert.ok(validQualificationQuestions(rules));
  assert.equal(evaluateQualification(rules, eligible).status, 'qualified');
  assert.equal(evaluateQualification(rules, { ...eligible, budget: '1499.99' }).status, 'ineligible');
  assert.equal(evaluateQualification(rules, { ...eligible, scope: 'One-off task' }).status, 'ineligible');
  for (const bad of ['', '0xFFFF', 'Infinity', '-1', '3,000', 2000]) {
    assert.equal(evaluateQualification(rules, { ...eligible, budget: bad }).status, 'incomplete');
  }
  assert.equal(evaluateQualification(rules, { ...eligible, scope: 'Unknown' }).status, 'incomplete');
  assert.equal(evaluateQualification(rules, Object.create(eligible)).status, 'incomplete');
  assert.equal(evaluateQualification([], undefined).status, 'qualified');
  assert.equal(validQualificationQuestions([rules[0], rules[0]]), false);
  assert.equal(validQualificationQuestions([{ ...rules[1], accepted: ['Missing'] }]), false);
  assert.equal(validQualificationQuestions([{ ...rules[0], minimum: Infinity }]), false);
});

initializeApp({ projectId: 'demo-qualification-tests' });
const db = getFirestore();

function fakeStore(t, calendar) {
  const records = new Map(), writes = [];
  const snapshot = path => ({ id: path.split('/').at(-1), data: () => records.get(path) });
  const collection = name => {
    const rows = () => ({ docs: [...records.keys()].filter(path => path.startsWith(name + '/')).map(snapshot) });
    return {
      name, doc: (id = 'event-' + writes.length) => ({ path: name + '/' + id, get: async () => snapshot(name + '/' + id) }),
      where: () => ({ get: async () => rows() }), rows,
    };
  };
  const ref = { id: 'calendar', parent: { parent: { collection } } };
  t.mock.method(db, 'collectionGroup', () => ({
    where: () => ({ limit: () => ({ get: async () => ({ size: 1, docs: [{ ref, data: () => calendar }] }) }) }),
  }));
  t.mock.method(db, 'runTransaction', fn => fn({
    get: async ref => ref.path === undefined ? ref.id === 'calendar' ? { data: () => calendar } : ref.rows() : snapshot(ref.path),
    set: (ref, value) => { writes.push(ref.path); records.set(ref.path, value); },
    create: (ref, value) => { writes.push(ref.path); records.set(ref.path, value); },
  }));
  return { writes, records };
}

const calendar = {
  name: 'Consultation', slug: 'consultation', active: true, duration: 30, free: true, hostTimezone: 'UTC',
  availability: Array.from({ length: 7 }, (_, day) => ({ day, enabled: true, start: '09:00', end: '17:00' })),
  afterBooking: { allowCancelReschedule: true },
};
const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
const booking = { id: 'request-1', name: 'Visitor', email: 'visitor@example.com', date, start: date + 'T12:00:00Z', duration: 30 };
const call = data => publicBooking.run({ data: { slug: calendar.slug, token: '1'.repeat(36), ...data } });

test('checks current rules inside create and writes only after qualification passes', async t => {
  const page = { ...calendar, qualificationQuestions: structuredClone(rules), passwordProtect: true, password: 'secret' };
  const { writes, records } = fakeStore(t, page);
  const request = { operation: 'create', booking, password: 'secret' };
  await assert.rejects(call({ operation: 'qualify', screeningAnswers: eligible }), { code: 'permission-denied' });
  const availability = await call({ password: 'secret' });
  assert.equal(availability.page.password, undefined);
  assert.equal(availability.page.qualificationQuestions, undefined);
  assert.equal(availability.screeningQuestions[0].minimum, undefined);
  assert.equal(availability.screeningQuestions[1].accepted, undefined);
  assert.deepEqual(availability.screeningQuestions[1].options, rules[1].options);
  assert.deepEqual(await call({ operation: 'qualify', password: 'secret', screeningAnswers: eligible }), { status: 'qualified' });
  assert.deepEqual((await call(request)).qualification, { status: 'incomplete', screeningQuestions: availability.screeningQuestions });
  page.qualificationQuestions[0].minimum = 1600;
  assert.deepEqual(await call({ ...request, screeningAnswers: eligible }), { qualification: { status: 'ineligible' } });
  assert.deepEqual(writes, []);

  const saved = await call({ ...request, screeningAnswers: { ...eligible, budget: '1600' } });
  assert.equal(saved.booking.status, 'Confirmed');
  assert.deepEqual(saved.booking.qualificationResponses.map(row => row.answer), ['1600', 'Strategy']);
  assert.equal([...records.entries()].find(([key]) => key.startsWith('leads/'))[1].qualificationStatus, 'Qualified');
  assert.equal(writes.filter(path => path.startsWith('events/')).length, 1);
  assert.deepEqual(await call(request), saved);
  assert.equal(writes.filter(path => path.startsWith('events/')).length, 1);

  page.qualificationQuestions[0].minimum = 10_000;
  const rescheduled = await call({ ...request, operation: 'reschedule', booking: { ...booking, start: date + 'T13:00:00Z' } });
  assert.deepEqual(rescheduled.booking.qualificationResponses, saved.booking.qualificationResponses);
});

test('legacy calendars still accept a regular booking with no screening payload', async t => {
  fakeStore(t, calendar);
  const availability = await call({});
  assert.deepEqual(availability.screeningQuestions, []);
  const saved = await call({ operation: 'create', booking });
  assert.equal(saved.booking.status, 'Confirmed');
  assert.equal(saved.booking.qualificationResponses, undefined);
});
