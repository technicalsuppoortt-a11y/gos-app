import { openPhoenixAccount } from "@/modules/brand-engine/services/phoenixTransfer";
import { openGosPlatform, requestGosPlatform } from "@/services/gosPlatform";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { preparePhoenixConfiguration } from "@/modules/brand-engine/services/brandDraft";
import { fingerprintBrandPages } from "@/modules/brand-engine/data/brandPages";
import { confirmedDeploymentSteps } from "@/modules/brand-engine/data/deploymentProgress";
import { useEffect, useMemo, useRef, useState } from "react";
import { configureStore } from "@reduxjs/toolkit";
import {
  ArrowRight,
  Check,
  Sparkles,
  CircleCheck,
  CircleAlert,
  ExternalLink,
  Crown,
  Rocket,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Provider } from "react-redux";
import { LandingPreviewBridge } from "@/modules/brand-engine/components/brandengine/landing-preview/LandingPreviewBridge";
import { DashboardBrandLogo } from "@/modules/brand-engine/components/brandengine/DashboardBrandLogo";
import { useDashboardBrand } from "@/modules/brand-engine/components/brandengine/useDashboardBrand";
import { Button } from "@/modules/brand-engine/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/modules/brand-engine/components/ui/dialog";
import type { Device } from "@/modules/brand-engine/data/types";
import brandReducer, { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import styles from "./PlatformDeployment.module.css";
import { activeReadySaas } from "@/modules/brand-engine/data/readySaas";
import { ReadySaasDeploymentSummary } from "./ReadySaasMarketplace";

const copy = {
  en: {
    eyebrow: "FINAL STEP · LAUNCH & REVIEW",
    title: "From idea to a platform ready in minutes",
    centerTitle: "AI Deployment Center",
    intro: "Review your pre-flight checklist and save your brand, pages, and settings to Joe Academy before publishing.",
    checklistTitle: "Deployment Checklist & Verification",
    checklistSub: "8 automated pre-flight checks across brand identity, pages, and workspace sync",
    liveTitle: "Your brand and platform are ready",
    liveBody: "Your brand, pages and settings are saved in Gose. Open your platform from Phoenix.",
    liveBodyAr: "تم إنشاء حساب منصتك وحفظ اختياراتك في Gose.",
    open: "Open your platform",
    reviewWebsite: "Review Website",
    startDeployment: "Start Deployment",
    dashboard: "Go to Dashboard",
    openDashboard: "Open Dashboard",
    openPortal: "Open Customer Portal",
    systemsReady: "Configuration received",
    live: "Prepared",
    unavailable: "A generated landing page is required before it can be reviewed.",
    workspace: "Workspace Summary",
    workspaceSub: "Your business workspace",
    platformUrl: "Platform URL",
    admin: "Admin Dashboard",
    portal: "Customer Portal",
    marketplace: "Marketplace",
    ready: "Ready",
    verified: "Verified",
    syncing: "Syncing",
    growthTitle: "Your Gose platform is ready",
    growthSub: "Open your platform from Phoenix with the same account.",
    aiWorking: "AI is working...",
    deployingTitle: "Sending your saved configuration…",
    deployingBody: "Saving your choices and preparing Gose. You will return to Phoenix when deployment completes.",
    deploymentFailed: "Configuration transfer failed",
    deploymentFailedBody: "Please check the error and retry. Your draft remains in Joe Academy.",
    retry: "Retry transfer",
    contactSupport: "Contact Support",
    readyItems: [
      "Brand choices saved",
      "Page parameters copied",
      "Snapshot stored in Joe Academy",
      "Gose account prepared",
    ],
    steps: [
      "Brand saved",
      "Template saved",
      "Module choices saved",
      "AI preferences saved",
      "Page content saved",
      "Account link verified",
      "Snapshot received",
      "Ready in Joe Academy",
    ],
    stepDetails: [
      "Identity, palette & typography tokens",
      "Selected website layout & theme",
      "Enabled SaaS tools & modules",
      "Connected AI generation settings",
      "Landing copy & section parameters",
      "Phoenix owner session verified",
      "Encrypted cloud snapshot stored",
      "Gose workspace ready to launch",
    ],
  },
  ar: {
    eyebrow: "الخطوة الأخيرة · المراجعة والنشر",
    title: "من الفكرة إلى منصة جاهزة خلال دقائق",
    centerTitle: "مركز النشر بالذكاء الاصطناعي",
    intro: "راجع قائمة التحقق واحفظ البراند واللوجو والصفحات والإعدادات في Joe Academy قبل النشر.",
    checklistTitle: "قائمة التحقق وجاهزية النشر",
    checklistSub: "٨ فحوصات تلقائية للهوية والصفحات وربط مساحة العمل قبل الإطلاق",
    liveTitle: "تم إنشاء البراند ومنصتك جاهزة",
    liveBody: "تم حفظ هويتك وصفحاتك وإعداداتك في حساب Gose. افتح منصتك من لوحة Phoenix.",
    liveBodyAr: "تم إنشاء حساب منصتك وحفظ اختياراتك في Gose.",
    open: "الدخول إلى المنصة",
    reviewWebsite: "مراجعة الموقع",
    startDeployment: "بدء النشر",
    dashboard: "اذهب إلى لوحة التحكم",
    openDashboard: "فتح لوحة التحكم",
    openPortal: "فتح بوابة العملاء",
    systemsReady: "تم استلام الإعدادات",
    live: "مجهّز",
    unavailable: "يلزم إنشاء صفحة هبوط قبل مراجعتها.",
    workspace: "ملخص مساحة العمل",
    workspaceSub: "مساحة عمل علامتك التجارية",
    platformUrl: "رابط المنصة",
    admin: "لوحة الإدارة",
    portal: "بوابة العملاء",
    marketplace: "المتجر",
    ready: "جاهز",
    verified: "مؤكّد",
    syncing: "جارٍ الحفظ",
    growthTitle: "منصتك جاهزة في Gose",
    growthSub: "افتح منصتك من لوحة Phoenix بنفس الحساب.",
    aiWorking: "الذكاء الاصطناعي يعمل...",
    deployingTitle: "جارٍ إرسال إعداداتك إلى Joe Academy…",
    deployingBody: "نحفظ اختياراتك ونجهّز حساب Gose. ستعود إلى Phoenix بعد اكتمال الإطلاق.",
    deploymentFailed: "تعذّر إرسال الإعدادات",
    deploymentFailedBody: "راجع السبب وأعد المحاولة. مسودتك تظل محفوظة في Joe Academy.",
    retry: "إعادة محاولة الإرسال",
    contactSupport: "التواصل مع الدعم",
    readyItems: [
      "تم حفظ اختيارات البراند",
      "تم نقل بارامترات الصفحات",
      "تم حفظ نسخة في Joe Academy",
      "تم تجهيز حساب Gose",
    ],
    steps: [
      "تم حفظ الهوية",
      "تم حفظ القالب",
      "تم حفظ اختيارات الوحدات",
      "تم حفظ تفضيلات الذكاء",
      "تم حفظ محتوى الصفحة",
      "تم التحقق من ربط الحساب",
      "تم استلام النسخة",
      "الإعدادات جاهزة في Joe Academy",
    ],
    stepDetails: [
      "الاسم والألوان والخطوط المختارة",
      "تخطيط الموقع ونمط العرض",
      "أدوات ووحدات المنصة المفعّلة",
      "إعدادات وتفضيلات الذكاء الاصطناعي",
      "نصوص وأقسام صفحة الهبوط",
      "التحقق من حساب المالك في Phoenix",
      "حفظ نسخة سحابية مؤمّنة",
      "مساحة عمل Gose جاهزة للانطلاق",
    ],
  },
} as const;

type DeploymentState = "idle" | "deploying" | "success" | "failed";

export function PlatformDeployment({ number = "04" }: { number?: string }) {
  const dispatch = useAppDispatch();
  const brand = useAppSelector((state) => state.brand);
  const selectedBrand = useDashboardBrand();
  const readySaas = activeReadySaas(brand);
  const language = brand.language;
  const text = copy[language];
  const reduceMotion = useReducedMotion();
  const miniSiteViewportRef = useRef<HTMLSpanElement>(null);
  const [miniSite, setMiniSite] = useState({ scale: 0.13, height: 780 });
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [deploymentAttempted, setDeploymentAttempted] = useState(false);
  const [syncingGos, setSyncingGos] = useState(false);
  const [gosReady, setGosReady] = useState(false);
  const [platformSignInError, setPlatformSignInError] = useState("");
  const [platformSigningIn, setPlatformSigningIn] = useState(false);
  const fingerprint = fingerprintBrandPages(brand);
  const deploymentState: DeploymentState =
    syncingGos || brand.phoenixPreparation.state === "transferring"
      ? "deploying"
      : gosReady && brand.phoenixPreparation.state === "prepared" && brand.phoenixPreparation.fingerprint === fingerprint
        ? "success"
        : brand.phoenixPreparation.state === "failed"
          ? "failed"
          : "idle";
  const launching = deploymentState === "deploying";

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let active = true;
    void getDoc(doc(db, "users", uid, "brandEngine", "gosDeployment"))
      .then((snapshot) => {
        if (active && auth.currentUser?.uid === uid) {
          setGosReady(
            snapshot.data()?.status === "prepared" && snapshot.data()?.revision === brand.phoenixPreparation.snapshotId,
          );
        }
      })
      .catch(() => {
        if (active) setGosReady(false);
      });
    return () => {
      active = false;
    };
  }, [brand.phoenixPreparation.snapshotId]);

  const [completedDeploymentSteps, setCompletedDeploymentSteps] = useState(() =>
    deploymentState === "success" ? text.steps.length : 0,
  );
  const transferProgress = brand.phoenixPreparation.progress ?? 0;
  const confirmedSteps = confirmedDeploymentSteps(deploymentState, transferProgress, text.steps.length);
  const animatingSteps =
    deploymentState === "deploying" || (deploymentState === "success" && completedDeploymentSteps < text.steps.length);

  const [readyItemCount, setReadyItemCount] = useState(() =>
    deploymentState === "success" ? text.readyItems.length : 0,
  );
  const hasPreview = Boolean(readySaas) || brand.builderBlocks.some((block) => block.visible);
  const workspaceBrandName = brand.brandName.trim() || brand.selectedBrandIdentity.name;
  const workspaceDescription = brand.brandDescription.trim() || brand.businessDescription.trim();
  const platformUrl = "https://app.upklick.net/dashboard";
  const workspaceIdentity = {
    ...brand.selectedBrandIdentity,
    name: workspaceBrandName,
    tagline: brand.tagline,
    palette: brand.brandPalette,
  };
  const readySaasBrand = readySaas
    ? {
        ...readySaas.brand,
        name: workspaceBrandName,
        business: brand.business,
        tagline: brand.tagline,
        palette: brand.brandPalette,
        typography: brand.fontPersonality,
        logo: workspaceIdentity,
      }
    : undefined;
  const isLive = deploymentState === "success";
  const showReady = deploymentState === "success" || (isLive && !launching);
  const progressPercent = showReady
    ? 100
    : launching
      ? Math.max(12, Math.round((completedDeploymentSteps / text.steps.length) * 100))
      : 100;

  const previewStore = useMemo(
    () =>
      configureStore({
        reducer: { brand: brandReducer },
        preloadedState: { brand: { ...brand, device: "desktop" as Device } },
      }),
    [brand],
  );

  useEffect(() => {
    const viewport = miniSiteViewportRef.current;
    if (!viewport) return;
    const updatePreviewSize = () => {
      const scale = viewport.clientWidth / 1280;
      if (scale > 0 && viewport.clientHeight > 0) {
        setMiniSite({ scale, height: Math.ceil(viewport.clientHeight / scale) });
      }
    };
    updatePreviewSize();
    const observer = new ResizeObserver(updatePreviewSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const openDashboard = () => window.location.assign("/dashboard");

  const deployPlatform = async () => {
    if (deploymentState === "deploying") return;
    setDeploymentAttempted(true);
    setCompletedDeploymentSteps(0);
    setReadyItemCount(0);
    setSyncingGos(true);
    const deploymentUid = auth.currentUser?.uid;
    try {
      const result = await preparePhoenixConfiguration();
      const uid = auth.currentUser?.uid;
      if (!uid || uid !== result.phoenixUid) throw new Error("The signed-in account changed.");
      await requestGosPlatform("deploy", result.snapshotId);
      if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
      await setDoc(doc(db, "users", uid, "brandEngine", "gosDeployment"), {
        status: "prepared",
        revision: result.snapshotId,
        updatedAt: serverTimestamp(),
      });
      setGosReady(true);
    } catch (error) {
      if (auth.currentUser?.uid === deploymentUid) {
        dispatch(
          actions.setPhoenixPreparation({
            ...brand.phoenixPreparation,
            state: "failed",
            error: error instanceof Error ? error.message : "Could not deploy your platform.",
          }),
        );
      }
      return;
    } finally {
      setSyncingGos(false);
    }
    await signInToPlatform();
  };

  const signInToPlatform = async () => {
    if (platformSigningIn) return;
    setPlatformSigningIn(true);
    setPlatformSignInError("");
    try {
      await openGosPlatform();
    } catch (error) {
      setPlatformSignInError(error instanceof Error ? error.message : "Could not sign in to your platform.");
      setPlatformSigningIn(false);
    }
  };

  const openCustomerPortal = () => {
    if (!showReady) {
      void deployPlatform();
      return;
    }
    openPhoenixAccount(brand.phoenixPreparation.phoenixOrigin, brand.phoenixPreparation.phoenixUid);
  };

  const openPlatform = () => {
    if (!showReady) {
      void deployPlatform();
      return;
    }
    void signInToPlatform();
  };

  useEffect(() => {
    if (deploymentState === "idle") {
      setCompletedDeploymentSteps(0);
      return;
    }
    if (deploymentState === "failed" || completedDeploymentSteps >= confirmedSteps) return;
    if (reduceMotion) {
      setCompletedDeploymentSteps(confirmedSteps);
      return;
    }
    const timeout = window.setTimeout(() => {
      setCompletedDeploymentSteps((current) => Math.min(current + 1, confirmedSteps));
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [deploymentState, completedDeploymentSteps, confirmedSteps, reduceMotion]);

  useEffect(() => {
    if (deploymentAttempted && deploymentState === "failed") setOutcomeOpen(true);
  }, [deploymentAttempted, deploymentState]);

  useEffect(() => {
    if (!showReady || readyItemCount >= text.readyItems.length) return;
    const interval = window.setInterval(() => {
      setReadyItemCount((current) => {
        if (current >= text.readyItems.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 210);
    return () => window.clearInterval(interval);
  }, [readyItemCount, showReady, text.readyItems.length]);

  useEffect(() => {
    if (!showReady) setReadyItemCount(0);
  }, [showReady]);

  return (
    <section
      className={styles["page"]}
      aria-labelledby="deployment-title"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <motion.div
        className={styles["inner"]}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className={styles["scaleFrame"]}>
          <header className={styles["hero"]}>
            <div className={styles["heroTitle"]}>
              <span className={styles["stepBadge"]} aria-label={`Step ${number}`}>
                {number}
              </span>
              <div className={styles["heroCopy"]}>
                <p className={styles["eyebrow"]}>{text.eyebrow}</p>
                <div className={styles["titleLine"]}>
                  <h1 className={styles["heading"]} id="deployment-title">
                    {text.title}
                  </h1>
                </div>
                <p className={styles["intro"]}>{text.intro}</p>
              </div>
            </div>
            <span className={styles["centerTitle"]}>{text.centerTitle}</span>
          </header>

          {readySaas && readySaasBrand && (
            <ReadySaasDeploymentSummary item={readySaas.item} brand={readySaasBrand} ar={language === "ar"} />
          )}

          <div className={`${styles["deploymentGrid"]} grid grid-cols-1 lg:grid-cols-12 gap-5`}>
            {/* Left Column (7/12): Clean Step-by-Step Checklist + Integrated Launch Command Card */}
            <main className={`${styles["mainColumn"]} lg:col-span-7`}>
              <div className={styles["checklistHeader"]}>
                <div className={styles["checklistHeaderTop"]}>
                  <div className={styles["checklistTitleGroup"]}>
                    <span className={styles["checklistIcon"]} aria-hidden="true">
                      <ShieldCheck size={17} />
                    </span>
                    <div>
                      <h2>{text.checklistTitle}</h2>
                      <p>{text.checklistSub}</p>
                    </div>
                  </div>
                  <span className={styles["checklistCountPill"]} data-state={deploymentState}>
                    {showReady
                      ? `${text.steps.length} / ${text.steps.length} ${text.verified}`
                      : launching
                        ? `${completedDeploymentSteps} / ${text.steps.length} ${text.syncing}`
                        : language === "ar"
                          ? `${text.steps.length} وحدات جاهزة`
                          : `${text.steps.length} Checks Ready`}
                  </span>
                </div>
                <div className={styles["checklistMeter"]} aria-hidden="true">
                  <span
                    className={styles["checklistMeterFill"]}
                    data-state={deploymentState}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className={styles["checklistSpecs"]}>
                  <div className={styles["specItem"]}>
                    <small>{language === "ar" ? "البراند" : "Brand Identity"}</small>
                    <strong>{workspaceBrandName}</strong>
                  </div>
                  <div className={styles["specItem"]}>
                    <small>{language === "ar" ? "نظام الألوان" : "Theme System"}</small>
                    <strong>
                      {brand.theme === "dark"
                        ? language === "ar"
                          ? "داكن · WCAG"
                          : "Dark · WCAG AA"
                        : language === "ar"
                          ? "فاتح · WCAG"
                          : "Light · WCAG AA"}
                    </strong>
                  </div>
                  <div className={styles["specItem"]}>
                    <small>{language === "ar" ? "صفحة الموقع" : "Website Funnel"}</small>
                    <strong>
                      {hasPreview
                        ? language === "ar"
                          ? "جاهزة للمراجعة"
                          : "Ready to Review"
                        : language === "ar"
                          ? "مسودة"
                          : "Draft"}
                    </strong>
                  </div>
                  <div className={styles["specItem"]}>
                    <small>{language === "ar" ? "وجهة الحفظ" : "Cloud Target"}</small>
                    <strong>Joe Academy · Gose</strong>
                  </div>
                </div>
              </div>

              <ol className={styles["progress"]} aria-label={text.eyebrow}>
                {text.steps.map((step, index) => {
                  const itemState =
                    index < completedDeploymentSteps || showReady
                      ? "complete"
                      : index === completedDeploymentSteps && animatingSteps
                        ? "active"
                        : "ready";
                  return (
                    <motion.li
                      key={step}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: reduceMotion ? 0 : index * 0.03 }}
                      data-state={itemState}
                      aria-current={itemState === "active" ? "step" : undefined}
                    >
                      <span className={styles["progressDot"]}>
                        {itemState === "complete" ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <div className={styles["progressCopy"]}>
                        <strong>{step}</strong>
                        <small>{text.stepDetails[index]}</small>
                      </div>
                      <span className={styles["progressTag"]}>
                        {itemState === "complete"
                          ? text.verified
                          : itemState === "active"
                            ? text.syncing
                            : text.ready}
                      </span>
                    </motion.li>
                  );
                })}
              </ol>

              <div
                className={styles["launchCommandBar"]}
                data-state={deploymentState}
                aria-live="polite"
                aria-label={
                  deploymentState === "failed"
                    ? text.deploymentFailed
                    : showReady
                      ? text.liveTitle
                      : text.deployingTitle
                }
              >
                <div className={styles["telemetryPills"]} aria-hidden="true">
                  <span>
                    <ShieldCheck size={13} />
                    {language === "ar" ? "حماية سحابية متكاملة" : "Cloud Sync Verified"}
                  </span>
                  <span>
                    <Zap size={13} />
                    {language === "ar" ? "هوية البراند مرتبطة" : "Brand Identity Linked"}
                  </span>
                  <span>
                    <Globe size={13} />
                    {language === "ar" ? "بوابة المنصة جاهزة" : "Live Portal Ready"}
                  </span>
                </div>

                <div className={styles["launchCommandMain"]}>
                  <div className={styles["launchCommandInfo"]}>
                    <span className={styles["launchMedallion"]} data-state={deploymentState} aria-hidden="true">
                      {deploymentState === "failed" ? (
                        <CircleAlert size={20} />
                      ) : showReady ? (
                        <Check size={20} />
                      ) : (
                        <Rocket size={20} />
                      )}
                    </span>
                    <div className={styles["launchCommandCopy"]}>
                      <h2>
                        {deploymentState === "failed"
                          ? text.deploymentFailed
                          : showReady
                            ? text.liveTitle
                            : deploymentState === "idle"
                              ? text.startDeployment
                              : text.deployingTitle}
                      </h2>
                      <p>
                        {deploymentState === "failed"
                          ? text.deploymentFailedBody
                          : showReady
                            ? text.liveBody
                            : deploymentState === "idle"
                              ? language === "ar"
                                ? "كل الإعدادات مراجعة وجاهزة للنقل الفوري إلى حسابك."
                                : "All configuration modules are verified and ready to publish."
                              : text.deployingBody}
                      </p>
                      {deploymentState === "failed" && brand.phoenixPreparation.error && (
                        <p className={styles["errorAlert"]} role="alert">
                          {brand.phoenixPreparation.error}
                        </p>
                      )}
                      {platformSignInError && (
                        <p className={styles["errorAlert"]} role="alert">
                          {platformSignInError}
                        </p>
                      )}
                      {showReady && <p className={styles["liveArabic"]}>{text.liveBodyAr}</p>}
                      {!hasPreview && (
                        <span className={styles["unavailableHint"]} id="preview-unavailable">
                          {text.unavailable}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles["actionRow"]}>
                    {deploymentState !== "success" && (
                      <Button
                        variant="outline"
                        className={styles["reviewAction"]}
                        disabled={!hasPreview}
                        aria-label={text.reviewWebsite}
                        aria-describedby={!hasPreview ? "preview-unavailable" : undefined}
                        onClick={() => dispatch(actions.setMode("builder"))}
                      >
                        <ExternalLink aria-hidden="true" />
                        {text.reviewWebsite}
                      </Button>
                    )}
                    {deploymentState === "failed" && (
                      <a className={styles["supportAction"]} href="mailto:support@brandengine.ai">
                        {text.contactSupport}
                      </a>
                    )}
                    <Button
                      size="lg"
                      className={styles["primaryAction"]}
                      onClick={showReady ? openPlatform : deployPlatform}
                      disabled={deploymentState === "deploying" || platformSigningIn}
                      aria-label={
                        showReady ? text.open : deploymentState === "failed" ? text.retry : text.startDeployment
                      }
                    >
                      {showReady ? (
                        <ExternalLink />
                      ) : deploymentState === "failed" ? (
                        <CircleAlert />
                      ) : (
                        <Sparkles />
                      )}
                      {showReady
                        ? text.open
                        : deploymentState === "failed"
                          ? text.retry
                          : deploymentState === "deploying"
                            ? text.deployingTitle
                            : text.startDeployment}
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              </div>
            </main>

            {/* Right Column (5/12): Compact, Rich Workspace Summary Card */}
            <aside className={`${styles["workspaceCard"]} lg:col-span-5`}>
              <div className={styles["workspaceHeading"]}>
                <span className={styles["workspaceCrown"]} aria-hidden="true">
                  <Crown size={18} />
                </span>
                <div>
                  <h2>{text.workspace}</h2>
                  <p>{text.workspaceSub}</p>
                </div>
                <b>
                  <CircleCheck size={13} />
                  {showReady
                    ? text.live
                    : deploymentState === "failed"
                      ? text.deploymentFailed
                      : launching
                        ? text.syncing
                        : text.ready}
                </b>
              </div>

              <div className={styles["workspaceBody"]}>
                <div
                  role="link"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      dispatch(actions.setMode("builder"));
                    }
                  }}
                  className={styles["miniSite"]}
                  onClick={() => dispatch(actions.setMode("builder"))}
                  aria-label={`${text.reviewWebsite}: ${workspaceBrandName}`}
                >
                  <span className={styles["miniSiteChrome"]} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <small dir="ltr">app.upklick.net</small>
                  </span>
                  <span ref={miniSiteViewportRef} className={styles["miniSiteViewport"]} aria-hidden="true" inert>
                    <span
                      className={styles["miniSiteCanvas"]}
                      style={{ height: miniSite.height, transform: `scale(${miniSite.scale})` }}
                    >
                      <Provider store={previewStore}>
                        <LandingPreviewBridge />
                      </Provider>
                    </span>
                  </span>
                  <button
                    type="button"
                    className={styles["miniSiteAction"]}
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch(actions.setMode("builder"));
                    }}
                  >
                    <ExternalLink size={12} aria-hidden="true" />
                    {text.reviewWebsite}
                  </button>
                </div>

                <div className={styles["workspaceInfo"]}>
                  <div className={styles["workspaceBrand"]}>
                    <div className={styles["workspaceBrandMark"]} aria-hidden="true">
                      <DashboardBrandLogo
                        identity={workspaceIdentity}
                        url={selectedBrand.logoUrl}
                        generated={selectedBrand.generatedLogo}
                        primary={selectedBrand.primary}
                      />
                    </div>
                    <div className={styles["workspaceBrandText"]}>
                      <strong>{workspaceBrandName}</strong>
                      {workspaceDescription && <small title={workspaceDescription}>{workspaceDescription}</small>}
                    </div>
                  </div>

                  <button type="button" className={styles["workspaceLink"]} onClick={openPlatform}>
                    <span className={styles["workspaceLabel"]}>{text.platformUrl}</span>
                    <strong dir="ltr">{platformUrl}</strong>
                    <ExternalLink size={13} />
                  </button>

                  <button type="button" className={styles["workspaceLink"]} onClick={openDashboard}>
                    <span className={styles["workspaceLabel"]}>{text.admin}</span>
                    <span className={styles["workspaceAction"]}>
                      {text.openDashboard}
                      <ArrowRight size={12} />
                    </span>
                  </button>

                  <button type="button" className={styles["workspaceLink"]} onClick={openCustomerPortal}>
                    <span className={styles["workspaceLabel"]}>{text.portal}</span>
                    <span className={styles["workspaceAction"]}>
                      {text.openPortal}
                      <ArrowRight size={12} />
                    </span>
                  </button>

                  <div className={styles["workspaceMarketplace"]}>
                    <span className={styles["workspaceLabel"]}>{text.marketplace}</span>
                    <span className={styles["workspaceAction"]}>{text.ready}</span>
                  </div>
                </div>
              </div>

              <div className={styles["growthCard"]}>
                <span className={styles["growthIcon"]} aria-hidden="true">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <strong>{text.growthTitle}</strong>
                  <span>{text.growthSub}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </motion.div>

      <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <DialogContent className={styles["deploymentOutcome"]} dir={language === "ar" ? "rtl" : "ltr"}>
          <div className={styles["outcomeIcon"]} data-state={deploymentState}>
            {deploymentState === "success" ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          </div>
          <DialogTitle>{deploymentState === "success" ? text.liveTitle : text.deploymentFailed}</DialogTitle>
          <DialogDescription>
            {deploymentState === "success"
              ? text.liveBody
              : brand.phoenixPreparation.error || text.deploymentFailedBody}
          </DialogDescription>
          <p className={styles["outcomeStage"]}>
            {language === "ar" ? "حالة الإرسال" : "Transfer status"}:{" "}
            {deploymentState === "success"
              ? `${text.steps.length}/${text.steps.length}`
              : `${completedDeploymentSteps}/${text.steps.length}`}
          </p>
          <div className={styles["outcomeActions"]}>
            {deploymentState === "failed" && (
              <Button
                variant="outline"
                onClick={() => {
                  setOutcomeOpen(false);
                  void deployPlatform();
                }}
              >
                {text.retry}
              </Button>
            )}
            <Button
              onClick={() => {
                setOutcomeOpen(false);
                if (deploymentState === "success") openPlatform();
                else openDashboard();
              }}
            >
              {deploymentState === "success" ? text.open : text.dashboard}
              <ArrowRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
