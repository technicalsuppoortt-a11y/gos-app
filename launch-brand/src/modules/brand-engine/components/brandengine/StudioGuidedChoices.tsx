import { useState } from "react";
import { defaultBrandFont } from "@/modules/brand-engine/data/brandFonts";
import { StudioSelect } from "./StudioSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/modules/brand-engine/components/ui/dialog";
import { AIGenerateMark } from "./AIGenerateMark";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import {
  brandFonts,
  arabicBrandFonts,
  isHexColor,
  readableBrandForeground,
  resolveBrandTheme,
  type BrandElement,
  type BrandElementCandidate,
  type BrandElementGeneration,
  type BrandColors,
} from "@/modules/brand-engine/data/brandTheme";
import { studioColorPresets, studioPresetTheme, studioPresetSwatches } from "@/modules/brand-engine/data/studioColorPresets";

export function StudioGuidedChoices({
  busy,
  connected,
  onGenerate,
  onApply,
}: {
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
  const [custom, setCustom] = useState(false);
  const pickPreset = (id: string) => {
    dispatch(actions.setBrandTheme(studioPresetTheme(id, theme)));
    const preset = studioColorPresets.find((item) => item.id === id);
    if (preset && preset.mode !== state.theme) dispatch(actions.toggleTheme());
    setCustom(false);
  };
  const generations = (state.pageParameters["branding"]?.["elementGenerations"] || {}) as Partial<
    Record<BrandElement, BrandElementGeneration>
  >;
  const names = (generations.name?.suggestions ?? []).filter((candidate) => candidate.name);
  const typographyFonts = [defaultBrandFont, ...(state.brandLanguage === "Arabic" ? arabicBrandFonts : brandFonts).filter((font) => font !== defaultBrandFont)];
  const selectedTypographyFont = state.brandLanguage === "Arabic" ? theme.typography.arabic : theme.typography.heading;
  const topTypographyFonts = typographyFonts.slice(0, 7);
  const visibleTypographyFonts = topTypographyFonts.some((font) => font === selectedTypographyFont)
    ? topTypographyFonts
    : [defaultBrandFont, selectedTypographyFont, ...topTypographyFonts.slice(1, 6)];
  const selectedPalette = custom || theme.paletteId === "custom" ? "custom" : theme.paletteId || "dashboard-default";
  const morePaletteValue = selectedPalette === "custom" || selectedPalette === "dashboard-default" || studioColorPresets.slice(0, 3).some((preset) => preset.id === selectedPalette)
    ? ""
    : selectedPalette;
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
  const setCustomColor = (key: keyof BrandColors, value: string) => {
    const update = (mode: "light" | "dark") => ({
      ...theme[mode],
      [key]: value,
      ...(key === "primary" ? { focus: value } : {}),
      ...(key === "buttonBackground" ? { onPrimary: readableBrandForeground(value) } : {}),
    });
    const mode = state.theme === "dark" ? "dark" : "light";
    dispatch(
      actions.setBrandTheme({
        ...theme,
        paletteId: "custom",
        ...(key === "primary" || key === "secondary"
          ? { light: update("light"), dark: update("dark") }
          : { [mode]: update(mode) }),
      }),
    );
  };
  return (
    <div className="studio-identity-columns">
      <section
        className="studio-guided-section studio-name-column"
        aria-labelledby="studio-summary-heading"
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">1</span>
          <div>
            <h2 id="studio-summary-heading" tabIndex={-1}>{t("Your brand name", "اسم البراند")}</h2>
            <p>
              {t("Generate and choose from AI suggestions.", "ولّد واختار من اقتراحات AI.")}
            </p>
          </div>
          {generate("name", t("Generate Brand Name", "ولّد اسم البراند"))}
          <span className="studio-choice-count">{names.length}</span>
        </div>
        <article className="studio-element-card studio-name-input">
          <input
            id="studio-brand-name"
            value={state.brandName}
            disabled={busy}
            maxLength={80}
            onChange={(e) => dispatch(actions.setBrandName(e.target.value))}
            placeholder={t("Your brand name", "اسم براندك")}
          />
        </article>
        {names.length > 0 && (
          <div className="studio-name-options studio-top-name-options" role="group" aria-label={t("Top brand name suggestions", "أبرز اقتراحات اسم البراند")}>
            {names.slice(0, 4).map((candidate) => (
              <button type="button" key={candidate.id} aria-pressed={candidate.name === state.brandName} disabled={busy} onClick={() => onApply("name", candidate)}>
                <span className="studio-name-option-copy"><strong>{candidate.name}</strong></span>
              </button>
            ))}
            {names.length > 4 && (
              <StudioSelect
                id="studio-name-options"
                label={t("More Choices", "اختيارات أكثر")}
                triggerLabel={t("More Choices", "اختيارات أكثر")}
                triggerClassName="studio-more-choice-tile"
                value={names.slice(4).find((candidate) => candidate.name === state.brandName)?.id ?? ""}
                disabled={busy}
                ar={ar}
                onChange={(id) => {
                  const candidate = names.find((option) => option.id === id);
                  if (candidate) onApply("name", candidate);
                }}
                options={names.slice(4).slice().reverse().map((candidate) => ({ value: candidate.id, label: candidate.name! }))}
              />
            )}
          </div>
        )}
      </section>
      {/* Slogan ideas are intentionally hidden from the guided studio UI.
      <section
        className="studio-guided-section studio-slogan-column"
        aria-labelledby="studio-slogan-heading"
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">3</span>
          <div>
            <h2 id="studio-slogan-heading">{t("Slogan ideas", "اقتراحات الشعار")}</h2>
            <p>{t("A short promise for your brand.", "عبارة قصيرة تعبّر عن براندك.")}</p>
          </div>
        </div>
        {generate("tagline", t("Generate Tagline", "ولّد الشعار النصي"))}
        <article className="studio-element-card studio-slogan-input">
          <label htmlFor="studio-brand-tagline">{t("Your slogan", "شعارك النصي")}</label>
          <textarea
            id="studio-brand-tagline"
            value={state.tagline}
            disabled={busy}
            maxLength={160}
            onChange={(event) => dispatch(actions.setTagline(event.target.value))}
            placeholder={t("Your brand promise…", "الرسالة اللي بيوعد بيها براندك…")}
          />
        </article>
        {slogans.length > 0 ? (
          <div
            className="studio-name-options studio-slogan-options"
            role="group"
            aria-labelledby="studio-slogan-heading"
          >
            {slogans.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                aria-pressed={candidate.tagline === state.tagline}
                disabled={busy}
                onClick={() => onApply("tagline", candidate)}
              >
                <span className="studio-choice-radio" aria-hidden="true">
                  {candidate.tagline === state.tagline && <Check size={10} />}
                </span>
                <span>
                  <strong>{candidate.tagline}</strong>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="studio-suggestions-empty">
            <Sparkles size={20} aria-hidden="true" />
            <p>
              {t(
                "Generate slogans to explore ideas for your brand.",
                "ولّد شعارات نصية عشان تستكشف أفكار لبراندك.",
              )}
            </p>
          </div>
        )}
      </section>
      */}
      <section
        className="studio-guided-section studio-visual-choices"
        aria-labelledby="studio-visual-heading"
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">2</span>
          <div>
            <h2 id="studio-visual-heading">{t("Colors", "الألوان")}</h2>
            <p>
              {t(
                "Three core colors. Everything else adjusts automatically.",
                "٣ ألوان أساسية، وباقي ألوان الواجهة بتتظبط تلقائيًا.",
              )}
            </p>
          </div>
          {generate("colors", t("Generate Colors", "ولّد الألوان"))}
        </div>
        <article className="studio-element-card studio-colors-card">
          <strong>{t("Colors", "الألوان")}</strong>
          <div className="studio-core-colors">
            {(
              [
                ["primary", t("Brand", "البراند")],
                ["secondary", t("Secondary", "الثانوي")],
                ["buttonBackground", t("Buttons", "الأزرار")],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="color"
                  aria-label={label}
                  value={key === "buttonBackground" ? "#FFFFFF" : colors[key]}
                  disabled={busy || key === "buttonBackground"}
                  title={
                    key === "buttonBackground"
                      ? t("Buttons are always white", "الأزرار بيضاء دائمًا")
                      : undefined
                  }
                  onChange={(e) => setCustomColor(key, e.target.value)}
                />
                <span>{label}</span>
                <code dir="ltr">
                  {(key === "buttonBackground" ? "#FFFFFF" : colors[key]).toUpperCase()}
                </code>
              </label>
            ))}
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
                </span>
              </button>
              {studioColorPresets.slice(0, 3).map((preset) => (
                <button type="button" key={preset.id} aria-pressed={!custom && theme.paletteId === preset.id} disabled={busy} onClick={() => pickPreset(preset.id)}>
                  <span className="studio-palette-swatches" aria-hidden="true">
                    {studioPresetSwatches(preset).map((color, index) => (
                      <i key={`${color}-${index}`} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  <span className="studio-palette-name"><strong>{ar ? preset.nameAr : preset.name}</strong><small>{preset.mode === "dark" ? t("Dark", "غامق") : t("Light", "فاتح")}</small></span>
                </button>
              ))}
              <StudioSelect
                id="studio-color-palette"
                label={t("More Templates", "قوالب أكثر")}
                triggerLabel={t("More Templates", "قوالب أكثر")}
                triggerClassName="studio-more-choice-tile"
                value={morePaletteValue}
                disabled={busy}
                ar={ar}
                onChange={(id) => {
                  if (id === "custom") setCustom(true);
                  else {
                    setCustom(false);
                    pickPreset(id);
                  }
                }}
                options={[
                  ...studioColorPresets.slice(3).map((preset) => ({
                    value: preset.id,
                    label: ar ? preset.nameAr : preset.name,
                    swatches: studioPresetSwatches(preset),
                    badge: preset.mode === "dark" ? t("Dark", "غامق") : t("Light", "فاتح"),
                  })),
                  { value: "custom", label: t("Customize colors", "تخصيص الألوان") },
                ]}
              />
            </div>
          </div>
          <Dialog open={custom} onOpenChange={setCustom}>
            <DialogContent
              className="studio-theme studio-custom-colors-dialog"
              dir={ar ? "rtl" : "ltr"}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                document.getElementById("studio-color-palette")?.focus();
              }}
            >
              <DialogHeader>
                <DialogTitle>{t("Customize colors", "تخصيص الألوان")}</DialogTitle>
                <DialogDescription>
                  {t("Color changes appear instantly in the preview.", "تغييرات الألوان بتظهر مباشرة في المعاينة.")}
                </DialogDescription>
              </DialogHeader>
            <div className="studio-custom-colors">
              {(
                [
                  ["primary", t("Brand", "البراند")],
                  ["secondary", t("Secondary", "الثانوي")],
                  ["background", t("Page background", "خلفية الصفحة")],
                  ["surface", t("Cards", "الكروت")],
                  ["text", t("Text", "النصوص")],
                  ["border", t("Borders", "الإطارات")],
                  ["headerBackground", t("Landing header", "هيدر صفحة الهبوط")],
                  ["footerBackground", t("Landing footer", "فوتر صفحة الهبوط")],
                ] as const
              ).map(([key, label], index) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    autoFocus={index === 0}
                    type="color"
                    aria-label={label}
                    value={colors[key]}
                    disabled={busy}
                    onChange={(event) => setCustomColor(key, event.target.value)}
                  />
                  <input
                    key={colors[key]}
                    aria-label={`${label} HEX`}
                    dir="ltr"
                    defaultValue={colors[key].toUpperCase()}
                    maxLength={7}
                    disabled={busy}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (isHexColor(value)) setCustomColor(key, value);
                      else event.target.value = colors[key].toUpperCase();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </label>
              ))}
            </div>
              <DialogClose className="studio-custom-colors-done">
                {t("Done", "تم")}
              </DialogClose>
            </DialogContent>
          </Dialog>
        </article>
      </section>
      <section
        className="studio-guided-section studio-typography-section"
        aria-labelledby="studio-typography-heading"
      >
        <div className="studio-section-heading">
          <span className="studio-section-number">3</span>
          <div>
            <h2 id="studio-typography-heading">{t("Typography", "الخطوط")}</h2>
            <p>{t("Select your font style.", "اختار طابع خط براندك.")}</p>
          </div>
          {generate("typography", t("Generate Typography", "ولّد الخطوط"))}
        </div>
        <article className="studio-element-card studio-typography-card">
          <label htmlFor="studio-font">{t("Typography", "الخطوط")}</label>
          <div className="studio-font-options" role="group" aria-label={t("Top typography choices", "أبرز اختيارات الخطوط")}>
            {visibleTypographyFonts.map((font) => (
              <button type="button" key={font} style={font === defaultBrandFont ? { gridColumn: "1 / -1" } : undefined} aria-pressed={font === defaultBrandFont ? Object.values(theme.typography).every((value) => value === defaultBrandFont) : selectedTypographyFont === font} disabled={busy} onClick={() => dispatch(actions.setFontPersonality(font))}>
                <span className="studio-choice-radio" aria-hidden="true" />
                <span>
                  <strong dir={font === defaultBrandFont && ar ? "rtl" : "ltr"}>{font === defaultBrandFont ? t("Keep Triptograph default", "احتفظ بخط Triptograph الافتراضي") : font}</strong>
                  {font === defaultBrandFont && <small dir="ltr">{defaultBrandFont}</small>}
                  <small lang={state.language} dir={ar ? "rtl" : "ltr"} style={{ fontFamily: font }}>{fontPreview}</small>
                </span>
              </button>
            ))}
          <StudioSelect
            id="studio-font"
            label={t("More Choices", "اختيارات أكثر")}
            triggerLabel={t("More Choices", "اختيارات أكثر")}
            triggerClassName="studio-more-choice-tile"
            value={selectedTypographyFont}
            disabled={busy}
            ar={ar}
            onChange={(value) =>
              value === "business-context"
                ? onGenerate("typography")
                : dispatch(actions.setFontPersonality(value === "triptograph-default" ? defaultBrandFont : value))
            }
            options={[
              { value: "triptograph-default", label: t("Keep Triptograph default", "احتفظ بخط Triptograph الافتراضي"), font: defaultBrandFont, preview: fontPreview },
              ...typographyFonts.map((font) => ({ value: font, label: font, font, preview: fontPreview })),
              { value: "business-context", label: t("Use my business context", "استخدم بيانات حسابي") },
            ]}
          />
          </div>
          {state.brandLanguage === "Bilingual" && (
            <small style={{ fontFamily: theme.typography.arabic }}>
              {theme.typography.arabic} — {fontPreview}
            </small>
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
    </div>
  );
}
