import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

// Read project config from .env.local if present
let projectId = 'gos-app-3c7fb';
try {
  const env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .filter(line => line.includes('='))
      .map(line => {
        const i = line.indexOf('=');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
      })
  );
  if (env.VITE_FIREBASE_PROJECT_ID) projectId = env.VITE_FIREBASE_PROJECT_ID;
} catch {}

const targetTenantId = process.argv[2];
if (!targetTenantId) {
  console.error("Usage: node scripts/seed-tenant-smoke.mjs <tenantId>");
  console.error("Example: node scripts/seed-tenant-smoke.mjs workspace-u12345");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const root = db.doc(`tenants/${targetTenantId}`);

async function seed() {
  console.log(`Seeding realistic demo data to: tenants/${targetTenantId}...`);
  const batch = db.batch();

  // A. Products
  const products = [
    { id: 'prod-coaching-12w', name: '12-Week Executive Coaching', type: 'Service', status: 'Active', price: '$2,400', config: { amount: 2400, currency: 'USD', duration: 60 }, createdAt: new Date().toISOString() },
    { id: 'prod-strategy-audit', name: 'Brand & Growth Strategy Audit', type: 'Digital Product', status: 'Active', price: '$490', config: { amount: 490, currency: 'USD' }, createdAt: new Date().toISOString() },
    { id: 'prod-retainer-monthly', name: 'Advisory Retainer', type: 'Service', status: 'Active', price: '$1,200/mo', config: { amount: 1200, currency: 'USD', duration: 45 }, createdAt: new Date().toISOString() }
  ];
  products.forEach(p => batch.set(root.collection('products').doc(p.id), p));

  // B. Calendars & Appointments
  const calendarId = 'cal-intro-session';
  batch.set(root.collection('calendars').doc(calendarId), {
    id: calendarId, name: '30-Minute Strategy Call', slug: 'strategy-30',
    duration: 30, active: true, free: true, hostTimezone: 'UTC', dailyLimit: 8,
    availability: Array.from({ length: 7 }, (_, d) => ({ day: d, enabled: d > 0 && d < 6, start: '09:00', end: '17:00' })),
    createdAt: new Date().toISOString()
  });

  const appointments = [
    { id: 'apt-101', calendarId, name: 'Nadia Mansour', email: 'nadia.m@fintech-cairo.com', date: new Date().toISOString().slice(0, 10), time: '10:00 AM', start: new Date().toISOString(), duration: 30, status: 'Confirmed', serviceName: '30-Minute Strategy Call' },
    { id: 'apt-102', calendarId, name: 'Kareem Tarek', email: 'k.tarek@logistics-hub.com', date: new Date().toISOString().slice(0, 10), time: '02:30 PM', start: new Date().toISOString(), duration: 30, status: 'Pending', serviceName: '30-Minute Strategy Call' }
  ];
  appointments.forEach(a => batch.set(root.collection('bookings').doc(a.id), a));

  // C. CRM Leads
  const leads = [
    { id: 'lead-1', name: 'Omar Sherif', email: 'omar@alphacapital.io', phone: '+201001234567', company: 'Alpha Capital', lifecycleStage: 'QUALIFIED', stage: 'QUALIFIED', value: 2400, source: 'LinkedIn', followUpState: 'CONVERSING', hasWhatsAppConsent: true, createdAt: new Date().toISOString() },
    { id: 'lead-2', name: 'Laila Hassan', email: 'laila.h@luxoretail.com', phone: '+201119876543', company: 'Luxo Retail', lifecycleStage: 'LEAD_CAPTURED', stage: 'LEAD_CAPTURED', value: 490, source: 'Website', followUpState: 'NEW', hasEmailConsent: true, createdAt: new Date().toISOString() },
    { id: 'lead-3', name: 'Tarek Ezzat', email: 'tarek@nexustech.me', phone: '+201223456789', company: 'Nexus Technologies', lifecycleStage: 'BOOKING', stage: 'BOOKING', value: 1200, source: 'WhatsApp', followUpState: 'BOOKED', hasWhatsAppConsent: true, createdAt: new Date().toISOString() }
  ];
  leads.forEach(l => batch.set(root.collection('leads').doc(l.id), l));

  // D. Verified Transactions for Analytics
  const transactions = [
    { id: 'tx-001', status: 'Completed', amount: 2400, currency: 'USD', productName: '12-Week Executive Coaching', customerName: 'Omar Sherif', date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() },
    { id: 'tx-002', status: 'Completed', amount: 490, currency: 'USD', productName: 'Brand & Growth Strategy Audit', customerName: 'Laila Hassan', date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() }
  ];
  transactions.forEach(t => batch.set(root.collection('transactions').doc(t.id), t));

  await batch.commit();
  console.log(`Successfully seeded sample data for tenant: ${targetTenantId}`);
}

seed().catch(err => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
