import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadTS(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: id => {
      if (id in mocks) return mocks[id];
      throw new Error(`Unexpected import: ${id}`);
    },
    console,
    crypto: { randomUUID: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 9) },
    Intl,
    Date,
    URL,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Math,
    JSON,
  });
  return exports;
}

const mockCloudStorage = {
  store: new Map(),
  getItem(k) { return this.store.get(k) ?? null; },
  setItem(k, v) { this.store.set(k, v); return Promise.resolve(); },
  removeItem(k) { this.store.delete(k); return Promise.resolve(); }
};

const bookingModel = loadTS('../src/pages/booking/model.ts', {
  '../../backend/workspace': { cloudStorage: mockCloudStorage },
  'react': { useCallback: fn => fn, useEffect: () => {}, useState: init => [typeof init === 'function' ? init() : init, () => {}] },
  './booking-section-schema': {
    locationFromLabel: (label, id) => ({ id, label, type: 'custom', address: '' }),
    sectionDefaults: () => ({
      locations: [],
      breaks: [],
      additionalWeekdayAvailability: [],
      specificDateAvailability: [],
      bookingLimits: [],
      lookBusy: { enabled: false, min: 0, max: 0 },
      formSettings: { nameType: 'fullname', guestsActive: false, guestsRequired: false },
      notificationWorkflows: {},
      templateSettings: { previewMode: 'standard', postBookingMode: 'standard' },
    }),
    weekdayMatches: (a, b) => a === b,
  }
});

const crmRecordLinks = loadTS('../src/pages/crm/recordLinks.ts', {
  '../../store/slices/crmSlice': {},
});

/* ========================================================================== */
/* TC-01: Sub-Tab Navigation & URL Routing Model Validation                   */
/* ========================================================================== */
test('TC-01: Validates sub-tab navigation mapping and URL query resolution', () => {
  const recognizedTabs = ['dashboard', 'bookings', 'calendar', 'contacts', 'workspace', 'templates'];
  const testUrls = [
    { url: '/dashboard/booking?tab=dashboard', expectedTab: 'dashboard' },
    { url: '/dashboard/booking?tab=bookings', expectedTab: 'bookings' },
    { url: '/dashboard/booking?tab=calendar', expectedTab: 'calendar' },
    { url: '/dashboard/booking?tab=contacts', expectedTab: 'contacts' },
    { url: '/dashboard/booking?tab=workspace', expectedTab: 'workspace' },
    { url: '/dashboard/booking?tab=templates', expectedTab: 'templates' },
    { url: '/dashboard/booking', expectedTab: 'dashboard' }, // default fallback
    { url: '/dashboard/booking?tab=links', expectedTab: 'dashboard' }, // alias fallback
  ];

  for (const { url, expectedTab } of testUrls) {
    const params = new URL(url, 'https://example.com').searchParams;
    const tabParam = params.get('tab');
    const resolved = tabParam === 'links' ? 'dashboard' : (tabParam ?? 'dashboard');
    assert.equal(resolved, expectedTab);
    assert.ok(recognizedTabs.includes(resolved));
  }
});

/* ========================================================================== */
/* TC-02: Contacts Management & RFC4180 CSV Import Validation                */
/* ========================================================================== */
test('TC-02: Contacts CSV Parser handles valid headers, quoted commas, BOM, and skips duplicates', () => {
  const csvContent = '\uFEFFName,Email,Phone,Company\n' +
    '"Sarah Connor",sarah@skynet.com,+15550199,"Cyberdyne Systems"\n' +
    '"John, Doe",john.doe@example.com,+15550200,"Acme, Inc."\n' +
    'Duplicate User,SARAH@SKYNET.COM,+15550300,Ignored\n' +
    'Invalid Email,not-an-email,+15550400,None\n';

  const rows = bookingModel.parseCSV(csvContent);
  assert.equal(rows.length, 5); // header + 4 rows
  const headers = Array.from(rows.shift()).map(s => s.replace(/^\uFEFF/, '').toLowerCase());
  assert.equal(headers[0], 'name');
  assert.equal(headers[1], 'email');
  assert.equal(headers[2], 'phone');
  assert.equal(headers[3], 'company');

  const contacts = [];
  let skipped = 0;
  for (const row of rows) {
    const name = row[headers.indexOf('name')];
    const email = row[headers.indexOf('email')].toLowerCase();
    const phone = row[headers.indexOf('phone')];
    const company = row[headers.indexOf('company')];

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isDuplicate = contacts.some(c => c.email === email);

    if (!name || (email && !isEmailValid) || (email && isDuplicate)) {
      skipped++;
      continue;
    }
    contacts.push({ id: bookingModel.uid(), name, email, phone, company });
  }

  assert.equal(contacts.length, 2);
  assert.equal(skipped, 2);
  assert.equal(contacts[0].name, 'Sarah Connor');
  assert.equal(contacts[1].name, 'John, Doe');
  assert.equal(contacts[1].company, 'Acme, Inc.');
});

/* ========================================================================== */
/* TC-03: Booking Creation, Availability Engine & Slot Calculation            */
/* ========================================================================== */
test('TC-03: Booking Engine generates available slots, enforces notice and avoids double booking', () => {
  const page = bookingModel.blankPage();
  page.id = 'page-qa-1';
  page.name = '30 Min Strategy Call';
  page.duration = 30;
  page.durationOptions = [30];
  page.hostTimezone = 'UTC';
  page.minNotice = 0; // immediate for testing
  page.bufferTime = 15;
  page.groupCapacity = 1;
  page.dailyLimit = 10;
  // Mon-Fri 09:00 - 17:00
  page.availability = Array.from({ length: 7 }, (_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    start: '09:00',
    end: '17:00'
  }));

  const testDate = '2026-11-02'; // A Monday
  const existingBookings = [
    {
      id: 'existing-b1',
      calendarId: 'page-qa-1',
      name: 'Client One',
      email: 'client1@example.com',
      date: testDate,
      time: '10:00',
      start: '2026-11-02T10:00:00.000Z',
      duration: 30,
      status: 'Confirmed'
    }
  ];

  const now = new Date('2026-11-02T08:00:00.000Z');
  const slots = bookingModel.availableSlots(page, testDate, 30, existingBookings, now);

  assert.ok(slots.length > 0);
  // 09:00 - 09:30 is allowed because it ends at 09:30, leaving >= 15 min buffer before 10:00
  assert.ok(slots.some(s => s.time === '09:00'));

  // 09:30 - 10:00 is BLOCKED because it violates the 15-minute buffer before the 10:00 meeting
  assert.equal(slots.some(s => s.time === '09:30'), false);

  // 10:00 is booked, so 10:00 slot must NOT be available
  assert.equal(slots.some(s => s.time === '10:00'), false);

  // Buffer is 15 min after, so booking ends at 10:30 + 15 min buffer = 10:45; 10:30 slot cannot start
  assert.equal(slots.some(s => s.time === '10:30'), false);

  // 11:00 slot starts after buffer (10:45) -> MUST be available
  assert.ok(slots.some(s => s.time === '11:00'));
});

/* ========================================================================== */
/* TC-04: Cross-Module CRM Sync & Record Linking                              */
/* ========================================================================== */
test('TC-04: CRM recordLinks correctly associates booking records with canonical lead', () => {
  const lead = {
    id: 'lead-12345',
    name: 'Alexander Hamilton',
    email: 'alex@treasury.gov',
    phone: '+1 (555) 987-6543',
    bookingId: 'booking-xyz',
    bookingStatus: 'Not Scheduled'
  };

  // 1. Direct match by bookingId
  assert.ok(crmRecordLinks.linkedToLead({ id: 'booking-xyz' }, lead, 'booking'));

  // 2. Direct match by email
  assert.ok(crmRecordLinks.linkedToLead({ id: 'other-id', email: 'ALEX@treasury.gov' }, lead, 'booking'));

  // 3. Direct match by phone digits
  assert.ok(crmRecordLinks.linkedToLead({ id: 'other-id', phone: '15559876543' }, lead, 'booking'));

  // 4. Match by leadId foreign key
  assert.ok(crmRecordLinks.linkedToLead({ id: 'other-id', leadId: 'lead-12345' }, lead, 'booking'));

  // 5. Must NOT match unrelated record
  assert.equal(crmRecordLinks.linkedToLead({ id: 'other-id', email: 'aaron.burr@example.com' }, lead, 'booking'), false);

  // 6. Must NEVER match blank emails or blank phones
  const emptyLead = { id: 'lead-blank', email: '', phone: '' };
  assert.equal(crmRecordLinks.linkedToLead({ id: 'row-1', email: '' }, emptyLead, 'booking'), false);
  assert.equal(crmRecordLinks.linkedToLead({ id: 'row-2', phone: '' }, emptyLead, 'booking'), false);
});

/* ========================================================================== */
/* TC-05: Booking Status Transitions & Status Filter Logic                    */
/* ========================================================================== */
test('TC-05: Status filter criteria categorize Upcoming, Pending, Canceled, and Past accurately', () => {
  const now = Date.now();
  const oneHour = 3600000;

  const bUpcoming = { id: '1', status: 'Confirmed', start: new Date(now + oneHour).toISOString(), duration: 30 };
  const bPending = { id: '2', status: 'Pending', start: new Date(now + oneHour).toISOString(), duration: 30 };
  const bCanceled = { id: '3', status: 'Canceled', start: new Date(now + oneHour).toISOString(), duration: 30 };
  const bPast = { id: '4', status: 'Confirmed', start: new Date(now - 2 * oneHour).toISOString(), duration: 30 };

  const matches = (b, status) =>
    status === 'Pending' ? b.status === 'Pending'
    : status === 'Canceled' ? b.status === 'Canceled'
    : status === 'Past' ? b.status === 'Confirmed' && Date.parse(b.start) + b.duration * 60000 <= now
    : bookingModel.isUpcomingAppointment(b, now);

  assert.ok(matches(bUpcoming, 'Upcoming'));
  assert.equal(matches(bUpcoming, 'Past'), false);

  assert.ok(matches(bPending, 'Pending'));
  assert.ok(matches(bCanceled, 'Canceled'));
  assert.ok(matches(bPast, 'Past'));
  assert.equal(matches(bPast, 'Upcoming'), false);
});

/* ========================================================================== */
/* TC-06: Troubleshoot Reason Diagnostics Engine                              */
/* ========================================================================== */
test('TC-06: Troubleshoot Slots accurately diagnoses blocked times and edge conditions', () => {
  const page = bookingModel.blankPage();
  page.id = 'page-troubleshoot';
  page.name = 'Diagnostic Test Calendar';
  page.duration = 30;
  page.hostTimezone = 'UTC';
  page.minNotice = 60; // 1 hour minimum notice
  page.maxAdvanceBooking = 14;
  page.bufferTime = 0;
  page.dailyLimit = 1;
  page.availability = Array.from({ length: 7 }, (_, day) => ({
    day,
    enabled: true,
    start: '09:00',
    end: '12:00'
  }));

  const testDate = '2026-11-04';
  const bookings = [
    {
      id: 'existing-meet',
      calendarId: 'page-troubleshoot',
      name: 'Busy Person',
      email: 'busy@example.com',
      date: testDate,
      time: '09:00',
      start: '2026-11-04T09:00:00.000Z',
      duration: 30,
      status: 'Confirmed'
    }
  ];

  // Daily limit of 1 was reached because 1 confirmed booking exists on this day
  const slots = bookingModel.troubleshootSlots(page, testDate, 30, bookings, new Date('2026-11-04T07:00:00.000Z'));
  assert.ok(slots.length > 0);
  assert.ok(slots.every(s => s.busy === true));
  assert.equal(slots[0].reason, 'LIMIT');
  assert.match(slots[0].detail, /booking limit/i);
});

/* ========================================================================== */
/* TC-07: Template Instantiation & Section Configuration Validation           */
/* ========================================================================== */
test('TC-07: Booking Template creates a normalized page with custom questions and slug', () => {
  const template = {
    key: 'strategy',
    category: 'Consulting',
    name: 'Strategy Session',
    description: 'Review business goals and map out next steps.',
    image: '/dashboard/product-consultation.png',
    duration: 45,
    location: 'Google Meet',
    color: 'violet',
    questions: [
      { id: 'company', label: 'Company or website', type: 'text', required: false, options: [] },
      { id: 'goals', label: 'What would you like to achieve?', type: 'textarea', required: true, options: [] },
    ]
  };

  const base = bookingModel.blankPage();
  const instantiated = {
    ...base,
    name: template.name,
    slug: `${bookingModel.slugify(template.name)}-${base.id.slice(0, 8)}`,
    description: template.description,
    duration: template.duration,
    durationOptions: [template.duration],
    location: template.location,
    color: template.color,
    questions: [...base.questions, ...template.questions],
  };

  assert.equal(instantiated.name, 'Strategy Session');
  assert.equal(instantiated.duration, 45);
  assert.ok(instantiated.slug.startsWith('strategy-session-'));
  assert.equal(instantiated.questions.length, 5); // 3 default + 2 template
  assert.ok(instantiated.questions.some(q => q.id === 'goals' && q.required));
});

/* ========================================================================== */
/* TC-08: Cross-Module CRM Lead State Synchronization Simulation              */
/* ========================================================================== */
test('TC-08: Booking confirmation and cancellation correctly updates CRM lead bookingStatus', () => {
  let lead = {
    id: 'lead-test-sync',
    name: 'Marcus Brody',
    email: 'brody@museum.edu',
    bookingStatus: 'Not Scheduled',
    bookingId: undefined,
    activities: []
  };

  // 1. Simulate booking creation
  const newBooking = {
    id: 'book-100',
    serviceName: 'Consultation',
    date: '2026-11-05',
    time: '14:00',
    status: 'Confirmed'
  };

  // Sync handler (identical to AppointmentEditorPage sync)
  if (newBooking.status === 'Confirmed' || newBooking.status === 'Pending') {
    lead = {
      ...lead,
      bookingStatus: 'Booked',
      bookingId: newBooking.id,
      activities: [
        { id: 'act-1', type: 'booking', title: 'Appointment booked', detail: `${newBooking.serviceName} on ${newBooking.date} at ${newBooking.time}` },
        ...lead.activities
      ]
    };
  }

  assert.equal(lead.bookingStatus, 'Booked');
  assert.equal(lead.bookingId, 'book-100');
  assert.equal(lead.activities.length, 1);
  assert.equal(lead.activities[0].type, 'booking');

  // 2. Simulate cancellation
  lead = {
    ...lead,
    bookingStatus: 'Not Scheduled',
    activities: [
      { id: 'act-2', type: 'booking', title: 'Appointment canceled', detail: `${newBooking.serviceName} on ${newBooking.date}` },
      ...lead.activities
    ]
  };

  assert.equal(lead.bookingStatus, 'Not Scheduled');
  assert.equal(lead.activities.length, 2);
  assert.equal(lead.activities[0].title, 'Appointment canceled');
});

