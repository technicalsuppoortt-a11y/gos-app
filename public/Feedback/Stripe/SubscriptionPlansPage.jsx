import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useCurrency } from "../../context/CurrencyContext";
import { db, receiptsStorage } from "../../firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "../../context/ToastContext";
import Topbar from "../../components/layout/Topbar";
import { motion, AnimatePresence } from "framer-motion";
import { createCheckoutSession, verifyCheckoutSession } from "../../services/stripeService";
import { TOOLS_24H } from "../../data/toolsData";
import { JOURNEY_STEPS } from "../../data/database";
import {
  Crown,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Upload,
  CheckCheck,
  XCircle,
  X,
  Copy,
  Clock,
  PenTool, Image, Search, FileText, Share2, Mail, Calculator, Target, 
  MessageSquare, Layout, Database, BookOpen, Settings, Briefcase, BarChart3, ShoppingCart, Zap, Users
} from "lucide-react";
import { autoTranslatePlanText, autoTranslatePlanFeatures } from "../../utils/planAutoTranslator";
import "./SubscriptionPlansPage.css"; // We'll create this or use inline styles


function getVectorIcon(id, size = 20) {
  if (!id) return <CheckCircle2 size={size} />;
  const str = id.toLowerCase();
  
  if (str.includes("analysis") || str.includes("radar")) return <Search size={size} />;
  if (str.includes("website") || str.includes("landing")) return <Layout size={size} />;
  if (str.includes("legal") || str.includes("portfolio")) return <FileText size={size} />;
  if (str.includes("social")) return <Share2 size={size} />;
  if (str.includes("email")) return <Mail size={size} />;
  if (str.includes("profit") || str.includes("pricing")) return <Calculator size={size} />;
  if (str.includes("marketing") || str.includes("campaign") || str.includes("ad")) return <Target size={size} />;
  if (str.includes("assistant") || str.includes("smart")) return <Zap size={size} />;
  if (str.includes("freelance") || str.includes("proposal")) return <Briefcase size={size} />;
  if (str.includes("interview") || str.includes("sales")) return <Users size={size} />;
  if (str.includes("library") || str.includes("database")) return <Database size={size} />;
  if (str.includes("tutorial") || str.includes("notebook")) return <BookOpen size={size} />;
  if (str.includes("settings")) return <Settings size={size} />;
  if (str.includes("product")) return <ShoppingCart size={size} />;
  if (str.includes("writing") || str.includes("crafting")) return <PenTool size={size} />;
  
  return <CheckCircle2 size={size} />;
}

function getMethodIcon(name, size = 20) {
  const n = (name || "").toLowerCase();
  if (n === "stripe" || n.includes("card") || n.includes("visa"))
    return <CreditCard size={size} />;
  if (n.includes("vodafone") || n.includes("فودافون"))
    return <Smartphone size={size} />;
  if (n.includes("instapay") || n.includes("انستاباي") || n.includes("bank"))
    return <Building2 size={size} />;
  if (n.includes("paypal") || n.includes("باي"))
    return <Wallet size={size} />;
  return <Wallet size={size} />;
}

export default function SubscriptionPlansPage() {
  const { userData, brandData } = useAuth();
  const { state } = useApp();
  const { convertAndFormat, displayCurrency } = useCurrency();
  const toast = useToast();
  const isRtl = state?.language?.startsWith('ar');
  const lang = state?.language || 'ar';
  const t = (ar, en) => (isRtl ? ar : en);
  const { t: tI18n } = useTranslation();


  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingPendingStatus, setLoadingPendingStatus] = useState(true);

  // ── Stripe success URL detection & client-side fulfillment fallback ─────────
  const [stripeVerifying, setStripeVerifying] = useState(false);
  const [stripeVerifyDone, setStripeVerifyDone] = useState(false);
  const [stripeVerifySuccess, setStripeVerifySuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'cancelled') {
      toast(t('تم إلغاء عملية الدفع.', 'Payment was cancelled.'), 'info');
      // Clean up URL params
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (paymentStatus === 'success' && sessionId) {
      setStripeVerifying(true);
      console.log('[Stripe Return] Detected payment=success, verifying session:', sessionId);

      verifyCheckoutSession(sessionId, userData?.uid)
        .then((result) => {
          console.log('[Stripe Return] verifyStripeSession result:', result);
          if (result?.success) {
            const planLabel = result.planName || '';
            const credits = result.creditsPerMonth || 0;
            toast(
              t(
                `تم تفعيل اشتراكك بنجاح! (${planLabel} — ${credits} نقطة)`,
                `Subscription activated! (${planLabel} — ${credits} credits)`
              ),
              'success'
            );
            setStripeVerifySuccess(true);
          } else {
            // Payment may still be processing; webhook will handle it
            console.warn('[Stripe Return] verifyStripeSession returned non-success:', result);
          }
        })
        .catch((err) => {
          console.error('[Stripe Return] verifyStripeSession error:', err);
          // Non-critical: webhook may have already processed it
        })
        .finally(() => {
          setStripeVerifying(false);
          setStripeVerifyDone(true);
          // Clean up URL params so refresh doesn't re-trigger
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the latest manual payment request for this user via real-time listener
  useEffect(() => {
    if (!userData?.uid) {
      setLoadingPendingStatus(false);
      return;
    }

    const q = query(
      collection(db, "payments"),
      where("userId", "==", userData.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setLoadingPendingStatus(false);
      if (!snap.empty) {
        // Sort documents in JavaScript to avoid Firestore composite index requirement
        const docs = snap.docs.map(doc => doc.data());
        docs.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toMillis?.() || 0);
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toMillis?.() || 0);
          return timeB - timeA;
        });
        const latest = docs[0];

        if (latest.status === "pending") {
          setIsPendingReview(true);
          setRejectionReason("");
        } else if (latest.status === "rejected") {
          setIsPendingReview(false);
          setRejectionReason(latest.rejectionReason || "");
        } else if (latest.status === "approved" || latest.status === "completed") {
          setIsPendingReview(false);
          setRejectionReason("");
        }
      } else {
        setIsPendingReview(false);
        setRejectionReason("");
      }
    }, (err) => {
      console.error("Error fetching latest payment:", err);
      setLoadingPendingStatus(false);
    });

    return () => unsubscribe();
  }, [userData]);
  
  // ── DIRECT PAYMENT METHODS FETCH ─────────────────────────────────────────
  // Multi-source fetch so Stripe + manual method details always appear.
  // Priority: 1) admin user doc via createdBy  2) query admin by brandName  3) brands doc  4) brandData memory
  const [livePaymentData, setLivePaymentData] = useState(null);

  useEffect(() => {
    if (!userData?.uid) return;

    const normalizePaymentMethods = (pm, foundAdminId) => {
      if (!pm) return null;
      return {
        ...pm,
        _adminId: foundAdminId,
        stripe: pm.stripe
          ? {
              ...pm.stripe,
              enabled: pm.stripe.enabled === true || pm.stripe.enabled === 'true' || pm.stripe.enabled === 1,
            }
          : undefined,
      };
    };

    const fetchPaymentMethods = async () => {
      const adminUid = brandData?.adminUid || userData?.adminId || userData?.createdBy || userData?.assignedAdminId;
      const brandName = userData?.brandName || brandData?.name;

      // 1. Direct admin UID lookup: users/{adminUid}
      if (adminUid) {
        try {
          // Try users/{adminUid} first
          const adminSnap = await getDoc(doc(db, 'users', adminUid));
          if (adminSnap.exists() && adminSnap.data()?.paymentMethods) {
            console.log('[Payment] Found via admin UID (users doc)');
            setLivePaymentData(normalizePaymentMethods(adminSnap.data().paymentMethods, adminUid));
            return;
          }
          // Also try tenants/{adminUid}
          const tenantSnap = await getDoc(doc(db, 'tenants', adminUid));
          if (tenantSnap.exists() && tenantSnap.data()?.paymentMethods) {
            console.log('[Payment] Found via admin UID (tenants doc)');
            setLivePaymentData(normalizePaymentMethods(tenantSnap.data().paymentMethods, adminUid));
            return;
          }
        } catch (err) {
          console.warn('[Payment] users/tenants/{adminUid} read failed:', err.message);
        }
      }

      // 2. Query: find admin user by matching brandName (try role=admin, then any role with paymentMethods)
      if (brandName) {
        try {
          // First try strict admin role
          let adminQ = query(
            collection(db, 'users'),
            where('brandName', '==', brandName),
            where('role', '==', 'admin'),
            limit(1)
          );
          let adminQSnap = await getDocs(adminQ);
          
          // If not found, try without role restriction — some admins may have different role values
          if (adminQSnap.empty) {
            adminQ = query(
              collection(db, 'users'),
              where('brandName', '==', brandName),
              limit(5)
            );
            adminQSnap = await getDocs(adminQ);
          }

          for (const adminDoc of adminQSnap.docs) {
            const adminData = adminDoc.data();
            if (adminData?.paymentMethods) {
              console.log('[Payment] Found via query users(brandName):', adminDoc.id);
              setLivePaymentData(normalizePaymentMethods(adminData.paymentMethods, adminDoc.id));
              return;
            }
          }
        } catch (err) {
          console.warn('[Payment] query users by brandName failed:', err.message);
        }

        // 3. brands/{brandName} doc
        try {
          const brandSnap = await getDoc(doc(db, 'brands', brandName));
          if (brandSnap.exists() && brandSnap.data()?.paymentMethods) {
            console.log('[Payment] Found via brands/{brandName}');
            setLivePaymentData(normalizePaymentMethods(brandSnap.data().paymentMethods, brandSnap.data().adminId || adminUid));
            return;
          }
        } catch (err) {
          console.warn('[Payment] brands/{brandName} read failed:', err.message);
        }
      }

      // 4. Fallback: brandData already in memory
      if (brandData?.paymentMethods) {
        console.log('[Payment] Using brandData in memory');
        setLivePaymentData(normalizePaymentMethods(brandData.paymentMethods, adminUid));
      } else {
        console.warn('[Payment] No payment methods found in any source.');
      }
    };

    fetchPaymentMethods();
  // Re-run whenever user identity or admin reference changes
  }, [userData?.uid, userData?.createdBy, userData?.assignedAdminId, userData?.brandName, brandData?.adminUid, brandData?.name]);
  // ─────────────────────────────────────────────────────────────────────────

  // Payment methods from brandData (populated from admin's user doc via AuthContext)
  const paymentData = livePaymentData || brandData?.paymentMethods || brandData?.publicPaymentMethods || {};
  
  const stripeData = paymentData?.stripe || {};
  // Support boolean true, string "true", or number 1 from Firestore
  const stripeEnabled = stripeData?.enabled === true || stripeData?.enabled === 'true' || stripeData?.enabled === 1;
  const stripePaymentLink = stripeData?.paymentLink || '';
  const stripePaymentLinkAnnual = stripeData?.paymentLinkAnnual || '';

  let manualMethods = paymentData?.manualMethods;
  if (!manualMethods || manualMethods.length === 0) {
    manualMethods = [
      { id: "def-1", name: "Vodafone Cash / فودافون كاش", value: "" },
      { id: "def-2", name: "InstaPay / انستا باي", value: "" },
      { id: "def-3", name: "Bank Transfer / تحويل بنكي", value: "" }
    ];
  }

  const plans = (brandData?.plans || []).filter((p) => p.isActive !== false);

  const ADDITIONAL_RESOURCES = [
    { id: "brand-library", label_ar: "مكتبة المنتجات", label_en: "Product Library", section: "additional" },
    { id: "smart-notebook", label_ar: "كشكول الملاحظات الذكي", label_en: "Smart Notebook", section: "additional" },
    { id: "settings", label_ar: "الإعدادات", label_en: "Settings", section: "additional" },
    { id: "tutorial", label_ar: "شروحات المنصة", label_en: "Tutorial", section: "additional" },
  ];
  const CHECKLIST_ITEMS = [...JOURNEY_STEPS, ...TOOLS_24H, ...ADDITIONAL_RESOURCES];

  // Modal State
  const [activeMethod, setActiveMethod] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toolsModalPlan, setToolsModalPlan] = useState(null);
  const fileInputRef = useRef(null);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
    setActiveMethod(null);
    setTermsAccepted(false);
    setReceiptFile(null);
  };

  const handleManualSubmit = async () => {
    if (!termsAccepted) {
      toast(t("يجب الموافقة على الشروط والأحكام أولاً", "You must accept the Terms & Conditions first"), "error");
      return;
    }
    if (!activeMethod || activeMethod.isStripe) {
      toast(t("الرجاء اختيار طريقة الدفع", "Please select a payment method"), "error");
      return;
    }
    if (!receiptFile) {
      toast(t("الرجاء إرفاق صورة إيصال التحويل", "Please upload the transfer receipt"), "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Receipt to Firebase Storage
      const ext = receiptFile.name.split(".").pop();
      const fileName = `receipts/${userData.uid}_${Date.now()}.${ext}`;
      const fileRef = ref(receiptsStorage, fileName);
      await uploadBytes(fileRef, receiptFile);
      const downloadUrl = await getDownloadURL(fileRef);

      // 2. Create Payment Document
      await addDoc(collection(db, "payments"), {
        userId: userData.uid,
        userName: userData.name || userData.email?.split("@")[0] || "User",
        userEmail: userData.email || "",
        userPhone: userData.phone || "",
        amount: selectedPlan.price ?? 0,
        currency: selectedPlan.currency || "EGP", // Dynamically grab currency from plan
        paymentMethod: activeMethod.name,
        planId: selectedPlan.id,
        planName: isRtl ? (selectedPlan.name_ar || selectedPlan.title_ar || selectedPlan.name) : (selectedPlan.name_en || selectedPlan.title_en || selectedPlan.name),
        receiptUrl: downloadUrl,
        status: "pending",
        adminUid: brandData?.adminUid || brandData?.adminId || userData?.createdBy || userData?.assignedAdminId || "admin",
        createdAt: serverTimestamp(),
      });

      // 3. Immediately cancel current active subscription to block premium features
      if (userData?.subscription?.status === "active") {
        await updateDoc(doc(db, "users", userData.uid), {
          "subscription.status": "cancelled",
          "subscription.currentPeriodEnd": new Date().toISOString()
        });
      }

      toast(
        t("تم استلام طلب الترقية بنجاح! سيتم المراجعة والتفعيل قريباً.", "Upgrade request received! It will be reviewed and activated soon."),
        "success"
      );
      setShowPaymentModal(false);
      setIsPendingReview(true);
    } catch (err) {
      console.error(err);
      toast(t("حدث خطأ أثناء إرسال الطلب", "An error occurred while submitting"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPaymentMethods = [];
  if (stripeEnabled) {
    allPaymentMethods.push({
      id: "stripe",
      isStripe: true,
      name: t("بطاقة ائتمان / الفيزا (Stripe)", "Credit Card (Stripe)"),
      desc: t("دفع فوري وآمن", "Instant & secure payment"),
    });
  }
  manualMethods.forEach((m) => {
    // Dynamically fetch from whatever field the admin used (value, details, accountNumber, or instructions)
    const methodDetails = m.value || m.details || m.accountNumber || m.instructions || (m.name.includes('Vodafone') ? "يتم تحديد الرقم من الإدارة" : "يتم تحديد الحساب من الإدارة");
    allPaymentMethods.push({
      id: m.id,
      isStripe: false,
      name: m.name,
      value: methodDetails,
      desc: t("تحويل يدوي وإرفاق الإيصال", "Manual transfer & upload receipt"),
    });
  });

  return (
    <div className="settings-page">
      <Topbar title={t("ترقية الباقة", "Upgrade Plan")} icon={<Crown />} />
      
      <div className="settings-content" style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
            {/* ── Stripe Payment Verification Banner ───────────────────────────── */}
        <AnimatePresence>
          {stripeVerifying && (
            <motion.div
              key="stripe-verifying"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                padding: "16px 20px",
                borderRadius: "12px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div style={{
                width: 20, height: 20, border: "2px solid rgba(59,130,246,0.4)",
                borderTopColor: "#3B82F6", borderRadius: "50%",
                animation: "spin 1s linear infinite", flexShrink: 0
              }} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#3B82F6" }}>
                  {t("جاري التحقق من الدفع...", "Verifying payment...")}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>
                  {t("يرجى الانتظار قليلاً، سيتم تفعيل اشتراكك تلقائياً.", "Please wait, your subscription will be activated automatically.")}
                </div>
              </div>
            </motion.div>
          )}
          {stripeVerifySuccess && stripeVerifyDone && !stripeVerifying && (
            <motion.div
              key="stripe-verified"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                padding: "14px 20px",
                borderRadius: "12px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <CheckCircle2 size={20} style={{ color: "var(--green)", flexShrink: 0 }} />
              <div style={{ fontSize: "14px", color: "var(--green)", fontWeight: "700" }}>
                {t("تم تفعيل اشتراكك بنجاح! ستظهر تغييرات الرصيد والباقة الآن.", "Subscription activated! Credits and plan updates will reflect now.")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {rejectionReason && !isPendingReview && (

          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }}>
            <XCircle style={{ color: "#EF4444", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#EF4444", fontSize: "15px" }}>
                {t("تم رفض طلبك الأخير", "Your recent payment request was rejected")}
              </h4>
              <p style={{ margin: 0, color: "var(--text2)", fontSize: "14px" }}>
                {rejectionReason}
              </p>
            </div>
            <button 
              onClick={() => setRejectionReason("")} 
              style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", marginLeft: isRtl ? "0" : "auto", marginRight: isRtl ? "auto" : "0" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {isPendingReview ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text3)", background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid var(--line)" }}>
            <Clock size={64} style={{ margin: "0 auto 24px", color: "#F59E0B", opacity: 0.8 }} />
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "12px" }}>
              {t("طلبك قيد المراجعة", "Your Request is Under Review")}
            </h2>
            <p style={{ fontSize: "15px", color: "var(--text2)", maxWidth: "500px", margin: "0 auto" }}>
              {t(
                "لقد استلمنا إيصال التحويل الخاص بك بنجاح. يرجى الانتظار حتى تقوم الإدارة بمراجعته وتفعيل الباقة لك قريباً.",
                "We have successfully received your transfer receipt. Please wait while the administration reviews it and activates your plan shortly."
              )}
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", marginBottom: "12px" }}>
                {t("اختر الباقة المناسبة لك", "Choose Your Subscription Plan")}
              </h1>
              <p style={{ fontSize: "15px", color: "var(--text3)", maxWidth: "600px", margin: "0 auto" }}>
                {t(
                  "اختر الباقة التي تلبي احتياجاتك وابدأ في استخدام جميع الأدوات والميزات الاحترافية.",
                  "Select the plan that fits your needs and unlock all professional tools and features."
                )}
              </p>
            </div>

            {plans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)", background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid var(--line)" }}>
                <ShieldCheck size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <h3 style={{ fontSize: "18px", color: "#fff", marginBottom: "8px" }}>
                  {t("لا توجد باقات متاحة حالياً", "No plans available right now")}
                </h3>
                <p>{t("يرجى مراجعة الإدارة لمزيد من التفاصيل.", "Please contact administration for more details.")}</p>
              </div>
            ) : (
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
            {plans.map((plan) => {
              const rawAr = plan.features_ar || plan.features || "";
              const rawEn = plan.features_en || "";
              const arrAr = typeof rawAr === "string" ? rawAr.split("\n").filter(Boolean) : (Array.isArray(rawAr) ? rawAr : []);
              const arrEn = typeof rawEn === "string" ? rawEn.split("\n").filter(Boolean) : (Array.isArray(rawEn) ? rawEn : []);
              let features = isRtl ? arrAr : (arrEn.length > 0 ? arrEn : autoTranslatePlanFeatures(rawAr, "en"));

              const rawName = isRtl ? (plan.name_ar || plan.title_ar || plan.name) : (plan.name_en || plan.title_en || plan.name);
              const displayPlanName = isRtl ? rawName : autoTranslatePlanText(rawName, "en");

              const planNameToCheck = userData?.subscription?.planName || userData?.planName;
              const nameMatch = planNameToCheck && (
                planNameToCheck === plan.name_ar ||
                planNameToCheck === plan.name_en ||
                planNameToCheck === plan.name ||
                planNameToCheck?.toLowerCase() === plan.name_ar?.toLowerCase() ||
                planNameToCheck?.toLowerCase() === plan.name_en?.toLowerCase()
              );

              // Prioritize nested subscription plan ID over root legacy plan ID
              const planIdToCheck = userData?.subscription?.planId || userData?.subscription?.type || userData?.planId;
              const hasPlanId = planIdToCheck !== undefined && planIdToCheck !== null && planIdToCheck !== "";
              const idMatch = hasPlanId && String(planIdToCheck) === String(plan.id);

              // The app heavily relies on planName as the source of truth (Admin Panel, Navbar).
              // So if planName is present in the database, we STRICTLY trust nameMatch.
              // We only fallback to idMatch if the name is completely missing.
              const isCurrentPlan = planNameToCheck ? nameMatch : idMatch;

              let isExpired = false;
              if (isCurrentPlan && userData?.subscription?.expiresAt) {
                const exp = userData.subscription.expiresAt.toDate ? userData.subscription.expiresAt.toDate() : new Date(userData.subscription.expiresAt);
                if (exp < new Date()) {
                  isExpired = true;
                }
              }
              
              if (userData?.subscription?.status === 'canceled' || userData?.subscription?.status === 'cancelled' || userData?.subscription?.status === 'expired') {
                isExpired = true;
              }

              let btnLabel = t("ترقية الآن", "Upgrade Now");
              let btnDisabled = false;
              if (isCurrentPlan) {
                if (isExpired) {
                  btnLabel = t("تجديد الاشتراك", "Renew Subscription");
                  btnDisabled = false; // explicitly active for renewal
                } else {
                  btnLabel = t("باقتك الحالية", "Current Plan");
                  btnDisabled = true;
                }
              }

              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -5 }}
                  style={{
                    flex: "1 1 300px",
                    maxWidth: "350px",
                    background: isCurrentPlan ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.95))" : "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))",
                    border: `1px solid ${isCurrentPlan ? "var(--green)" : plan.recommended ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "20px",
                    padding: "30px",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: isCurrentPlan ? "0 10px 30px -10px rgba(16, 185, 129, 0.3)" : plan.recommended ? "0 10px 30px -10px rgba(59, 130, 246, 0.3)" : "none",
                  }}
                >
                  {isCurrentPlan && (
                    <div
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: isRtl ? "auto" : "-35px",
                        left: isRtl ? "-35px" : "auto",
                        background: "var(--green)",
                        color: "#fff",
                        padding: "4px 40px",
                        fontSize: "11px",
                        fontWeight: "800",
                        transform: isRtl ? "rotate(-45deg)" : "rotate(45deg)",
                        letterSpacing: "1px",
                        zIndex: 2,
                      }}
                    >
                      {t("باقتك الحالية", "CURRENT PLAN")}
                    </div>
                  )}
                  {plan.recommended && !isCurrentPlan && (
                    <div
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: isRtl ? "auto" : "-30px",
                        left: isRtl ? "-30px" : "auto",
                        background: "var(--accent)",
                        color: "#fff",
                        padding: "4px 40px",
                        fontSize: "11px",
                        fontWeight: "800",
                        transform: isRtl ? "rotate(-45deg)" : "rotate(45deg)",
                        letterSpacing: "1px",
                        zIndex: 1,
                      }}
                    >
                      {t("مُقترح", "RECOMMENDED")}
                    </div>
                  )}

                  <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>
                    {displayPlanName}
                  </h3>
                  
                  <div style={{ margin: "20px 0", display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "36px", fontWeight: "900", color: "#fff" }}>
                      {convertAndFormat(plan.price || plan.monthlyPrice || 0, plan.currency || 'EGP')}
                    </span>
                    <span style={{ fontSize: "14px", color: "var(--text3)", fontWeight: "600" }}>
                      {displayCurrency} / {plan.billingCycle === "yearly" || plan.durationDays === 365 ? t("سنوياً", "Yearly") : t("شهرياً", "Monthly")}
                    </span>
                  </div>
                  {displayCurrency !== (plan.currency || 'EGP').toUpperCase() && (
                    <div style={{ marginTop: '-14px', marginBottom: '18px', color: 'var(--text3)', fontSize: '11px' }}>
                      {t(`السعر الأصلي: ${plan.price || plan.monthlyPrice || 0} ${plan.currency || 'EGP'} — تقديري للعرض`, `Original price: ${plan.price || plan.monthlyPrice || 0} ${plan.currency || 'EGP'} — display estimate`)}
                    </div>
                  )}

                  <div style={{ marginBottom: "20px" }}>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      ⚡ {plan.creditsPerMonth || plan.credits || 0} {t("نقطة / شهرياً", "Credits / Month")}
                    </span>
                  </div>

                  <button
                    disabled={btnDisabled}
                    onClick={() => handlePlanSelect(plan)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      background: btnDisabled ? "rgba(16, 185, 129, 0.1)" : plan.recommended ? "var(--accent)" : "rgba(255,255,255,0.05)",
                      color: btnDisabled ? "var(--green)" : plan.recommended ? "#fff" : "var(--text)",
                      border: btnDisabled ? "1px solid rgba(16, 185, 129, 0.3)" : plan.recommended ? "none" : "1px solid rgba(255,255,255,0.1)",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: btnDisabled ? "not-allowed" : "pointer",
                      marginBottom: "30px",
                      transition: "all 0.2s",
                      opacity: btnDisabled ? 0.8 : 1,
                    }}
                    onMouseOver={(e) => {
                      if(!plan.recommended && !btnDisabled) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if(!plan.recommended && !btnDisabled) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      }
                    }}
                  >
                    {btnLabel}
                  </button>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                    {features.map((feat, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: "10px" }}>
                        <CheckCircle2 size={18} style={{ color: "var(--green)", flexShrink: 0, marginTop: "2px" }} />
                        <span style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.5 }}>
                          {feat}
                        </span>
                      </div>
                    ))}

                    {plan.allowedTools && Array.isArray(plan.allowedTools) && plan.allowedTools.length > 0 && (
                      <button
                        onClick={() => setToolsModalPlan(plan)}
                        style={{
                          marginTop: "auto",
                          padding: "10px 14px",
                          background: "rgba(99, 102, 241, 0.1)",
                          color: "var(--accent)",
                          border: "1px dashed rgba(99, 102, 241, 0.3)",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
                          e.currentTarget.style.borderColor = "var(--accent)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                        }}
                      >
                        <Crown size={16} />
                        {isRtl ? "عرض الأدوات المتاحة" : "View Included Tools"}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        </>
        )}

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && selectedPlan && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px",
              }}
              dir={isRtl ? "rtl" : "ltr"}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{
                  background: "#0D1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "24px",
                  width: "100%",
                  maxWidth: "550px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                }}
              >
                {/* Header */}
                <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>
                      {t("إتمام الدفع", "Complete Payment")}
                    </h3>
                    <div style={{ fontSize: "13px", color: "var(--text3)", marginTop: "4px" }}>
                      {isRtl ? (selectedPlan.name_ar || selectedPlan.title_ar || selectedPlan.name) : (selectedPlan.name_en || selectedPlan.title_en || selectedPlan.name)} — {convertAndFormat(selectedPlan.price || selectedPlan.monthlyPrice || 0, selectedPlan.currency || 'EGP')}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", padding: "8px" }}
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* Select Payment Method */}
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#fff", display: "block", marginBottom: "12px" }}>
                      {t("طريقة الدفع", "Payment Method")}
                    </label>
                    
                    {allPaymentMethods.length === 0 ? (
                      <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", borderRadius: "12px", fontSize: "13px", textAlign: "center" }}>
                        {t("لا توجد طرق دفع متاحة حالياً.", "No payment methods currently available.")}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                        {allPaymentMethods.map((method) => {
                          const isSelected = activeMethod?.id === method.id;
                          return (
                            <div
                              key={method.id}
                              onClick={() => setActiveMethod(method)}
                              style={{
                                padding: "16px",
                                background: isSelected ? "rgba(59, 130, 246, 0.1)" : "rgba(0,0,0,0.2)",
                                border: `1px solid ${isSelected ? "#3B82F6" : "rgba(255,255,255,0.05)"}`,
                                borderRadius: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              <div style={{ color: isSelected ? "#3B82F6" : "var(--text3)" }}>
                                {getMethodIcon(method.isStripe ? "stripe" : method.name, 24)}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "15px", fontWeight: "700", color: isSelected ? "#3B82F6" : "#fff" }}>
                                  {method.name}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "4px" }}>
                                  {method.desc}
                                </div>
                              </div>
                              <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${isSelected ? "#3B82F6" : "var(--text3)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {isSelected && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3B82F6" }} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manual Transfer Details */}
                  {activeMethod && !activeMethod.isStripe && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      style={{ background: "rgba(0,0,0,0.2)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}
                    >
                      {activeMethod.value ? (
                        <div>
                          <div style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "6px" }}>
                            {t("قم بتحويل المبلغ إلى:", "Transfer the amount to:")}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: "10px" }}>
                            <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff", letterSpacing: "1px", fontFamily: "monospace" }} dir="ltr">
                              {activeMethod.value}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(activeMethod.value);
                                toast(t("تم النسخ", "Copied"), "success");
                              }}
                            style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700" }}
                          >
                            <Copy size={14} />
                            {t("نسخ", "Copy")}
                          </button>
                        </div>
                      </div>
                      ) : null}

                      <div>
                        <div style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "8px" }}>
                          {t("إرفاق إيصال التحويل (مطلوب)", "Upload Transfer Receipt (Required)")}
                        </div>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: "1px dashed rgba(255,255,255,0.2)",
                            borderRadius: "12px",
                            padding: "24px",
                            textAlign: "center",
                            cursor: "pointer",
                            background: receiptFile ? "rgba(16, 185, 129, 0.05)" : "rgba(255,255,255,0.02)",
                            transition: "all 0.2s",
                          }}
                        >
                          {receiptFile ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                              <CheckCheck size={28} color="#10B981" />
                              <div style={{ fontSize: "13px", fontWeight: "600", color: "#10B981" }}>{receiptFile.name}</div>
                              <div style={{ fontSize: "11px", color: "var(--text3)" }}>{t("انقر لتغيير الملف", "Click to change file")}</div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                              <Upload size={28} color="var(--text3)" />
                              <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>
                                {t("اضغط هنا لاختيار صورة الإيصال", "Click here to select receipt image")}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text3)" }}>PNG, JPG, JPEG</div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setReceiptFile(e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Terms & Conditions Checkbox */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px" }}>
                    <div
                      onClick={() => setTermsAccepted(!termsAccepted)}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "6px",
                        border: `2px solid ${termsAccepted ? "var(--green)" : "rgba(255,255,255,0.2)"}`,
                        background: termsAccepted ? "var(--green)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        marginTop: "2px"
                      }}
                    >
                      {termsAccepted && <CheckCircle2 size={14} color="#000" />}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.5 }}>
                      {t("أوافق على ", "I agree to the ")}
                      <a href="/terms" target="_blank" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "700" }}>
                        {t("الشروط والأحكام", "Terms & Conditions")}
                      </a>
                      {t(" وسياسة الخصوصية الخاصة بالمنصة وأن هذا الاشتراك غير قابل للاسترداد.", " and Privacy Policy, and understand that this subscription is non-refundable.")}
                    </div>
                  </div>

                </div>

                {/* Footer / Submit */}
                <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "12px", color: "#fff", fontWeight: "700", cursor: "pointer" }}
                  >
                    {t("إلغاء", "Cancel")}
                  </button>
                  
                  {activeMethod?.isStripe ? (
                    <button
                      disabled={isSubmitting}
                      onClick={async () => {
                        if (!termsAccepted) {
                          toast(t("يجب الموافقة على الشروط والأحكام أولاً", "You must accept the Terms & Conditions first"), "error");
                          return;
                        }

                        setIsSubmitting(true);
                        try {
                          // ── Option A: Dynamic Checkout Session via Cloud Function ──
                          const adminId = livePaymentData?._adminId
                            || brandData?.adminUid
                            || userData?.adminId
                            || userData?.createdBy
                            || userData?.assignedAdminId;

                          if (!adminId) {
                            throw new Error("Could not identify admin account.");
                          }

                          // amount is always the full display price (e.g. 300 EGP).
                          // The Cloud Function multiplies by 100 → piastres/cents internally.
                          const amount = Number(selectedPlan.price ?? selectedPlan.monthlyPrice ?? 0);
                          const currency = (selectedPlan.currency || "egp").toLowerCase();
                          const planCredits = Number(selectedPlan.creditsPerMonth || selectedPlan.credits || 0);
                          const planLabel = isRtl
                            ? (selectedPlan.name_ar || selectedPlan.title_ar || selectedPlan.name)
                            : (selectedPlan.name_en || selectedPlan.title_en || selectedPlan.name);

                          // ── Debug: log exact payload before calling the Cloud Function ──
                          console.log("[Stripe Checkout] Sending payload to Stripe:", {
                            adminId,
                            userId: userData.uid,
                            userEmail: userData.email || "",
                            planName: planLabel || "Subscription Plan",
                            amount,
                            currency,
                            planId: selectedPlan.id,
                            creditsPerMonth: planCredits,
                            note: "amount is full display price; CF multiplies × 100 for piastres/cents",
                          });

                          let checkoutUrl = null;
                          try {
                            const { url } = await createCheckoutSession({
                              adminId,
                              userId: userData.uid,
                              userEmail: userData.email || "",
                              planName: planLabel || "Subscription Plan",
                              planId: selectedPlan.id || '',
                              creditsPerMonth: planCredits,
                              amount,
                              currency,
                            });
                            checkoutUrl = url;
                          } catch (cfErr) {
                            console.error("[Stripe Checkout] Cloud Function error details:", {
                              message: cfErr.message,
                              stack: cfErr.stack,
                              payload: { adminId, amount, currency, planId: selectedPlan.id },
                            });
                            throw cfErr; // re-throw so the outer catch handles the fallback
                          }

                          // Redirect to Stripe-hosted checkout page
                          window.top.location.href = checkoutUrl;
                          return;

                        } catch (err) {
                          console.warn("[Stripe Checkout] Cloud Function failed, attempting fallback to static link. Error:", err.message);

                          // ── Option B: Fallback to Direct Stripe Payment Link ──
                          const isAnnual = selectedPlan.billingCycle === "yearly" || selectedPlan.durationDays === 365;
                          const paymentLink = isAnnual
                            ? (stripePaymentLinkAnnual || stripePaymentLink)
                            : stripePaymentLink;

                          if (paymentLink && paymentLink.trim() !== "") {
                            console.log("[Stripe Checkout] Redirecting to static Stripe payment link:", paymentLink);
                            const separator = paymentLink.includes("?") ? "&" : "?";
                            window.top.location.href = `${paymentLink}${separator}client_reference_id=${userData.uid}`;
                            return;
                          }

                          // Both paths failed — show the error to the user
                          toast(
                            err.message || t(
                              "حدث خطأ أثناء إعداد الدفع. حاول مرة أخرى.",
                              "Payment setup failed. Please try again."
                            ),
                            "error"
                          );
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      style={{
                        flex: 2,
                        padding: "14px",
                        background: !isSubmitting ? "#6366F1" : "rgba(255,255,255,0.1)",
                        border: "none",
                        borderRadius: "12px",
                        color: !isSubmitting ? "#fff" : "var(--text3)",
                        fontWeight: "700",
                        fontSize: "15px",
                        cursor: !isSubmitting ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                          {t("جاري التحضير...", "Preparing...")}
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                          {t("متابعة للدفع الآمن", "Proceed to Secure Payment")}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleManualSubmit}
                      disabled={isSubmitting || !termsAccepted || !activeMethod || !receiptFile}
                      style={{
                        flex: 2,
                        padding: "14px",
                        background: (termsAccepted && receiptFile && activeMethod && !isSubmitting) ? "var(--green)" : "rgba(255,255,255,0.1)",
                        border: "none",
                        borderRadius: "12px",
                        color: (termsAccepted && receiptFile && activeMethod) ? "#fff" : "var(--text3)",
                        fontWeight: "700",
                        cursor: (termsAccepted && receiptFile && activeMethod && !isSubmitting) ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                          {t("جاري الإرسال...", "Submitting...")}
                        </>
                      ) : (
                        t("تأكيد طلب الترقية", "Confirm Upgrade Request")
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* Tools Popup Modal */}
        <AnimatePresence>
          {toolsModalPlan && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setToolsModalPlan(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)" }} />
              <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} style={{ background: "linear-gradient(180deg, #1A2235, #0F172A)", width: "90%", maxWidth: "450px", borderRadius: "24px", position: "relative", zIndex: 1001, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
                
                <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.15)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Crown size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0, letterSpacing: "0.2px" }}>
                        {isRtl ? "الأدوات المتاحة" : "Included Tools"}
                      </h3>
                      <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>
                        {isRtl ? (toolsModalPlan.name_ar || toolsModalPlan.name) : (toolsModalPlan.name_en || toolsModalPlan.name)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setToolsModalPlan(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", width: "32px", height: "32px", borderRadius: "8px", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
                    <X size={18} />
                  </button>
                </div>
                
                <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {toolsModalPlan.allowedTools.map(toolId => {
                    const toolItem = CHECKLIST_ITEMS.find(item => item.id === toolId);
                    if (!toolItem) return null;
                    const label = isRtl ? (toolItem.label_ar || toolItem.label_en) : (toolItem.label_en || toolItem.label_ar);
                    return (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={toolId} style={{ display: "flex", alignItems: "center", gap: "14px", background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                          {getVectorIcon(toolId, 20)}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>{label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
