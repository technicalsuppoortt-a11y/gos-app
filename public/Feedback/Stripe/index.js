/**
 * Firebase Cloud Functions — Stripe Integration
 *
 * Exports:
 *  1. createStripeCheckout  — Creates a Stripe Checkout Session (HTTP, CORS-enabled)
 *  2. stripeWebhook         — Receives Stripe events (checkout.session.completed) and fulfills orders
 *  3. verifyStripeSession   — Client-callable fallback: verifies session and updates Firestore
 *
 * The Secret Key NEVER leaves the server.
 */

const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors")({ origin: true });

// Public currency-display endpoint. It does not use the OpenAI key and never
// exposes a third-party API key to the browser. Rates are cached in Firestore.
const FX_DOCUMENT = ["system", "currencyRates"];
const FX_TTL_MS = 6 * 60 * 60 * 1000;
const FX_CODES = ["USD", "EGP", "SAR", "AED", "EUR", "GBP", "KWD", "QAR"];

function isValidRates(rates) {
  return FX_CODES.every((code) => Number.isFinite(Number(rates?.[code])) && Number(rates[code]) > 0);
}

async function downloadExchangeRates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
    if (!response.ok) throw new Error(`Exchange rate source returned ${response.status}`);
    const payload = await response.json();
    const rates = { USD: 1, ...payload.rates };
    if (payload.result !== "success" || !isValidRates(rates)) throw new Error("Exchange rate source returned incomplete data");
    return rates;
  } finally {
    clearTimeout(timer);
  }
}

exports.getExchangeRates = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const { admin, db } = getAdminAndDb();
    const ref = db.collection(FX_DOCUMENT[0]).doc(FX_DOCUMENT[1]);
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : null;
    const fetchedAtMs = existing?.fetchedAt?.toMillis?.() || Date.parse(existing?.fetchedAt || 0) || 0;
    const isFresh = isValidRates(existing?.rates) && Date.now() - fetchedAtMs < FX_TTL_MS;

    if (isFresh) return res.set("Cache-Control", "public, max-age=300").json({ ...existing, status: "fresh" });

    try {
      const rates = await downloadExchangeRates();
      const fresh = {
        base: "USD", rates, source: "ExchangeRate-API", fetchedAt: admin.firestore.Timestamp.now(), schemaVersion: 1,
      };
      await ref.set(fresh, { merge: true });
      return res.set("Cache-Control", "public, max-age=300").json({ ...fresh, status: "fresh" });
    } catch (sourceError) {
      console.error("[getExchangeRates] refresh failed:", sourceError.message);
      if (isValidRates(existing?.rates)) return res.status(200).json({ ...existing, status: "stale" });
      return res.status(503).json({ error: "Currency rates are temporarily unavailable" });
    }
  } catch (error) {
    console.error("[getExchangeRates] failed:", error);
    return res.status(500).json({ error: "Currency service failed" });
  }
});

let _admin;
let _db;
function getAdminAndDb() {
  if (!_admin) {
    _admin = require("firebase-admin");
    if (!_admin.apps.length) {
      _admin.initializeApp();
    }
  }
  if (!_db) {
    _db = _admin.firestore();
  }
  return { admin: _admin, db: _db };
}

function getStripe(secretKey) {
  const Stripe = require("stripe");
  return Stripe(secretKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Fulfill a paid Stripe Checkout Session into Firestore
// Called by both the webhook and the verifyStripeSession fallback.
// Idempotent: checks subscription.stripeSessionId before writing.
// ─────────────────────────────────────────────────────────────────────────────
async function fulfillCheckoutSession(session) {
  const { admin, db } = getAdminAndDb();
  const metadata = session.metadata || {};
  const userId = session.client_reference_id || metadata.userId;
  const adminId = metadata.adminId || null;
  const planId = metadata.planId || null;
  const planName = metadata.planName || "Subscription Plan";
  const creditsPerMonth = Number(metadata.creditsPerMonth) || 0;
  const currency = (metadata.currency || session.currency || "egp").toUpperCase();
  const sessionId = session.id;

  if (!userId) {
    console.error("[fulfillCheckoutSession] No userId in session metadata:", sessionId);
    return { success: false, error: "No userId in session metadata" };
  }

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    console.error("[fulfillCheckoutSession] User not found:", userId);
    return { success: false, error: "User not found" };
  }

  const existingData = userSnap.data();

  // ── Idempotency guard — skip if this session was already processed ──────────
  if (existingData && existingData.subscription && existingData.subscription.stripeSessionId === sessionId) {
    console.log("[fulfillCheckoutSession] Already processed session:", sessionId);
    return { success: true, alreadyProcessed: true };
  }

  // ── Calculate subscription period ──────────────────────────────────────────
  const now = admin.firestore.Timestamp.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expiryDate = admin.firestore.Timestamp.fromMillis(Date.now() + thirtyDaysMs);
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  // ── Write to Firestore ──────────────────────────────────────────────────────
  await userRef.update({
    "subscription.status": "active",
    "subscription.planId": planId,
    "subscription.planName": planName,
    "subscription.type": planId,
    "subscription.startDate": now,
    "subscription.expiryDate": expiryDate,
    "subscription.currentPeriodEnd": expiryDate.toDate().toISOString(),
    "subscription.stripeSessionId": sessionId, // idempotency marker
    "subscription.paymentMethod": "stripe",
    "subscription.currency": currency,
    // Credits
    credits: creditsPerMonth,
    totalCredits: creditsPerMonth,
    creditsPerMonth: creditsPerMonth,
    lastCreditResetDate: `${currentMonthStr}-01`,
    // Top-level plan info (for navbar / legacy checks)
    planId: planId,
    planName: planName,
    subscriptionStatus: "active",
  });

  console.log(
    `[fulfillCheckoutSession] ✅ Fulfilled userId=${userId} planId=${planId} ` +
    `planName=${planName} credits=${creditsPerMonth} session=${sessionId}`
  );

  return { success: true, userId, planId, planName, creditsPerMonth };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. createStripeCheckout — Creates a Stripe Checkout Session
// ─────────────────────────────────────────────────────────────────────────────
exports.createStripeCheckout = onRequest({ cors: true }, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const {
      adminId,         // UID of the admin whose Stripe keys to use
      userId,          // UID of the purchasing user
      userEmail,       // Email for Stripe prefill
      planName,        // Human-readable plan name
      planId,          // Plan ID for fulfillment metadata
      creditsPerMonth, // Credits to grant after payment
      amount,          // Amount in full currency units (e.g. 300 EGP) — CF converts to piastres/cents
      currency,        // e.g. "usd", "egp"
      successUrl,      // Where to redirect on success
      cancelUrl,       // Where to redirect on cancel
    } = req.body;

    // ── Validate required fields ─────────────────────────────────────────────
    if (!adminId) return res.status(400).json({ error: "adminId is required" });
    if (!userId)  return res.status(400).json({ error: "userId is required" });
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: "amount must be a number" });

    try {
      const { db } = getAdminAndDb();

      // ── 1. Fetch admin's Stripe Secret Key from Firestore ─────────────────
      const adminDoc = await db.collection("users").doc(adminId).get();
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin not found in Firestore" });
      }

      const adminData = adminDoc.data();
      const secretKey = adminData && adminData.paymentMethods && adminData.paymentMethods.stripe
        ? adminData.paymentMethods.stripe.secretKey
        : null;

      if (!secretKey || !secretKey.startsWith("sk_")) {
        return res.status(400).json({
          error: "Stripe Secret Key not configured for this admin. Please add it in Admin → Transactions & Payments.",
        });
      }

      // ── 2. Initialize Stripe ──────────────────────────────────────────────
      const stripe = getStripe(secretKey);

      // ── 3. Normalize currency & amount ────────────────────────────────────
      // The client ALWAYS sends the full display price (e.g. 300 EGP).
      // We ALWAYS multiply by 100 → piastres/cents.
      const normalizedCurrency = (currency || "usd").toLowerCase();
      const unitAmount = Math.round(Number(amount) * 100);

      console.log(
        `[createStripeCheckout] adminId=${adminId} userId=${userId} ` +
        `planId=${planId} planName=${planName} amount=${amount} ` +
        `currency=${normalizedCurrency} unitAmount=${unitAmount} credits=${creditsPerMonth}`
      );

      // ── 4. Build success/cancel URLs ──────────────────────────────────────
      const origin = req.headers.origin || "http://localhost:5173";
      const finalSuccessUrl =
        successUrl ||
        `${origin}/dashboard/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const finalCancelUrl =
        cancelUrl ||
        `${origin}/dashboard/subscription?payment=cancelled`;

      // ── 5. Create Stripe Checkout Session ─────────────────────────────────
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        client_reference_id: userId, // primary userId carrier for webhook
        customer_email: userEmail || undefined,
        line_items: [
          {
            price_data: {
              currency: normalizedCurrency,
              product_data: {
                name: planName || "Subscription Plan",
                description: `One-time payment for ${planName || "subscription"}`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        // ── Full metadata for webhook/verifyStripeSession fulfillment ──────
        metadata: {
          userId,
          adminId,
          planId: planId || "",
          planName: planName || "",
          creditsPerMonth: String(creditsPerMonth || 0),
          currency: normalizedCurrency,
        },
      });

      // ── 6. Return the checkout URL ─────────────────────────────────────────
      return res.status(200).json({
        url: session.url,
        sessionId: session.id,
      });

    } catch (err) {
      console.error("[createStripeCheckout] Error:", err);
      if (err.type && err.type.startsWith("Stripe")) {
        return res.status(402).json({ error: err.message });
      }
      return res.status(500).json({ error: "Internal server error. Please try again." });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. stripeWebhook — Receives Stripe events, fulfills checkout.session.completed
//
// Register this URL in Stripe Dashboard → Webhooks:
//   https://us-central1-digital-product-3a97c.cloudfunctions.net/stripeWebhook
// Event to listen for: checkout.session.completed
// ─────────────────────────────────────────────────────────────────────────────
exports.stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawPayload = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body)));
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const { db } = getAdminAndDb();

    // Parse the event first (without verification) to extract adminId from metadata
    let parsedEvent;
    try {
      parsedEvent = typeof rawPayload === "string"
        ? JSON.parse(rawPayload)
        : JSON.parse(rawPayload.toString("utf8"));
    } catch (parseErr) {
      parsedEvent = req.body;
    }

    const sessionMetadata = (parsedEvent && parsedEvent.data && parsedEvent.data.object && parsedEvent.data.object.metadata) || {};
    const adminId = sessionMetadata.adminId;

    // Try to get webhookSecret for verified mode
    let webhookSecret = null;
    let secretKey = null;
    if (adminId) {
      try {
        const adminDoc = await db.collection("users").doc(adminId).get();
        if (adminDoc.exists) {
          const adminPayments = adminDoc.data().paymentMethods;
          webhookSecret = adminPayments && adminPayments.stripe ? adminPayments.stripe.webhookSecret : null;
          secretKey = adminPayments && adminPayments.stripe ? adminPayments.stripe.secretKey : null;
        }
      } catch (fetchErr) {
        console.warn("[stripeWebhook] Could not fetch admin data:", fetchErr.message);
      }
    }

    if (webhookSecret && webhookSecret.startsWith("whsec_") && sig && secretKey) {
      // ── Verified mode ──────────────────────────────────────────────────────
      const stripe = getStripe(secretKey);
      event = stripe.webhooks.constructEvent(rawPayload, sig, webhookSecret);
      console.log("[stripeWebhook] ✅ Signature verified");
    } else {
      // ── Unverified mode (test / no whsec configured) ──────────────────────
      console.warn("[stripeWebhook] Processing without signature verification (no webhookSecret configured).");
      event = parsedEvent;
    }
  } catch (err) {
    console.error("[stripeWebhook] Event parsing/verification error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Handle the event ──────────────────────────────────────────────────────
  if (event && event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("[stripeWebhook] checkout.session.completed received:", session.id, "payment_status:", session.payment_status);

    if (session.payment_status === "paid") {
      const result = await fulfillCheckoutSession(session);
      console.log("[stripeWebhook] fulfillCheckoutSession result:", JSON.stringify(result));
    } else {
      console.warn("[stripeWebhook] Session not paid yet, skipping. Status:", session.payment_status);
    }
  } else {
    console.log("[stripeWebhook] Unhandled event type:", event && event.type);
  }

  return res.status(200).json({ received: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. verifyStripeSession — HTTP fallback fulfillment (no Firebase Auth required)
//
// Called by the client when landing on ?payment=success&session_id=cs_...
// Identity is verified via session.client_reference_id / session.metadata.userId
// (set when creating the checkout session), NOT via Firebase Auth tokens.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyStripeSession = onRequest({ cors: true }, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { sessionId, userId: bodyUserId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }
    if (!bodyUserId) {
      return res.status(400).json({ error: "userId is required" });
    }

    console.log(`[verifyStripeSession] sessionId=${sessionId} userId=${bodyUserId}`);

    try {
      const { db } = getAdminAndDb();

      // ── Find user's adminId to get the Stripe secret key ──────────────────
      const userDoc = await db.collection("users").doc(bodyUserId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();
      const adminId =
        userData.adminId ||
        userData.createdBy ||
        userData.assignedAdminId ||
        userData.brandAdminId;

      if (!adminId) {
        return res.status(400).json({ error: "Could not determine admin account for this user" });
      }

      const adminDoc = await db.collection("users").doc(adminId).get();
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin account not found" });
      }

      const adminPayments = adminDoc.data().paymentMethods;
      const secretKey = adminPayments && adminPayments.stripe ? adminPayments.stripe.secretKey : null;

      if (!secretKey || !secretKey.startsWith("sk_")) {
        return res.status(400).json({ error: "Stripe not configured for this account" });
      }

      const stripe = getStripe(secretKey);

      // ── Retrieve the session from Stripe ──────────────────────────────────
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Stripe session not found" });
      }

      // ── Verify the session belongs to this user (via Stripe metadata) ─────
      const sessionUserId = session.client_reference_id || (session.metadata && session.metadata.userId);
      if (sessionUserId && sessionUserId !== bodyUserId) {
        console.error(`[verifyStripeSession] UID mismatch: session=${sessionUserId} body=${bodyUserId}`);
        return res.status(403).json({ error: "Session does not belong to this user" });
      }

      if (session.payment_status !== "paid") {
        return res.status(200).json({
          success: false,
          status: session.payment_status,
          message: `Payment not completed. Status: ${session.payment_status}`,
        });
      }

      // ── Fulfill the session (idempotent) ──────────────────────────────────
      const result = await fulfillCheckoutSession(session);

      return res.status(200).json({
        success: result.success,
        alreadyProcessed: result.alreadyProcessed || false,
        userId: result.userId || bodyUserId,
        planId: result.planId,
        planName: result.planName,
        creditsPerMonth: result.creditsPerMonth,
      });

    } catch (err) {
      console.error("[verifyStripeSession] Unexpected error:", err);
      return res.status(500).json({ error: err.message || "Verification failed" });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. deleteUserAdmin — Deletes user from Firebase Auth and Firestore
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUserAdmin = onRequest({ cors: true }, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { targetUserId, adminId } = req.body || {};
    if (!targetUserId || !adminId) {
      return res.status(400).json({ error: "targetUserId and adminId are required" });
    }

    try {
      const { admin, db } = getAdminAndDb();

      // Ensure caller is an admin
      const adminDoc = await db.collection("users").doc(adminId).get();
      if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        return res.status(403).json({ error: "Unauthorized. Only admins can delete users." });
      }

      // 1. Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(targetUserId);
        console.log(`[deleteUserAdmin] Deleted from Auth: ${targetUserId}`);
      } catch (authErr) {
        // Log but don't fail, user might already be deleted or not exist in Auth
        console.warn(`[deleteUserAdmin] Auth deletion warn: ${authErr.message}`);
      }

      // 2. Delete from Firestore
      try {
        await db.collection("users").doc(targetUserId).delete();
        console.log(`[deleteUserAdmin] Deleted from Firestore: ${targetUserId}`);
      } catch (fsErr) {
        console.warn(`[deleteUserAdmin] Firestore deletion warn: ${fsErr.message}`);
      }

      return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (err) {
      console.error("[deleteUserAdmin] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});
