# Upclick Platform Knowledge Base & Operating Manual

---

## 1. Platform Overview
**Upclick (GOS Platform)** is an all-in-one business operating system designed for modern agencies, eCommerce brands, service providers, and enterprises. The platform unifies:
- **Omnichannel Communication:** Centralized inbox connecting WhatsApp Business API, Instagram Direct, Facebook Messenger, SMS, Email, and live Web Chat.
- **AI Copilot & Automations:** Autonomous customer service agents and smart follow-up workflows powered by real-time Knowledge Base retrieval (RAG).
- **SaaS Subscription & Reseller Hub:** Multi-tier client management, custom branded pricing plans, add-ons, and permission-based sub-accounts.
- **Communication Wallet & Financial Ledger:** Real-time balance and usage tracking for third-party network transit carrier fees.

---

## 2. Communication Wallet & Top-Up System

### What is the Communication Wallet?
The Communication Wallet is a dedicated prepaid cash reserve denominated in Euros (€) strictly reserved for paying **external network transit carrier fees**. These fees include:
- Official WhatsApp Business API conversation charges (Meta fees).
- Direct SMS carrier transit delivery costs.
- Bulk broadcast email dispatch fees.

### Decoupled AI Token & Platform Costs
- **No Double-Dipping:** AI token costs (OpenAI / LLM inference), platform hosting, CRM tools, and workspace seats are **fully covered** under your active monthly/annual subscription plan.
- The Communication Wallet balance is **only deducted** when messages physically traverse external telecom/carrier infrastructure.

### Supported Top-Up Payment Methods
Users and clients can recharge their Communication Wallet using two primary mechanisms:

1. **Manual Transfers & Mobile Cash Wallets:**
   - **Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay**
   - **InstaPay Egypt** (Instant account-to-account transfer)
   - **Direct Bank Wire / SWIFT Transfers**
   - *Workflow:* The user selects or inputs a top-up amount (€5.00 minimum), completes the transfer, uploads the payment receipt image (PNG, JPG, PDF), and enters the transaction reference ID. The request enters `Pending Review` status.
2. **Instant Payment Gateway:**
   - Credit / Debit Cards (Visa, Mastercard, American Express via Stripe).
   - Instant activation: funds are credited to the Communication Wallet immediately upon payment confirmation.

### Promo Codes & Coupon Incentives
During top-up checkout, users can apply valid promo codes:
- **Percentage Discount:** Reduces the total payable amount by a set percentage (e.g., 10% or 20% off).
- **Fixed Discount:** Deducts a flat cash value from the payable total.
- **Credit Bonus:** Grants free additional carrier credits to the wallet upon approval without increasing the payable amount (e.g., pay €50.00, receive €60.00 in credits).

### Top-Up Request Lifecycle & Fraud Prevention
- **One Pending Request at a Time:** Once a user submits a manual top-up request, a prominent banner appears: *"Top-Up Request Pending Review — Awaiting Approval"*.
- To prevent duplicate charges or accidental re-submissions, further top-up submissions are locked until the active request is decided by an administrator.
- **Admin Approval Workflow:**
  - Administrators review the submitted receipt and transaction ID in the Admin Billing Hub.
  - Upon clicking **Approve**, the client’s Communication Wallet is credited directly in real time.
  - An entry is recorded in the client's ledger with type `wallet_topup`.
  - The client's pending review banner immediately clears via real-time WebSocket sync.

---

## 3. Subscription Plans & Add-ons

### Platform Plan Tiers
- **Free Trial Plan:** Provides exploratory access to core platform features, builder tools, and a sample pool of AI interactions.
- **Growth / Pro Plans:** Geared toward scaling teams. Includes additional team seats, elevated monthly credit allocations, unlimited inbox channels, and priority queue handling.
- **Agency / Reseller Tier:** Enables agency administrators to manage unlimited client sub-accounts, configure custom plans, and publish bespoke tool bundles.

### Modular Add-ons
Teams can scale specific features without upgrading entire plans:
- **Extra Team Seats:** Add team members with granular permission roles (Owner, Admin, Member, Agent).
- **Marketing Funnel Builder:** Deploy high-converting landing pages, lead capture funnels, and checkout flows.
- **Booking & Calendar Scheduler:** Automated appointment booking with round-robin host assignment and calendar sync.
- **Advanced CRM & Lead Pipelines:** Custom deal stages, automated triggers, and lead scoring.

---

## 4. AI Copilot & Knowledge Base Integration

### How AI Copilot Uses This Knowledge Base
The Upclick AI Copilot uses Retrieval-Augmented Generation (RAG) to provide human-like, accurate answers to incoming inquiries across WhatsApp, Messenger, and live chat:
1. **Context Extraction:** When a customer asks a question, the system searches indexed Knowledge Base sources for semantically relevant passages.
2. **Strict Guardrails:** The AI is instructed to answer strictly based on approved company documentation, preventing hallucinations or unauthorized promises.
3. **Seamless Human Handoff:** If an inquiry falls outside the indexed knowledge or requires human intervention, the AI automatically flags the conversation and alerts team agents.

### Best Practices for Creating Knowledge Sources
- **Clear Headings:** Group related information under distinct categories (Pricing, Shipping, Policies, Specifications).
- **Direct Answers:** Formulate questions and concise answers for frequent customer queries.
- **Currency & Terms:** Clearly state pricing, accepted payment methods, and operational hours.

---

## 5. Frequently Asked Questions (FAQ)

#### Q: Are AI replies deducted from my Communication Wallet?
**A:** No. All AI reasoning, responses, and token costs are included in your subscription plan. The Communication Wallet is solely utilized for telecom carrier fees (Meta WhatsApp fees and carrier SMS rates).

#### Q: What happens if my Communication Wallet reaches €0.00?
**A:** Outbound messages requiring telecom transit (such as outbound WhatsApp marketing campaigns or SMS) will pause until the wallet is replenished. Inbound messages and web chat remain active. You can enable **Auto-Recharge** in the Wallet settings to automatically top up when the balance dips below a threshold.

#### Q: How long does manual top-up approval take?
**A:** Manual top-ups (Vodafone Cash, InstaPay, Bank Transfer) are typically verified and approved by the administration team within 5 to 30 minutes during standard business hours.

#### Q: Can I use multiple coupons on a single top-up?
**A:** Only one promo code can be applied per top-up transaction.

#### Q: Is my payment receipt stored securely?
**A:** Yes. Transfer receipts are securely encrypted and stored within dedicated private Cloud Storage, accessible solely by authorized billing administrators for audit compliance.

---

## 6. Support & Contact Channels
- **Technical Support:** Available 24/7 via the in-app Support Chat room.
- **Billing Inquiries:** billing@upclick.com
- **Knowledge Base Documentation:** https://upclick.com/docs
