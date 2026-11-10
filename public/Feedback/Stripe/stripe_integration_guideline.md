# Stripe Integration Guideline

## 1. Files Used (File Names Only)

### Core Backend & Service Files
- `index.js` *(Firebase Cloud Functions)*
- `stripeService.js`

### Frontend Pages & Components
- `SubscriptionPlansPage.jsx`
- `AdminDashboardPage.jsx`
- `SuperAdminPage.jsx`
- `PaymentModal.jsx`
- `WebsiteConstruction.jsx`

### State & Context
- `AuthContext.jsx`

### Configuration & Dependencies
- `vite.config.js`
- `package.json`

### Localization (Translations for Stripe UI)
- `en.json`
- `ar.json`
- `ar-EG.json`
- `ar-GCC.json`

---

## 2. Architecture Overview

The website uses a **Multi-Tenant Stripe Architecture** where each Admin (Brand Owner) connects their own Stripe account to accept card payments from their assigned users.

- **Security Principle:** The Stripe **Secret Key (`sk_...`)** and **Webhook Signing Secret (`whsec_...`)** never leave the server/Admin document. Only public settings (`enabled`, `publishableKey`, `paymentLink`, `paymentLinkAnnual`) are exposed to client sessions.
- **Dual-Path Fulfillment:** Orders are fulfilled both via **Stripe Webhook** (`stripeWebhook`) and a **Client Return Fallback** (`verifyStripeSession`), protected by an idempotency guard (`stripeSessionId`) so credits and subscriptions are never duplicated.

---

## 3. Step-by-Step Workflow

### Step 1: Admin Configuration (`AdminDashboardPage.jsx`)
1. The Admin navigates to **Transactions & Payments** in the Admin Dashboard and configures their Stripe settings:
   - `enabled`: Enables or disables Stripe payments for their brand.
   - `publishableKey`: Stripe Publishable Key (`pk_test_...` or `pk_live_...`).
   - `secretKey`: Stripe Secret Key (`sk_test_...` or `sk_live_...`).
   - `webhookSecret`: Stripe Webhook Signing Secret (`whsec_...`) — optional in test mode, used to verify webhook signatures in production.
   - `paymentLink` & `paymentLinkAnnual`: Optional static Stripe Payment Links (`https://buy.stripe.com/...`) used as a fallback if dynamic session creation fails.
2. When saved:
   - Full credentials (including `secretKey` and `webhookSecret`) are saved to the Admin's Firestore document (`users/{adminId}.paymentMethods.stripe`).
   - Public-only fields (`enabled`, `publishableKey`, `paymentLink`, `paymentLinkAnnual`) are synced to the `brands` and `tenants` collections.

---

### Step 2: Resolving Brand Payment Methods (`AuthContext.jsx` & `SubscriptionPlansPage.jsx`)
1. When a user signs in, `AuthContext.jsx` resolves their assigned `adminId` and loads the Admin's payment configuration into `brandData.paymentMethods` (exposing only public Stripe fields).
2. `SubscriptionPlansPage.jsx` also performs a multi-source fallback lookup (`users/{adminUid}`, `tenants/{adminUid}`, `brands/{brandName}`, or in-memory `brandData`) to ensure payment methods are always available.
3. If `stripe.enabled` is `true`, **Credit Card (Stripe)** is displayed in the payment modal alongside manual transfer methods.

---

### Step 3: Creating a Checkout Session (`SubscriptionPlansPage.jsx` -> `stripeService.js` -> `index.js`)
When a user selects a subscription plan, agrees to the Terms & Conditions, chooses **Stripe**, and clicks **Proceed to Secure Payment**:

#### Option A: Dynamic Checkout Session (Primary Flow)
1. `SubscriptionPlansPage.jsx` calls `createCheckoutSession(...)` from `stripeService.js`, passing:
   - `adminId`
   - `userId`
   - `userEmail`
   - `planName`
   - `planId`
   - `creditsPerMonth`
   - `amount` (full display price, e.g., `300`)
   - `currency` (e.g., `egp`, `usd`)
2. `stripeService.js` sends a `POST` request to the `createStripeCheckout` Firebase Cloud Function (`index.js`).
   - *Note:* In local development, `vite.config.js` proxies `/api/stripe/*` requests to the local Firebase Functions emulator.
3. Inside `createStripeCheckout` (`index.js`):
   - Fetches `users/{adminId}` from Firestore and reads `paymentMethods.stripe.secretKey`.
   - Initializes the Stripe SDK with the Admin's `secretKey`.
   - Converts `amount` into minor currency units (`Math.round(Number(amount) * 100)` for cents/piastres).
   - Creates a Stripe Checkout Session (`mode: "payment"`) with:
     - `client_reference_id: userId`
     - `customer_email: userEmail`
     - `metadata`: `{ userId, adminId, planId, planName, creditsPerMonth, currency }`
     - `success_url`: `{origin}/dashboard/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`
     - `cancel_url`: `{origin}/dashboard/subscription?payment=cancelled`
   - Returns `{ url, sessionId }` to the client.
4. The frontend redirects the user (`window.top.location.href = checkoutUrl`) to the Stripe-hosted checkout page.

#### Option B: Static Payment Link (Fallback Flow)
- If the Cloud Function fails, `SubscriptionPlansPage.jsx` checks if the Admin configured `paymentLink` (or `paymentLinkAnnual` for annual plans) and redirects the user to `{paymentLink}?client_reference_id={userId}`.

---

### Step 4: Order Fulfillment & Verification (`index.js` & `SubscriptionPlansPage.jsx`)
Once payment is completed on Stripe, the order is fulfilled through one of two paths:

#### Path 1: Stripe Webhook (`stripeWebhook` in `index.js`)
1. Stripe sends a `POST` request with the `checkout.session.completed` event to the `stripeWebhook` Cloud Function.
2. The function extracts `adminId` from `event.data.object.metadata.adminId` and retrieves the Admin's `webhookSecret` and `secretKey` from Firestore.
3. If `webhookSecret` (`whsec_...`) and the `stripe-signature` header are present, it verifies the event signature via `stripe.webhooks.constructEvent(...)`. Otherwise, it parses the event in unverified/test mode.
4. If `session.payment_status === "paid"`, it calls `fulfillCheckoutSession(session)`.

#### Path 2: Client Return Verification Fallback (`verifyStripeSession` in `index.js`)
1. When the user returns from Stripe to `/dashboard/subscription?payment=success&session_id=cs_...`, `SubscriptionPlansPage.jsx` detects `payment=success` and `session_id` in the URL query string.
2. It calls `verifyCheckoutSession(sessionId, userData.uid)` in `stripeService.js`, which sends a `POST` request to the `verifyStripeSession` Cloud Function.
3. `verifyStripeSession` (`index.js`):
   - Finds the user's `adminId` from `users/{userId}` and retrieves the Admin's `secretKey` from `users/{adminId}`.
   - Calls `stripe.checkout.sessions.retrieve(sessionId)` directly from Stripe.
   - Verifies that `session.client_reference_id` (or `session.metadata.userId`) matches the requesting `userId`.
   - Checks that `session.payment_status === "paid"` and calls `fulfillCheckoutSession(session)`.
4. `SubscriptionPlansPage.jsx` displays a success toast and cleans up the URL query parameters.

---

### Step 5: Updating Firestore & Activating Subscription (`fulfillCheckoutSession` in `index.js`)
Both the Webhook and Client Verification call the shared `fulfillCheckoutSession(session)` helper:

1. **Idempotency Check:**
   - Reads `users/{userId}` from Firestore.
   - If `existingData.subscription.stripeSessionId === session.id`, the session was already processed; it immediately returns `{ success: true, alreadyProcessed: true }` without re-granting credits.
2. **Subscription & Credit Update:**
   - Calculates a 30-day subscription period (`startDate = now`, `expiryDate = now + 30 days`).
   - Updates `users/{userId}` in Firestore:
     - `subscription.status`: `"active"`
     - `subscription.planId`: `planId`
     - `subscription.planName`: `planName`
     - `subscription.type`: `planId`
     - `subscription.startDate`: `now`
     - `subscription.expiryDate`: `expiryDate`
     - `subscription.currentPeriodEnd`: ISO string of `expiryDate`
     - `subscription.stripeSessionId`: `session.id` *(idempotency marker)*
     - `subscription.paymentMethod`: `"stripe"`
     - `subscription.currency`: uppercase currency code
     - `credits`: `creditsPerMonth`
     - `totalCredits`: `creditsPerMonth`
     - `creditsPerMonth`: `creditsPerMonth`
     - `lastCreditResetDate`: `YYYY-MM-01`
     - `planId`: `planId`
     - `planName`: `planName`
     - `subscriptionStatus`: `"active"`
