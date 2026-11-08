import { brandEnginePortalContainer } from "../../lib/portalContainer";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Sparkles, X } from 'lucide-react';
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import {
  resolveBrandTheme,
  type BrandElement,
  type BrandElementAnswers,
  type BrandElementCandidate,
  type BrandElementGeneration,
} from "@/modules/brand-engine/data/brandTheme";
import { StudioSelect } from "./StudioSelect";
import { BrandLogoImage } from "./BrandLogoImage";
import { AIGenerationProgress } from "./AIGenerationProgress";
import logoDesignSources from "@/modules/brand-engine/configuration/prompts/logoDesignSources.json";
import { useLogoAttempts } from "../../hooks/useLogoAttempts";
import { mergeLogoSuggestions } from "../../services/logoHistory.js";

export function StudioElementGenerator({
  element,
  busy,
  connected,
  error,
  requestId,
  onClose,
  onGenerate,
  onApply,
}: {
  element: BrandElement | null;
  busy: boolean;
  connected: boolean;
  error: string;
  requestId?: string | undefined;
  onClose: () => void;
  onGenerate: (element: BrandElement, answers: BrandElementAnswers) => Promise<boolean>;
  onApply: (element: BrandElement, candidate: BrandElementCandidate) => boolean;
}) {
  const lastElement = useRef(element);
  if (element) lastElement.current = element;
  return (
    <Dialog.Root
      open={Boolean(element)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal container={brandEnginePortalContainer()}>
        <Dialog.Overlay className="studio-dialog-overlay" />
        <Dialog.Content
          className={`studio-theme studio-choice-dialog studio-element-dialog${element === 'logo' ? ' studio-logo-generator-dialog' : ''}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document
              .getElementById(`studio-generate-${lastElement.current}`)
              ?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (busy) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          {element && (
            <StudioElementGeneratorContent
              key={element}
              element={element}
              busy={busy}
              connected={connected}
              error={error}
              requestId={requestId}
              onClose={onClose}
              onGenerate={onGenerate}
              onApply={onApply}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StudioElementGeneratorContent({
  element,
  busy,
  connected,
  error,
  requestId,
  onClose,
  onGenerate,
  onApply,
}: {
  element: BrandElement;
  busy: boolean;
  connected: boolean;
  error: string;
  requestId?: string | undefined;
  onClose: () => void;
  onGenerate: (element: BrandElement, answers: BrandElementAnswers) => Promise<boolean>;
  onApply: (element: BrandElement, candidate: BrandElementCandidate) => boolean;
}) {
  const state = useAppSelector((s) => s.brand),
    ar = state.language === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const dispatch = useAppDispatch();
  const theme = resolveBrandTheme(state);
  const logoAttempts = useLogoAttempts(state.userProfile?.uid, element === "logo");
  const logoLimitReached = element === "logo" && logoAttempts.used >= 3;
  const logoUnavailable = element === "logo" && (logoAttempts.loading || logoAttempts.historyLoading || logoAttempts.error || logoAttempts.historyError || logoLimitReached);
  const attemptsKnown = !(logoAttempts.loading || logoAttempts.historyLoading || logoAttempts.error || logoAttempts.historyError);
  const remaining = attemptsKnown ? Math.max(0, 3 - logoAttempts.used) : '—';
  const generation = (
    state.pageParameters["branding"]?.["elementGenerations"] as
      Partial<Record<BrandElement, BrandElementGeneration>> | undefined
  )?.[element];
  const suggestions: BrandElementCandidate[] = element === "logo"
    ? mergeLogoSuggestions(logoAttempts.suggestions, generation?.suggestions)
    : generation?.suggestions || [];
  const selectedCandidateId = (
    state.pageParameters["branding"]?.["selectedElementCandidates"] as
      Partial<Record<BrandElement, string>> | undefined
  )?.[element];
  const [answers, setAnswers] = useState<BrandElementAnswers>(
    (
      state.pageParameters["branding"]?.["elementQuestionDrafts"] as
        Partial<Record<BrandElement, BrandElementAnswers>> | undefined
    )?.[element] ||
      generation?.answers || { preference: "", detail: "", interest: "", nameLength: "two" },
  );
  const restoreLogoHistory = () => {
    if (element !== "logo" || !logoAttempts.suggestions.length ||
        !logoAttempts.suggestions.some(candidate => !generation?.suggestions.some(saved => saved.id === candidate.id))) return;
    const generations = state.pageParameters["branding"]?.["elementGenerations"] as
      Partial<Record<BrandElement, BrandElementGeneration>> | undefined;
    dispatch(actions.setPageParameter({ pageId: "branding", key: "elementGenerations", value: {
      ...generations,
      logo: { ...generation, answers: generation?.answers || answers, suggestions,
        inputFingerprint: generation?.inputFingerprint || "recovered-history",
        promptVersion: generation?.promptVersion || "recovered-history" },
    } }));
  };
  useEffect(() => {
    const drafts = state.pageParameters["branding"]?.["elementQuestionDrafts"] as
      Partial<Record<BrandElement, BrandElementAnswers>> | undefined;
    if (JSON.stringify(drafts?.[element]) !== JSON.stringify(answers))
      dispatch(
        actions.setPageParameter({
          pageId: "branding",
          key: "elementQuestionDrafts",
          value: { ...drafts, [element]: answers },
        }),
      );
  }, [answers, element, dispatch, state.pageParameters]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [localError, setLocalError] = useState("");
  const visibleError = element === 'logo' && /Firebase|firestore|permission|صلاحيات|AI Center/i.test(localError || error)
    ? t('Generation is temporarily unavailable. We are reconnecting automatically.', 'التوليد غير متاح مؤقتًا. بنحاول نرجّعه تلقائيًا.') : localError || error;
  const labels: Record<BrandElement, string> = {
    name: t("Generate Brand Name", "ولّد اسم البراند"),
    tagline: t("Generate Tagline", "ولّد الشعار النصي"),
    colors: t("Generate Colors", "ولّد الألوان"),
    typography: t("Generate Typography", "ولّد الخطوط"),
    logo: t("Generate Logo", "ولّد اللوجو"),
  };
  const questions: Record<BrandElement, [string, string, [string, string][]]> = {
    name: [
      t("Brand language", "لغة اسم البراند"),
      t("Name personality (optional)", "طابع الاسم (اختياري)"),
      [
        ["Arabic", t("Arabic", "عربي")],
        ["English", t("English", "إنجليزي")],
      ],
    ],
    tagline: [
      t("Benefit to highlight (optional)", "الميزة اللي عايز تبرزها (اختياري)"),
      t("Tone or extra details (optional)", "نبرة الكلام أو تفاصيل إضافية (اختياري)"),
      [
        ["Save time", t("Save time", "توفير الوقت")],
        ["Build trust", t("Build trust", "بناء الثقة")],
        ["Simplify work", t("Simplify work", "تبسيط العمل")],
      ],
    ],
    colors: [
      t("Brand feeling", "إحساس البراند"),
      t("Colors you prefer or avoid (optional)", "ألوان تفضلها أو تتجنبها (اختياري)"),
      [
        ["Trustworthy", t("Trustworthy", "موثوق")],
        ["Calm", t("Calm", "هادئ")],
        ["Energetic", t("Energetic", "حيوي")],
        ["Premium", t("Premium", "فاخر")],
      ],
    ],
    typography: [
      t("Type personality", "طابع الخط"),
      t("Reading priority (optional)", "أولوية الوضوح أو التميز (اختياري)"),
      [
        ["Modern", t("Modern", "عصري")],
        ["Elegant", t("Elegant", "أنيق")],
        ["Friendly", t("Friendly", "ودود")],
      ],
    ],
    logo: [
      t("Logo style", "طابع اللوجو"),
      t("Symbol idea or things to avoid (optional)", "فكرة الرمز أو حاجات تتجنبها (اختياري)"),
      [
        ...logoDesignSources.styles.map(style => [style.id, t(style.en, style.ar)] as [string, string]),
      ],
    ],
  };
  const [first, second, choices] = questions[element];
  const changed = JSON.stringify(answers) !== JSON.stringify(generation?.answers);
  return (
    <div dir={ar ? "rtl" : "ltr"}>
      <div className="studio-generation-header">
        <span className="studio-generation-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <Dialog.Title>{labels[element]}</Dialog.Title>
          <Dialog.Description>
            {t(
              "Uses your Discovery answers and current brand choices. Choose one result to apply it.",
              "بيعتمد على إجابات Discovery واختيارات براندك الحالية. اختار نتيجة عشان تطبقها.",
            )}
          </Dialog.Description>
        </div>
      </div>
      <Dialog.Close
        className="studio-dialog-close"
        disabled={busy}
        aria-label={t("Close", "إغلاق")}
      >
        <X size={20} />
      </Dialog.Close>
      {element === "logo" && (
        <div className="studio-logo-context">
          <strong>{state.brandName}</strong>
          <span className="studio-palette-strip">
            {[theme.light.primary, theme.light.secondary, theme.light.buttonBackground].map(
              (color, i) => (
                <i key={i} style={{ background: color }} title={color} />
              ),
            )}
          </span>
          <small>
            {t(
              "One finished logo per generation, using your business brief and the studio references. Three attempts per account.",
              "لوجو واحد مكتمل في كل توليد، من بيانات نشاطك ومراجع الاستوديو. لكل حساب ٣ محاولات فقط.",
            )}
          </small>
        </div>
      )}
      {element === "logo" && (
        <details className="studio-logo-design-sources">
          <summary>{t("Logo design references", "مراجع تصميم اللوجو")}</summary>
          <p>{t(
            "The generator receives reviewed design lessons from these real identities and original vector construction studies, adapted to your brand and selected style.",
            "التوليد بيستخدم دروس تصميم من الهويات الفعلية دي وأمثلة أصلية لبناء الرمز، ويكيّفها مع براندك والطابع اللي اخترته.",
          )}</p>
          <div>
            {logoDesignSources.caseStudies.map(source => (
              <a key={source.brand} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.brand} · {source.studio}
              </a>
            ))}
            {logoDesignSources.learningResources.map(source => (
              <a key={source.title} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
            ))}
          </div>
        </details>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (logoUnavailable) return;
          setLocalError("");
          try {
            if (await onGenerate(element, answers))
              requestAnimationFrame(() =>
                resultsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
              );
          } catch (error) {
            setLocalError(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        <div className="studio-generation-questions">
          <label className="studio-choice-field" htmlFor="studio-generation-preference">
            {first}
            <StudioSelect
              id="studio-generation-preference"
              label={first}
              value={answers.preference || "business-context"}
              disabled={busy}
              ar={ar}
              onChange={(value) =>
                setAnswers({
                  ...answers,
                  preference: value === "business-context" ? "" : value,
                })
              }
              options={[
                {
                  value: "business-context",
                  label: t("Use my business context", "استخدم بيانات حسابي"),
                },
                ...choices.map(([value, label]) => ({ value, label })),
                ...(answers.preference && !choices.some(([value]) => value === answers.preference)
                  ? [{ value: answers.preference, label: answers.preference }]
                  : []),
              ]}
            />
          </label>
          {element === "name" && (
            <>
              <label className="studio-choice-field" htmlFor="studio-name-length">
                {t("Name length", "عدد كلمات الاسم")}
                <StudioSelect
                  id="studio-name-length"
                  label={t("Name length", "عدد كلمات الاسم")}
                  value={answers.nameLength || "two"}
                  disabled={busy}
                  ar={ar}
                  onChange={(value) => setAnswers({ ...answers, nameLength: value === "one" ? "one" : "two" })}
                  options={[
                    { value: "one", label: t("One word", "كلمة واحدة") },
                    { value: "two", label: t("Two words", "كلمتين") },
                  ]}
                />
              </label>
              <label className="studio-choice-field">
                {t("Business or interests", "مجال العمل أو الاهتمام")}
                <input
                  maxLength={200}
                  value={answers.interest || ""}
                  placeholder={t("e.g. restaurants, fitness, coffee", "مثال: مطاعم، جيم، قهوة")}
                  disabled={busy}
                  onChange={(e) => setAnswers({ ...answers, interest: e.target.value })}
                />
              </label>
            </>
          )}
          <label className="studio-choice-field">
            {second}
            <input
              maxLength={element === "name" ? 200 : 400}
              value={answers.detail}
              placeholder={t("Optional — leave it to AI", "اختياري — اتركه للذكاء الاصطناعي")}
              disabled={busy}
              onChange={(e) => setAnswers({ ...answers, detail: e.target.value })}
            />
          </label>
        </div>
        <div className="studio-generation-actions">
          <small>
            {answers.preference
              ? t("Your preference + Discovery analysis", "اختيارك + تحليل Discovery")
              : t(
                  "Based on your saved Discovery answers and analysis",
                  "بناءً على إجابات وتحليل Discovery المحفوظين",
                )}
          </small>
          <button
            className="studio-done-button studio-element-generate"
            type="submit"
            disabled={busy || !connected || logoUnavailable}
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {busy
              ? t("Generating…", "جارٍ التوليد…")
              : logoLimitReached
                ? t("All 3 attempts used", "استخدمت الـ٣ محاولات")
              : element === "logo" && generation?.suggestions.length
                ? t("Generate next logo", "ولّد اللوجو التالي")
              : generation?.suggestions.length
                ? t("Generate Again", "ولّد بدائل جديدة")
                : labels[element]}
          </button>
        </div>
      </form>
      {element === "logo" && (
        <p className="studio-guided-note" role="status">
          {t(`Attempts remaining: ${remaining} of 3`, `المحاولات المتبقية: ${remaining} من ٣`)}
        </p>
      )}
      <AIGenerationProgress
        busy={busy}
        error={visibleError}
        ar={ar}
        operation="generateBrandElement"
        element={element}
        requestId={requestId}
      />
      {visibleError && (
        <p role="alert" className="bs-logo-save-status error">
          {visibleError}
        </p>
      )}
      {(!connected || (element === 'logo' && (logoAttempts.error || logoAttempts.historyError))) && (
        <p role="status" className="studio-guided-note">
          {t(
            "Preparing generation automatically. Please wait a moment…",
            "بنجهّز التوليد تلقائيًا، لحظات…",
          )}
        </p>
      )}
      {changed && generation?.suggestions.length ? (
        <p className="studio-guided-note">
          {t(
            "These suggestions use your previous answers. Choose one or generate new alternatives.",
            "دي اقتراحات من إجاباتك السابقة. تقدر تختار منها أو تولّد بدائل جديدة.",
          )}
        </p>
      ) : null}
      <div ref={resultsRef} className="studio-generation-results">
        {element === "logo" && !logoAttempts.historyLoading && !logoAttempts.historyError && !suggestions.length && (
          <p role="status">{logoAttempts.used > 0
            ? t("No completed logo was saved for these attempts. A failed attempt has no finished design to display.", "المحاولات دي ما اتحفظش منها لوجو مكتمل. المحاولة اللي فشلت ما بيكونش ليها تصميم نهائي نعرضه.")
            : t("Your generated logos will be saved and shown here, including after reopening this window.", "اللوجوهات اللي هتولّدها هتتحفظ وتظهر هنا، حتى بعد قفل النافذة وفتحها.")}</p>
        )}
        {Boolean(suggestions.length) && (
          <h3>{element === "logo" ? t("Your saved logos — choose one", "لوجوهاتك المحفوظة — اختار واحد") : t("Choose one suggestion", "اختار اقتراح واحد")}</h3>
        )}
        <div className={`studio-element-results${element === "logo" ? " studio-logo-results" : ""}`}>
          {suggestions.map((c, index) => (
            <article key={c.id} className="studio-element-result">
              <span className="studio-result-number">
                {t("Option", "اقتراح")} {index + 1}
              </span>
              {element === "name" && (
                <>
                  <strong>{c.name}</strong>
                  {c.arabicName && c.arabicName !== c.name && <small>{c.arabicName}</small>}
                </>
              )}
              {element === "tagline" && <strong>{c.tagline}</strong>}
              {element === 'logo' && c.qualityStatus && c.qualityStatus !== 'approved' && (
                <p role="status">{c.qualityStatus === 'rejected'
                  ? t('Design saved. Quality improvements recommended; no attempt charged.', 'اللوجو محفوظ ومتاح للاختيار. محتاج تحسين حسب مراجعة الجودة؛ لم تُخصم محاولة.')
                  : t('Design saved. Quality review unavailable; no attempt charged.', 'اللوجو محفوظ ومتاح للاختيار. اعتماد الجودة غير متاح حاليًا؛ لم تُخصم محاولة.')}</p>
              )}
              {element === "colors" && c.coreColors && (
                <div className="studio-core-colors">
                  {Object.entries(c.coreColors).map(([key, color]) => (
                    <span key={key}>
                      <i style={{ background: color }} />
                      <small>
                        {key === "primary"
                          ? t("Brand", "البراند")
                          : key === "secondary"
                            ? t("Secondary", "الثانوي")
                            : t("Buttons", "الأزرار")}
                      </small>
                      <code>{color}</code>
                    </span>
                  ))}
                </div>
              )}
              {element === "typography" && c.typography && (
                <>
                  <strong style={{ fontFamily: c.typography.heading }}>Your brand, clearly.</strong>
                  <strong style={{ fontFamily: c.typography.arabic }}>هوية واضحة لبراندك</strong>
                  <small>
                    {c.typography.heading} · {c.typography.body} · {c.typography.arabic}
                  </small>
                </>
              )}
              {element === "logo" && c.logo && c.mark && (
                <BrandLogoImage
                  primary={theme.light.primary}
                  layout="horizontal"
                  identity={{
                    ...state.selectedBrandIdentity,
                    id: c.id,
                    name: state.brandName,
                    tagline: state.tagline,
                    palette: state.brandPalette,
                    typography: theme.typography.heading,
                    mark: c.mark,
                    logo: c.logo,
                  }}
                />
              )}
              <button
                type="button"
                className={`studio-done-button${selectedCandidateId === c.id ? " is-selected" : ""}`}
                disabled={busy}
                onClick={() => {
                  restoreLogoHistory();
                  if (onApply(element, c)) onClose();
                }}
              >
                {selectedCandidateId === c.id
                  ? t("Selected", "تم الاختيار")
                  : t("Choose this option", "اختار الاقتراح ده")}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
