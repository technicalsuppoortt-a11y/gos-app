import { brandEnginePortalContainer } from "../../lib/portalContainer";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X } from 'lucide-react';
import { AIGenerateMark } from "./AIGenerateMark";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import {
  resolveBrandTheme,
  type BrandCandidate,
  type BrandDirectionParts,
} from "@/modules/brand-engine/data/brandTheme";
import { BrandLogoImage } from "./BrandLogoImage";
import { AIGenerationProgress } from "./AIGenerationProgress";

export function StudioOptionalDirections({
  busy,
  connected,
  generating,
  requestId,
  error = "",
  logoUrl,
  onGenerate,
  onGenerateName,
  onApply,
}: {
  busy: boolean;
  connected: boolean;
  generating: boolean;
  requestId?: string | undefined;
  error?: string;
  logoUrl?: string | undefined;
  onGenerate: () => void;
  onGenerateName: () => void;
  onApply: (candidate: BrandCandidate, parts: BrandDirectionParts) => void;
}) {
  const state = useAppSelector((s) => s.brand),
    ar = state.language === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [candidate, setCandidate] = useState<BrandCandidate | null>(null);
  const [parts, setParts] = useState<BrandDirectionParts>({
    name: false,
    colors: false,
    typography: false,
    logo: false,
  });
  const current = resolveBrandTheme(state);
  const sources = state.pageParameters["branding"]?.["elementSources"] as
    Record<string, string> | undefined;
  const confirmed = (key: string) => Boolean(sources?.[key] && sources[key] !== "default");
  const open = (c: BrandCandidate) => {
    setCandidate(c);
    setParts({
      name: false,
      colors: !confirmed("colors"),
      typography: !confirmed("typography"),
      logo: !confirmed("logo") && !state.pageParameters["branding"]?.["uploadedLogo"],
    });
  };
  const previewTheme = candidate
    ? {
        ...current,
        ...(parts.colors ? { light: candidate.theme.light } : {}),
        ...(parts.typography ? { typography: candidate.theme.typography } : {}),
      }
    : current;
  const previewIdentity = candidate
    ? {
        ...(parts.logo ? candidate : state.selectedBrandIdentity),
        id: candidate.id,
        name: state.brandName || candidate.name,
        tagline: state.tagline || candidate.tagline,
        palette: previewTheme.paletteId,
        typography: previewTheme.typography.heading,
        vibe: "DIRECTION",
        ...(parts.logo && candidate.logo
          ? {
              logo: {
                ...candidate.logo,
                ...(candidate.logo.wordmark
                  ? {
                      wordmark: {
                        ...candidate.logo.wordmark,
                        font:
                          state.brandLanguage === "Arabic"
                            ? previewTheme.typography.arabic
                            : previewTheme.typography.heading,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      }
    : state.selectedBrandIdentity;
  return (
    <section className="studio-guided-section studio-optional-directions">
      <div className="studio-section-heading">
        <span className="studio-section-number">5</span>
        <div>
          <h2>{t("AI Direction · optional", "اتجاه AI · اختياري")}</h2>
          <p>{t("Explore improvements around your choices.", "شوف اقتراحات لتحسين تناسق اختياراتك.")}</p>
        </div>
        <button type="button" className="studio-element-generate" disabled={busy} onClick={() => setResultsOpen(true)}>
          <AIGenerateMark size={14} />{t("Explore directions", "استكشف الاتجاهات")}
        </button>
      </div>
      <Dialog.Root
        open={resultsOpen && !candidate}
        onOpenChange={(open) => {
          if (!generating) setResultsOpen(open);
        }}
      >
        <Dialog.Portal container={brandEnginePortalContainer()}>
          <Dialog.Overlay className="studio-dialog-overlay" />
          <Dialog.Content
            className="studio-theme studio-choice-dialog studio-element-dialog studio-directions-results"
            dir={ar ? "rtl" : "ltr"}
            onEscapeKeyDown={(event) => {
              if (generating) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (generating) event.preventDefault();
            }}
          >
            <Dialog.Title>{t("Optional AI directions", "اتجاهات AI اختيارية")}</Dialog.Title>
            <Dialog.Description>
              {t(
                "Review three alternatives and choose which elements to apply.",
                "راجع ٣ بدائل واختار العناصر اللي تحب تطبقها.",
              )}
            </Dialog.Description>
            <Dialog.Close
              disabled={busy}
              className="studio-dialog-close"
              aria-label={t("Close", "إغلاق")}
            >
              <X size={20} />
            </Dialog.Close>
            <div className="studio-optional-body">
              <button
                type="button"
                className="studio-element-generate"
                disabled={busy || !connected}
                onClick={onGenerate}
              >
                {generating ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <AIGenerateMark size={16} />
                )}
                {generating
                  ? t("Generating…", "جارٍ التوليد…")
                  : t("Generate AI Directions", "ولّد اتجاهات AI")}
              </button>
              <AIGenerationProgress
                busy={generating}
                error={error}
                ar={ar}
                operation="generateBrandIdentity"
                requestId={requestId}
              />
              {!connected && (
                <p className="studio-guided-note">
                  {t(
                    "AI generation needs the platform AI Center connection.",
                    "التوليد يحتاج اتصال AI مفعّل من إعدادات المنصة.",
                  )}
                </p>
              )}
              <div className="studio-direction-grid">
                {state.brandCandidates.map((c) => (
                  <article className={`studio-direction${state.pageParameters["branding"]?.["selectedDirectionId"] === c.id ? " is-applied" : ""}`} key={c.id}>
                    <div
                      className="studio-direction-art"
                      style={{ background: c.theme.light.background }}
                    >
                      <BrandLogoImage
                        primary={c.theme.light.primary}
                        identity={{
                          ...c,
                          palette: c.theme.paletteId,
                          typography: c.theme.typography.heading,
                          vibe: "DIRECTION",
                        }}
                      />
                    </div>
                    <div className="studio-palette-strip">
                      {[
                        c.theme.light.primary,
                        c.theme.light.secondary,
                        c.theme.light.buttonBackground,
                      ].map((color, i) => (
                        <i key={i} style={{ background: color }} title={color} />
                      ))}
                    </div>
                    <h3>{c.name}</h3>
                    {/*<span className="studio-direction-tagline">{c.tagline}</span>*/}
                    {state.pageParameters["branding"]?.["selectedDirectionId"] === c.id &&
                      <span className="studio-direction-applied">{t("Applied direction", "الاتجاه المطبق")}</span>}
                    <small>{c.theme.typography.heading}</small>
                    <button type="button" disabled={busy} onClick={() => open(c)}>
                      {t("Review changes", "راجع التغييرات")}
                    </button>
                  </article>
                ))}
              </div>
              {!state.brandCandidates.length && (
                <p className="studio-guided-note">
                  {t(
                    "You can finish your brand without generating a direction.",
                    "تقدر تحفظ وتكمل بدون توليد اتجاه AI.",
                  )}
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={Boolean(candidate)}
        onOpenChange={(value) => {
          if (!value && !busy) setCandidate(null);
        }}
      >
        <Dialog.Portal container={brandEnginePortalContainer()}>
          <Dialog.Overlay className="studio-dialog-overlay" />
          <Dialog.Content
            className="studio-theme studio-choice-dialog studio-direction-dialog"
            dir={ar ? "rtl" : "ltr"}
          >
            <Dialog.Title>{t("Choose prompt options", "اختار خيارات البرومبت")}</Dialog.Title>
            <Dialog.Description>
              {t(
                "Choose which parts of this direction to apply. Generate a fresh brand name when you select it.",
                "اختار العناصر اللي تطبقها من الاتجاه. عند اختيار الاسم، هيولّد AI اسم براند جديد.",
              )}
            </Dialog.Description>
            <Dialog.Close
              disabled={busy}
              className="studio-dialog-close"
              aria-label={t("Close", "إغلاق")}
            >
              <X size={20} />
            </Dialog.Close>
            {candidate && (
              <>
                <div
                  className="studio-direction-effective-preview"
                  style={{ background: previewTheme.light.background }}
                >
                  {!parts.logo && logoUrl ? (
                    <img src={logoUrl} alt={t("Your current logo", "اللوجو الحالي")} />
                  ) : (
                    <BrandLogoImage
                      primary={previewTheme.light.primary}
                      identity={previewIdentity}
                    />
                  )}
                  <span className="studio-palette-strip">
                    {[
                      previewTheme.light.primary,
                      previewTheme.light.secondary,
                      previewTheme.light.buttonBackground,
                    ].map((color, i) => (
                      <i key={i} style={{ background: color }} title={color} />
                    ))}
                  </span>
                  <strong
                    style={{
                      fontFamily: ar
                        ? previewTheme.typography.arabic
                        : previewTheme.typography.heading,
                    }}
                  >
                    {state.brandName || candidate.name}
                  </strong>
                </div>
                <div className="studio-direction-parts">
                  {(
                    [
                      ["name", t("Apply Brand Name", "تطبيق اسم البراند")],
                      ["colors", t("Apply colors", "تطبيق الألوان")],
                      ["typography", t("Apply typography", "تطبيق الخطوط")],
                      ["logo", t("Replace logo", "استبدال اللوجو")],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={parts[key]}
                        disabled={busy || (key === "name" && generating)}
                        onChange={(e) => setParts({ ...parts, [key]: e.target.checked })}
                      />
                      <span>
                        {label}
                        {key === "name" && candidate.name && (
                          <small>{t("AI suggestion", "اقتراح AI")}: {candidate.name}{candidate.arabicName ? ` · ${candidate.arabicName}` : ""}</small>
                        )}
                        {confirmed(key) && (
                          <small>
                            {t(
                              "You already chose this; replace only if you want to.",
                              "العنصر ده مختار بالفعل؛ استبدله لو حابب.",
                            )}
                          </small>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                    {parts.name && (
                  <button type="button" className="studio-element-generate" disabled={busy || !connected || generating} onClick={onGenerateName}>
                    {generating ? <LoaderCircle size={16} className="animate-spin" /> : <AIGenerateMark size={14} />}
                    {generating ? t("Generating brand name…", "جارٍ توليد اسم البراند…") : t("Generate Brand Name", "ولّد اسم البراند")}
                  </button>
                )}
                <button
                  type="button"
                  className="studio-done-button"
                  disabled={busy || (parts.name && !candidate.name) || !Object.values(parts).some(Boolean)}
                  onClick={() => {
                    onApply(candidate, parts);
                    setCandidate(null);
                    setResultsOpen(false);
                  }}
                >
                  {t("Apply selected changes", "طبّق التغييرات المحددة")}
                </button>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
