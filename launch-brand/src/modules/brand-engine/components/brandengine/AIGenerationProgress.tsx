import { useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { CheckCircle2, CircleAlert, Clock3, LoaderCircle, Sparkles } from "lucide-react";
import { auth, db } from "@/modules/brand-engine/firebase";
import { estimateGenerationTime, type GenerationEstimate } from "@/modules/brand-engine/data/ai/generationTiming";
import "./AIGenerationProgress.css";
import type { BrandIdentity } from "../../data/types";
import { validateBrandLogoArtwork } from "../../services/brandLogo";
import { LogoDrawingPreview } from "./LogoDrawingPreview";

const STAGE_PROGRESS_FLOOR: Record<string, number> = {
  profile: 14,
  matching: 36,
  generating: 44,
  research: 62,
  validating: 72,
  comparing: 82,
  "design-review": 84,
  saving: 93,
  complete: 100,
};

export function AIGenerationProgress({
  busy,
  error = "",
  operation,
  element,
  requestId,
  ar,
  stage: suppliedStage,
  logoContext,
}: {
  busy: boolean;
  error?: string;
  operation: string;
  element?: string | undefined;
  requestId?: string | undefined;
  ar: boolean;
  stage?: string;
  logoContext?: { identity: BrandIdentity; primary: string; palette: string[] } | undefined;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [percent, setPercent] = useState(0);
  const [estimate, setEstimate] = useState<GenerationEstimate | null>(null);
  const [stage, setStage] = useState("profile");
  const [trackingUnavailable, setTrackingUnavailable] = useState(false);
  const [draftPreview, setDraftPreview] = useState<{ requestId: string; identity: BrandIdentity } | null>(null);
  const [outcome, setOutcome] = useState<"idle" | "success" | "error">("idle");
  const started = useRef<number | null>(null);
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  useEffect(() => {
    if (!busy) {
      if (started.current !== null) {
        setElapsed(Math.floor((Date.now() - started.current) / 1000));
        const hasErr = Boolean(error);
        setOutcome(hasErr ? "error" : "success");
        if (!hasErr) setPercent(100);
        started.current = null;
      }
      return;
    }
    started.current ??= Date.now();
    setElapsed(0);
    setPercent(4);
    setOutcome("idle");
    setStage("profile");
    setTrackingUnavailable(false);
    setDraftPreview(null);
    setEstimate(null);
    let active = true;
    const uid = auth.currentUser?.uid;
    if (uid) {
      void getDocs(
        query(collection(db, "users", uid, "aiJobs"), orderBy("startedAt", "desc"), limit(60)),
      )
        .then((snapshot) => {
          if (active && auth.currentUser?.uid === uid) {
            setEstimate(
              estimateGenerationTime(
                snapshot.docs.map((item) => item.data()),
                operation,
                element,
              ),
            );
          }
        })
        .catch(() => {
          /* Timing is optional; generation continues if history is unavailable. */
        });
    }
    const timer = window.setInterval(() => {
      if (started.current !== null) setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [busy, operation, element, error]);

  // Smooth real-time percentage ticker (0% -> 96% while busy, 100% on completion)
  const currentStage = suppliedStage || stage;
  useEffect(() => {
    if (!busy) return;
    const targetDurationMs = estimate?.typicalMs ? Math.max(5500, estimate.typicalMs) : 11500;
    const interval = window.setInterval(() => {
      if (started.current === null) return;
      const elapsedMs = Date.now() - started.current;
      const ratio = elapsedMs / targetDurationMs;
      // Smooth asymptotic curve approaching 95%
      const timeCurve = Math.min(95, Math.round(96 * (1 - Math.exp(-2.15 * ratio))));
      const stageFloor = STAGE_PROGRESS_FLOOR[currentStage] ?? 12;
      setPercent((prev) => Math.min(96, Math.max(prev, timeCurve, stageFloor)));
    }, 120);
    return () => window.clearInterval(interval);
  }, [busy, estimate, currentStage]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!busy || !uid || !requestId) return;
    return onSnapshot(
      doc(db, "users", uid, "aiJobs", requestId),
      (snapshot) => {
        if (auth.currentUser?.uid === uid && snapshot.exists()) {
          const job = snapshot.data();
          setTrackingUnavailable(false);
          setStage(job["stage"] || "profile");
          const preview = job["result"]?.preview;
          if (
            logoContext &&
            job["status"] === "running" &&
            job["stage"] === "design-review" &&
            typeof preview?.id === "string" &&
            preview?.logo &&
            ["prism", "flow", "serif", "nodes", "bilingual", "burst"].includes(preview.mark)
          ) {
            try {
              const identity: BrandIdentity = {
                ...logoContext.identity,
                id: preview.id,
                mark: preview.mark,
                logo: preview.logo,
              };
              validateBrandLogoArtwork(identity);
              setDraftPreview({ requestId, identity });
            } catch {
              setDraftPreview(null);
            }
          } else {
            setDraftPreview(null);
          }
        }
      },
      () => setTrackingUnavailable(true),
    );
  }, [busy, requestId, logoContext]);

  useEffect(() => {
    if (!busy && !error && outcome === "error") {
      setOutcome("idle");
    }
  }, [busy, error, outcome]);

  if (!busy && outcome === "idle") return null;

  const failed = !busy && (Boolean(error) || outcome === "error");
  const displayPercent = failed ? percent : busy ? percent : 100;
  const logo = element === "logo";

  const logoStages = [
    {
      id: "profile",
      label: t("Brief", "الفكرة"),
      detail: t("Preparing your name, style and brand colors", "تجهيز الاسم والطابع وألوان براندك"),
    },
    {
      id: "generating",
      label: t("Design", "التصميم"),
      detail: t("The model is building your logo", "المولّد بيبني تصميم اللوجو"),
    },
    {
      id: "validating",
      label: t("Check", "الفحص"),
      detail: t("Checking the returned artwork", "فحص عناصر التصميم اللي وصلت"),
    },
    {
      id: "design-review",
      label: t("Review", "المراجعة"),
      detail: t("Reviewing the composition and readability", "مراجعة التكوين ووضوح التصميم"),
    },
    {
      id: "saving",
      label: t("Save", "الحفظ"),
      detail: t("Saving the result to your account", "حفظ النتيجة في حسابك"),
    },
  ];
  const stageIndex =
    currentStage === "complete"
      ? logoStages.length - 1
      : Math.max(0, logoStages.findIndex((item) => item.id === currentStage));

  // Real-time dynamic AI status headline synced with live percentage
  const dynamicHeadline = !busy
    ? failed
      ? t("Generation did not complete", "تعذّر إكمال التوليد")
      : t("Branding assets finalized!", "اكتمل توليد الهوية بنجاح!")
    : displayPercent < 34
      ? t("Analyzing market intent...", "تحليل توجه السوق وبيانات نشاطك...")
      : displayPercent < 74
        ? t("Generating neural assets...", "توليد عناصر الهوية بالذكاء الاصطناعي...")
        : t("Finalizing branding...", "مراجعة وتنسيق مخرجات البراند...");

  const stageLabels: Record<string, string> = {
    profile: t("Preparing your business context & niche signals", "تجهيز بيانات نشاطك وإشارات السوق"),
    generating: logo
      ? t("Synthesizing custom vector geometry & brand mark", "تصميم وبناء شعار الفيكتور المخصص")
      : t("Crafting tailored suggestions aligned to your market", "صياغة اقتراحات مخصصة لمجالك"),
    validating: t("Validating contrast, structure & legibility", "التحقق من التباين وجودة المخرجات"),
    "design-review": t("Reviewing logo composition and readability", "مراجعة تكوين الشعار ووضوحه"),
    saving: t("Saving generated assets to your workspace", "حفظ العناصر المولّدة في مساحتك"),
    matching: t("Matching approved markets & specializations", "مطابقة الأسواق والتخصصات المعتمدة"),
    research: t("Researching demand signals & business opportunities", "تحليل مؤشرات الطلب والفرص"),
    comparing: t("Comparing evidence & strategic fit", "مقارنة الأدلة وملاءمة الاتجاه"),
    complete: t("All assets verified and saved", "تم التحقق وحفظ النتائج"),
  };

  const upperRemaining = estimate ? Math.ceil(estimate.upperMs / 1000) - elapsed : 0;
  const lowerRemaining = estimate ? Math.max(1, Math.ceil(estimate.typicalMs / 1000) - elapsed) : 0;
  const activePhaseIdx = !busy && !failed ? 3 : displayPercent < 34 ? 0 : displayPercent < 74 ? 1 : 2;

  return (
    <div
      className={`ai-generation-progress transition-all duration-300 ease-out${logo ? " ai-logo-progress" : ""} ${busy ? "is-running" : failed ? "is-error" : "is-success"}`}
      role={failed ? "alert" : undefined}
    >
      <div
        className="ai-generation-progress-header"
        role={failed ? undefined : "status"}
        aria-live={failed ? "off" : "polite"}
        aria-atomic="true"
      >
        <span className="ai-generation-orb" aria-hidden="true">
          {busy ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : failed ? (
            <CircleAlert size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}
        </span>
        <div className="ai-generation-copy">
          <strong className="ai-generation-headline">{dynamicHeadline}</strong>
          <span className="ai-generation-sub">
            {busy
              ? stageLabels[currentStage] || stageLabels["generating"]
              : failed
                ? t("Please check the message below and try again.", "راجع التنبيه أدناه وأعد المحاولة.")
                : stageLabels["complete"]}
          </span>
        </div>
        <span className="ai-generation-percent-pill" dir="ltr">
          <Sparkles size={12} aria-hidden="true" />
          {displayPercent}%
        </span>
      </div>

      {/* Glossy Glowing Multi-Stop Gradient Progress Bar */}
      <div
        className="ai-glossy-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayPercent}
        aria-label={dynamicHeadline}
      >
        <div className="ai-glossy-bar-fill" style={{ width: `${displayPercent}%` }}>
          {busy && <span className="ai-glossy-bar-sheen" aria-hidden="true" />}
        </div>
      </div>

      {/* Real-time 3-step neural phase pills */}
      <div className="ai-generation-phases" aria-hidden="true">
        {[
          t("Analyzing market intent", "تحليل السوق"),
          t("Generating neural assets", "توليد العناصر"),
          t("Finalizing branding", "اعتماد الهوية"),
        ].map((label, idx) => {
          const stateAttr = idx < activePhaseIdx ? "done" : idx === activePhaseIdx && busy ? "active" : "pending";
          return (
            <span key={label} className="ai-phase-chip" data-phase={stateAttr}>
              <i />
              {label}
            </span>
          );
        })}
      </div>

      {logo && (
        <div className="ai-logo-journey">
          <ol aria-label={t("Logo generation stages", "مراحل توليد اللوجو")}>
            {logoStages.map((item, index) => {
              const complete = index < stageIndex || (!busy && !failed);
              const current = busy && index === stageIndex;
              return (
                <li
                  key={item.id}
                  data-state={
                    complete ? "complete" : current ? "current" : failed && index === stageIndex ? "error" : "pending"
                  }
                  aria-current={current ? "step" : undefined}
                >
                  <span className="ai-logo-step-marker" aria-hidden="true">
                    {complete ? (
                      <CheckCircle2 size={16} />
                    ) : failed && index === stageIndex ? (
                      <CircleAlert size={16} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ol>
          {busy && (
            <div className="ai-logo-stage-detail">
              <strong>
                {t(`Stage ${stageIndex + 1} of ${logoStages.length}`, `المرحلة ${stageIndex + 1} من ${logoStages.length}`)}
              </strong>
              <span>{logoStages[stageIndex]?.detail}</span>
            </div>
          )}
          <p className="ai-logo-progress-note">
            {busy
              ? t(
                  "Stages update as the job reports them. Your logo's drawing reveal appears when the artwork arrives.",
                  "المراحل بتتحدّث حسب تقدم العملية. عرض رسم اللوجو بيظهر لما التصميم يوصل.",
                )
              : failed
                ? t(
                    "You can retry when ready. A completed logo has not been confirmed for this request.",
                    "تقدر تعيد المحاولة. لسه ما اتأكدش اكتمال لوجو للطلب ده.",
                  )
                : t(
                    "Your result is ready below. You can replay its drawing reveal without generating again.",
                    "النتيجة جاهزة تحت. تقدر تعيد عرض الرسم من غير توليد جديد.",
                  )}
          </p>
        </div>
      )}

      {busy && logoContext && draftPreview && draftPreview.requestId === requestId && (
        <div className="ai-logo-live-draft">
          <p>{t("Draft artwork — quality review in progress", "مسودة التصميم — مراجعة الجودة جارية")}</p>
          <LogoDrawingPreview
            identity={draftPreview.identity}
            primary={logoContext.primary}
            palette={logoContext.palette}
            ar={ar}
          />
        </div>
      )}

      <div className="ai-generation-timing" aria-live="off">
        <Clock3 size={14} />
        <span>
          {t("Elapsed", "الوقت المنقضي")}: {elapsed} {t("sec", "ثانية")}
        </span>
        {busy && (
          <span>
            {estimate && upperRemaining > 0
              ? t(
                  `About ${lowerRemaining === upperRemaining ? upperRemaining : `${lowerRemaining}–${upperRemaining}`} sec remaining`,
                  `متبقي تقريبًا ${lowerRemaining === upperRemaining ? upperRemaining : `${lowerRemaining}–${upperRemaining}`} ثانية`,
                )
              : estimate
                ? t("Taking longer than previous runs; still working", "أطول من العمليات السابقة؛ التوليد مستمر")
                : t("Live neural synthesis active…", "التوليد الذكي نشط الآن…")}
          </span>
        )}
      </div>

      {busy && elapsed >= 30 && (
        <small>
          {t(
            "The provider is still processing your request. You do not need to generate again.",
            "مزوّد الذكاء الاصطناعي لسه بيعالج الطلب. مش محتاج تضغط توليد مرة تانية.",
          )}
        </small>
      )}
      {failed && error && <p className="ai-generation-error-msg">{error}</p>}
      {busy && trackingUnavailable && (
        <p className="ai-logo-progress-note">
          {t(
            "Live stage updates are temporarily unavailable. Waiting for the generator's response…",
            "متابعة المراحل اللحظية غير متاحة مؤقتًا. بننتظر رد المولّد…",
          )}
        </p>
      )}
    </div>
  );
}
