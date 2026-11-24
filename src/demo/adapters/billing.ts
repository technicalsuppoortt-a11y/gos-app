import {
  addDays,
  CHANNEL_IDS,
  executeBilling,
  newCommunicationWallet,
  PLATFORM,
  TOOL_IDS,
  type BillingActor,
  type BillingStore,
} from "../../../functions/billing-engine.js";
import { read, write, entries } from "../store";
import { activeDemoSession, demoSession, type DemoAdminTrialSeed } from "./session";

// The demo account is a USER whose provider is a simulated Admin. Requests are auto-approved by that
// simulated Admin so the full plan → wallet → ledger flow can be explored without a second account.
const DEMO_ADMIN = "demo-admin";
const user: BillingActor = {
  uid: demoSession.user.id,
  role: "USER",
  name: demoSession.user.name,
  email: demoSession.user.email,
  supportParentId: DEMO_ADMIN,
};
const admin: BillingActor = {
  uid: DEMO_ADMIN,
  role: "ADMIN",
  name: "Demo Agency",
  email: "agency@demo.example",
};
const platform: BillingActor = {
  uid: "demo-super-admin",
  role: "SUPER_ADMIN",
  name: "Platform",
};

const store: BillingStore = {
  get: async (path) => read("doc:" + path),
  query: async (collection, field, value) =>
    entries("doc:" + collection + "/")
      .map(([path, data]) => ({ ...data, id: path.split("/").at(-1) }))
      .filter((row) => row[field] === value),
  id: () => crypto.randomUUID(),
  commit: (writes) => {
    for (const [path, data] of writes) write("doc:" + path, data);
  },
};

const plan = (input: Record<string, unknown>) => ({
  visible: true,
  currency: "USD",
  features: { en: [], ar: [] },
  ...input,
});
async function seed() {
  if (read("doc:billingPlans/" + DEMO_ADMIN + "__trial")) return;
  write("doc:users/" + DEMO_ADMIN, {
    role: "ADMIN",
    name: admin.name,
    email: admin.email,
  });
  write("doc:users/" + user.uid, {
    role: "USER",
    name: user.name,
    email: user.email,
    supportParentId: DEMO_ADMIN,
  });
  const allTools = [
    "ai-copilot",
    "funnel-builder",
    "crm-pipeline",
    "unified-inbox",
    "booking-engine",
    "products-payments",
    "custom-domains",
    "webhooks-api",
    "ai-followup",
    "email-sms",
    "analytics-bi",
    "client-portal",
  ];
  await executeBilling(
    "savePlan",
    {
      plan: plan({
        id: "demo-platform-agency",
        kind: "plan",
        name: { en: "Agency", ar: "الوكالة" },
        price: 199,
        billingType: "monthly",
        credits: 50000,
        tools: allTools,
        limits: { clients: 50, seats: 10 },
      }),
    },
    platform,
    store,
  );
  await executeBilling(
    "assignPlan",
    { subscriberId: DEMO_ADMIN, planId: "demo-platform-agency" },
    platform,
    store,
  );
  const plans = [
    {
      id: "demo-starter",
      kind: "plan",
      name: { en: "Starter", ar: "البداية" },
      price: 29,
      billingType: "monthly",
      credits: 500,
      tools: allTools,
      limits: { seats: 2 },
      features: {
        en: ["CRM & booking", "Funnel builder", "Unified inbox"],
        ar: ["إدارة العملاء والحجوزات", "منشئ القمع", "صندوق الوارد"],
      },
      sortOrder: 1,
    },
    {
      id: "demo-growth",
      kind: "plan",
      name: { en: "Growth", ar: "النمو" },
      price: 290,
      billingType: "annual",
      credits: 2000,
      badge: { en: "Popular", ar: "الأكثر طلبًا" },
      tools: allTools,
      limits: { seats: 5 },
      features: {
        en: [
          "Everything in Starter",
          "AI Copilot & follow-up",
          "Unified inbox",
        ],
        ar: ["كل مزايا البداية", "AI Agent والمتابعة", "صندوق وارد موحد"],
      },
      sortOrder: 2,
    },
    {
      id: "demo-sprint",
      kind: "plan",
      name: { en: "90-Day Sprint", ar: "تحدي 90 يوم" },
      price: 99,
      billingType: "fixed",
      durationDays: 90,
      credits: 1000,
      tools: allTools,
      limits: { seats: 3 },
      sortOrder: 3,
    },
    {
      id: "demo-lifetime",
      kind: "plan",
      name: { en: "Lifetime", ar: "مدى الحياة" },
      price: 999,
      billingType: "lifetime",
      credits: 1500,
      tools: allTools,
      limits: { seats: 10 },
      sortOrder: 4,
    },
    {
      id: "demo-pack-1k",
      kind: "addon",
      addonType: "credits",
      name: { en: "1,000 credits", ar: "1,000 رصيد" },
      price: 20,
      credits: 1000,
      sortOrder: 1,
    },
    {
      id: "demo-pack-seats",
      kind: "addon",
      addonType: "seats",
      name: { en: "+3 team seats", ar: "+3 مقاعد فريق" },
      price: 15,
      addonSeats: 3,
      sortOrder: 2,
    },
    {
      id: "demo-pack-webhooks",
      kind: "addon",
      addonType: "tool",
      name: { en: "Webhooks & API", ar: "Webhooks وواجهة API" },
      price: 25,
      addonTool: "webhooks-api",
      sortOrder: 3,
    },
    {
      kind: "trial",
      name: { en: "Free trial", ar: "تجربة مجانية" },
      durationDays: 14,
      credits: 100,
      tools: allTools,
      limits: { seats: 1 },
      enabled: true,
    },
  ];
  for (const item of plans)
    await executeBilling("savePlan", { plan: plan(item) }, admin, store);
}

export async function seedTrialAdminWorkspace(trialSeed: DemoAdminTrialSeed) {
  await seed();
  const id = trialSeed.id;
  if (read("doc:billingSubscriptions/" + id)) return;
  const now = new Date().toISOString();
  const days = Math.max(1, Number(trialSeed.trialDays) || 14);
  const endsAt = addDays(now, days);
  const aiCredits = Math.max(0, Number(trialSeed.credits) || 1000);
  const emailCredits = 500;
  const lang = trialSeed.language === "ar" ? "ar" : "en";

  write("doc:users/" + id, {
    id,
    role: "ADMIN",
    status: "Active",
    accountType: "agency",
    tenantId: trialSeed.tenantId,
    tenantName: trialSeed.workspaceName,
    name: trialSeed.name,
    email: trialSeed.email,
    ...(trialSeed.phone ? { phone: trialSeed.phone } : {}),
    trialOrigin: "landing_start_now",
    createdAt: now,
    activatedAt: now,
  });

  write("doc:tenants/" + trialSeed.tenantId, {
    id: trialSeed.tenantId,
    name: trialSeed.workspaceName,
    accountType: "agency",
    ownerId: id,
    ownerUid: id,
    billingOwnerId: id,
    status: "Active",
    createdAt: now,
  });

  write("doc:dashboardBrands/" + id, {
    values: {
      name: trialSeed.workspaceName,
      logoUrl: "",
      theme: "violet",
      language: lang,
      currency: "USD",
      mode: "system",
      timezone: "UTC",
    },
    updatedBy: id,
    updatedAt: now,
  });

  write("doc:billingSubscriptions/" + id, {
    id,
    subscriberId: id,
    subscriberRole: "ADMIN",
    subscriberName: trialSeed.name,
    subscriberEmail: trialSeed.email,
    providerId: PLATFORM,
    planId: `${PLATFORM}__trial`,
    planName: { en: "Admin Free Trial", ar: "التجربة المجانية لحساب المدير" },
    kind: "trial",
    billingType: "fixed",
    durationDays: days,
    status: "trialing",
    price: 0,
    currency: "USD",
    credits: aiCredits,
    aiCredits,
    emailCredits,
    tools: [...TOOL_IDS],
    channels: [...CHANNEL_IDS],
    limits: { seats: 3, clients: 10 },
    addonTools: [],
    addonSeats: 0,
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: endsAt,
    specialCaseFlow: "landing_admin_trial",
    updatedAt: now,
  });

  write("doc:billingWallets/" + id, {
    id,
    subscriberId: id,
    subscriberRole: "ADMIN",
    providerId: PLATFORM,
    balance: aiCredits,
    aiCredits,
    emailCredits,
    lifetimeGranted: aiCredits,
    lifetimeConsumed: 0,
    lifetimeEmailGranted: emailCredits,
    lifetimeEmailConsumed: 0,
    currency: "USD",
    updatedAt: now,
  });

  write(
    "doc:communicationWallets/" + id,
    newCommunicationWallet(id, "ADMIN", PLATFORM, now),
  );
}

export async function demoBilling(data: Record<string, any>) {
  await seed();
  const current = activeDemoSession();
  const activeActor: BillingActor =
    current.role === "ADMIN"
      ? {
          uid: current.user.id,
          role: "ADMIN",
          name: current.user.name,
          email: current.user.email,
        }
      : user;
  const result = await executeBilling(data.operation, data, activeActor, store);
  // Auto-approve automated gateway payments in demo mode.
  // Manual transfers with uploaded receipts remain pending so they can be inspected in the requests panel.
  if (
    (data.operation === "requestPlan" || data.operation === "requestAddon") &&
    result?.request?.id &&
    data.paymentType === "gateway" &&
    result.request.status !== "approved"
  ) {
    await executeBilling(
      "decideRequest",
      {
        requestId: result.request.id,
        decision: "approve",
        reason: "Auto-approved via simulated gateway in the demo workspace",
      },
      admin,
      store,
    );
    return { request: await store.get("billingRequests/" + result.request.id) };
  }
  return result;
}
export const demoBillingProvider = { id: DEMO_ADMIN, platform: PLATFORM };
