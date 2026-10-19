# GOS Platform Live Integration & Manual Testing Plan
**Target Project:** `gos-app-3c7fb` | **Architecture:** Firebase Auth + Firestore + v2 Functions + `gos-api`

---

## 1. Prerequisites & Environment Check

Before initiating manual or automated testing, confirm your local environment and network baseline:

1. **Verify `.env.local` Configuration**:
   Open [`.env.local`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/.env.local) and confirm the following keys are set:
   ```env
   VITE_FIREBASE_PROJECT_ID=gos-app-3c7fb
   VITE_FIREBASE_AUTH_DOMAIN=gos-app-3c7fb.firebaseapp.com
   VITE_FIREBASE_API_KEY=<project-api-key>
   VITE_GOS_API_BASE_URL=https://gos-api.vercel.app
   VITE_USE_CLOUD_FUNCTIONS=true
   ```
2. **Start the Local Development Server**:
   ```powershell
   npm run dev
   ```
   *(Running locally connects to live Firebase services unless `VITE_LOCAL_DEMO=true` is explicitly enabled).*
3. **Open Developer Tools**:
   Press `F12` to inspect the **Console** and **Network** tabs to track token exchanges, Firebase Cloud Function responses, and Firestore snapshot listeners.

---

## 2. Test Execution Plan

### Flow 1: User Management & Multi-Tenant Onboarding Cycle

#### Goal
Verify that an administrator can provision a new workspace tenant, generate a valid invitation, and verify that Firebase Auth Custom Claims (`role`, `tenantId`) are securely stamped.

#### Step-by-Step Test Procedure
1. **Sign in as System Admin**:
   - Navigate to `/login` ([`LoginPage.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/auth/LoginPage.tsx)).
   - Sign in with pre-seeded administrative credentials (e.g., `admin@gmail.com` / `12345678` from [`functions/seed.mjs`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/functions/seed.mjs#L11)).
   - Verify you land on `/admin/dashboard` or `/dashboard`.
2. **Access Admin User Management**:
   - Navigate to `/admin/users` ([`AdminUsers.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/onboarding/AdminUsers.tsx)).
   - Click **"Invite your first user"** or **"Send invite"**.
3. **Dispatch a Disposable Invite**:
   - Enter a test name: `QA Tester`
   - Enter a test email: `qa-smoke+<timestamp>@example.com`
   - Select Role: `Team member` (`USER`) or `Admin` (`ADMIN`).
   - Submit the dialog.
4. **Inspect the Generated Link**:
   - Copy the activation link produced by the UI:
     - **Cloud Functions Ready**: An official Firebase password setup link containing an `oobCode` (`https://gos-app-3c7fb.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=...`).
     - **Client Fallback**: A local direct activation URL (`/auth/reset-password?email=...&mode=activation&id=...`).
5. **Verify Token & Custom Claims**:
   - In browser DevTools Console, inspect the claims of the newly active user:
     ```javascript
     const tokenResult = await window.firebaseAuth?.currentUser?.getIdTokenResult();
     console.log("Custom Claims:", tokenResult?.claims);
     ```
   - **Acceptance Criteria**:
     - `claims.role` MUST match `'ADMIN'` or `'USER'`.
     - `claims.tenantId` MUST exist (e.g., `workspace-<uid>`).
     - In Firestore: Records under `users/{uid}` and `tenants/{tenantId}/members/{uid}` must exist with `active: true` and `status: 'Active'`.

---

### Flow 2: Authentication & Action Link Recovery Flows

#### 2.1 Login Flow
1. Navigate to `/auth/login` ([`LoginPage.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/auth/LoginPage.tsx)).
2. Test both happy and unhappy paths:
   - **Invalid Password**: Ensure a clear toast appears (`The email or password is incorrect.`) without raw Firebase SDK codes (`auth/invalid-credential`).
   - **Valid Login**: Enter valid credentials. Ensure the user is routed via [`routeForRole()`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/router/ProtectedRoute.tsx):
     - `SUPER_ADMIN` $\rightarrow$ `/super-admin`
     - `ADMIN` $\rightarrow$ `/admin` or `/dashboard`
     - `USER` $\rightarrow$ `/dashboard`
3. Verify session resolution: Reload the browser on `/dashboard` and confirm that [`FirebaseSession`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/backend/session.tsx#L143) restores auth state without redirecting to `/login`.

#### 2.2 Password Reset & Recovery
1. Navigate to `/auth/forgot-password` ([`ForgotPasswordPage.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/auth/ForgotPasswordPage.tsx)).
2. Enter your registered email address and click **"Send reset link"**.
3. Verify that the 30-second resend cooldown timer activates.
4. Open the email reset link or capture the test action code (`oobCode`).
5. Paste the link into the browser to land on `/auth/reset-password?oobCode=...` ([`ResetPasswordPage.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/auth/ResetPasswordPage.tsx)).
6. Enter a new password satisfying the 4 criteria badges (8+ characters, mixed case, number, special character).
7. Submit the form: Verify the countdown modal redirects to `/auth/login`, and sign in with the new password.

#### 2.3 Email Verification Action Handling
1. When receiving a Firebase Action link with `mode=verifyEmail&oobCode=...`:
2. Navigate directly to `/activate?mode=verifyEmail&oobCode=...`.
3. Confirm that the application acknowledges email verification or applies the action code via `applyActionCode()` rather than attempting to parse the code as a password reset token.

---

### Flow 3: User Dashboard & Core Pages Checklist

Test the following functional modules inside the `/dashboard/*` suite:

| Page / Route | Core Components to Test | Expected Acceptance Behavior |
| :--- | :--- | :--- |
| **Home Dashboard**<br>`/dashboard` | [`HomeDashboard.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/dashboard/HomeDashboard.tsx) | Metric summary widgets render without infinite loading skeleton; recent activity reflects updates. |
| **CRM & Leads**<br>`/dashboard/crm` | [`CRMLeads.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/CRMLeads.tsx) | Pipeline board displays stages (`Lead Captured`, `Contacted`, `Qualified`). Dragging a card between stages persists; contact search and CSV export trigger. |
| **Unified Inbox**<br>`/dashboard/inbox` | [`Inbox.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/Inbox.tsx) | Channel filters (WhatsApp, Email, Webchat) switch conversation lists. Conversation threads load customer messages, timestamps, and read badges. |
| **Booking & Calendars**<br>`/dashboard/booking` | [`BookingCalendar.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/booking/BookingCalendar.tsx) | Calendar view loads; clicking an available slot opens the appointment inspector; host availability ranges can be configured. |
| **Public Booking**<br>`/book/:slug` | [`PublicBookingPage.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/booking/PublicBookingPage.tsx) | Anonymous visitors can view slots and submit bookings without being prompted for workspace login. |
| **Products & Payments**<br>`/dashboard/products-payments` | [`ProductsPayments.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/ProductsPayments.tsx) | Product list loads products; clicking "Add Product" allows creating a service/digital product; currency symbol formats correctly. |
| **Funnels & Websites**<br>`/dashboard/funnels` | [`FunnelBuilder.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/FunnelBuilder.tsx) | Template selector loads visual thumbnails; opening an asset loads the PageFly canvas builder. |
| **Settings Hub**<br>`/dashboard/settings/profile` | [`SettingsWorkspace.tsx`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/src/pages/settings/SettingsWorkspace.tsx) | Profile name, business address, and currency update and persist across page refreshes. |

---

### Features to AVOID During This Test Phase

Do **not** fail the smoke test based on the following known blocks:

1. **AI Copilot (`/dashboard/copilot`)**:
   - **Reason**: Requires `OPENAI_API_KEY` bound to Google Cloud Secret Manager.
   - **Expected Failure**: Sending prompts will result in `The AI service has not been configured yet` or `functions/unavailable`.
2. **AI Follow-Up Live Outbound Dispatch (`/dashboard/follow-up`)**:
   - **Reason**: Live provider delivery adapters (Meta / Twilio / Resend) are omitted while credentials are not configured.
   - **Safe Testing Scope**: Creating workflows and editing steps in the UI works; clicking "Run Workflow" will leave messages in status `queued` in the outbox.
3. **Live External Provider Connect in Settings (`/dashboard/settings/integrations`)**:
   - **Reason**: Live third-party OAuth redirect callbacks are not registered.
   - **Expected Failure**: Clicking "Connect" in production mode throws *"This provider action is not configured"*. (Use `VITE_LOCAL_DEMO=true` to test the simulated integration modal).
4. **Live Inbound Webhooks to Unified Inbox**:
   - **Reason**: Real-time webhook ingestion from external platforms requires live webhook endpoints to be registered with Meta/Twilio.

---

## 3. Real Data & Seeding Strategy (Fast & Safe)

### Strategy A: Tenant-Scoped Firestore Seed Script (Zero Risk)

All tenant data in `gos-app` is sandboxed under:
`/tenants/{tenantId}/*`

You can seed an isolated test tenant using the Node.js script below. It populates **Leads, Calendars, Bookings, Products, and Workflows** for your active tenant, and can be wiped instantly by deleting the tenant subcollections.

#### Seeding Script: `scripts/seed-tenant-smoke.mjs`

Run this script to seed data into a specific test tenant:

```javascript
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Initialize with project ID
const projectId = 'gos-app-3c7fb';
initializeApp({ projectId });
const db = getFirestore();

// 2. Set your test tenant ID (e.g. node scripts/seed-tenant-smoke.mjs workspace-<your-uid>)
const targetTenantId = process.argv[2];
if (!targetTenantId) {
  console.error("Usage: node scripts/seed-tenant-smoke.mjs <tenantId>");
  process.exit(1);
}

const root = db.doc(`tenants/${targetTenantId}`);

async function seed() {
  console.log(`Seeding realistic demo data to: tenants/${targetTenantId}...`);
  const batch = db.batch();

  // A. Seed Sample Products
  const products = [
    { id: 'prod-coaching-12w', name: '12-Week Executive Coaching', type: 'Service', status: 'Active', price: '$2,400', config: { amount: 2400, currency: 'USD', duration: 60 }, createdAt: new Date().toISOString() },
    { id: 'prod-strategy-audit', name: 'Brand & Growth Strategy Audit', type: 'Digital Product', status: 'Active', price: '$490', config: { amount: 490, currency: 'USD' }, createdAt: new Date().toISOString() },
    { id: 'prod-retainer-monthly', name: 'Advisory Retainer', type: 'Service', status: 'Active', price: '$1,200/mo', config: { amount: 1200, currency: 'USD', duration: 45 }, createdAt: new Date().toISOString() }
  ];
  products.forEach(p => batch.set(root.collection('products').doc(p.id), p));

  // B. Seed Calendars & Appointments
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

  // C. Seed CRM Leads
  const leads = [
    { id: 'lead-1', name: 'Omar Sherif', email: 'omar@alphacapital.io', phone: '+201001234567', company: 'Alpha Capital', lifecycleStage: 'QUALIFIED', stage: 'QUALIFIED', value: 2400, source: 'LinkedIn', followUpState: 'CONVERSING', hasWhatsAppConsent: true, createdAt: new Date().toISOString() },
    { id: 'lead-2', name: 'Laila Hassan', email: 'laila.h@luxoretail.com', phone: '+201119876543', company: 'Luxo Retail', lifecycleStage: 'LEAD_CAPTURED', stage: 'LEAD_CAPTURED', value: 490, source: 'Website', followUpState: 'NEW', hasEmailConsent: true, createdAt: new Date().toISOString() },
    { id: 'lead-3', name: 'Tarek Ezzat', email: 'tarek@nexustech.me', phone: '+201223456789', company: 'Nexus Technologies', lifecycleStage: 'BOOKING', stage: 'BOOKING', value: 1200, source: 'WhatsApp', followUpState: 'BOOKED', hasWhatsAppConsent: true, createdAt: new Date().toISOString() }
  ];
  leads.forEach(l => batch.set(root.collection('leads').doc(l.id), l));

  // D. Seed Verified Transactions for Analytics
  const transactions = [
    { id: 'tx-001', status: 'Completed', amount: 2400, currency: 'USD', productName: '12-Week Executive Coaching', customerName: 'Omar Sherif', date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() },
    { id: 'tx-002', status: 'Completed', amount: 490, currency: 'USD', productName: 'Brand & Growth Strategy Audit', customerName: 'Laila Hassan', date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() }
  ];
  transactions.forEach(t => batch.set(root.collection('transactions').doc(t.id), t));

  await batch.commit();
  console.log("Seeding complete! Refresh your dashboard.");
}

seed().catch(console.error);
```

#### Running the Seed:
```powershell
node scripts/seed-tenant-smoke.mjs workspace-<your-uid>
```

#### Teardown & Cleanup After Testing:
To completely remove all test records without touching other tenants or production accounts:
```powershell
node -e "
import('firebase-admin/firestore').then(async ({ getFirestore }) => {
  const { initializeApp } = await import('firebase-admin/app');
  initializeApp({ projectId: 'gos-app-3c7fb' });
  const db = getFirestore();
  const root = db.doc('tenants/workspace-<your-uid>');
  await db.recursiveDelete(root);
  console.log('Test tenant wiped successfully.');
});"
```

---

### Strategy B: Instant In-Browser Demo Mode

To evaluate UI/UX aesthetics, animations, and typography immediately without writing any data to live Firestore:
1. Temporarily toggle the demo flag in [`.env.local`](file:///d:/Froent_end_Courses/FreeLancer/GOS-app/.env.local):
   ```env
   VITE_LOCAL_DEMO=true
   ```
2. Restart Vite:
   ```powershell
   npm run dev
   ```
3. **What happens**:
   - The **Unified Inbox** populates with rich multimedia customer chats, voice notes, and attachments.
   - The **Integrations Hub** allows clicking "Connect" on Meta, WhatsApp, Stripe, and Google Calendar with immediate simulated success.
   - All state is confined to browser `localStorage` under `gos-local-demo-v1:*` and will never touch live Firestore collections.
