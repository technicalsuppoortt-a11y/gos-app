# Marketing Tracking Architecture & Guide

Joe Partner Portal features a unified **Pixel & Marketing Tracking Center**. This system allows platform administrators and individual affiliate partners/marketers to configure, test, and monitor third-party tracking pixels (**Meta Pixel** and **Google Analytics 4**) seamlessly across the application.

---

## 1. System Overview & Key Concepts

The Marketing Tracking system solves three main challenges:
1. **Multi-Tenant / Role-Based Configuration**:
   - **Administrators**: Configure platform-wide default pixels saved in `settings/marketingTracking`.
   - **Individual Marketers / Partners**: Configure their own personal tracking pixels saved in their user profile document `users/{userId}` under `trackingSettings`.
2. **Dynamic & Idempotent Script Injection**:
   - Injects the official tracking scripts for **Meta (Facebook/Instagram)** and **Google Analytics 4 (GA4)** dynamically at runtime only when valid credentials exist.
   - Prevents duplicate script loading via unique DOM element IDs.
   - Validates pixel IDs with strict regular expressions to avoid malicious script injection or syntax errors.
3. **Unified Tracking SDK & Real-Time Event Bus**:
   - A single wrapper library (`Tracking`) routes events to both Meta (`window.fbq`) and Google Analytics (`window.gtag`) simultaneously.
   - Dispatches a local browser event (`upklick_track` CustomEvent) so the interactive dashboard displays live events instantly without polling the database.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Storage ["Firestore Database"]
        AdminCfg["settings/marketingTracking\n(Global Platform Config)"]
        UserCfg["users/{userId}.trackingSettings\n(Personal Partner Config)"]
    end

    subgraph Initialization ["Application Bootstrap"]
        Dash["Dashboard.tsx"] --> Hook["useTrackingScripts.ts"]
        AdminCfg -.->|Fetch on mount| Hook
        Hook -->|Inject <script> tags| DOMHead["Document <head>"]
    end

    subgraph Runtime ["Event Dispatching & SDK"]
        Components["App Components / Actions\n(Signups, Purchases, Bookings)"] --> SDK["Tracking SDK\n(tracking.ts)"]
        SDK -->|fbq('track', ...)| MetaAPI["Meta Pixel\n(Facebook / Instagram)"]
        SDK -->|gtag('event', ...)| GA4API["Google Analytics 4"]
        SDK -->|window.dispatchEvent\n('upklick_track')| EventBus["Browser Custom Event Bus"]
    end

    subgraph UI ["Marketing Tracking Center UI (MarketingTrackingSection.tsx)"]
        Tabs["12 Sub-Tabs\n(Overview, Integrations, Events, Funnels, etc.)"]
        EventBus -.->|Realtime Listener| RealtimeTable["Live Stream & Debug Logs"]
        TestCenter["Test Center Buttons"] --> SDK
        Wizard["Setup Wizard & Forms"] -->|Save Config| Storage
    end
```

---

## 3. Related Files & Responsibilities

| File | Role & Purpose |
|---|---|
| [`tracking.ts`](file:///d:/Froent_end_Courses/FreeLancer/joepartner-portal/src/lib/tracking.ts) | **Client Tracking SDK**: Safe unified API (`Tracking.page`, `Tracking.lead`, `Tracking.purchase`, `Tracking.bookMeeting`, `Tracking.identify`, `Tracking.track`, `Tracking.custom`). Handles safe calls to `window.fbq` and `window.gtag`, and emits the `upklick_track` DOM event. |
| [`useTrackingScripts.ts`](file:///d:/Froent_end_Courses/FreeLancer/joepartner-portal/src/hooks/useTrackingScripts.ts) | **Global Auto-Injection Hook**: Executed on dashboard mount. Reads global platform configuration from Firestore (`settings/marketingTracking`), validates Meta & GA4 IDs, injects the official script tags into `<head>`, and triggers the initial pageview. |
| [`MarketingTrackingSection.tsx`](file:///d:/Froent_end_Courses/FreeLancer/joepartner-portal/src/pages/tabs/MarketingTrackingSection.tsx) | **Main Tracking Center UI**: 12-tab management section. Supports real-time Firestore sync (`getDoc` + `onSnapshot`), setup wizards, live event streaming, test triggers, funnel visualization, health audits, and custom event configuration. |
| [`Dashboard.tsx`](file:///d:/Froent_end_Courses/FreeLancer/joepartner-portal/src/pages/Dashboard.tsx) | **Dashboard Integration**: Mounts `useTrackingScripts()` globally and renders `MarketingTrackingSection` when the user navigates to the `marketing-tracking` tab. |
| [`pixel-tracking-feature/`](file:///d:/Froent_end_Courses/FreeLancer/joepartner-portal/public/pixel-tracking-feature) | **Reference Prototype / Standalone Module**: Contains original standalone prototypes, Next.js reference code, and documentation for the standalone export. |

---

## 4. How Marketing Tracking Works (Step-by-Step)

### Step 1: Storing Configuration in Firestore
When an admin or user enters their Meta Pixel ID or Google Analytics Measurement ID in the UI:
- **Admin**:
  ```ts
  await firestore.setDoc(firestore.doc(db, "settings", "marketingTracking"), config, { merge: true });
  ```
- **User / Partner**:
  ```ts
  await firestore.setDoc(firestore.doc(db, "users", userId), { trackingSettings: config }, { merge: true });
  ```

#### Data Schema:
```json
{
  "meta": {
    "connected": true,
    "business": "Direct Setup",
    "page": "Direct Setup",
    "pixel": {
      "id": "123456789012345",
      "name": "Custom Pixel"
    }
  },
  "google": {
    "connected": true,
    "property": {
      "name": "Custom GA4 Property",
      "measurementId": "G-ABC123XYZ0"
    }
  },
  "advancedMode": false,
  "customEvents": ["my_special_event"],
  "webhookUrl": "https://api.example.com/capi"
}
```

---

### Step 2: Validation Guardrails
To prevent Cross-Site Scripting (XSS) or invalid inputs, all IDs are strictly checked before DOM injection:
- **Meta Pixel ID**: `/^\d{10,16}$/` (must be 10–16 digits).
- **GA4 Measurement ID**: `/^G-[A-Z0-9]{4,20}$/i` (must follow standard `G-XXXXXXXX` format).

---

### Step 3: Dynamic Script Injection
1. **Meta Pixel Injection**:
   - Creates a script with ID `meta-pixel-global` (or `mtc-meta-pixel` inside the management tab).
   - Injects the official Facebook snippet initializing `fbq('init', pixelId)`.
   - Appends a `<noscript>` image beacon for fallback support.
2. **Google Analytics 4 (GA4) Injection**:
   - Injects `https://www.googletagmanager.com/gtag/js?id=${measurementId}`.
   - Injects the inline configuration initializing `window.dataLayer` and executing `gtag('config', measurementId)`.

---

### Step 4: Dispatching Events with `Tracking` SDK
Whenever a user performs an action in the application, developers call the `Tracking` SDK methods:

```ts
import { Tracking } from "../lib/tracking";

// 1. Page Views (fired automatically by useTrackingScripts)
Tracking.page("/dashboard");

// 2. New Lead Capture (e.g., registration or newsletter sign-up)
Tracking.lead({ source: "affiliate_link", partnerId: "user_123" });

// 3. Purchase Event
Tracking.purchase(49.00, "USD", { orderId: "ord_9982", plan: "Pro" });

// 4. Bookings & Consultations
Tracking.bookMeeting({ meetingType: "consultation", date: "2026-11-01" });

// 5. User Identification
Tracking.identify("usr_456", { role: "partner", plan: "tier_2" });

// 6. Custom Business Events
Tracking.track("custom_export_pdf", { docType: "report" });
```

---

### Step 5: Dual Dispatch & Internal Real-Time Stream
When any `Tracking.*` method is invoked:
1. **Third-Party Pixel Dispatch**:
   - Checks if `window.fbq` exists; if so, calls `fbq('track', eventName, payload)`.
   - Checks if `window.gtag` exists; if so, calls `gtag('event', eventName, payload)`.
   - **Fail-safe**: If pixels are blocked by ad-blockers or not configured, the function gracefully exits without throwing errors.
2. **Internal Real-Time Event Bus**:
   - Fires a standard DOM event:
     ```ts
     window.dispatchEvent(new CustomEvent("upklick_track", {
       detail: { event: eventName, payload, time: "14:15:30" }
     }));
     ```
   - `MarketingTrackingSection.tsx` listens to `upklick_track` and immediately prepends the event to the **Realtime** log table and **Debug** log view.

---

## 5. Overview of the 12 UI Sub-Tabs

| Tab | Name | Purpose |
|---|---|---|
| 1 | **Overview** | Health readiness score %, connected integrations summary, real-time counters (events, conversions), and quick launch actions. |
| 2 | **Connect Accounts** | Meta Pixel and GA4 connection cards with an interactive setup wizard and manual ID inputs. |
| 3 | **Event SDK** | Interactive code reference showing syntax for `Tracking.page()`, `Tracking.lead()`, `Tracking.purchase()`, etc. |
| 4 | **Event Library** | Catalog of 25+ standard e-commerce & SaaS events with platform mappings (e.g., `Purchase` → Meta `Purchase` & GA4 `purchase`), plus custom event generator. |
| 5 | **Realtime** | Live feed of all dispatched events with timestamp, user scope, platform destination, status badge, and CSV export. |
| 6 | **Funnels** | Visual conversion pipeline (Visitor → Lead → Checkout → Purchase) with drop-off rates and completion percentages. |
| 7 | **Analytics** | Event distribution charts, volume breakdowns, and traffic channel distributions. |
| 8 | **Health Check** | 12-point infrastructure checklist (Meta Pixel, GA4, SSL/HTTPS, Google Tag Manager, Consent Mode, Webhook status). |
| 9 | **Debug Logs** | Low-level HTTP / API inspector showing script injections, API payload responses, and initialization logs. |
| 10 | **Test Center** | Interactive sandbox where users can click test buttons (`Page View`, `Lead`, `Purchase`, `Signup`, `Login`, `Book Meeting`) to verify tracking live without creating real transactions. |
| 11 | **AI Optimization** | Automated diagnostics giving recommendations (e.g. missing pixel warnings, Google Consent Mode v2 notice). |
| 12 | **Advanced** | Developer mode overrides, direct script resets, and Webhook / Conversions API (CAPI) endpoint configuration. |

---

## 6. How to Integrate Tracking in New Pages or Features

To track user interactions anywhere in the frontend codebase, simply import `Tracking` from `@/lib/tracking`:

```tsx
import { Tracking } from "../../lib/tracking";

export default function CheckoutButton({ amount, planId }: { amount: number; planId: string }) {
  const handleCheckout = () => {
    // 1. Fire initiate checkout event
    Tracking.track("InitiateCheckout", { value: amount, planId });

    // 2. Perform business logic
    // ...
  };

  return (
    <button onClick={handleCheckout}>
      Subscribe Now (${amount})
    </button>
  );
}
```
