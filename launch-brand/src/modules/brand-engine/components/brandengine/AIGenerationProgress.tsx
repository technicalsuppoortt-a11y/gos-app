import { useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { CheckCircle2, CircleAlert, Clock3, LoaderCircle } from 'lucide-react';
import { auth, db } from "@/modules/brand-engine/firebase";
import { estimateGenerationTime, type GenerationEstimate } from "@/modules/brand-engine/data/ai/generationTiming";
import "./AIGenerationProgress.css";
import type { BrandIdentity } from "../../data/types";
import { validateBrandLogoArtwork } from "../../services/brandLogo";
import { LogoDrawingPreview } from "./LogoDrawingPreview";

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
        setOutcome(error ? "error" : "success");
        started.current = null;
      }
      return;
    }
    started.current ??= Date.now();
    setElapsed(0);
    setOutcome("idle");
    setStage("profile");
    setTrackingUnavailable(false);
    setDraftPreview(null);
    setEstimate(null);
    let active = true;
    const uid = auth.currentUser?.uid;
    if (uid)
      void getDocs(
        query(collection(db, "users", uid, "aiJobs"), orderBy("startedAt", "desc"), limit(60)),
      )
        .then((snapshot) => {
          if (active && auth.currentUser?.uid === uid)
            setEstimate(
              estimateGenerationTime(
                snapshot.docs.map((item) => item.data()),
                operation,
                element,
              ),
            );
        })
        .catch(() => {
          /* Timing is optional; generation continues if history is unavailable. */
        });
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
  }, [busy, operation, element]);
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
          if (logoContext && job["status"] === "running" && job["stage"] === "design-review" && typeof preview?.id === "string" && preview?.logo
            && ["prism", "flow", "serif", "nodes", "bilingual", "burst"].includes(preview.mark)) {
            try {
              const identity: BrandIdentity = { ...logoContext.identity, id: preview.id, mark: preview.mark, logo: preview.logo };
              validateBrandLogoArtwork(identity);
              setDraftPreview({ requestId, identity });
            } catch { setDraftPreview(null); }
          } else setDraftPreview(null);
        }
      },
      () => setTrackingUnavailable(true),
    );
  }, [busy, requestId, logoContext]);
  if (!busy && outcome === "idle") return null;
  const failed = !busy && (Boolean(error) || outcome === "error");
  const currentStage = suppliedStage || stage;
  const logo = element === "logo";
  const logoStages = [
    { id: "profile", label: t("Brief", "الفكرة"), detail: t("Preparing your name, style and brand colors", "تجهيز الاسم والطابع وألوان براندك") },
    { id: "generating", label: t("Design", "التصميم"), detail: t("The model is building your logo", "المولّد بيبني تصميم اللوجو") },
    { id: "validating", label: t("Check", "الفحص"), detail: t("Checking the returned artwork", "فحص عناصر التصميم اللي وصلت") },
    { id: "design-review", label: t("Review", "المراجعة"), detail: t("Reviewing the composition and readability", "مراجعة التكوين ووضوح التصميم") },
    { id: "saving", label: t("Save", "الحفظ"), detail: t("Saving the result to your account", "حفظ النتيجة في حسابك") },
  ];
  const stageIndex = currentStage === "complete" ? logoStages.length - 1 : Math.max(0, logoStages.findIndex(item => item.id === currentStage));
  const stageLabels: Record<string, string> = {
    profile: t("Preparing your business context", "تجهيز بيانات نشاطك"),
    generating: logo ? t("Designing your logo", "جاري تصميم اللوجو") : t("AI is generating suggestions", "الذكاء الاصطناعي بيولّد الاقتراحات"),
    validating: t("Checking the generated results", "مراجعة النتائج المولّدة"),
    "design-review": t("Reviewing logo design and readability", "مراجعة تصميم اللوجو ووضوحه"),
    saving: t("Saving your logo", "حفظ اللوجو"),
    matching: t("Matching approved markets", "مطابقة الأسواق المعتمدة"),
    research: t("Researching businesses and demand", "بحث الأنشطة والطلب"),
    comparing: t("Comparing evidence and opportunities", "مقارنة الأدلة والفرص"),
    complete: t("Saving your results", "حفظ النتائج"),
  };
  const upperRemaining = estimate ? Math.ceil(estimate.upperMs / 1000) - elapsed : 0;
  const lowerRemaining = estimate ? Math.max(1, Math.ceil(estimate.typicalMs / 1000) - elapsed) : 0;
  return (
    <div
      className={`ai-generation-progress${logo ? " ai-logo-progress" : ""} ${busy ? "is-running" : failed ? "is-error" : "is-success"}`}
      role={failed ? "alert" : undefined}
    >
      <div className="ai-generation-progress-title" role={failed ? undefined : "status"} aria-live={failed ? "off" : "polite"} aria-atomic="true">
        {busy ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : failed ? (
          <CircleAlert size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
        <strong>
          {busy
            ? stageLabels[currentStage] || stageLabels["generating"]
            : failed
              ? t("Generation did not complete", "التوليد ما اكتملش")
              : t("Generation completed successfully", "التوليد اكتمل بنجاح")}
        </strong>
      </div>
      {logo && (
        <div className="ai-logo-journey">
          <ol aria-label={t("Logo generation stages", "مراحل توليد اللوجو")}>
            {logoStages.map((item, index) => {
              const complete = index < stageIndex || (!busy && !failed);
              const current = busy && index === stageIndex;
              return <li key={item.id} data-state={complete ? "complete" : current ? "current" : failed && index === stageIndex ? "error" : "pending"} aria-current={current ? "step" : undefined}>
                <span className="ai-logo-step-marker" aria-hidden="true">{complete ? <CheckCircle2 size={18} /> : failed && index === stageIndex ? <CircleAlert size={18} /> : index + 1}</span>
                <span>{item.label}</span>
              </li>;
            })}
          </ol>
          {busy && <div className="ai-logo-stage-detail">
            <strong>{t(`Stage ${stageIndex + 1} of ${logoStages.length}`, `المرحلة ${stageIndex + 1} من ${logoStages.length}`)}</strong>
            <span>{logoStages[stageIndex].detail}</span>
            <div className="ai-logo-stage-activity" role="progressbar" aria-label={t("Current stage is in progress", "المرحلة الحالية قيد التنفيذ")}><span /></div>
          </div>}
          <p className="ai-logo-progress-note">{busy
            ? t("Stages update as the job reports them. Your logo's drawing reveal appears when the artwork arrives.", "المراحل بتتحدّث حسب تقدم العملية. عرض رسم اللوجو بيظهر لما التصميم يوصل.")
            : failed ? t("You can retry when ready. A completed logo has not been confirmed for this request.", "تقدر تعيد المحاولة. لسه ما اتأكدش اكتمال لوجو للطلب ده.")
            : t("Your result is ready below. You can replay its drawing reveal without generating again.", "النتيجة جاهزة تحت. تقدر تعيد عرض الرسم من غير توليد جديد.")}</p>
        </div>
      )}
      {busy && logoContext && draftPreview && draftPreview.requestId === requestId && <div className="ai-logo-live-draft">
        <p>{t("Draft artwork — quality review in progress", "مسودة التصميم — مراجعة الجودة جارية")}</p>
        <LogoDrawingPreview identity={draftPreview.identity} primary={logoContext.primary} palette={logoContext.palette} ar={ar} />
      </div>}
      <div className="ai-generation-timing" aria-live="off">
        <Clock3 size={15} />
        <span>
          {t("Elapsed", "الوقت اللي عدى")}: {elapsed} {t("sec", "ثانية")}
        </span>
        {busy && (
          <span>
            {estimate && upperRemaining > 0
              ? t(
                  `About ${lowerRemaining === upperRemaining ? upperRemaining : `${lowerRemaining}–${upperRemaining}`} sec remaining`,
                  `متبقي تقريبًا ${lowerRemaining === upperRemaining ? upperRemaining : `${lowerRemaining}–${upperRemaining}`} ثانية`,
                )
              : estimate
                ? t(
                    "Taking longer than previous runs; still working",
                    "أطول من العمليات السابقة؛ التوليد لسه شغال",
                  )
                : t(
                    "Calculating a reliable estimate…",
                    "لسه مفيش بيانات كفاية لتقدير الوقت المتبقي",
                  )}
          </span>
        )}
      </div>
      {busy && (
        <small>
          {estimate
            ? t(
                `Estimate based on ${estimate.samples} completed operations.`,
                `التقدير مبني على ${estimate.samples} عمليات مكتملة.`,
              )
            : t(
                "An estimate appears after enough completed operations of this type.",
                "تقدير الوقت هيظهر بعد عمليات مكتملة كفاية من نفس النوع.",
              )}{" "}
          {t(
            "This window stays open until generation finishes.",
            "النافذة هتفضل مفتوحة لحد ما التوليد يخلص.",
          )}
        </small>
      )}
      {busy && elapsed >= 30 && (
        <small>
          {t(
            "The provider is still processing your request. You do not need to generate again.",
            "مزوّد الذكاء الاصطناعي لسه بيعالج الطلب. مش محتاج تضغط توليد مرة تانية.",
          )}
        </small>
      )}
      {failed && error && <p>{error}</p>}
      {busy && trackingUnavailable && <p className="ai-logo-progress-note">{t("Live stage updates are temporarily unavailable. Waiting for the generator's response…", "متابعة المراحل اللحظية غير متاحة مؤقتًا. بننتظر رد المولّد…")}</p>}
    </div>
  );
}
