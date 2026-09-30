Act as a Principal UI/UX Lead and Senior React Frontend Engineer. Your task is to build/refactor the frontend application for **GOS (AI Sales OS)** by carefully analyzing two primary assets located in the project directory (`public/Feedback/`):

1. **The Product Specification Document:** `GOS_User_Dashboard_Master_Product_Specification_v2_0 (1).docx`
2. **The Reference UI Screenshots:** All `.png` and `.jfif` image files inside `public/Feedback/`:
   - `admin_dashboard.png`
   - `Ai_copilot.jfif`
   - `ai-follow-up.jfif`
   - `Analytics.jfif`
   - `Booking_calander.jfif`
   - `Funnels_website1.jfif`
   - `Funnels_website2.jfif`
   - `home.png`
   - `products_payments.jfif`
   - `settings.jfif`
   - `superadmin_dashboard.png`

---

### 📋 Phase 1: Deep Specification & Logic Analysis
- Thoroughly read and absorb the business rules, canonical entity models, RBAC structure, and UX states defined in `GOS_User_Dashboard_Master_Product_Specification_v2_0 (1).docx`.
- Adhere strictly to the "One Source of Truth" rule: CRM, Booking, Products, Payments, and Knowledge entities must be canonical and shared seamlessly across all views.
- Respect all defined universal UX states: Skeleton Loading, Empty States (with single primary CTA), Success Confirmation, Error Handling, and Permission Restrictions.

---

### 🎨 Phase 2: Exact UI/UX Implementation for Covered Screens
For all screens with reference images in `public/Feedback/`, replicate the design, layout, color tokens, card layouts, navigation hierarchy, typography, badges, and spacing **EXACTLY**:

1. **SuperAdmin Dashboard:** Follow `superadmin_dashboard.png` (Dark theme sidebar, platform revenue metrics, active clients list, system usage).
2. **Admin / White-Label Dashboard:** Follow `admin_dashboard.png` (White-label header, tool status grid, recent activity feed, tenant metrics).
3. **User Dashboard Home:** Follow `home.png` (Welcome banner, quick tool launchers, "Continue Learning" academy widget).
4. **AI Copilot:** Follow `Ai_copilot.jfif` (Minimalist conversation area, action prompt chips, left sidebar chat history, no analytics clutter).
5. **AI Follow-Up:** Follow `ai-follow-up.jfif` (Lead follow-up automation table, funnel filters, status badges, response timeline).
6. **Booking & Calendar:** Follow `Booking_calander.jfif` (Calendar grid, slot scheduling modal, Google Calendar status, booking list).
7. **Funnels & Websites:** Follow `Funnels_website1.jfif` & `Funnels_website2.jfif` (Funnel builder, responsive preview, landing page templates, drag-and-drop block interface).
8. **Products & Payments:** Follow `products_payments.jfif` (Canonical service/course/digital product cards, connected gateway status, checkout flow).
9. **Analytics:** Follow `Analytics.jfif` (Operational KPIs, lead conversion charts, revenue distribution donut, follow-up metrics).
10. **Settings:** Follow `settings.jfif` (Tabbed navigation for Business Identity, Team & Permissions, Integrations, Billing, Security).

---

### 💡 Phase 3: Premium Custom UI/UX Proposals for Missing Screens
For modules/screens mentioned in the spec document that **do NOT have an explicit reference screenshot** (e.g., **CRM & Leads Pipeline**, **Unified Inbox**, **Knowledge Center**, **Authentication Pages**), design and propose ultra-clean, high-converting React interfaces that match the exact visual language, color palette, glassmorphism, rounded borders, and design system seen in the provided images:

#### 1. CRM & Leads (`/dashboard/crm`)
- **Kanban Pipeline & Table View Toggle:** Stages (`NEW`, `CONTACTED`, `QUALIFIED`, `BOOKING_OFFERED`, `BOOKED`, `CUSTOMER`, `CLOSED`).
- **Lead Profile Drawer:** Complete activity timeline, tags, assigned team member, conversation history, and quick action bar (Book, Send Message, Change Stage).

#### 2. Unified Inbox (`/dashboard/inbox`)
- **Split-Pane Layout:** Left pane for conversation channels (WhatsApp, Instagram, Messenger, Email), center pane for real-time thread, right pane for CRM lead card & AI Takeover Toggle switch (`Human` vs. `AI Copilot`).

#### 3. Knowledge Center (`/dashboard/knowledge`)
- **Business Context Trainer:** File drag-and-drop zone, Website URL scraper input, FAQ editor, and AI context confidence index.

#### 4. Professional Auth Suite (`/auth/login`, `/auth/forgot-password`, `/auth/reset-password`)
- **Design Style:** Split-screen layout.
  - *Left Side:* Premium gradient mesh background with subtle animated product showcase cards (Framer Motion) highlighting GOS AI capabilities.
  - *Right Side:* Glassmorphism login card with tenant logo auto-resolution (White-Label readiness), clean floating inputs, password visibility toggle, MFA modal, and seamless "Forgot Password" drawer workflow.

---

### 💻 Execution Deliverables
1. Reusable Tailwind CSS theme configuration aligned with the screenshots.
2. Complete page routing and layout shells matching the 3 dashboards.
3. Fully styled React components with mock data matching the logic of the `.docx` file.