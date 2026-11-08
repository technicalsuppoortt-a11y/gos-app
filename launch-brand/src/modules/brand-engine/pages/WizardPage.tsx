import { lazy, Suspense, useState, useRef, useCallback } from "react";
import JoeAcademyLoader from "../../../components/ui/JoeAcademyLoader";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Rocket,
} from 'lucide-react';
import { Button } from "@/modules/brand-engine/components/ui/button";
import { getWizardStepId, steps, wizardOrder } from "@/modules/brand-engine/data/mockData";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { translations } from "@/modules/brand-engine/locales/translations";
import { ArchitectureDialog } from "@/modules/brand-engine/components/brandengine/ArchitectureDialog";
import type { StudioResetAction, StudioSaveAction } from "@/modules/brand-engine/components/brandengine/BrandingStudio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/brand-engine/components/ui/alert-dialog";
// import { ModuleMarketplace } from "@/modules/brand-engine/components/brandengine/ModuleMarketplace";
// import { MarketingStrategy } from "@/modules/brand-engine/components/brandengine/MarketingStrategy";
// import { ContentPlanner } from "@/modules/brand-engine/components/brandengine/ContentPlanner";
// import { AICenter } from "@/modules/brand-engine/components/brandengine/AICenter";
import { BusinessDiscoveryStep } from "@/modules/brand-engine/components/brandengine/BusinessDiscoveryStep";
import "@/modules/brand-engine/components/brandengine/WizardNavigationColors.css";
import { getDiscoverySelection } from "@/modules/brand-engine/data/discovery";
// import {
//   RocketIllustration,
//   PaletteIllustration,
//   BuilderIllustration,
//   BotIllustration,
//   MegaphoneIllustration,
// } from "@/modules/brand-engine/components/brandengine/JourneyIllustrations";
import type { AppDispatch, RootState } from "@/modules/brand-engine/store";
import { store } from "@/modules/brand-engine/store";

const BrandingStudio = lazy(() => import("../components/brandengine/BrandingStudio").then(module => ({ default: module.BrandingStudio })));
const PlatformDeployment = lazy(() => import("../components/brandengine/PlatformDeployment").then(module => ({ default: module.PlatformDeployment })));


// let initialBootDelayed = false;
//
//
// function AnimatedCounter({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
//   const [val, setVal] = useState(0);
//
//   useEffect(() => {
//     const controls = animate(0, to, {
//       duration: 2.5,
//       ease: [0.22, 1, 0.36, 1],
//       onUpdate(value) {
//         setVal(value);
//       },
//     });
//     return () => controls.stop();
//   }, [to]);
//
//   return <span>{prefix}{val.toFixed(decimals)}{suffix}</span>;
// }
//
// function OrbitHero({ words, coreText }: { words: string[], coreText: string }) {
//   return (
//     <div className="relative w-full max-w-[360px] sm:max-w-[460px] h-[200px] sm:h-[240px] mx-auto mb-8 flex items-center justify-center">
//       <div className="absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] flex items-center justify-center pointer-events-none" style={{ perspective: "1000px" }}>
//        
//         {/* Radial Aura */}
//         <div className="absolute w-[200px] h-[200px] blur-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent rounded-full" />
//        
//         {/* Core Typography */}
//         <h2 className="relative z-20 text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] text-center mt-[-10px]">
//           {coreText}
//         </h2>
//
//         {/* 3D Orbit System */}
//         <div 
//           className="absolute inset-0 flex items-center justify-center pointer-events-none"
//           style={{ transformStyle: "preserve-3d", transform: "rotateX(65deg)" }}
//         >
//            {/* Rings */}
//            <div className="absolute w-[90%] h-[90%] border-2 border-dashed border-sa-primary/30 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
//            <div className="absolute w-[65%] h-[65%] border border-sa-primary/20 rounded-full" />
//
//            {/* Orbiting Nodes */}
//            <motion.div
//              animate={{ rotateZ: 360 }}
//              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
//              className="absolute inset-0"
//              style={{ transformStyle: "preserve-3d" }}
//            >
//              {words.map((word, i) => {
//                const angle = (360 / words.length) * i;
//                return (
//                  <div
//                    key={i}
//                    className="absolute top-[5%] left-1/2 -ms-[100px] w-[200px] h-[45%] flex justify-center origin-bottom pointer-events-auto"
//                    style={{ transform: `rotateZ(${angle}deg)`, transformStyle: "preserve-3d" }}
//                  >
//                    <motion.div
//                      animate={{ rotateZ: -360 }}
//                      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
//                      style={{ transformStyle: "preserve-3d" }}
//                      className="mt-[-16px]"
//                    >
//                      <div 
//                        style={{ transform: `rotateZ(${-angle}deg) rotateX(-65deg)` }}
//                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-sa-bg/80 border border-sa-primary/30 text-sa-text-primary font-semibold text-sm shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl hover:scale-110 hover:border-emerald-400 transition-all duration-300 whitespace-nowrap"
//                      >
//                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
//                        {word}
//                      </div>
//                    </motion.div>
//                  </div>
//                );
//              })}
//            </motion.div>
//         </div>
//       </div>
//     </div>
//   );
// }
//
export function WizardPage() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.brand);
  const [architecture, setArchitecture] = useState<number | null>(null);
  const studioSaveAction = useRef<StudioSaveAction | null>(null);
  const studioResetAction = useRef<StudioResetAction | null>(null);
  const [studioResetDisabled, setStudioResetDisabled] = useState(true);
  const savingRef = useRef(false);
  const [studioSaveDisabled, setStudioSaveDisabled] = useState(true);
  const [studioSaving, setStudioSaving] = useState(false);
  const onStudioSaveActionChange = useCallback((action: StudioSaveAction | null) => {
    studioSaveAction.current = action;
    setStudioSaveDisabled(!action || action.disabled);
  }, []);
  const onStudioResetActionChange = useCallback((action: StudioResetAction | null) => {
    studioResetAction.current = action;
    setStudioResetDisabled(!action || action.disabled);
  }, []);
  const saveAndContinue = async () => {
    const action = studioSaveAction.current;
    if (!action || action.disabled || savingRef.current) return;
    const uid = store.getState().brand.userProfile?.uid;
    savingRef.current = true;
    setStudioSaving(true);
    try {
      const saved = await action.run();
      const latest = store.getState().brand;
      if (saved && getWizardStepId(latest.activeStep) === 14 && latest.userProfile?.uid === uid) {
        dispatch(actions.nextStep());
        dispatch(actions.completeStep(5));
        dispatch(actions.setMode("dashboard"));
      }
    } finally {
      savingRef.current = false;
      setStudioSaving(false);
    }
  };
  const deploymentInProgress = state.phoenixPreparation.state === "transferring";
  const activeStep = getWizardStepId(state.activeStep);
  const current = steps.find((s) => s.id === activeStep);
  const index = wizardOrder.indexOf(activeStep);
  const isRtl = state.language === "ar";
  const t = translations[state.language];

//   useEffect(() => {
//     if (!initialBootDelayed) {
//       const timer = setTimeout(() => {
//         initialBootDelayed = true;
//       }, 3100);
//       return () => clearTimeout(timer);
//     }
//   }, []);
//
  if (!current) return null;
  return (
    <div className={`wizard ${state.activeStep === 1 ? "vision-mode" : ""} ${activeStep === 14 ? "wizard--brand-studio" : ""} ${activeStep === 18 ? "wizard--deployment" : ""} ${activeStep === 4 ? "wizard--website" : ""}`}>
      {deploymentInProgress && <button type="button" className="deployment-status-pill" onClick={() => dispatch(actions.setStep(18))} aria-live="polite">
        <Rocket aria-hidden="true" />
        {isRtl ? "جارٍ إرسال إعداداتك إلى Joe Academy" : "Sending your configuration to Joe Academy"}
      </button>}
      {(activeStep === 14 || activeStep === 18) && (
        <section className="studio-page-frame" style={{ display: activeStep === 14 ? undefined : "none" }}>
          <Suspense fallback={activeStep === 14 ? <JoeAcademyLoader /> : null}>
            <BrandingStudio onSaveActionChange={onStudioSaveActionChange} onResetActionChange={onStudioResetActionChange} />
          </Suspense>
        </section>
      )}
      {activeStep !== 14 && (
        <AnimatePresence mode="sync">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<JoeAcademyLoader />}>
              {renderStep(activeStep, index + 1, state, dispatch, onStudioSaveActionChange)}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      )}
      {state.activeStep !== 1 && state.activeStep !== 13 && (
        <div className="wizard-footer">
          <div className="step-caption">
            {t.step} {index + 1} {t.of} {wizardOrder.length}
          </div>
          <div className="architecture-links flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-sa-text-disabled uppercase tracking-wider">
              {Math.round(((index + 1) / wizardOrder.length) * 100)}% {t.completed}
            </span>
            <div className="h-2 w-48 sm:w-64 bg-slate-100 dark:bg-sa-surface-sunken rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#0fa978] to-[#078a63] text-sa-text-primary border-0 h-full transition-all duration-500 ease-out"
                style={{ width: `${((index + 1) / wizardOrder.length) * 100}%` }}
              />
            </div>
          </div>
          <div className={`wizard-actions flex ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            {activeStep === 14 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="studio-reset" disabled={studioResetDisabled}>
                    <RotateCcw />
                    {isRtl ? "إعادة ضبط" : "Reset"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isRtl ? "إعادة ضبط اختيارات البراند؟" : "Reset your brand choices?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isRtl
                        ? "هل أنت متأكد؟ سيتم إرجاع اختيارات البراند للوضع الافتراضي ومسح الهويات المقترحة واختيار اللوجو الحالي والمفضلة، لتتمكن من الاختيار من جديد."
                        : "Are you sure? This will restore the default brand choices and clear generated directions, your current logo selection, and favorites so you can choose again."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{isRtl ? "لا، إلغاء" : "No, cancel"}</AlertDialogCancel>
                    <AlertDialogAction
                      className="studio-reset-confirm"
                      disabled={studioResetDisabled}
                      onClick={() => studioResetAction.current?.run()}
                    >
                      <RotateCcw />
                      {isRtl ? "نعم، إعادة ضبط" : "Yes, reset"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              onClick={() => activeStep === 18 ? dispatch(actions.setStep(14)) : dispatch(actions.previousStep())}
              disabled={index === 0 || (activeStep === 14 && studioSaving)}
            >
              {isRtl ? (
                <>
                  {t.back}
                  <ArrowLeft />
                </>
              ) : (
                <>
                  <ArrowLeft />
                  {t.back}
                </>
              )}
            </Button>
            <Button
              onClick={() => activeStep === 14 ? void saveAndContinue() : dispatch(actions.nextStep())}
              disabled={index === wizardOrder.length - 1 || (activeStep === 14 && (studioSaveDisabled || studioSaving)) || (state.activeStep === 13 && !getDiscoverySelection(state.pageParameters["business_discovery"]?.["nicheSelection"]))}
              title={state.activeStep === 13 && !getDiscoverySelection(state.pageParameters["business_discovery"]?.["nicheSelection"]) ? (isRtl ? "اختار المجال والتخصص الفرعي أولًا" : "Select your niche and specialization first") : undefined}
            >
              {isRtl ? (
                <>
                  <ArrowRight />
                  {activeStep === 14 ? (studioSaving ? "جارٍ الحفظ…" : "احفظ وتابع") : t.next}
                </>
              ) : (
                <>
                  {activeStep === 14 ? (studioSaving ? "Saving…" : "Save & Continue") : t.next}
                  <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      {architecture && (
        <ArchitectureDialog id={architecture} onClose={() => setArchitecture(null)} />
      )}
    </div>
  );
}
function renderStep(
  id: number,
  displayIndex: number,
  s: RootState["brand"],
  _dispatch: AppDispatch,
  _onStudioSaveActionChange: (action: StudioSaveAction | null) => void,
) {
  const ar = s.language === "ar";
  const title = (n: number) => {
    const x = steps.find((v) => v.id === n);
    return (ar ? x?.titleAr : x?.title) ?? "Joe Academy";
  };
  const number = String(displayIndex).padStart(2, "0");
//   const bootDelay = initialBootDelayed ? 0.2 : 3.2;

//   if (id === 1)
//     return (
//       <section className="relative overflow-hidden flex flex-col justify-center" style={{ background: "var(--navy)", minHeight: "100vh" }}>
//         {/* Ambient background glows */}
//         <motion.div className="absolute top-[-100px] left-[-60px] w-[480px] h-[480px] rounded-full pointer-events-none"
//           style={{ background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)" }}
//           animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
//           transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
//         <motion.div className="absolute bottom-[-60px] right-[8%] w-[380px] h-[380px] rounded-full pointer-events-none"
//           style={{ background: "radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)" }}
//           animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.8, 0.4] }}
//           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
//         {/* Fine dot grid */}
//         <div className="absolute inset-0 pointer-events-none" style={{
//           backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
//           backgroundSize: "28px 28px"
//         }} />
//
//         {/* Two-column grid */}
//         <div className={`relative z-10 grid lg:grid-cols-2 items-center gap-0 w-full max-w-7xl mx-auto ${ar ? "direction-rtl" : ""}`} style={{ minHeight: "100vh" }}>
//
//           {/* LEFT: Copy */}
//           <div className={`flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 ${ar ? "items-end text-end" : "items-start text-start"}`}>
//             {/* Live badge */}
//             <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
//               className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
//               style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.28)" }}>
//               <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400"
//                 animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
//               <span className="text-sa-primary text-[11px] font-bold uppercase tracking-widest">
//                 {ar ? "منصة الأعمال الذكية" : "AI Business Platform"}
//               </span>
//             </motion.div>
//
//             {/* Headline */}
//             <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
//               className="font-black leading-[1.06] tracking-tight mb-4 text-sa-text-primary"
//               style={{ fontSize: "clamp(34px, 4.2vw, 60px)" }}>
//               {ar ? (<>بناء منصتك<br /><span style={{ color: "var(--primary)" }}>بالذكاء الاصطناعي</span></>) : (<>Build Your Platform<br /><span style={{ color: "var(--primary)" }}>Powered by AI</span></>)}
//             </motion.h1>
//
//             {/* Subtext */}
//             <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.25 }}
//               className="text-base leading-relaxed mb-7 max-w-[400px]" style={{ color: "oklch(0.72 0.025 215)" }}>
//               {ar
//                 ? "من الفكرة إلى الإطلاق في ٥ خطوات ذكية — علامة تجارية، بناء، أدوات، ونشر بمساعدة الذكاء الاصطناعي."
//                 : "From idea to launch in 5 smart steps — branding, building, tools & deployment guided by AI."}
//             </motion.p>
//
//             {/* Chips */}
//             <motion.div className="flex flex-wrap gap-2 mb-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
//               {[
//                 { icon: <Zap className="w-3 h-3" />, text: ar ? "~دقيقتين" : "~2 min setup", c: "16,185,129" },
//                 { icon: <Sparkles className="w-3 h-3" />, text: ar ? "مدعوم بـ AI" : "AI-Driven", c: "20,184,166" },
//                 { icon: <Check className="w-3 h-3" />, text: ar ? "٥ خطوات" : "5 Steps", c: "14,165,233" },
//               ].map((chip, i) => (
//                 <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
//                   style={{ background: `rgba(${chip.c},0.10)`, border: `1px solid rgba(${chip.c},0.28)`, color: `rgb(${chip.c})` }}>
//                   {chip.icon} {chip.text}
//                 </span>
//               ))}
//             </motion.div>
//
//             {/* CTA */}
//             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
//               <Button size="lg" onClick={() => dispatch(actions.nextStep())}
//                 className="font-bold text-base px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 text-sa-text-primary border-none"
//                 style={{ background: "linear-gradient(135deg,#10b981,#0d9488)", boxShadow: "0 0 28px rgba(16,185,129,0.32), 0 4px 18px rgba(0,0,0,0.28)" }}>
//                 {t.getStarted} {ar ? <ArrowLeft className="ms-2 w-5 h-5" /> : <ArrowRight className="ms-2 w-5 h-5" />}
//               </Button>
//             </motion.div>
//
//             {/* Trust stats */}
//             <motion.div className={`flex items-center gap-6 mt-9 ${ar ? "flex-row-reverse" : ""}`}
//               initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
//               {[
//                 { val: "2K+", label: ar ? "منصة مطلقة" : "Platforms Launched" },
//                 { val: "98%", label: ar ? "رضا العملاء" : "Satisfaction" },
//                 { val: "5×", label: ar ? "نمو أسرع" : "Faster Growth" },
//               ].map((stat, i) => (
//                 <div key={i} className={`flex flex-col ${ar ? "items-end" : "items-start"}`}>
//                   <span className="text-xl font-black" style={{ color: "var(--primary)" }}>{stat.val}</span>
//                   <span className="text-[11px]" style={{ color: "oklch(0.55 0.02 215)" }}>{stat.label}</span>
//                 </div>
//               ))}
//             </motion.div>
//           </div>
//
//           {/* RIGHT: Premium mockup */}
//           <div className="relative flex items-center justify-center py-10 lg:py-6 overflow-hidden">
//             <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(16,185,129,0.06) 0%, transparent 60%)" }} />
//             <motion.div className="relative w-full max-w-[500px] mx-6 lg:mx-10 cursor-pointer group"
//               onClick={() => dispatch(actions.nextStep())}
//               initial={{ opacity: 0, x: ar ? -35 : 35, y: 8 }}
//               animate={{ opacity: 1, x: 0, y: 0 }}
//               whileHover={{ scale: 1.03, rotateY: ar ? 5 : -5, rotateX: 2 }}
//               transition={{ duration: 0.75, delay: 0.28, ease: "easeOut", hover: { type: "spring", stiffness: 300, damping: 20 } }}
//               style={{ filter: "drop-shadow(0 28px 55px rgba(0,0,0,0.48))", perspective: 1000, transformStyle: "preserve-3d" }}>
//
//               {/* Window */}
//               <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.175 0.04 245)", border: "1.5px solid rgba(255,255,255,0.07)", boxShadow: "0 35px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
//                 {/* Chrome bar */}
//                 <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: "oklch(0.135 0.04 245)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
//                   <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
//                   <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
//                   <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
//                   <div className="mx-2 flex-1 rounded" style={{ height: "16px", background: "rgba(255,255,255,0.04)", maxWidth: "180px" }} />
//                   <span className="text-[10px] font-bold tracking-widest" style={{ color: "var(--primary)" }}>Joe Academy</span>
//                 </div>
//
//                 {/* App layout */}
//                 <div className="flex" style={{ height: "270px" }}>
//                   {/* Sidebar */}
//                   <div className="flex flex-col py-4 px-2 gap-1.5" style={{ width: "50px", background: "oklch(0.115 0.05 245)", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
//                     <motion.div className="w-7 h-7 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--primary)" }}
//                       animate={{ boxShadow: ["0 0 6px rgba(16,185,129,0.25)", "0 0 14px rgba(16,185,129,0.55)", "0 0 6px rgba(16,185,129,0.25)"] }}
//                       transition={{ duration: 2, repeat: Infinity }}>
//                       <Sparkles className="w-3.5 h-3.5 text-sa-text-primary" />
//                     </motion.div>
//                     {[...Array(5)].map((_, i) => (
//                       <div key={i} className="w-5 h-5 rounded mx-auto" style={{ background: i === 0 ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.03)", marginBottom: "4px" }} />
//                     ))}
//                   </div>
//
//                   {/* Content area */}
//                   <div className="flex-1 p-4 overflow-hidden flex flex-col">
//                     {/* Header */}
//                     <div className="flex items-center justify-between mb-3">
//                       <div>
//                         <div className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: "oklch(0.5 0.03 215)" }}>WELCOME BACK</div>
//                         <div className="text-sm font-bold text-sa-text-primary">Growth Command Center</div>
//                       </div>
//                       <motion.div className="px-2 py-0.5 rounded text-[9px] font-bold"
//                         style={{ background: "rgba(16,185,129,0.13)", color: "#34d399", border: "1px solid rgba(16,185,129,0.28)" }}
//                         animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
//                         ● LIVE
//                       </motion.div>
//                     </div>
//
//                     {/* KPI row */}
//                     <div className="grid grid-cols-3 gap-1.5 mb-3">
//                       {[
//                         { l: "Revenue", v: <AnimatedCounter to={24.8} prefix="$" suffix="K" decimals={1} />, up: "+18%" },
//                         { l: "Clients", v: <AnimatedCounter to={342} />, up: "+12%" },
//                         { l: "Conv. Rate", v: <AnimatedCounter to={6.4} suffix="%" decimals={1} />, up: "+3%" },
//                       ].map((k, i) => (
//                         <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
//                           className="rounded-lg p-2 group-hover:bg-white/5 transition-colors duration-300" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.055)" }}>
//                           <div className="text-[8px] mb-0.5" style={{ color: "oklch(0.5 0.03 215)" }}>{k.l}</div>
//                           <div className="text-xs font-black text-sa-text-primary">{k.v}</div>
//                           <div className="text-[8px] font-semibold" style={{ color: "#34d399" }}>{k.up}</div>
//                         </motion.div>
//                       ))}
//                     </div>
//
//                     {/* Bar chart */}
//                     <div className="flex items-end gap-1 flex-1 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
//                       {[25, 40, 35, 55, 50, 67, 62, 80, 74, 92].map((v, i) => (
//                         <motion.div key={i} className="flex-1 rounded-t group-hover:bg-emerald-400 transition-colors duration-500"
//                           style={{ height: `${v}%`, background: i === 9 ? "var(--primary)" : `rgba(16,185,129,${0.15 + i * 0.07})`, transformOrigin: "bottom" }}
//                           initial={{ scaleY: 0 }} animate={{ scaleY: [0.85, 1.15, 0.85] }}
//                           transition={{ 
//                             scaleY: { delay: 0.9 + i * 0.055, duration: 3 + (i % 3) * 0.5, repeat: Infinity, ease: "easeInOut" }
//                           }} />
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//
//               {/* Laptop base */}
//               <div className="mx-auto mt-0.5 rounded-b-xl" style={{ height: "12px", width: "82%", background: "linear-gradient(to bottom, oklch(0.22 0.03 245), oklch(0.16 0.03 245))", boxShadow: "0 6px 18px rgba(0,0,0,0.38)" }} />
//               <div className="mx-auto rounded-b-full" style={{ height: "4px", width: "38%", background: "oklch(0.135 0.04 245)" }} />
//             </motion.div>
//
//             {/* Floating notification: Deploy */}
//             <motion.div className="absolute top-[18%] right-3 lg:right-6 rounded-xl px-3 py-2.5 shadow-[0_15px_30px_rgba(0,0,0,0.3)] pointer-events-none"
//               style={{ background: "rgba(10,20,30,0.88)", border: "1px solid rgba(16,185,129,0.22)", backdropFilter: "blur(14px)" }}
//               initial={{ opacity: 0, x: 20, y: 0 }} animate={{ opacity: 1, x: 0, y: [0, -8, 0] }} 
//               transition={{ opacity: { delay: 1.2 }, x: { delay: 1.2 }, y: { delay: 1.2, duration: 4, repeat: Infinity, ease: "easeInOut" } }}>
//               <div className="flex items-center gap-2">
//                 <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.18)" }}>
//                   <Rocket className="w-3 h-3" style={{ color: "#34d399" }} />
//                 </div>
//                 <div>
//                   <div className="font-bold text-sa-text-primary text-[11px]">{ar ? "نشر ناجح" : "Live Deploy"}</div>
//                   <div className="text-[10px]" style={{ color: "#34d399" }}>✓ {ar ? "منذ دقيقتين" : "2 min ago"}</div>
//                 </div>
//               </div>
//             </motion.div>
//
//             {/* Floating notification: AI */}
//             <motion.div className="absolute bottom-[20%] left-3 lg:left-6 rounded-xl px-3 py-2.5 shadow-[0_15px_30px_rgba(0,0,0,0.3)] pointer-events-none"
//               style={{ background: "rgba(10,20,30,0.88)", border: "1px solid rgba(20,184,166,0.22)", backdropFilter: "blur(14px)" }}
//               initial={{ opacity: 0, x: -20, y: 0 }} animate={{ opacity: 1, x: 0, y: [0, -6, 0] }} 
//               transition={{ opacity: { delay: 1.5 }, x: { delay: 1.5 }, y: { delay: 1.5, duration: 4.5, repeat: Infinity, ease: "easeInOut" } }}>
//               <div className="flex items-center gap-2">
//                 <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(20,184,166,0.18)" }}>
//                   <Sparkles className="w-3 h-3" style={{ color: "#2dd4bf" }} />
//                 </div>
//                 <div>
//                   <div className="font-bold text-sa-text-primary text-[11px]">{ar ? "ذكاء اصطناعي جاهز" : "AI Ready"}</div>
//                   <div className="text-[10px]" style={{ color: "#2dd4bf" }}>GPT-4o + Custom</div>
//                 </div>
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       </section>
//     );
//
//   if (id === 2)
//     return (
//       <StepFrame number={number} title={title(2)} kicker={t.visionPath} intro={t.visionIntro}>
//         <div className="flex flex-col justify-center w-full mt-4 pb-4 flex-1">
//           <div className="journey-grid grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch w-full relative z-10">
//           {phases.map((p, i) => {
//             const isActive = p.steps.includes(s.activeStep) || p.id === 2;
//
//             const iconConfig: Record<number, { Illustration: any }> = {
//               1: { Illustration: RocketIllustration },
//               2: { Illustration: PaletteIllustration },
//               3: { Illustration: BuilderIllustration },
//               4: { Illustration: BotIllustration },
//               5: { Illustration: MegaphoneIllustration },
//             };
//
//             const { Illustration } = iconConfig[p.id] || iconConfig[1];
//             const stepCount = p.steps.filter((step) => wizardOrder.includes(step)).length;
//
//            
//
//             const glowColor: Record<number, { bg: string, ring: string }> = {
//               1: { bg: "bg-sa-primary-soft", ring: "ring-emerald-500/30 border-emerald-400/30" },
//               2: { bg: "bg-sa-primary-soft", ring: "ring-emerald-500/30 border-emerald-400/30" },
//               3: { bg: "bg-purple-500/20", ring: "ring-purple-500/30 border-purple-400/30" },
//               4: { bg: "bg-purple-500/20", ring: "ring-purple-500/30 border-purple-400/30" },
//               5: { bg: "bg-cyan-500/20", ring: "ring-cyan-500/30 border-cyan-400/30" },
//             };
//
//             const aura = glowColor[p.id] || glowColor[1];
//
//             return (
//               <motion.button
//                 key={p.id}
//                 initial={{ opacity: 0, y: 40, scale: 0.96 }}
//                 animate={{ opacity: 1, y: 0, scale: 1 }}
//                 transition={{ duration: 0.7, delay: i * 0.15 + 0.1, ease: [0.22, 1, 0.36, 1] }}
//                 className={`journey-phase group h-full flex flex-col rounded-2xl relative text-center backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 border-t border-white/60 dark:border-sa-border border-x border-b border-white/20 dark:border-sa-border/80 overflow-hidden ${
//                   p.id === 2 
//                     ? "ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20 bg-gradient-to-b from-slate-900/5 via-slate-50 to-emerald-500/10 dark:from-slate-900 dark:via-slate-900/95 dark:to-emerald-950/20 z-10" 
//                     : "bg-gradient-to-b from-slate-900/5 via-slate-50 to-emerald-500/10 dark:from-slate-900 dark:via-slate-900/95 dark:to-emerald-950/20 shadow-md"
//                 }`}
//               >
//                 {/* Ambient Mesh Texture */}
//                 <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
//
//                 <div className="flex flex-col flex-1 items-center p-4 sm:p-5 relative z-10">
//                   <span className="bg-sa-surface/80 text-sa-primary border border-sa-primary/30 text-[9px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur-md uppercase mb-4">
//                     STEP {String(p.id).padStart(2, "0")}
//                   </span>
//
//                   <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-3 mx-auto transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 relative [&>svg]:w-3/4 [&>svg]:h-3/4">
//                     {/* Glowing radial light aura */}
//                     <div className={`absolute inset-0 rounded-full blur-[16px] transition-opacity duration-500 ${p.id === 2 ? 'opacity-80' : 'opacity-40 group-hover:opacity-80'} ${aura.bg}`} />
//                     {/* 3D Glass Orb */}
//                     <div className={`relative z-10 flex items-center justify-center w-full h-full rounded-full bg-white/40 dark:bg-sa-surface-sunken/40 backdrop-blur-md border ${aura.ring} shadow-inner`}>
//                       <Illustration />
//                     </div>
//                   </div>
//
//                   <strong className="font-bold text-[14px] sm:text-[15px] text-slate-800 dark:text-slate-100 tracking-tight leading-snug mt-auto pt-2">
//                     {ar ? p.titleAr : p.title}
//                   </strong>
//                 </div>
//
//                 <div className="border-t border-slate-200/50 dark:border-sa-border/80 py-2.5 px-4 text-[11px] sm:text-[12px] text-sa-text-disabled dark:text-sa-text-secondary font-semibold flex items-center justify-between w-full relative z-10 bg-sa-surface/5 dark:bg-sa-surface-sunken/40 rounded-b-2xl">
//                   <span>
//                     {stepCount} {t.coreSteps}
//                   </span>
//                   {isActive && (
//                     <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
//                   )}
//                 </div>
//               </motion.button>
//             );
//           })}
//           </div>
//          
//           <div className="journey-callout mt-6 py-3 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-sa-border flex items-center gap-3 relative overflow-hidden shadow-lg shrink-0">
//           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
//           <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sa-primary-soft text-sa-primary shrink-0 relative z-10 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
//             <Sparkles size={16} />
//           </div>
//           <div className="relative z-10 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-4">
//             <strong className="text-sa-text-primary font-semibold text-sm tracking-tight">
//               {t.journeyFooterTitle}
//             </strong>
//             <p className="text-sa-text-primary leading-tight text-xs sm:text-sm m-0">
//               {t.journeyFooterText}
//             </p>
//           </div>
//           </div>
//         </div>
//       </StepFrame>
//     );
  if (id === 13)
    return (
      <BusinessDiscoveryStep
        number={number}
        title={title(13)}
        kicker={ar ? "اختر مسارك الأقوى" : "Choose Your Business & AI Will Build Your Platform"}
        intro={
          ar
            ? "اختر المجال الذي يناسبك. وسيقوم الذكاء الاصطناعي باقتراح الأدوات والتصميم المناسب لك."
            : "Tell us what you want to do, and our AI will recommend the best tools, design and setup for you."
        }
      />
    );
  if (id === 14) return null;
//   if (id === 6)
//     return (
//       <StepFrame
//         number={number}
//         title={title(6)}
//         kicker={ar ? "فقط الأدوات التي تحتاجها" : "Only the tools you need"}
//         intro={
//           ar
//             ? "جهّز خدماتك الخارجية واتبع تعليمات الربط الخاصة بكل مزوّد."
//             : "Set up external services with step-by-step connection guides for each provider."
//         }
//       >
//         <ModuleMarketplace />
//       </StepFrame>
//     );
//   if (id === 8) return <AICenter number="5" />;
//   if (id === 16) return <ContentPlanner number="9" />;
//   if (id === 17) return <MarketingStrategy number="10" />;
  return <PlatformDeployment number="4" />;
}
