import { useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { CheckCircle2, CircleAlert, Clock3, LoaderCircle } from 'lucide-react';
import { auth, db } from "@/modules/brand-engine/firebase";
import { estimateGenerationTime, type GenerationEstimate } from "@/modules/brand-engine/data/ai/generationTiming";
import "./AIGenerationProgress.css";

export function AIGenerationProgress({
  busy,
  error = "",
  operation,
  element,
  requestId,
  ar,
  stage: suppliedStage,
}: {
  busy: boolean;
  error?: string;
  operation: string;
  element?: string | undefined;
  requestId?: string | undefined;
  ar: boolean;
  stage?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [estimate, setEstimate] = useState<GenerationEstimate | null>(null);
  const [stage, setStage] = useState("profile");
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
  }, [busy, operation, element, error]);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!busy || !uid || !requestId) return;
    return onSnapshot(
      doc(db, "users", uid, "aiJobs", requestId),
      (snapshot) => {
        if (auth.currentUser?.uid === uid && snapshot.exists())
          setStage(snapshot.data()["stage"] || "profile");
      },
      () => {},
    );
  }, [busy, requestId]);
  if (!busy && outcome === "idle") return null;
  const failed = !busy && (Boolean(error) || outcome === "error");
  const currentStage = suppliedStage || stage;
  const stageLabels: Record<string, string> = {
    profile: t("Preparing your business context", "تجهيز بيانات نشاطك"),
    generating: t("AI is generating suggestions", "الذكاء الاصطناعي بيولّد الاقتراحات"),
    validating: t("Checking the generated results", "مراجعة النتائج المولّدة"),
    "design-review": t("Reviewing logo design and readability", "مراجعة تصميم اللوجو ووضوحه"),
    saving: t("Saving your logo image", "حفظ صورة اللوجو"),
    matching: t("Matching approved markets", "مطابقة الأسواق المعتمدة"),
    research: t("Researching businesses and demand", "بحث الأنشطة والطلب"),
    comparing: t("Comparing evidence and opportunities", "مقارنة الأدلة والفرص"),
    complete: t("Saving your results", "حفظ النتائج"),
  };
  const upperRemaining = estimate ? Math.ceil(estimate.upperMs / 1000) - elapsed : 0;
  const lowerRemaining = estimate ? Math.max(1, Math.ceil(estimate.typicalMs / 1000) - elapsed) : 0;
  return (
    <div
      className={`ai-generation-progress ${busy ? "is-running" : failed ? "is-error" : "is-success"}`}
      role={failed ? "alert" : "status"}
      aria-live="polite"
      aria-atomic="true"
      aria-busy={busy}
    >
      <div className="ai-generation-progress-title">
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
    </div>
  );
}
