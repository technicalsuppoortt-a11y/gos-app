import { openPhoenixAccount } from "@/modules/brand-engine/services/phoenixTransfer";
import { openGosPlatform, requestGosPlatform } from '@/services/gosPlatform';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { preparePhoenixConfiguration } from "@/modules/brand-engine/services/brandDraft";
import { fingerprintBrandPages } from "@/modules/brand-engine/data/brandPages";
import { confirmedDeploymentSteps } from "@/modules/brand-engine/data/deploymentProgress";
import { useEffect, useMemo, useRef, useState } from "react";
import { configureStore } from "@reduxjs/toolkit";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  CircleCheck,
  CircleAlert,
  ExternalLink,
  Crown,
} from 'lucide-react';
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
    eyebrow: "FINAL STEP. A BIGGER FUTURE.",
    title: "From idea to a platform ready in minutes",
    centerTitle: "AI Deployment Center",
    intro: "Save your brand, logo, pages and settings in Joe Academy before publishing.",
    introAr: "Your website can be published after Joe Academy receives the configuration.",
    liveTitle: "Your brand and platform are ready",
    liveBody: "Your brand, pages and settings are saved in Gose. Open your platform from Phoenix.",
    liveBodyAr: "تم إنشاء حساب منصتك وحفظ اختياراتك في Gose.",
    open: "Open your platform",
    reviewWebsite: "Review Website",
    startDeployment: "Start Deployment",
    dashboard: "Go to Dashboard",
    experience: "Preview configuration",
    openDashboard: "Open Dashboard",
    openPortal: "Open Customer Portal",
    openAiCenter: "Open AI Center",
    complete: "Completed",
    completedNow: "Just completed",
    systemsReady: "Configuration received",
    review: "Review configuration",
    preview: "Preview",
    draft: "Draft",
    live: "Prepared",
    draftHelper: "This preview shows your current draft.",
    liveHelper: "This preview shows the configuration prepared for Joe Academy.",
    desktop: "Desktop",
    tablet: "Tablet",
    mobile: "Mobile",
    closePreview: "Close preview",
    unavailable: "A generated landing page is required before it can be reviewed.",
    step: "Step 13 of 13",
    finalStep: "Final step completed",
    back: "Back",
    continue: "Continue",
    workspace: "Workspace Summary",
    workspaceSub: "Your business workspace",
    platformUrl: "Platform URL",
    admin: "Admin Dashboard",
    portal: "Customer Portal",
    aiCenter: "AI Center",
    marketplace: "Marketplace",
    ready: "Ready",
    growthTitle: "Your Gose platform is ready",
    growthSub: "Open your platform from Phoenix with the same account.",
    aiWorking: "AI is working...",
    deployingTitle: "Sending your saved configuration…",
    deployingBody: "Saving your choices and preparing Gose. You will return to Phoenix when deployment completes.",
    deploymentFailed: "Configuration transfer failed",
    deploymentFailedBody: "Please check the error and retry. Your draft remains in Joe Academy.",
    retry: "Retry transfer",
    contactSupport: "Contact Support",
    workingItems: [
      "Configuring your platform...",
      "Setting up integrations...",
      "Optimizing performance...",
      "Preparing your workspace...",
    ],
    workingCaptions: [
      "Applying your brand, pages, and chosen modules",
      "Connecting your selected tools and automations",
      "Checking speed, security, and launch readiness",
      "Creating your dashboard, portal, and AI workspace",
    ],
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
  },
  ar: {
    eyebrow: "الخطوة الأخيرة. مستقبل أكبر.",
    title: "من الفكرة إلى منصة جاهزة خلال دقائق",
    centerTitle: "مركز النشر بالذكاء الاصطناعي",
    intro: "احفظ البراند واللوجو والصفحات والاختيارات في Joe Academy قبل نشر الموقع.",
    introAr: "كل ما تحتاجه من أجل انطلاقة أكثر ذكاءً وسرعة.",
    liveTitle: "تم إنشاء البراند ومنصتك جاهزة",
    liveBody: "تم حفظ هويتك وصفحاتك وإعداداتك في حساب Gose. افتح منصتك من لوحة Phoenix.",
    liveBodyAr: "تم إنشاء حساب منصتك وحفظ اختياراتك في Gose.",
    open: "الدخول إلى المنصة",
    reviewWebsite: "مراجعة الموقع",
    startDeployment: "بدء النشر",
    dashboard: "اذهب إلى لوحة التحكم",
    experience: "معاينة الإعدادات",
    openDashboard: "فتح لوحة التحكم",
    openPortal: "فتح بوابة العملاء",
    openAiCenter: "فتح مركز الذكاء الاصطناعي",
    complete: "مكتمل",
    completedNow: "اكتمل الآن",
    systemsReady: "تم استلام الإعدادات",
    review: "مراجعة الإعدادات",
    preview: "معاينة",
    draft: "مسودة",
    live: "مجهّز",
    draftHelper: "تعرض هذه المعاينة مسودتك الحالية.",
    liveHelper: "تعرض المعاينة الإعدادات التي تم تجهيزها لـJoe Academy.",
    desktop: "سطح المكتب",
    tablet: "الجهاز اللوحي",
    mobile: "الهاتف",
    closePreview: "إغلاق المعاينة",
    unavailable: "يلزم إنشاء صفحة هبوط قبل مراجعتها.",
    step: "الخطوة 13 من 13",
    finalStep: "اكتملت الخطوة الأخيرة",
    back: "رجوع",
    continue: "متابعة",
    workspace: "ملخص مساحة العمل",
    workspaceSub: "مساحة عمل علامتك التجارية",
    platformUrl: "رابط المنصة",
    admin: "لوحة الإدارة",
    portal: "بوابة العملاء",
    aiCenter: "مركز الذكاء الاصطناعي",
    marketplace: "المتجر",
    ready: "جاهز",
    growthTitle: "منصتك جاهزة في Gose",
    growthSub: "افتح منصتك من لوحة Phoenix بنفس الحساب.",
    aiWorking: "الذكاء الاصطناعي يعمل...",
    deployingTitle: "جارٍ إرسال إعداداتك إلى Joe Academy…",
    deployingBody: "نحفظ اختياراتك ونجهّز حساب Gose. ستعود إلى Phoenix بعد اكتمال الإطلاق.",
    deploymentFailed: "تعذّر إرسال الإعدادات",
    deploymentFailedBody: "راجع السبب وأعد المحاولة. مسودتك تظل محفوظة في Joe Academy.",
    retry: "إعادة محاولة الإرسال",
    contactSupport: "التواصل مع الدعم",
    workingItems: ["يجهز منصتك...", "يربط التكاملات...", "يحسن الأداء...", "يجهز مساحة عملك..."],
    workingCaptions: ["يطبّق الهوية والصفحات والوحدات المختارة", "يربط الأدوات والأتمتة التي اخترتها", "يفحص السرعة والأمان وجاهزية الإطلاق", "ينشئ لوحة التحكم والبوابة ومساحة الذكاء"],
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
  },
} as const;

type DeploymentState = "idle" | "deploying" | "success" | "failed";

export function PlatformDeployment({ number = "11" }: { number?: string }) {
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
  const [platformSignInError, setPlatformSignInError] = useState('');
  const [platformSigningIn, setPlatformSigningIn] = useState(false);
  const fingerprint = fingerprintBrandPages(brand);
  const deploymentState: DeploymentState = syncingGos || brand.phoenixPreparation.state === "transferring" ? "deploying" :
    gosReady && brand.phoenixPreparation.state === "prepared" && brand.phoenixPreparation.fingerprint === fingerprint ? "success" :
    brand.phoenixPreparation.state === "failed" ? "failed" : "idle";
  const launching = deploymentState === "deploying";
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let active = true;
    void getDoc(doc(db, 'users', uid, 'brandEngine', 'gosDeployment')).then(snapshot => {
      if (active && auth.currentUser?.uid === uid) setGosReady(snapshot.data()?.status === 'prepared' && snapshot.data()?.revision === brand.phoenixPreparation.snapshotId);
    }).catch(() => { if (active) setGosReady(false); });
    return () => { active = false; };
  }, [brand.phoenixPreparation.snapshotId]);
  const [completedDeploymentSteps, setCompletedDeploymentSteps] = useState(() =>
    deploymentState === "success" ? text.steps.length : 0,
  );
  // Animate only as far as the confirmed transfer progress allows. The last
  // step remains active until Joe Academy confirms a successful save.
  const transferProgress = brand.phoenixPreparation.progress ?? 0;
  const confirmedSteps = confirmedDeploymentSteps(deploymentState, transferProgress, text.steps.length);
  const animatingSteps = deploymentState === "deploying" ||
    (deploymentState === "success" && completedDeploymentSteps < text.steps.length);
  const activeWorkItem = Math.min(text.workingItems.length - 1,
    Math.floor(completedDeploymentSteps / 2));
  const [readyItemCount, setReadyItemCount] = useState(() =>
    deploymentState === "success" ? text.readyItems.length : 0,
  );
  const hasPreview = Boolean(readySaas) || brand.builderBlocks.some((block) => block.visible);
  const workspaceBrandName = brand.brandName.trim() || brand.selectedBrandIdentity.name;
  const workspaceDescription = brand.brandDescription.trim() || brand.businessDescription.trim();
  const platformUrl = "https://gos-app-3c7fb.web.app/dashboard";
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
  const showWorking = deploymentState === "deploying";
  const showReady = deploymentState === "success" || (isLive && !launching);
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
//   const openAICenter = () => {
//     dispatch(actions.setMode("wizard"));
//     dispatch(actions.setStep(8));
//   };
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
      if (!uid || uid !== result.phoenixUid) throw new Error('The signed-in account changed.');
      await requestGosPlatform('deploy', result.snapshotId);
      if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
      await setDoc(doc(db, 'users', uid, 'brandEngine', 'gosDeployment'), { status: 'prepared', revision: result.snapshotId, updatedAt: serverTimestamp() });
      setGosReady(true);
    } catch (error) {
      if (auth.currentUser?.uid === deploymentUid) dispatch(actions.setPhoenixPreparation({ ...brand.phoenixPreparation, state: 'failed', error: error instanceof Error ? error.message : 'Could not deploy your platform.' }));
      return;
    } finally {
      setSyncingGos(false);
    }
    await signInToPlatform();
  };
  const signInToPlatform = async () => {
    if (platformSigningIn) return;
    setPlatformSigningIn(true);
    setPlatformSignInError('');
    try {
      await openGosPlatform();
    } catch (error) {
      setPlatformSignInError(error instanceof Error ? error.message : 'Could not sign in to your platform.');
      setPlatformSigningIn(false);
    }
  };
  const openCustomerPortal = () => {
    if (!showReady) { deployPlatform(); return; }
    openPhoenixAccount(brand.phoenixPreparation.phoenixOrigin, brand.phoenixPreparation.phoenixUid);
  };

  const openPlatform = () => {
    if (!showReady) { deployPlatform(); return; }
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
    // Replay skipped checkpoints one by one when several updates arrive together.
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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className={styles["scaleFrame"]}>
          <header className={styles["hero"]}>
          <div className={styles["heroTitle"]}>
            <span className={styles["stepBadge"]} aria-label={`Step ${number}`}>
              {number}
            </span>
            <div>
              <p className={styles["eyebrow"]}>{text.eyebrow}</p>
              <div className={styles["titleLine"]}>
                <h1 className={styles["heading"]} id="deployment-title">
                  {text.title}
                </h1>
                <p className={styles["centerTitle"]}>{text.centerTitle}</p>
              </div>
              <div className={styles["introLine"]}>
                <p className={styles["intro"]}>{text.intro}</p>
              </div>
            </div>
          </div>
        </header>

        {readySaas && readySaasBrand && <ReadySaasDeploymentSummary item={readySaas.item} brand={readySaasBrand} ar={language === "ar"} />}
        <div className={styles["deploymentGrid"]}>
          <main className={styles["mainColumn"]}>
            <ol className={styles["progress"]} aria-label={text.eyebrow}>
              {text.steps.map((step, index) => (
                <motion.li
                  key={step}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: reduceMotion ? 0 : index * 0.05 }}
                  data-state={index < completedDeploymentSteps ? "complete" : index === completedDeploymentSteps && animatingSteps ? "active" : "pending"}
                  aria-current={index === completedDeploymentSteps && animatingSteps ? "step" : undefined}
                >
                  <span className={styles["progressDot"]}>
                    {index < completedDeploymentSteps ? <Check aria-hidden="true" /> : index + 1}
                  </span>
                  <span>{step}</span>
                </motion.li>
              ))}
            </ol>

            <div className={styles["launchStage"]}>
              <aside
                className={styles["workingCard"]}
                data-state={showWorking ? "active" : "complete"}
                aria-live="polite"
              >
                <div className={styles["statusCardTitle"]}>
                  <span className={styles["statusOrb"]} aria-hidden="true" />
                  <strong>{deploymentState === "idle" ? text.startDeployment : text.aiWorking}</strong>
                </div>
                {text.workingItems.map((item, index) => (
                  <p key={item} data-active={showWorking && activeWorkItem === index} data-complete={showReady || (showWorking && index < activeWorkItem)}>
                    <span className={styles["statusCheck"]} aria-hidden="true" />
                    <span>{item}<small>{text.workingCaptions[index]}</small></span>
                  </p>
                ))}
              </aside>
              <div className={styles["celebration"]} data-state={deploymentState} aria-live="polite" aria-label={deploymentState === "failed" ? text.deploymentFailed : showReady ? text.liveTitle : text.deployingTitle}>
                <div className={styles["rings"]} aria-hidden="true">
                  <span className={styles["ring"]} />
                  <span className={styles["launchConfetti"]}>
                    {Array.from({ length: 12 }, (_, index) => (
                      <i key={index} />
                    ))}
                  </span>
                  <span className={styles["launchCloud"]} aria-hidden="true" />
                  <span className={styles["rocketWrap"]}>
                    <img src="/deployment/live-rocket.png" alt="" />
                  </span>
                </div>
                <h2>
                  {deploymentState === "failed" ? text.deploymentFailed : showReady ? <>{text.liveTitle} <span aria-hidden="true">🎉</span></> : deploymentState === "idle" ? text.startDeployment : text.deployingTitle}
                </h2>
                <p>{deploymentState === "failed" ? text.deploymentFailedBody : showReady ? text.liveBody : deploymentState === "idle" ? text.intro : text.deployingBody}</p>
                {deploymentState === "failed" && <p role="alert">{brand.phoenixPreparation.error}</p>}
                {platformSignInError && <p role="alert">{platformSignInError}</p>}
                {showReady && <p className={styles["liveArabic"]}>{text.liveBodyAr}</p>}
                <div className={styles["actionRow"]}>
                  <Button
                    size="lg"
                    className={styles["primaryAction"]}
                    onClick={showReady ? openPlatform : deployPlatform}
                    disabled={deploymentState === "deploying" || platformSigningIn}
                    aria-label={showReady ? text.open : deploymentState === "failed" ? text.retry : text.startDeployment}
                  >
                    {showReady ? <ExternalLink /> : deploymentState === "failed" ? <CircleAlert /> : <Sparkles />}
                    {showReady ? text.open : deploymentState === "failed" ? text.retry : deploymentState === "deploying" ? text.deployingTitle : text.startDeployment}
                    <ArrowRight />
                  </Button>
                  {deploymentState === "failed" && <a className={styles["supportAction"]} href="mailto:support@brandengine.ai">{text.contactSupport}</a>}
                  {deploymentState !== "success" && (
                    <Button
                      variant="outline"
                      className={styles["reviewAction"]}
                      disabled={!hasPreview}
                      aria-label={text.reviewWebsite}
                      aria-describedby={!hasPreview ? "preview-unavailable" : undefined}
                      onClick={() => dispatch(actions.setMode("builder"))}
                    >
                      <Sparkles aria-hidden="true" />
                      {text.reviewWebsite}
                    </Button>
                  )}
                </div>
              </div>
              <aside
                className={styles["readyCard"]}
                data-state={showReady ? "active" : "waiting"}
                aria-live="polite"
              >
                <div className={styles["statusCardTitle"]}>
                  <span className={styles["readyOrb"]} aria-hidden="true" />
                  <strong>{showReady ? text.systemsReady : deploymentState === "failed" ? text.deploymentFailed : text.ready}</strong>
                </div>
                {text.readyItems.map((item, index) => (
                  <p key={item} data-ready={index < readyItemCount}>
                    <span className={styles["statusCheck"]} aria-hidden="true" />
                    {item}
                  </p>
                ))}
              </aside>
            </div>
            {!hasPreview && (
              <span className={styles["unavailableHint"]} id="preview-unavailable">
                {text.unavailable}
              </span>
            )}
          </main>

          <aside className={styles["workspaceCard"]}>
            <div className={styles["workspaceHeading"]}>
              <span>
                <Crown />
              </span>
              <div>
                <h2>{text.workspace}</h2>
                <p>{text.workspaceSub}</p>
              </div>
              <b>
                <CircleCheck />
                {text.live}
              </b>
            </div>
            <div className={styles["workspaceBody"]}>
              <div
                role="link"
                tabIndex={0}
                onKeyDown={event => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    dispatch(actions.setMode("builder"));
                  }
                }}
                className={styles["miniSite"]}
                onClick={() => dispatch(actions.setMode("builder"))}
                aria-label={`${text.reviewWebsite}: ${workspaceBrandName}`}
              >
                <span ref={miniSiteViewportRef} className={styles["miniSiteViewport"]} aria-hidden="true" inert>
                  <span className={styles["miniSiteCanvas"]} style={{ height: miniSite.height, transform: `scale(${miniSite.scale})` }}>
                    <Provider store={previewStore}>
                      <LandingPreviewBridge />
                    </Provider>
                  </span>
                </span>
                <button
                  type="button"
                  className={styles["miniSiteAction"]}
                  onClick={event => {
                    event.stopPropagation();
                    dispatch(actions.setMode("builder"));
                  }}
                >
                  <ExternalLink aria-hidden="true" />
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
                  <div>
                    <strong>{workspaceBrandName}</strong>
                    {/*<small>{brand.tagline}</small>*/}
                    {workspaceDescription && <small title={workspaceDescription}>{workspaceDescription}</small>}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles["workspaceLink"]}
                  onClick={openPlatform}
                >
                  <span className={styles["workspaceLabel"]}>{text.platformUrl}</span>
                  <strong>{platformUrl}</strong>
                  <ExternalLink />
                </button>
                <button type="button" className={styles["workspaceLink"]} onClick={openDashboard}>
                  <span className={styles["workspaceLabel"]}>{text.admin}</span>
                  <span className={styles["workspaceAction"]}>
                    {text.openDashboard}
                    <ArrowRight />
                  </span>
                </button>
                <button
                  type="button"
                  className={styles["workspaceLink"]}
                  onClick={openCustomerPortal}
                >
                  <span className={styles["workspaceLabel"]}>{text.portal}</span>
                  <span className={styles["workspaceAction"]}>
                    {text.openPortal}
                    <ArrowRight />
                  </span>
                </button>
                {/* <button type="button" className={styles["workspaceLink"]} onClick={openAICenter}>
                  <span className={styles["workspaceLabel"]}>{text.aiCenter}</span>
                  <span className={styles["workspaceAction"]}>
                    {text.openAiCenter}
                    <ArrowRight />
                  </span>
                </button> */}
                <div className={styles["workspaceMarketplace"]}>
                  <span className={styles["workspaceLabel"]}>{text.marketplace}</span>
                  <span className={styles["workspaceAction"]}>{text.ready}</span>
                </div>
              </div>
            </div>
            <div className={styles["growthCard"]}>
              <span className={styles["growthIcon"]} aria-hidden="true">
                <i />
                <i />
                <i />
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
          <DialogDescription>{deploymentState === "success" ? text.liveBody : brand.phoenixPreparation.error || text.deploymentFailedBody}</DialogDescription>
          <p className={styles["outcomeStage"]}>{language === "ar" ? "حالة الإرسال" : "Transfer status"}: {deploymentState === "success" ? `${text.steps.length}/${text.steps.length}` : `${completedDeploymentSteps}/${text.steps.length}`}</p>
          <div className={styles["outcomeActions"]}>
            {deploymentState === "failed" && <Button variant="outline" onClick={() => { setOutcomeOpen(false); deployPlatform(); }}>{text.retry}</Button>}
            <Button onClick={() => { setOutcomeOpen(false); if (deploymentState === "success") openPlatform(); else openDashboard(); }}>
              {deploymentState === "success" ? text.open : text.dashboard}<ArrowRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <footer className={styles["footer"]}>
        <span className={styles["stepCount"]}>{text.step}</span>
        <div className={styles["footerActions"]}>
          <Button variant="outline" onClick={() => dispatch(actions.previousStep())}>
            <ArrowLeft />
            {text.back}
          </Button>
          <Button disabled aria-disabled="true" title={text.finalStep}>
            {text.continue}
            <ArrowRight />
          </Button>
        </div>
        <span className={styles["footerHint"]}>{text.finalStep}</span>
      </footer>
    </section>
  );
}
