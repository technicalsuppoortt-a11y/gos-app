// import { brandEnginePortalContainer } from "../../lib/portalContainer";
import { useEffect, useRef, useState } from "react";
// import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  Download,
  X,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { store } from "@/modules/brand-engine/store";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useDiscoveryCatalog } from "@/modules/brand-engine/hooks/useDiscoveryCatalog";
import {
  getActiveNiches,
  getActiveSubNiches,
  createDiscoverySelection,
  cloneDiscoveryWorkspace,
  getDiscoverySelection,
  type DiscoveryCatalog,
} from "@/modules/brand-engine/data/discovery";
import {
  defaultDiscoveryConfiguration,
  emptyDiscoveryProfile,
  // profileIssues,
  analysisIsCurrent,
  editDiscoveryDraftProfile,
  getDiscoveryDraftSelection,
  getDiscoveryQualificationAnswers,
  type DiscoveryDraft,
  // type DiscoveryAnalysis,
} from "@/modules/brand-engine/data/discoveryProfile";
import {
  // analyzeDiscoveryProfile,
  translateDiscoveryAnalysis,
  // subscribeDiscoveryAnalysis,
  subscribeDiscoveryConfiguration,
  loadAnalysisCatalog,
  getCachedAnalysisCatalog,
} from "@/modules/brand-engine/services/discoveryAnalysis";
import { saveBrandDraft } from "@/modules/brand-engine/services/brandDraft";
import { aiError } from "@/modules/brand-engine/services/aiConnection";
import { exportDiscoveryPDF } from "@/modules/brand-engine/services/discoveryExport";
import "./BusinessDiscover.css";
import { DiscoverProfileForm } from "./DiscoverProfileForm";
// import { DiscoveryResearchPreview } from "./DiscoveryResearchPreview";
import { DiscoverySources } from "./DiscoverySources";
// import { AIGenerationProgress } from "./AIGenerationProgress";
// import { StageStepper } from "@/modules/brand-engine/components/ui/stage-stepper";
import { analysisLanguage } from "@/modules/brand-engine/data/ai/discoveryTranslation.js";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from "@/modules/brand-engine/components/ui/alert-dialog";

const stages = ["profile", "recommendation", "review"] as const;
type Stage = (typeof stages)[number];
export function Pager({
  page,
  last,
  onChange,
  ar = false,
}: {
  page: number;
  last: number;
  onChange: (page: number) => void;
  ar?: boolean;
}) {
  if (last < 1) return null;
  return (
    <div className="discover-pagination">
      <button
        type="button"
        disabled={!page}
        onClick={() => onChange(page - 1)}
        aria-label={ar ? "الصفحة السابقة" : "Previous page"}
      >
        <ArrowLeft />
      </button>
      <small dir="ltr">
        {page + 1}/{last + 1}
      </small>
      <button
        type="button"
        disabled={page >= last}
        onClick={() => onChange(page + 1)}
        aria-label={ar ? "الصفحة التالية" : "Next page"}
      >
        <ArrowRight />
      </button>
    </div>
  );
}
export function PagedText({ text }: { text: string }) {
  return <p className="discover-prose">{text}</p>;
}
export function BusinessDiscover(_props: {
  number: string;
  title: string;
  kicker: string;
  intro: string;
}) {
  const dispatch = useAppDispatch(),
    state = useAppSelector((s) => s.brand),
    ar = state.language === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const published = useDiscoveryCatalog(),
    owner = state.userProfile?.uid;
  const saved = getDiscoverySelection(
    state.pageParameters["business_discovery"]?.["nicheSelection"],
  );
  const draft = (state.pageParameters["business_discovery"]?.["discoverDraft"] as
    DiscoveryDraft | undefined) || { profile: emptyDiscoveryProfile() };
  const [config, setConfig] = useState(defaultDiscoveryConfiguration),
    [configError, setConfigError] = useState(false);
  const [configAttempt, setConfigAttempt] = useState(0);
  const [release, setRelease] = useState<DiscoveryCatalog | null>(null);
  // const resumeReview = Boolean(saved && (!state.pageParameters["business_discovery"]?.["discoverDraft"] || draft.selection));
  // const [stage, setStage] = useState<Stage>(resumeReview ? "review" : "profile"),
  const [stage, setStage] = useState<Stage>("profile"),
    [group, setGroup] = useState(0),
    [part, setPart] = useState(0);
  const [busy, setBusy] = useState(false),
    // [progress, setProgress] = useState("profile"),
    [error, setError] = useState("");
  // const [analyzing, setAnalyzing] = useState(false);
  // const [analysisProgressOpen, setAnalysisProgressOpen] = useState(false);
  const [chooser, setChooser] = useState(false),
    [chooserNiche, setChooserNiche] = useState(""),
    [chooserPage, setChooserPage] = useState(0),
    [exporting, setExporting] = useState(false);
  const [profileResetKey, setProfileResetKey] = useState(0);
  const [translationAttempt, setTranslationAttempt] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const mounted = useRef(true),
    stopJob = useRef<(() => void) | null>(null),
    requestId = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeDiscoveryConfiguration(
      (value) => {
        setConfig(value);
        setConfigError(false);
      },
      () => setConfigError(true),
    );
    return () => {
      mounted.current = false;
      unsubscribe();
      stopJob.current?.();
    };
  }, [owner, configAttempt]);
  useEffect(() => {
    // setStage(resumeReview ? "review" : "profile");
    setStage("profile");
    setRelease(null);
    setChooser(false);
    setBusy(false);
    requestId.current = null;
  }, [owner]);
  const version = draft.analysis?.catalogVersion || saved?.catalogVersion;
  useEffect(() => {
    if (!version) return;
    let active = true;
    loadAnalysisCatalog(version)
      .then((value) => {
        if (active) setRelease(value);
      })
      .catch(() => {
        if (active)
          setError(
            t(
              "Could not load the saved catalog. Retry before confirming.",
              "تعذر تحميل الكتالوج المحفوظ. أعد المحاولة قبل التأكيد.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [version, owner]);
  const catalog = version
    ? (release?.version === version ? release : null) ||
      getCachedAnalysisCatalog(version) ||
      (published.catalog?.version === version ? published.catalog : null)
    : published.catalog;
  const selection =
    getDiscoveryDraftSelection(draft) ||
    (!state.pageParameters["business_discovery"]?.["discoverDraft"] && saved
      ? { nicheId: saved.nicheId, subNicheId: saved.subNicheId, source: "manual" as const }
      : undefined);
  const sub = catalog?.subNiches.find(
      (item) => item.id === selection?.subNicheId && item.nicheId === selection?.nicheId,
    ) ||
    (!catalog && saved && saved.catalogVersion === version &&
    saved.subNicheId === selection?.subNicheId && saved.nicheId === selection?.nicheId
      ? saved.profileSnapshot
      : undefined),
    niche = catalog?.niches.find((item) => item.id === selection?.nicheId);
  const profile = draft.profile,
    current = analysisIsCurrent(draft);
  const put = (next: DiscoveryDraft) =>
    dispatch(
      actions.setPageParameter({ pageId: "business_discovery", key: "discoverDraft", value: next }),
    );
  const latestDraft = (): DiscoveryDraft =>
    (store.getState().brand.pageParameters["business_discovery"]?.[
      "discoverDraft"
    ] as DiscoveryDraft) || { profile: emptyDiscoveryProfile() };
  const displayLanguage = ar ? "ar" : "en";
  const translatedText = draft.analysis?.translations?.[displayLanguage];
  const displayedAnalysis = draft.analysis ? { ...draft.analysis, ...translatedText } : undefined;
  const needsTranslation = Boolean(draft.analysis && analysisLanguage(draft.analysis) !== displayLanguage && !translatedText);
  useEffect(() => {
    const analysis = draft.analysis;
    if (!owner || stage !== "recommendation" || !analysis || !needsTranslation) {
      setTranslating(false);
      setTranslationError("");
      return;
    }
    let active = true;
    setTranslating(true);
    setTranslationError("");
    translateDiscoveryAnalysis(crypto.randomUUID(), analysis.analysisId, displayLanguage)
      .then(async value => {
        const latest = latestDraft();
        if (!active || store.getState().brand.userProfile?.uid !== owner || latest.analysis?.analysisId !== analysis.analysisId) return;
        put({ ...latest, analysis: { ...latest.analysis, translations: { ...latest.analysis.translations, [displayLanguage]: value } } });
        await saveBrandDraft();
      })
      .catch(cause => { if (active) setTranslationError(aiError(cause, ar)); })
      .finally(() => { if (active) setTranslating(false); });
    return () => { active = false; };
  }, [owner, stage, draft.analysis?.analysisId, needsTranslation, displayLanguage, translationAttempt]);
  function editProfile(patch: Partial<typeof profile>) {
    put(editDiscoveryDraftProfile(draft, patch, config.version, crypto.randomUUID()));
    if ("language" in patch || "defaultLanguage" in patch) {
      const updated = { ...profile, ...patch };
      const language = updated.language === "both" ? updated.defaultLanguage : updated.language;
      if (language === "ar" || language === "en") dispatch(actions.setLanguage(language));
    }
    requestId.current = null;
    setError("");
  }
  const switchGroup = (next: number) => {
    setGroup(next);
    setPart(0);
    setError("");
  };
  const decisions = (kind: string, subNicheId: string | null) => [
    ...(draft.decisions || []).slice(-19),
    { kind, subNicheId, reason: "", at: new Date().toISOString() },
  ];
  /* AI analysis temporarily disabled; original implementation retained.
  async function analyze() {
    if (busy || configError || profileIssues(profile).length) return;
    const prepared =
      profile.questionnaireVersion === config.version
        ? profile
        : { ...profile, questionnaireVersion: config.version, revision: crypto.randomUUID() };
    put({ ...draft, profile: prepared, committedRevision: undefined });
    const uid = owner,
      id = requestId.current || crypto.randomUUID();
    requestId.current = id;
    setBusy(true);
    setAnalyzing(true);
    setAnalysisProgressOpen(true);
    setError("");
    setProgress("profile");
    stopJob.current?.();
    try {
      await saveBrandDraft();
      if (
        store.getState().brand.userProfile?.uid !== uid ||
        latestDraft().profile.revision !== prepared.revision
      )
        throw new Error("Profile changed");
      let resolveSaved: (result: DiscoveryAnalysis) => void;
      const savedResult = new Promise<DiscoveryAnalysis>(resolve => { resolveSaved = resolve; });
      stopJob.current = subscribeDiscoveryAnalysis(id, (value) => {
        if (mounted.current && store.getState().brand.userProfile?.uid === uid) {
          setProgress(value.stage);
          if (value.status === "failed") requestId.current = null;
          if (value.status === "complete" && value.persisted && value.result?.analysisId === id && value.result.profileRevision === prepared.revision) resolveSaved(value.result);
        }
      });
      // The saved job can arrive before optional operation accounting finishes.
      // Both promises stay observed, so a late provider rejection is handled.
      const result = await Promise.race([analyzeDiscoveryProfile(id, prepared.revision, state.language), savedResult]),
        frozen = catalog?.version === result.catalogVersion ? catalog : await loadAnalysisCatalog(result.catalogVersion);
      if (
        !mounted.current ||
        store.getState().brand.userProfile?.uid !== uid ||
        latestDraft().profile.revision !== result.profileRevision
      )
        return;
      setRelease(frozen);
      put({
        ...latestDraft(),
        analysis: result,
        selection:
          result.status === "recommended"
            ? { nicheId: result.nicheId!, subNicheId: result.subNicheId!, source: "ai" }
            : undefined,
        qualificationAnswers:
          latestDraft().qualificationAnswers?.subNicheId === result.subNicheId
            ? latestDraft().qualificationAnswers
            : undefined,
      });
      setStage("recommendation");
      setPart(0);
      requestId.current = null;
    } catch (cause) {
      if ((cause as { diagnostic?: string })?.diagnostic === "discovery-missing-source-urls") requestId.current = null;
      if (mounted.current && store.getState().brand.userProfile?.uid === uid)
        setError(aiError(cause, ar));
    } finally {
      if (mounted.current && store.getState().brand.userProfile?.uid === uid) {
        setBusy(false);
        setAnalyzing(false);
        stopJob.current?.();
      }
    }
  }
  */
  function openChooser() {
    setChooser(true);
    setChooserNiche("");
    setChooserPage(0);
    setError("");
  }
  function selectManual(id: string) {
    const item = catalog?.subNiches.find((value) => value.id === id);
    if (!item) return;
    put({
      ...draft,
      selection: { nicheId: item.nicheId, subNicheId: item.id, source: "manual" },
      offer: undefined,
      audience: undefined,
      qualificationAnswers:
        draft.qualificationAnswers?.subNicheId === item.id ? draft.qualificationAnswers : undefined,
      committedRevision: undefined,
      decisions: decisions("manual", id),
    });
    // setChooser(false); // Keep the specialization choices visible until saving.
    setPart(0);
    // setStage("review"); // Market review is temporarily disabled.
  }
  const offer =
    draft.offer ??
    (sub
      ? `${ar ? sub.nameAr : sub.nameEn}: ${ar ? sub.desiredOutcomeAr : sub.desiredOutcomeEn}`
      : state.businessDescription);
  const audience =
    draft.audience ?? (sub ? (ar ? sub.buyerProfileAr : sub.buyerProfileEn) : state.targetAudience);
  const preview =
    catalog && sub ? cloneDiscoveryWorkspace(catalog, sub, state.brandName, state.language) : null;
  const qualificationAnswers = sub
    ? getDiscoveryQualificationAnswers(
        draft,
        sub.id,
        sub.qualificationQuestionsEn,
        sub.qualificationQuestionsAr,
      )
    : undefined;
  async function commit() {
    if (!catalog || !sub || !selection || busy) return;
    /* Full questionnaire validation retained while those sections are disabled.
    if (draft.selection && profileIssues(profile).length) {
      setStage("profile");
      setError(t("Complete your profile before saving.", "أكمل ملفك قبل الحفظ."));
      return;
    }
    */
    const uid = owner;
    setBusy(true);
    setError("");
    try {
      const canonical = createDiscoverySelection(catalog, sub);
      if (!saved || saved.subNicheId !== sub.id || saved.catalogVersion !== catalog.version)
        dispatch(actions.confirmDiscovery({ selection: canonical, workspace: preview! }));
      dispatch(actions.setBusinessDescription(offer));
      dispatch(actions.setTargetAudience(audience));
      put({
        ...draft,
        selection,
        offer,
        audience,
        qualificationAnswers,
        committedRevision: profile.revision,
        decisions: decisions("confirmed", sub.id),
      });
      await saveBrandDraft();
      if (store.getState().brand.userProfile?.uid !== uid) return;
      const confirmed = getDiscoverySelection(
        store.getState().brand.pageParameters["business_discovery"]?.["nicheSelection"],
      );
      if (confirmed?.subNicheId !== sub.id || confirmed.catalogVersion !== catalog.version)
        throw new Error("Concurrent setup change");
      dispatch(actions.nextStep());
    } catch {
      if (mounted.current && store.getState().brand.userProfile?.uid === uid)
        setError(
          t(
            "Could not confirm this setup. Retry saving your draft.",
            "تعذر تأكيد الإعداد. حاول حفظ مسودتك مجددًا.",
          ),
        );
    } finally {
      if (mounted.current && store.getState().brand.userProfile?.uid === uid) setBusy(false);
    }
  }
  /* AI stage labels retained for re-enabling the navigation.
  const labels = [
    t("Your Profile", "ملفك"),
    t("AI Recommendation", "ترشيح AI"),
    t("Market Review", "مراجعة السوق"),
  ];
  */
  const fields = sub
    ? [
        [t("Who you'll serve", "من ستخدم"), ar ? sub.targetAudienceAr : sub.targetAudienceEn],
        [t("Typical buyer", "المشتري المعتاد"), ar ? sub.buyerProfileAr : sub.buyerProfileEn],
        [t("Core problems", "المشكلات الأساسية"), ar ? sub.coreProblemsAr : sub.coreProblemsEn],
        [t("Daily sales pain", "المعاناة اليومية"), ar ? sub.dayToDayPainAr : sub.dayToDayPainEn],
        [
          t("Desired outcome", "النتيجة المطلوبة"),
          ar ? sub.desiredOutcomeAr : sub.desiredOutcomeEn,
        ],
        [t("How GOS helps", "كيف يساعد GOS"), ar ? sub.gosSolutionAr : sub.gosSolutionEn],
      ]
    : [];
  const report = {
    configuration: config,
    profile,
    analysis: draft.analysis,
    selection,
    offer,
    audience,
    qualificationAnswers,
    status: draft.committedRevision === profile.revision ? "confirmed" : "draft",
    nicheName: niche ? (ar ? niche.nameAr : niche.nameEn) : saved && saved.nicheId === selection?.nicheId ? (ar ? saved.nicheNameAr : saved.nicheNameEn) : "",
    subNicheName: sub ? (ar ? sub.nameAr : sub.nameEn) : "",
    details: [
      ...fields.map(([label, value]) => [label, value || ""] as [string, string]),
      ...(preview ? [
        [t("Funnel", "الفانل"), preview.funnelSteps.map((item, index) => `${index + 1}. ${ar ? item.nameAr : item.nameEn}`).join("\n")] as [string, string],
        [t("Sales pipeline", "مراحل المبيعات"), preview.pipelineStages.map((item, index) => `${index + 1}. ${ar ? item.nameAr : item.nameEn}`).join("\n")] as [string, string],
      ] : []),
    ],
  };
  const miniTabs = (items: string[]) => {
    const nextKey = ar ? "ArrowLeft" : "ArrowRight";
    const previousKey = ar ? "ArrowRight" : "ArrowLeft";
    return (
      <div className="discover-mini-tabs" role="tablist">
        {items.map((label, index) => (
          <button
            type="button"
            key={label}
            role="tab"
            aria-selected={part === index}
            tabIndex={part === index ? 0 : -1}
            disabled={busy}
            onClick={() => setPart(index)}
            onKeyDown={(e) => {
              if (![nextKey, previousKey, "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? items.length - 1
                    : (index + (e.key === nextKey ? 1 : -1) + items.length) % items.length;
              setPart(next);
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
                [next]?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };
  const chooserMarket = catalog?.niches.find((item) => item.id === chooserNiche);
  return (
    <section className="discover-page discover-market-only" dir={ar ? "rtl" : "ltr"}>
      <header className="discover-header">
        <div>
          <div className="discover-title-row">
            <span className="discover-title-number">01</span>
            <h1>{t("Discover Your Market", "اكتشف سوقك")}</h1>
          </div>
          <p>
            {t(
              "Let's start with what you know, what interests you, and where you want to compete.",
              "لنبدأ بما تعرفه، وما يهمك، وأين تريد المنافسة.",
            )}
          </p>
        </div>
        {/* AI stage navigation temporarily disabled.
        <StageStepper
          className="discover-progress-nav"
          label={t("Discovery stages", "مراحل اكتشاف السوق")}
          language={state.language}
          activeId={stage}
          steps={stages.map((id, index) => ({
            id,
            label: labels[index]!,
            completed: index < stages.indexOf(stage),
            disabled:
              busy ||
              (id !== "profile" && id !== "recommendation" && !selection) ||
              (id === "recommendation" && !draft.analysis && !selection),
          }))}
          onStepChange={(id) => {
            setStage(id as Stage);
            setPart(0);
            setChooser(false);
          }}
        />
        */}
      </header>

      <div className="discover-layout">
        <main
          className={`discover-main-card ${stage === "profile" && !chooser ? "discover-profile-card" : ""} ${stage === "recommendation" && !chooser ? "is-recommendation" : ""} ${chooser ? "is-chooser" : ""}`}
        >
          {chooser ? (
            <>
              <div className="discover-card-heading">
                <div>
                  <span className="discover-eyebrow">
                    {chooserNiche ? t("STEP 02 · SPECIALIZATION", "الخطوة 02 · التخصص") : t("STEP 01 · MARKET", "الخطوة 01 · المجال")}
                  </span>
                  <h2>
                    {chooserNiche
                      ? t("Choose a specialization", "اختر تخصصًا")
                      : t("Choose a market", "اختر مجالًا")}
                  </h2>
                  <p>{chooserNiche
                    ? t("Choose the specialization that fits your direction. Your choice is provisional until you save.", "اختر التخصص الأنسب لاتجاهك. يظل اختيارك مؤقتًا حتى الحفظ النهائي.")
                    : t("Explore the markets, then choose one to see its specializations.", "استكشف المجالات واختر مجالًا لعرض التخصصات المتاحة.")}</p>
                </div>
                <button
                  className="discover-icon-button"
                  disabled={busy}
                  aria-label={t("Close chooser", "إغلاق الاختيارات")}
                  onClick={() => setChooser(false)}
                >
                  <X />
                </button>
              </div>
              {chooserMarket && (
                <div className="discover-market-context">
                  <span>{t("Selected market", "المجال المختار")}</span>
                  <strong>{ar ? chooserMarket.nameAr : chooserMarket.nameEn}</strong>
                  <button type="button" disabled={busy} onClick={() => { setChooserNiche(""); setChooserPage(0); }}>
                    {t("Change market", "تغيير المجال")}
                  </button>
                </div>
              )}
              {catalog ? (
                <>
                  <div className="discover-market-grid">
                    {(chooserNiche
                      ? getActiveSubNiches(catalog, chooserNiche)
                      : getActiveNiches(catalog)
                    )
                      .slice(chooserPage * 8, chooserPage * 8 + 8)
                      .map((item, index) => (
                        <button
                          type="button"
                          key={item.id}
                          disabled={busy}
                          aria-pressed={chooserNiche ? selection?.subNicheId === item.id : selection?.nicheId === item.id}
                          className={
                            item.id ===
                            (chooserNiche
                              ? selection?.subNicheId || draft.analysis?.subNicheId
                              : selection?.nicheId || draft.analysis?.nicheId)
                              ? "selected"
                              : ""
                          }
                          onClick={() => {
                            if (chooserNiche) selectManual(item.id);
                            else {
                              setChooserNiche(item.id);
                              setChooserPage(0);
                            }
                          }}
                        >
                          <span className="discover-market-number" aria-hidden="true" dir="ltr">
                            {String(chooserPage * 8 + index + 1).padStart(2, "0")}
                          </span>
                          <span className="discover-market-copy">
                            <strong>{ar ? item.nameAr : item.nameEn}</strong>
                            {(draft.analysis?.subNicheId === item.id ||
                              draft.analysis?.nicheId === item.id) && (
                              <small>{t("AI recommended", "ترشيح AI")}</small>
                            )}
                          </span>
                          {chooserNiche && selection?.subNicheId === item.id
                            ? <Check className="discover-market-check" aria-hidden="true" />
                            : <ArrowRight aria-hidden="true" />}
                        </button>
                      ))}
                  </div>
                  {chooserNiche && selection?.nicheId === chooserNiche && sub && (
                    <div className="discover-choice-summary" role="status">
                      <span className="discover-summary-icon"><Check aria-hidden="true" /></span>
                      <div>
                        <strong>{t("Your selection", "اختيارك")}: {ar ? sub.nameAr : sub.nameEn}</strong>
                        <p>{t("Ready? Continue and save to confirm your direction.", "جاهز للخطوة التالية؟ اضغط متابعة وحفظ لتأكيد اتجاهك.")}</p>
                      </div>
                    </div>
                  )}
                  <div className="discover-inline-footer">
                    <small>{t("Provisional until the final save.", "اختيار مؤقت حتى الحفظ النهائي.")}</small>
                    <Pager
                      ar={ar}
                      page={chooserPage}
                      last={Math.max(
                        0,
                        Math.ceil(
                          (chooserNiche
                            ? getActiveSubNiches(catalog, chooserNiche)
                            : getActiveNiches(catalog)
                          ).length / 8,
                        ) - 1,
                      )}
                      onChange={setChooserPage}
                    />
                  </div>
                </>
              ) : (
                <p className="discover-catalog-loading" role="status"><Loader2 className="animate-spin" aria-hidden="true" />{t("Loading catalog…", "تحميل الكتالوج…")}</p>
              )}
            </>
          ) : stage === "profile" ? (
            <DiscoverProfileForm
              key={profileResetKey}
              profile={profile}
              config={config}
              edit={editProfile}
              ar={ar}
              busy={busy}
            />
          ) : stage === "recommendation" ? (
            <>
              <div className="discover-card-heading">
                <div>
                  <small className="discover-eyebrow">
                    {selection?.source === "manual"
                      ? t("YOUR SELECTION", "اختيارك")
                      : t("RECOMMENDED FOR YOU", "الترشيح المناسب لك")}
                  </small>
                  <h2>
                    {sub
                      ? ar
                        ? sub.nameAr
                        : sub.nameEn
                      : t("Let's refine your direction", "لنحدد اتجاهك بدقة")}
                  </h2>
                  <p>{niche ? (ar ? niche.nameAr : niche.nameEn) : ""}</p>
                </div>
                <Sparkles />
              </div>
              {draft.analysis && !current && (
                <p className="discover-warning">
                  {t(
                    "These suggestions use your previous answers. You can keep this direction or generate an updated analysis.",
                    "الاقتراحات دي مبنية على إجاباتك السابقة. تقدر تكمل بنفس الاتجاه أو تولّد تحليل جديد باختيارك.",
                  )}
                </p>
              )}
              {draft.analysis?.status === "needs_clarification" ? (
                <div className="discover-review-content">
                  <PagedText text={needsTranslation && !translationError ? t("Translating…", "جارٍ الترجمة…") : displayedAnalysis?.clarification || ""} />
                  <button onClick={() => setStage("profile")}>
                    {t("Update my profile", "تعديل ملفي")}
                  </button>
                </div>
              ) : (
                <>
                  {miniTabs([
                    t("Why it fits", "سبب الملاءمة"),
                    t("Evidence & limits", "الأدلة والحدود"),
                    t("Sources", "المصادر"),
                  ])}
                  <div className="discover-review-content">
                    {needsTranslation && !translationError && part !== 2 ? <p role="status" className="discover-prose">{t("Translating…", "جارٍ الترجمة…")}</p> : part === 0 ? (
                      <PagedText
                        text={
                          displayedAnalysis?.reasons.join("\n\n") ||
                          t(
                            "You selected this direction manually. Explore its details before saving.",
                            "اخترت هذا الاتجاه يدويًا. استكشف تفاصيله قبل الحفظ.",
                          )
                        }
                      />
                    ) : part === 1 ? (
                      <>
                        <PagedText
                          text={
                            [
                              ...(displayedAnalysis?.problemSignals || []),
                              ...(displayedAnalysis?.tradeoffs || []),
                            ].join("\n\n") ||
                            t(
                              "No verified evidence returned. Profile matching is not proof of demand.",
                              "لم تُرجع العملية أدلة موثقة. مطابقة الملف ليست إثباتًا للطلب.",
                            )
                          }
                        />
                        <span className="discover-badge">
                          {t("Competition", "المنافسة")}: {ar ? ({ low: "منخفضة", medium: "متوسطة", high: "مرتفعة", unknown: "غير معروفة" }[draft.analysis?.competition || "unknown"]) : draft.analysis?.competition || "unknown"}
                        </span>
                      </>
                    ) : (
                      <DiscoverySources key={draft.analysis?.analysisId} sources={draft.analysis?.sources || []} ar={ar} status={draft.analysis?.audienceResearchStatus} />
                    )}
                  </div>
                </>
              )}
              {translationError && <div role="alert" className="discover-warning"><p>{translationError}</p><button type="button" disabled={translating} onClick={() => setTranslationAttempt(value => value + 1)}>{t("Retry translation", "إعادة الترجمة")}</button></div>}
              <div className="discover-inline-footer">
                <button
                  onClick={() => {
                    put({
                      ...draft,
                      selection: undefined,
                      committedRevision: undefined,
                      decisions: decisions("rejected", draft.analysis?.subNicheId || null),
                    });
                    openChooser();
                  }}
                >
                  {t("Not for me", "لا يناسبني")}
                </button>
                <button
                  disabled={!sub || busy}
                  onClick={() => {
                    setStage("review");
                    setPart(0);
                  }}
                >
                  {t("Explore", "استكشف")}
                  <ArrowRight />
                </button>
              </div>
            </>
          ) : stage === "review" && sub ? (
            /* Market review temporarily disabled; original page retained.
            <>
              <div className="discover-card-heading">
                <div>
                  <small className="discover-eyebrow">
                    {t("YOUR SPECIALIZATION", "تخصص نشاطك")}
                  </small>
                  <h2>{ar ? sub.nameAr : sub.nameEn}</h2>
                  <p>{ar ? sub.desiredOutcomeAr : sub.desiredOutcomeEn}</p>
                </div>
              </div>
              {miniTabs([
                t("Audience", "الجمهور"),
                t("Problems", "المشكلات"),
                t("GOS Solution", "حل GOS"),
              ])}
              <div className={`discover-detail-grid ${part === 0 ? "has-audience-sources" : ""}`}>
                {fields.slice(part * 2, part * 2 + 2).map(([label, value]) => (
                  <article key={label}>
                    <h3>{label}</h3>
                    <PagedText text={value!} />
                  </article>
                ))}
              </div>
              {part === 0 && <DiscoverySources
                key={`${draft.analysis?.analysisId}-${sub.id}`}
                sources={current && draft.analysis?.subNicheId === sub.id ? draft.analysis.audienceSources || [] : []}
                ar={ar} audience
                status={current && draft.analysis?.subNicheId === sub.id ? draft.analysis.audienceResearchStatus : undefined}
              />}
              <p className="discover-note">
                {t(
                  "Approved catalog content. Research evidence is shown separately.",
                  "محتوى الكتالوج المعتمد. أدلة البحث معروضة منفصلة.",
                )}
              </p>
            </>
            */
            null
          ) : (
            <div className="discover-center">
              <Loader2 />
              <p>{t("Loading specialization…", "تحميل التخصص…")}</p>
              <button onClick={() => setStage("profile")}>
                {t("Back to profile", "العودة لملفك")}
              </button>
            </div>
          )}
        </main>
        {/* AI intelligence panel temporarily disabled; original code retained.
        <aside
          className={`discover-intelligence ${stage === "profile" ? "is-profile" : "is-result"}`}
        >
          <div className="discover-ai-heading">
            <span>
              <Sparkles />
            </span>
            <div>
              <h2>GOS Market Intelligence</h2>
              <p>{t("Your profile + approved markets", "ملفك + الأسواق المعتمدة")}</p>
            </div>
          </div>
          <p className="discover-ai-description">
            {t(
              "We'll use your answers to research markets, competitors, demand signals and business problems before recommending a direction.",
              "نستخدم إجاباتك لبحث الأسواق والمنافسين وإشارات الطلب ومشكلات الأنشطة قبل ترشيح اتجاه.",
            )}
          </p>
          <Dialog.Root open={analysisProgressOpen} onOpenChange={(open) => {
            if (!analyzing) setAnalysisProgressOpen(open);
          }}>
            <Dialog.Portal container={brandEnginePortalContainer()}>
              <Dialog.Overlay className="discover-generation-overlay" />
              <Dialog.Content className="discover-generation-dialog" dir={ar ? "rtl" : "ltr"}
                onEscapeKeyDown={(event) => { if (analyzing) event.preventDefault(); }}
                onInteractOutside={(event) => { if (analyzing) event.preventDefault(); }}>
                <Dialog.Title>{t("AI Business Discovery", "تحليل النشاط بالذكاء الاصطناعي")}</Dialog.Title>
                <Dialog.Description>{t("Research based on your saved answers and business profile.",
                  "بحث مبني على إجاباتك المحفوظة وبيانات نشاطك.")}</Dialog.Description>
                <AIGenerationProgress busy={analyzing} error={error} ar={ar}
                  operation="analyzeDiscoveryProfile" requestId={requestId.current || undefined}
                  stage={progress} />
                <Dialog.Close className="discover-generation-close" disabled={analyzing}>
                  {analyzing ? t("Please wait for analysis to finish", "انتظر لحد ما التحليل يخلص")
                    : error ? t("Back to my answers", "ارجع لإجاباتي") : t("View results", "شوف النتائج")}
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          {analyzing ? (
            <div className="discover-progress" role="status" aria-live="polite">
              <h3>
                <Loader2 className="animate-spin" />
                {t("Analysis in progress", "التحليل قيد التنفيذ")}
              </h3>
              {["profile", "matching", "research", "comparing"].map((id, index) => (
                <p
                  key={id}
                  className={
                    ["profile", "matching", "research", "comparing", "complete"].indexOf(
                      progress,
                    ) >= index
                      ? "active"
                      : ""
                  }
                >
                  <span>{index + 1}</span>
                  {
                    [
                      t("Understanding your profile", "فهم ملفك"),
                      t("Matching approved markets", "مطابقة الأسواق"),
                      t("Researching businesses & problems", "بحث الأنشطة والمشكلات"),
                      t("Comparing evidence & opportunities", "مقارنة الأدلة والفرص"),
                    ][index]
                  }
                </p>
              ))}
            </div>
          ) : busy ? (
            <div className="discover-progress" role="status" aria-live="polite">
              <h3><Loader2 className="animate-spin" />{t("Saving your direction", "جارٍ حفظ اتجاهك")}</h3>
              <p>{t("Saving your changes before opening AI Branding Studio.", "بنحفظ تعديلاتك قبل فتح استوديو الهوية بالـAI.")}</p>
            </div>
          ) : (
            <>
              {stage === "profile" ? (
                <>
                <button
                  className="discover-primary"
                  disabled={configError || profileIssues(profile).length > 0}
                  onClick={() => void analyze()}
                >
                  <Sparkles />
                  {t("Analyze My Options", "حلّل اختياراتي")}
                </button>
                {draft.analysis && selection && sub && <button type="button"
                  className="discover-generation-resume" disabled={busy}
                  onClick={() => { setStage("recommendation"); setPart(0); }}>
                  {t("Continue with my saved direction", "كمل بالاتجاه المحفوظ")}
                  <ArrowRight size={16} />
                </button>}
                </>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="discover-primary" disabled={configError}>
                      <Sparkles />
                      {t("Review my profile", "راجع ملفي")}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("Return to Your Profile?", "الرجوع إلى ملفك؟")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          "Review or edit your answers while keeping your current recommendation and setup. You can generate an updated analysis whenever you choose.",
                          "راجع أو عدّل إجاباتك مع الاحتفاظ بالترشيح والإعدادات الحالية. تقدر تولّد تحليل جديد وقت ما تختار.",
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="from-[var(--sa-primary)] to-[var(--sa-primary-hover)] hover:from-[var(--sa-primary-hover)] hover:to-[var(--sa-primary)]"
                        onClick={() => {
                          setStage("profile");
                          switchGroup(0);
                          setPart(0);
                          setChooser(false);
                        }}
                      >
                        {t("Yes, review my profile", "نعم، راجع ملفي")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {stage === "profile" && !error && !published.error && !configError && (
                <DiscoveryResearchPreview ar={ar} />
              )}
              <div className="discover-summary">
                <h3>{t("Your profile", "ملفك")}</h3>
                <p>
                  <span>{t("Interests", "الاهتمامات")}</span>
                  <b>{profile.interests.length}</b>
                </p>
                <p>
                  <span>{t("Skills", "المهارات")}</span>
                  <b>{profile.skills.length}</b>
                </p>
                <p>
                  <span>{t("Market", "السوق")}</span>
                  <b>
                    {config.markets.find((item) => item.id === profile.market)?.[
                      ar ? "ar" : "en"
                    ] ||
                      profile.market ||
                      "—"}
                  </b>
                </p>
                <p>
                  <span>{t("Languages", "اللغات")}</span>
                  <b>{profile.language === "both" ? t("Arabic + English", "العربية + الإنجليزية") : profile.language === "ar" ? t("Arabic", "العربية") : profile.language === "en" ? t("English", "الإنجليزية") : "—"}</b>
                </p>
                {profile.language === "both" && profile.defaultLanguage && (
                  <p>
                    <span>{t("Default language", "اللغة الافتراضية")}</span>
                    <b>{profile.defaultLanguage === "ar" ? t("Arabic", "العربية") : t("English", "الإنجليزية")}</b>
                  </p>
                )}
                <p>
                  <span>{t("Selling", "البيع")}</span>
                  <b>{profile.selling.toUpperCase() || "—"}</b>
                </p>
              </div>
              {draft.analysis && (
                <div className="discover-result-meta">
                  <span className="discover-badge">
                    {draft.analysis.mode === "research"
                      ? t("Research-backed · provisional", "بحث بمصادر · أولي")
                      : t("Profile matching · limited evidence", "مطابقة الملف · أدلة محدودة")}
                  </span>
                  <small>
                    {t(
                      "Recommendations do not guarantee market demand.",
                      "الترشيحات لا تضمن وجود طلب بالسوق.",
                    )}
                  </small>
                </div>
              )}
            </>
          )}
          {(error || published.error || configError) && (
            <p className="discover-error" role="alert">
              {error ||
                t(
                  "Could not load published questions or catalog. Check your connection.",
                  "تعذر تحميل الأسئلة أو الكتالوج. تحقق من الاتصال.",
                )}
              <button
                onClick={() => {
                  setConfigAttempt((value) => value + 1);
                  published.retry();
                  if (version)
                    void loadAnalysisCatalog(version)
                      .then(setRelease)
                      .catch(() => {});
                }}
              >
                {t("Retry", "حاول مجددًا")}
              </button>
            </p>
          )}
          {(stage === "profile" || stage === "recommendation") && (
            <div className="discover-ai-bottom">
              <button disabled={busy || !catalog} onClick={openChooser}>
                {t("Choose Niche Manual", "اختيار التخصص يدويًا")}
              </button>
            </div>
          )}
        </aside>
        */}
      </div>
      {(error || published.error || configError) && (
        <p className="discover-error" role="alert">
          {error || t("Could not load questions or markets. Please retry.", "تعذر تحميل الأسئلة أو الأسواق. حاول مجددًا.")}
          <button type="button" onClick={() => { setConfigAttempt(value => value + 1); published.retry(); }}>
            {t("Retry", "حاول مجددًا")}
          </button>
        </p>
      )}
      <footer className="discover-footer">
        <button
          disabled={busy}
          onClick={() => {
            if (chooser && chooserNiche) {
              setChooserNiche("");
              setChooserPage(0);
            }
            else if (chooser) setChooser(false);
            else if (stage === "profile") switchGroup(Math.max(0, group - 1));
            else {
              setStage(stages[Math.max(0, stages.indexOf(stage) - 1)]!);
              setPart(0);
            }
          }}
        >
          <ArrowLeft />
          {t("Back", "رجوع")}
        </button>
        {/* <small>{t("AI recommends. You choose.", "الـAI يرشح، وأنت تختار.")}</small> */}
        <small>{t("Explore markets and choose your direction.", "استكشف الأسواق واختار اتجاهك.")}</small>
        <div>
          {stage === "profile" && !chooser && (
            <button type="button" className="discover-primary" disabled={busy || !catalog} onClick={openChooser}>
              {t("Explore markets", "استكشاف السوق")}
              <ArrowRight />
            </button>
          )}
          {stage === "profile" && !chooser && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="discover-reset" disabled={busy || exporting}>
                  <RotateCcw />
                  {t("Reset", "إعادة ضبط")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Reset your profile?", "إعادة ضبط ملفك؟")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "This will clear all choices and answers in Your Profile and discard recommendations based on them. You can then choose again.",
                      "سيتم مسح كل الاختيارات والإجابات في ملفك وإلغاء الترشيحات المبنية عليها، لتتمكن من الاختيار من جديد.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("No, cancel", "لا، إلغاء")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="discover-reset-confirm"
                    onClick={() => {
                      requestId.current = null;
                      stopJob.current?.();
                      put({
                        profile: { ...emptyDiscoveryProfile(config.version), revision: crypto.randomUUID() },
                        decisions: decisions("profile_reset", null),
                      });
                      setRelease(null);
                      setGroup(0);
                      setPart(0);
                      setError("");
                      setProfileResetKey(value => value + 1);
                    }}
                  >
                    <RotateCcw />
                    {t("Yes, reset", "نعم، إعادة ضبط")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <button
            type="button"
            disabled={busy || exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportDiscoveryPDF(report, ar);
              } catch {
                setError(t("Could not export the PDF. Please try again.", "تعذر تصدير PDF. حاول مرة أخرى."));
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            {exporting ? t("Preparing PDF…", "تجهيز PDF…") : t("Export PDF", "تصدير PDF")}
          </button>
          {chooser && chooserNiche && selection?.nicheId === chooserNiche && (
            <button
              type="button"
              className="discover-primary"
              disabled={busy || !catalog || !sub || !preview}
              onClick={() => void commit()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {busy ? t("Saving…", "جارٍ الحفظ…") : t("Continue and Save", "متابعة وحفظ")}
            </button>
          )}
          {/* Previous review navigation retained while the review page is disabled.
          {stage !== "profile" && selection && !chooser && (
            <button
              className="discover-primary"
              disabled={busy || !sub || (stage === "review" && !preview)}
              onClick={() => {
                if (stage === "review") void commit();
                else {
                  setStage("review");
                  setPart(0);
                }
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {busy
                ? t("Saving…", "جارٍ الحفظ…")
                : stage === "review"
                  ? t("Continue and Save", "متابعة وحفظ")
                  : t("Continue", "متابعة")}
            </button>
          )}
          */}
        </div>
      </footer>
    </section>
  );
}
