import { useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, Globe, Palette, ShieldCheck, Type, X } from "lucide-react";
import { defaultBrandFont } from "@/modules/brand-engine/data/brandFonts";
import { StudioSelect } from "./StudioSelect";
import { AIGenerateMark } from "./AIGenerateMark";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { useStore } from "../../../../store/useStore";
import {
  brandFonts,
  arabicBrandFonts,
  resolveBrandTheme,
  type BrandElement,
  type BrandElementCandidate,
  type BrandElementGeneration,
} from "@/modules/brand-engine/data/brandTheme";
import {
  studioColorPresets,
  studioPresetTheme,
  studioPresetSwatches,
  studioPresetStyle,
  type StudioColorStyle,
} from "@/modules/brand-engine/data/studioColorPresets";

const FONT_STYLE_TAG: Record<string, [string, string]> = {
  "Plus Jakarta Sans": ["Geometric SaaS · Crisp", "هندسي عصري · واضح"],
  "Space Grotesk": ["Tech Display · Bold", "تقني حديث · بارز"],
  "Outfit": ["Clean Modern · Balanced", "عصري متوازن · ناعم"],
  "Sora": ["Futuristic · Precision", "مستقبلي · دقيق"],
  "DM Sans": ["Humanist · Approachable", "إنساني مريح · ودود"],
  "Inter": ["Neutral UI · High Legibility", "واجهة قياسية · مقروئية عالية"],
  "Manrope": ["Executive Sans · Sharp", "احترافي للأعمال · حاد"],
  "Playfair Display": ["Editorial Serif · Luxury", "تحريري فخم · كلاسيكي"],
  "Cairo": ["Modern Arabic · Geometric", "عربي عصري · هندسي"],
  "Tajawal": ["Clean Arabic UI · Friendly", "واجهة عربية ناعمة · واضح"],
  "Almarai": ["Crisp Editorial · Readable", "وضوح عالي · متزن"],
  "Readex Pro": ["Contemporary · Tech Arabic", "معاصر · تقني"],
  "Amiri": ["Classic Calligraphic · Heritage", "خط أميري الأصيل · تراثي"],
};

export function StudioGuidedChoices({
  busy,
  connected,
  onGenerate,
  onApply,
  logoPanel,
  generatorPanel,
  activeSection,
  onSectionChange: setActiveSection,
}: {
  logoPanel: ReactNode;
  generatorPanel: ReactNode;
  activeSection: "name" | "colors" | "typography" | "logo";
  onSectionChange: (section: "name" | "colors" | "typography" | "logo") => void;
  busy: boolean;
  connected: boolean;
  onGenerate: (element: BrandElement) => void;
  onApply: (element: BrandElement, candidate: BrandElementCandidate) => boolean;
}) {
  const state = useAppSelector((s) => s.brand),
    dispatch = useAppDispatch();
  const ar = state.language === "ar",
    t = (en: string, arabic: string) => (ar ? arabic : en);
  const fontPreview = t("Your brand, clearly.", "هوية واضحة لبراندك");
  const theme = resolveBrandTheme(state),
    colors = theme[state.theme === "dark" ? "dark" : "light"];
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingPalette, setPendingPalette] = useState<string | null>(null);
  const [paletteFilter, setPaletteFilter] = useState<"all" | StudioColorStyle>("all");
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const sections = [
    { id: "name" as const, label: t("Name", "الاسم") },
    { id: "colors" as const, label: t("Colors", "الألوان") },
    { id: "typography" as const, label: t("Typography", "الخطوط") },
    { id: "logo" as const, label: t("Logo", "اللوجو") },
  ];
  const sectionIndex = sections.findIndex((section) => section.id === activeSection);
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = sections.length - 1;
    else if (event.key === "ArrowRight") next = (index + (ar ? -1 : 1) + sections.length) % sections.length;
    else if (event.key === "ArrowLeft") next = (index + (ar ? 1 : -1) + sections.length) % sections.length;
    else return;
    event.preventDefault();
    setActiveSection(sections[next]!.id);
    tabs.current[next]?.focus();
  };
  const pickPreset = (id: string) => {
    dispatch(actions.setBrandTheme(studioPresetTheme(id, theme)));
    const preset = studioColorPresets.find((item) => item.id === id);
    const targetMode = preset ? preset.mode : "light";
    useStore.getState().setTheme(targetMode);
    if (targetMode !== state.theme) dispatch(actions.toggleTheme());
  };
  const generations = (state.pageParameters["branding"]?.["elementGenerations"] || {}) as Partial<
    Record<BrandElement, BrandElementGeneration>
  >;
  const allNames = (generations.name?.suggestions ?? []).filter((candidate) => candidate.name);
  const names = allNames.slice(-3);
  const trimmedBrandName = state.brandName.trim();
  const isNameReady = trimmedBrandName.length >= 2;
  const brandSlug =
    trimmedBrandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "your-brand";
  const brandInitial = (trimmedBrandName || (ar ? "ب" : "B")).slice(0, 1).toUpperCase();
  const activeFontName = ar ? theme.typography.arabic : theme.typography.heading;

  const typographyFonts = [
    defaultBrandFont,
    ...(state.brandLanguage === "Arabic" ? arabicBrandFonts : brandFonts).filter((font) => font !== defaultBrandFont),
  ];
  const selectedTypographyFont = state.brandLanguage === "Arabic" ? theme.typography.arabic : theme.typography.heading;
  const topTypographyFonts = typographyFonts.slice(0, 3);
  const visibleTypographyFonts = topTypographyFonts.some((font) => font === selectedTypographyFont)
    ? topTypographyFonts
    : [defaultBrandFont, selectedTypographyFont, ...topTypographyFonts.slice(1, 2)];
  const selectedPalette = theme.paletteId && theme.paletteId !== "custom" ? theme.paletteId : "dashboard-default";
  const currentPreset = studioColorPresets.find((p) => p.id === selectedPalette);
  const featuredPresets = studioColorPresets.slice(0, 3);
  const activeExtraPreset =
    selectedPalette !== "dashboard-default" && !featuredPresets.some((p) => p.id === selectedPalette)
      ? currentPreset
      : undefined;
  const filteredPresets =
    paletteFilter === "all"
      ? studioColorPresets
      : studioColorPresets.filter((preset) => {
          if (paletteFilter === "dark") return preset.mode === "dark";
          if (paletteFilter === "light") return preset.mode === "light" && studioPresetStyle(preset) === "light";
          return studioPresetStyle(preset) === paletteFilter;
        });
  const styleLabel = (style: StudioColorStyle, mode: "light" | "dark") => {
    if (style === "vibrant") return t("Vibrant", "حيوي");
    if (style === "bold") return t("Bold", "جريء");
    return mode === "dark" ? t("Dark", "داكن") : t("Light", "فاتح");
  };
  const fontTagFor = (font: string) => {
    if (font === defaultBrandFont) return t("System Balanced · Bilingual", "الخط القياسي المتوازن · ثنائي اللغة");
    const pair = FONT_STYLE_TAG[font];
    return pair ? (ar ? pair[1] : pair[0]) : t("Curated Brand Typeface", "خط احترافي للهوية");
  };
  const generate = (element: BrandElement, label: string) => (
    <button
      type="button"
      id={`studio-generate-${element}`}
      className="studio-element-generate"
      disabled={busy}
      aria-label={label}
      title={
        !connected
          ? t("Connect AI in AI Center to generate", "فعّل اتصال AI من إعدادات المنصة للتوليد")
          : label
      }
      onClick={() => onGenerate(element)}
    >
      <AIGenerateMark size={14} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="studio-compact-editor">
      <div className="studio-editor-tabs" role="tablist" aria-label={t("Brand identity sections", "أقسام هوية البراند")}>
        {sections.map((section, index) => (
          <button
            key={section.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`studio-tab-${section.id}`}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`studio-panel-${section.id}`}
            tabIndex={activeSection === section.id ? 0 : -1}
            onClick={() => setActiveSection(section.id)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            <span className="studio-tab-index" aria-hidden="true">
              {index + 1}
            </span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Section 1: Name */}
      <section
        className="studio-guided-section studio-name-column"
        id="studio-panel-name"
        role="tabpanel"
        aria-labelledby="studio-tab-name"
        hidden={activeSection !== "name"}
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">1</span>
          <div>
            <h2 id="studio-summary-heading" tabIndex={-1}>
              {t("Your brand name", "اسم البراند")}
            </h2>
            <p>
              {t(
                "Enter your brand name or generate 3 tailored AI suggestions.",
                "اكتب اسم براندك أو ولّد ٣ اقتراحات مخصصة لمجالك بالذكاء الاصطناعي.",
              )}
            </p>
          </div>
          {generate("name", t("Generate Brand Name", "ولّد اسم البراند"))}
          {names.length > 0 && <span className="studio-choice-count">{names.length}</span>}
        </div>

        <article className="studio-element-card studio-name-input studio-name-form-card">
          <div className="studio-name-form-header">
            <label htmlFor="studio-brand-name">{t("Brand name", "اسم البراند")}</label>
            <div className="studio-name-form-badges">
              <span className="studio-name-status-pill" data-ready={isNameReady ? "true" : "false"}>
                {isNameReady && <Check size={11} aria-hidden="true" />}
                {isNameReady ? t("Ready", "جاهز") : t("2+ chars", "حرفان على الأقل")}
              </span>
              <span className="studio-name-char-count" dir="ltr">
                {trimmedBrandName.length}/80
              </span>
            </div>
          </div>
          <div className="studio-name-input-field">
            <span className="studio-name-input-monogram" aria-hidden="true">
              {brandInitial}
            </span>
            <input
              id="studio-brand-name"
              value={state.brandName}
              disabled={busy}
              maxLength={80}
              onChange={(e) => dispatch(actions.setBrandName(e.target.value))}
              placeholder={t("e.g. Veloce Studio, Lumina Health", "مثال: لومينا، مدار الأعمال")}
              aria-describedby="studio-brand-name-hint"
            />
          </div>
          <div className="studio-name-form-footer">
            <ShieldCheck size={13} aria-hidden="true" />
            <p id="studio-brand-name-hint" className="studio-field-hint">
              {t(
                "Synced automatically across your website header, dashboard, and client portal.",
                "يتم تطبيقه تلقائيًا في موقعك ولوحة التحكم وبوابة العملاء.",
              )}
            </p>
          </div>
        </article>

        <div className="lb-wordmark-preview" aria-hidden="true">
          <div className="lb-wordmark-chrome">
            <span className="lb-wordmark-live-badge">
              <b />
              {t("Live Wordmark Preview", "معاينة حية للاسم")}
            </span>
            <span className="lb-wordmark-domain" dir="ltr">
              <Globe size={11} />
              {brandSlug}.upklick.net
            </span>
          </div>
          <div className="lb-wordmark-stage">
            <span
              className="lb-wordmark-mark"
              style={{
                backgroundColor: `${colors.primary}16`,
                borderColor: `${colors.primary}38`,
                color: colors.primary,
              }}
            >
              {brandInitial}
            </span>
            <div className="lb-wordmark-copy">
              <span
                className="lb-wordmark-text"
                style={{ fontFamily: activeFontName, color: colors.primary }}
                dir="auto"
              >
                {trimmedBrandName || t("Your Brand", "براندك")}
              </span>
              <i style={{ background: colors.primary }} />
            </div>
          </div>
          <div className="lb-wordmark-meta">
            <span>
              {t("Font:", "الخط:")} <strong dir="ltr">{activeFontName}</strong>
            </span>
            <span>{state.theme === "dark" ? t("Dark Surface", "الوضع الداكن") : t("Light Surface", "الوضع الفاتح")}</span>
          </div>
        </div>

        {names.length === 0 && (
          <ul className="lb-name-tips" aria-label={t("Naming guidelines", "إرشادات اختيار الاسم")}>
            <li>
              <span className="lb-name-tip-icon" aria-hidden="true">
                <Check size={12} />
              </span>
              <div>
                <strong>{t("Short & spoken clearly", "قصير وسهل النطق")}</strong>
                <small>{t("Aim for 1–2 crisp words customers recall instantly.", "كلمة أو كلمتان يسهل تذكرهما من أول مرة.")}</small>
              </div>
            </li>
            <li>
              <span className="lb-name-tip-icon" aria-hidden="true">
                <Check size={12} />
              </span>
              <div>
                <strong>{t("Effortless to spell", "سهل الكتابة والبحث")}</strong>
                <small>{t("Clean spelling works better in URLs and search.", "إملاء واضح يسهّل كتابة الرابط والبحث عنك.")}</small>
              </div>
            </li>
            <li>
              <span className="lb-name-tip-icon" aria-hidden="true">
                <Check size={12} />
              </span>
              <div>
                <strong>{t("Outcome over literal task", "يعكس القيمة لا الخدمة الحرفية")}</strong>
                <small>{t("Hint at the transformation your clients get.", "ركّز على الأثر والنتيجة التي يحصل عليها عميلك.")}</small>
              </div>
            </li>
          </ul>
        )}
        {names.length > 0 && (
          <div
            className="studio-name-options studio-top-name-options"
            role="group"
            aria-label={t("Top 3 AI brand name suggestions", "أبرز ٣ اقتراحات لاسم البراند")}
          >
            {names.map((candidate, index) => (
              <button
                type="button"
                key={candidate.id}
                aria-pressed={candidate.name === state.brandName}
                disabled={busy}
                onClick={() => onApply("name", candidate)}
              >
                <span className="studio-choice-radio" aria-hidden="true" />
                <span className="studio-name-option-copy">
                  <strong>{candidate.name}</strong>
                  {candidate.rationale && <small>{candidate.rationale}</small>}
                </span>
                <span className="studio-name-rank-badge" aria-hidden="true">
                  0{index + 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Colors */}
      <section
        className="studio-guided-section studio-visual-choices"
        id="studio-panel-colors"
        role="tabpanel"
        aria-labelledby="studio-tab-colors"
        hidden={activeSection !== "colors"}
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">2</span>
          <div>
            <h2 id="studio-visual-heading">{t("Colors", "الألوان")}</h2>
            <p>
              {t(
                "Curated brand templates engineered for crisp Light & Dark contrast.",
                "قوالب ألوان احترافية مضبوطة التباين للوضعين الفاتح والداكن.",
              )}
            </p>
          </div>
          {generate("colors", t("Generate Colors", "ولّد الألوان"))}
        </div>
        <article className="studio-element-card studio-colors-card">
          <div className="studio-active-template-banner" role="status">
            <span className="studio-active-template-swatches" aria-hidden="true">
              <i style={{ backgroundColor: theme.light.primary }} title="Light Primary" />
              <i style={{ backgroundColor: theme.light.secondary }} title="Secondary Accent" />
              <i style={{ backgroundColor: theme.dark.background }} title="Dark Surface" />
            </span>
            <span className="studio-active-template-meta">
              <strong>
                {currentPreset
                  ? ar
                    ? currentPreset.nameAr
                    : currentPreset.name
                  : t("Keep Dashboard Color", "الاحتفاظ بألوان الداشبورد")}
              </strong>
              <small>
                <ShieldCheck size={12} aria-hidden="true" />
                {t("WCAG AA · Light & Dark Adaptive", "تباين قياسي · متوافق مع الفاتح والداكن")}
              </small>
            </span>
          </div>

          <div className="studio-color-presets" aria-label={t("Ready-made color templates", "قوالب الألوان الجاهزة")}>
            <h3 className="studio-color-presets-title">{t("Ready-made templates", "قوالب جاهزة")}</h3>
            <div className="studio-palette-grid">
              <button
                type="button"
                aria-pressed={selectedPalette === "dashboard-default"}
                disabled={busy}
                onClick={() => pickPreset("dashboard-default")}
              >
                <span className="studio-palette-swatches" aria-hidden="true">
                  {["#635BFF", "#7065DE", "#F8F9FD"].map((color) => (
                    <i key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="studio-palette-name">
                  <strong>{t("Keep Dashboard Color", "الاحتفاظ بألوان الداشبورد")}</strong>
                  <small>{t("Default · Light", "افتراضي · فاتح")}</small>
                </span>
                {selectedPalette === "dashboard-default" && <Check size={16} aria-hidden="true" />}
              </button>
              {featuredPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  aria-pressed={theme.paletteId === preset.id}
                  disabled={busy}
                  onClick={() => pickPreset(preset.id)}
                >
                  <span className="studio-palette-swatches" aria-hidden="true">
                    {studioPresetSwatches(preset).map((color, index) => (
                      <i key={`${color}-${index}`} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <span className="studio-palette-name">
                    <strong>{ar ? preset.nameAr : preset.name}</strong>
                    <small>{styleLabel(studioPresetStyle(preset), preset.mode)}</small>
                  </span>
                  {theme.paletteId === preset.id && <Check size={16} aria-hidden="true" />}
                </button>
              ))}
              {activeExtraPreset && (
                <button type="button" aria-pressed="true" disabled={busy} onClick={() => setTemplatesOpen(true)}>
                  <span className="studio-palette-swatches" aria-hidden="true">
                    {studioPresetSwatches(activeExtraPreset).map((color, index) => (
                      <i key={`${color}-${index}`} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <span className="studio-palette-name">
                    <strong>{ar ? activeExtraPreset.nameAr : activeExtraPreset.name}</strong>
                    <small>{styleLabel(studioPresetStyle(activeExtraPreset), activeExtraPreset.mode)}</small>
                  </span>
                  <Check size={16} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                id="studio-color-palette"
                className="studio-more-choice-tile studio-more-palettes-trigger"
                disabled={busy}
                aria-haspopup="dialog"
                aria-expanded={templatesOpen}
                onClick={() => setTemplatesOpen(true)}
              >
                <span className="studio-more-palettes-dots" aria-hidden="true">
                  <i style={{ background: "#FACC15" }} />
                  <i style={{ background: "#1E293B" }} />
                  <i style={{ background: "#4338CA" }} />
                  <i style={{ background: "#059669" }} />
                </span>
                <span>{t("More Templates", "قوالب أكثر")}</span>
                <small className="studio-more-palettes-count">{studioColorPresets.length}+</small>
              </button>
            </div>
          </div>

          <RadixDialog.Root open={templatesOpen} onOpenChange={(open) => {
            setTemplatesOpen(open);
            if (!open) setPendingPalette(null);
          }}>
            <RadixDialog.Portal>
              <RadixDialog.Overlay className="studio-palettes-gallery-overlay" />
              <RadixDialog.Content
                className="studio-theme studio-palettes-gallery-dialog"
                dir={ar ? "rtl" : "ltr"}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  document.getElementById("studio-color-palette")?.focus();
                }}
              >
                <RadixDialog.Close
                  className="studio-palettes-gallery-close"
                  aria-label={t("Close color templates", "إغلاق قوالب الألوان")}
                >
                  <X size={18} aria-hidden="true" />
                </RadixDialog.Close>
                <div className="studio-palettes-gallery-header">
                  <RadixDialog.Title className="studio-gallery-dialog-title">
                    <Palette size={18} aria-hidden="true" />
                    {t("Curated Color Palettes", "مكتبة قوالب الألوان المتنوعة")}
                  </RadixDialog.Title>
                  <RadixDialog.Description className="studio-gallery-dialog-desc">
                    {t(
                      "Choose from WCAG-compliant light, dark, vibrant, and bold brand templates — engineered to look sharp across both Light and Dark modes.",
                      "اختر من قوالب احترافية فاتحة وداكنة وحيوية وجريئة — مصممة بوضوح وتباين كامل في الوضعين الفاتح والداكن.",
                    )}
                  </RadixDialog.Description>
                </div>
                <div
                  className="studio-palette-filter-bar"
                  role="tablist"
                  aria-label={t("Filter palettes by style", "تصفية القوالب حسب النمط")}
                >
                  {(
                    [
                      ["all", t("All Styles", "الكل")],
                      ["light", t("Light", "فاتح")],
                      ["dark", t("Dark & Slate", "داكن وأردوازي")],
                      ["vibrant", t("Vibrant", "حيوي")],
                      ["bold", t("Bold & Rich", "جريء وفخم")],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={paletteFilter === id}
                      className={`studio-palette-filter-pill ${paletteFilter === id ? "is-active" : ""}`}
                      onClick={() => setPaletteFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="studio-palettes-gallery-grid">
                  {filteredPresets.map((preset) => {
                    const swatches = studioPresetSwatches(preset);
                    const style = studioPresetStyle(preset);
                    const isSelected = (pendingPalette ?? theme.paletteId) === preset.id;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        aria-pressed={isSelected}
                        disabled={busy}
                        className={`studio-gallery-palette-card ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setPendingPalette(preset.id);
                        }}
                      >
                        <span
                          className="studio-gallery-palette-preview"
                          style={{ background: swatches[2] }}
                          aria-hidden="true"
                        >
                          <span className="studio-gallery-bar-primary" style={{ background: swatches[0] }} />
                          <span className="studio-gallery-bar-secondary" style={{ background: swatches[1] }} />
                          <span className="studio-gallery-dot-accent" style={{ background: preset.primary }} />
                        </span>
                        <span className="studio-gallery-palette-meta">
                          <strong>{ar ? preset.nameAr : preset.name}</strong>
                          <span className="studio-gallery-palette-tags">
                            <em data-mode={preset.mode}>
                              {preset.mode === "dark" ? t("Dark", "داكن") : t("Light", "فاتح")}
                            </em>
                            {(style === "vibrant" || style === "bold") && (
                              <em data-style={style}>{styleLabel(style, preset.mode)}</em>
                            )}
                          </span>
                        </span>
                        {isSelected && <Check size={15} className="studio-gallery-check" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
                <div className="studio-palettes-gallery-footer">
                  <span className="studio-gallery-wcag-note">
                    <ShieldCheck size={14} aria-hidden="true" />
                    {t(
                      "All templates automatically adapt across Light & Dark UpKlick dashboards.",
                      "جميع القوالب تتكيف تلقائيًا مع الوضع الفاتح والداكن في لوحة تحكم UpKlick.",
                    )}
                  </span>
                  <button type="button" className="studio-custom-colors-done" disabled={busy} onClick={() => {
                    if (pendingPalette) pickPreset(pendingPalette);
                    setPendingPalette(null);
                    setTemplatesOpen(false);
                  }}>{t("Done", "تم")}</button>
                </div>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>
        </article>
      </section>

      {/* Section 3: Typography — Elevated Specimen & Font Pairing Studio */}
      <section
        className="studio-guided-section studio-typography-section"
        id="studio-panel-typography"
        role="tabpanel"
        aria-labelledby="studio-tab-typography"
        hidden={activeSection !== "typography"}
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">3</span>
          <div>
            <h2 id="studio-typography-heading">{t("Typography", "الخطوط")}</h2>
            <p>
              {t(
                "Pair expressive headings with ultra-legible dashboard & body text.",
                "اختر طابع الخط المتناسق للعناوين وواجهة المنصة.",
              )}
            </p>
          </div>
          {generate("typography", t("Generate Typography", "ولّد الخطوط"))}
        </div>

        {/* Live Architectural Typography Specimen Card */}
        <div className="studio-type-specimen-card" aria-hidden="true">
          <div className="studio-type-specimen-chrome">
            <span className="studio-type-specimen-badge">
              <Type size={12} />
              {t("Live Type Specimen", "معاينة حية للخط")}
            </span>
            <span className="studio-type-specimen-font-pill" dir="ltr">
              {selectedTypographyFont}
            </span>
          </div>
          <div className="studio-type-specimen-body">
            <span className="studio-type-specimen-glyph" style={{ fontFamily: selectedTypographyFont }}>
              {ar || state.brandLanguage === "Arabic" ? "أب" : "Aa"}
            </span>
            <div className="studio-type-specimen-sample" style={{ fontFamily: selectedTypographyFont }}>
              <strong dir="auto">{trimmedBrandName || t("Modern SaaS Identity", "هوية رقمية احترافية")}</strong>
              <span dir={ar ? "rtl" : "ltr"}>
                {t(
                  "Engineered for crisp readability across hero headlines, metrics, and UI controls.",
                  "مصمم بوضوح فائق للعناوين الرئيسية والأرقام وعناصر واجهة المستخدم.",
                )}
              </span>
            </div>
          </div>
          <div className="studio-type-specimen-scale">
            <span dir="ltr">Display 28px · Heading 18px · Body 14px</span>
            <strong>
              {state.brandLanguage === "Bilingual"
                ? t("AR + EN Synced", "عربي + إنجليزي")
                : state.brandLanguage === "Arabic"
                  ? t("Arabic RTL", "عربي")
                  : t("Global Latin", "إنجليزي")}
            </strong>
          </div>
        </div>

        <article className="studio-element-card studio-typography-card">
          <label htmlFor="studio-font">{t("Curated font systems", "أنظمة الخطوط المختارة")}</label>
          <div
            className="studio-font-options"
            role="group"
            aria-label={t("Top typography choices", "أبرز اختيارات الخطوط")}
          >
            {visibleTypographyFonts.map((font) => {
              const isPressed =
                font === defaultBrandFont
                  ? Object.values(theme.typography).every((value) => value === defaultBrandFont)
                  : selectedTypographyFont === font;
              return (
                <button
                  type="button"
                  key={font}
                  className="studio-font-card-btn"
                  style={font === defaultBrandFont ? { gridColumn: "1 / -1" } : undefined}
                  aria-pressed={isPressed}
                  disabled={busy}
                  onClick={() => dispatch(actions.setFontPersonality(font))}
                >
                  <span className="studio-font-glyph-tile" style={{ fontFamily: font }} aria-hidden="true">
                    {ar || state.brandLanguage === "Arabic" ? "أب" : "Aa"}
                  </span>
                  <span className="studio-font-card-copy">
                    <span className="studio-font-card-title-row">
                      <strong dir={font === defaultBrandFont && ar ? "rtl" : "ltr"}>
                        {font === defaultBrandFont ? t("Default brand font", "خط البراند الافتراضي") : font}
                      </strong>
                      <em className="studio-font-tag">{fontTagFor(font)}</em>
                    </span>
                    <small lang={state.language} dir={ar ? "rtl" : "ltr"} style={{ fontFamily: font }}>
                      {fontPreview}
                    </small>
                  </span>
                  {isPressed ? (
                    <span className="studio-font-selected-check" aria-hidden="true">
                      <Check size={13} />
                    </span>
                  ) : (
                    <span className="studio-choice-radio" aria-hidden="true" />
                  )}
                </button>
              );
            })}
            <StudioSelect
              id="studio-font"
              label={t("More Typefaces", "خطوط إضافية")}
              triggerLabel={t("Browse More Typefaces", "استعراض المزيد من الخطوط")}
              triggerClassName="studio-more-choice-tile studio-more-fonts-trigger"
              value={selectedTypographyFont}
              disabled={busy}
              ar={ar}
              onChange={(value) =>
                value === "business-context"
                  ? onGenerate("typography")
                  : dispatch(actions.setFontPersonality(value === "triptograph-default" ? defaultBrandFont : value))
              }
              options={[
                {
                  value: "triptograph-default",
                  label: t("Default brand font", "خط البراند الافتراضي"),
                  font: defaultBrandFont,
                  preview: fontPreview,
                },
                ...typographyFonts.map((font) => ({ value: font, label: font, font, preview: fontPreview })),
                { value: "business-context", label: t("Use my business context", "استخدم بيانات حسابي") },
              ]}
            />
          </div>
          {state.brandLanguage === "Bilingual" && (
            <div className="studio-bilingual-font-pill">
              <span>{t("Paired Arabic Font:", "الخط العربي المرافق:")}</span>
              <strong style={{ fontFamily: theme.typography.arabic }}>
                {theme.typography.arabic} — {fontPreview}
              </strong>
            </div>
          )}
        </article>
        {!connected && (
          <p className="studio-guided-note">
            {t(
              "Manual choices are available. AI generation needs a connected AI Center.",
              "تقدر تختار وتكتب بنفسك. التوليد يحتاج اتصال AI مفعّل في المنصة.",
            )}
          </p>
        )}
        {Object.keys(generations).length > 0 && (
          <span className="sr-only">
            {t("Your previous generation answers are saved.", "إجابات التوليد السابقة محفوظة.")}
          </span>
        )}
      </section>

      {/* Section 4: Logo */}
      <div id="studio-panel-logo" role="tabpanel" aria-labelledby="studio-tab-logo" hidden={activeSection !== "logo"}>
        {logoPanel}
      </div>
      {generatorPanel}

      <div className="studio-editor-footer">
        <span>
          {t(`Section ${sectionIndex + 1} of ${sections.length}`, `القسم ${sectionIndex + 1} من ${sections.length}`)}
        </span>
        <div>
          {sectionIndex > 0 && (
            <button
              type="button"
              className="studio-text-button studio-prev-btn"
              onClick={() => setActiveSection(sections[sectionIndex - 1]!.id)}
            >
              {ar ? <ArrowRight size={14} aria-hidden="true" /> : <ArrowLeft size={14} aria-hidden="true" />}
              {t("Previous", "السابق")}
            </button>
          )}
          {sectionIndex < sections.length - 1 && (
            <button
              type="button"
              className="studio-section-next"
              onClick={() => setActiveSection(sections[sectionIndex + 1]!.id)}
            >
              {t(`Next: ${sections[sectionIndex + 1]!.label}`, `التالي: ${sections[sectionIndex + 1]!.label}`)}
              {ar ? <ArrowLeft size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
