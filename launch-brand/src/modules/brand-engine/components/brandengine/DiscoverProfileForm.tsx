import { useState, useEffect, useId } from "react";
import {
  Stethoscope,
  Dumbbell,
  GraduationCap,
  House,
  BriefcaseBusiness,
  ShoppingCart,
  Utensils,
  Sparkles,
  ChartNoAxesColumnIncreasing,
  UserRound,
  MapPin,
  Cpu,
  Send,
  Ellipsis,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  DiscoveryConfiguration,
  DiscoveryOption,
  DiscoveryProfile,
} from "@/modules/brand-engine/data/discoveryProfile";
import { DiscoveryCountryPicker } from "./DiscoveryCountryPicker";

const icons = {
  health: Stethoscope,
  fitness: Dumbbell,
  education: GraduationCap,
  "real-estate": House,
  professional: BriefcaseBusiness,
  ecommerce: ShoppingCart,
  hospitality: Utensils,
  beauty: Sparkles,
  finance: ChartNoAxesColumnIncreasing,
  coaching: UserRound,
  local: MapPin,
  technology: Cpu,
  travel: Send,
  other: Ellipsis,
};
function Options({
  options,
  value,
  change,
  ar,
  visual = false,
  compact = false,
  inlinePager = false,
}: {
  options: DiscoveryOption[];
  value: string[];
  change: (value: string[]) => void;
  ar: boolean;
  visual?: boolean;
  compact?: boolean;
  inlinePager?: boolean;
}) {
  const [page, setPage] = useState(0);
  const all = [
    ...options.filter(
      (option) => option.id.toLowerCase() !== "other" && !/^(other|أخرى)$/i.test(option.en.trim()),
    ),
    ...value
      .filter((id) => id.toLowerCase() !== "other" && !options.some((o) => o.id === id))
      .map((id) => ({ id, en: id, ar: id })),
  ];
  const size = compact ? Math.max(1, all.length) : visual ? 14 : 11,
    last = Math.max(0, Math.ceil(all.length / size) - 1),
    current = Math.min(page, last);
  return (
    <div className="profile-option-group">
      <div className={`profile-options ${visual ? "visual" : "plain"}`}>
        {all.slice(current * size, current * size + size).map((option) => {
          const Icon = icons[option.id as keyof typeof icons] || Ellipsis;
          const selected = value.includes(option.id);
          return (
            <button
              type="button"
              key={option.id}
              title={ar ? option.ar : option.en}
              aria-pressed={selected}
              className={selected ? "selected" : ""}
              onClick={() =>
                change(
                  selected
                    ? value.filter((id) => id !== option.id)
                    : value.length < 20
                      ? [...value, option.id]
                      : value,
                )
              }
            >
              {visual && (
                <span className="profile-option-icon">
                  <Icon aria-hidden="true" />
                </span>
              )}
              <span className="profile-option-label">{ar ? option.ar : option.en}</span>
              {selected && <Check className="profile-option-check" aria-hidden="true" />}
            </button>
          );
        })}
      {last > 0 && (
        <div className={`profile-option-pages ${inlinePager ? "is-inline" : "is-full-row"}`}>
          <button
            type="button"
            disabled={!current}
            onClick={() => setPage(current - 1)}
            aria-label={ar ? "الاختيارات السابقة" : "Previous options"}
          >
            <ChevronLeft />
          </button>
          <small aria-live="polite" aria-atomic="true">
            {current + 1}/{last + 1}
          </small>
          <button
            type="button"
            disabled={current === last}
            onClick={() => setPage(current + 1)}
            aria-label={ar ? "المزيد من الاختيارات" : "More options"}
          >
            <ChevronRight />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
export function DiscoverProfileForm({
  profile,
  config,
  edit,
  ar,
  busy,
}: {
  profile: DiscoveryProfile;
  config: DiscoveryConfiguration;
  edit: (patch: Partial<DiscoveryProfile>) => void;
  ar: boolean;
  busy: boolean;
}) {
  const [countryOpen, setCountryOpen] = useState(false);
  const formId = useId();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 700px)");
    const updateCompact = () => setCompact(viewport.matches);
    updateCompact();
    viewport.addEventListener("change", updateCompact);
    return () => viewport.removeEventListener("change", updateCompact);
  }, []);
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const heading = (i: number, title: string, description: string) => (
    <div
      className="profile-section-heading"
      id={`${formId}-heading-${i}`}
    >
      <b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b>
      <div>
        <h2>{title}</h2>
        <small>{description}</small>
      </div>
    </div>
  );
  const choices = (key: "language" | "defaultLanguage" | "selling" | "time" | "budget", options: DiscoveryOption[]) => (
    <div className="profile-radio">
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          aria-pressed={profile[key] === o.id}
          className={profile[key] === o.id ? "selected" : ""}
          onClick={() => {
            if (key !== "language") {
              edit({ [key]: o.id });
              return;
            }
            const language = o.id as DiscoveryProfile["language"];
            edit({
              language,
              defaultLanguage: language === "both"
                ? profile.defaultLanguage || (profile.language === "ar" || profile.language === "en" ? profile.language : "")
                : language,
            });
          }}
        >
          <span className="profile-radio-dot" aria-hidden="true">
            {profile[key] === o.id && <Check />}
          </span>
          <span>{ar ? o.ar : o.en}</span>
        </button>
      ))}
    </div>
  );
  return (
    <fieldset
      disabled={busy}
      className="discover-profile-form"
      aria-label={t("Your business profile", "ملف نشاطك التجاري")}
    >
      <section className="profile-section section-interests is-open">
        {heading(
          0,
          t("What are you interested in?", "ما المجالات التي تهمك؟"),
          t(
            "Choose topics you're passionate about. You can select multiple.",
            "اختر المجالات التي تهمك. يمكنك تحديد أكثر من اختيار.",
          ),
        )}
        <div
          className="profile-section-body"
          id={`${formId}-section-0`}
          aria-labelledby={`${formId}-heading-0`}
        >
          <Options
            compact={compact}
            visual
            options={config.interests}
            value={profile.interests}
            change={(value) =>
              edit({
                interests: value,
                exclusions: profile.exclusions.filter((id) => !value.includes(id)),
              })
            }
            ar={ar}
          />
        </div>
      </section>
      {/*
      <section className={`profile-section section-knowledge ${active === 1 ? "is-open" : ""}`}>
        {heading(
          1,
          t("What do you already know?", "ما الذي تعرفه بالفعل؟"),
          t(
            "Select the industries you understand and your main skills.",
            "حدد الصناعات التي تفهمها ومهاراتك الأساسية.",
          ),
        )}
        <div
          className="profile-section-body"
          id={`${formId}-section-1`}
          aria-labelledby={`${formId}-heading-1`}
          hidden={compact && active !== 1}
        >
          <div className="profile-knowledge-columns">
            <div>
              <h3>{t("Industries you understand", "صناعات تفهمها")}</h3>
              <Options
                compact={compact}
                inlinePager
                options={config.interests}
                value={profile.industries}
                change={(industries) => edit({ industries })}
                ar={ar}
              />
            </div>
            <div>
              <h3>{t("Your skills or experience", "مهاراتك أو خبرتك")}</h3>
              <Options
                compact={compact}
                options={config.skills}
                value={profile.skills}
                change={(skills) => edit({ skills })}
                ar={ar}
              />
            </div>
          </div>
        </div>
      </section>
      */}
      {/*
      <section className={`profile-section section-markets ${active === 2 ? "is-open" : ""}`}>
        {heading(
          2,
          t("Where do you want to operate?", "أين تريد العمل؟"),
          t(
            "Select your target country or region and preferred language.",
            "حدد البلد أو المنطقة المستهدفة ولغة العمل.",
          ),
        )}
        <div
          className="profile-section-body profile-market-columns"
          id={`${formId}-section-2`}
          aria-labelledby={`${formId}-heading-2`}
          hidden={compact && active !== 2}
        >
          <div>
            <h3>{t("Target country or region", "الدولة أو المنطقة المستهدفة")}</h3>
            <div className="profile-country-chips">
              {markets.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  aria-pressed={profile.market === o.id}
                  className={profile.market === o.id ? "selected" : ""}
                  onClick={() => edit({ market: o.id, customMarket: "" })}
                >
                  <CountryFlag code={o.id} />
                  <span>{ar ? o.ar : o.en}</span>
                  {profile.market === o.id && (
                    <Check className="profile-option-check" aria-hidden="true" />
                  )}
                </button>
              ))}
              {selectedExtraCountry && (
                <button
                  type="button"
                  className="selected"
                  aria-pressed="true"
                  onClick={() => setCountryOpen(true)}
                >
                  <CountryFlag code={selectedExtraCountry} />
                  <span>{countryNames.of(selectedExtraCountry)}</span>
                  <Check className="profile-option-check" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className={profile.market === "GLOBAL" ? "selected" : ""}
                aria-pressed={profile.market === "GLOBAL"}
                aria-haspopup="dialog"
                aria-expanded={countryOpen}
                onClick={() => setCountryOpen(true)}
              >
                <Globe2 aria-hidden="true" />
                <span>{t("Global", "العالم")}</span>
                {profile.market === "GLOBAL" && (
                  <Check className="profile-option-check" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
      */}
      <section className="profile-section section-language">
        {heading(1, t("Preferred language", "اللغة المفضلة"), t("Choose the language for your brand content.", "اختر اللغة التي تفضلها لمحتوى علامتك التجارية."))}
        <div className="profile-section-body">
          <div>
            {choices("language", [
              { id: "ar", en: "Arabic", ar: "العربية" },
              { id: "en", en: "English", ar: "الإنجليزية" },
              { id: "both", en: "Arabic + English", ar: "العربية + الإنجليزية" },
            ])}
            {profile.language === "both" && (
              <div className="profile-default-language">
                <h3>{t("Which language should be the default?", "ما اللغة الافتراضية التي تفضلها؟")}</h3>
                {choices("defaultLanguage", [
                  { id: "ar", en: "Arabic", ar: "العربية" },
                  { id: "en", en: "English", ar: "الإنجليزية" },
                ])}
              </div>
            )}
          </div>
        </div>
      </section>
      {/*
      <section className={`profile-section section-preferences ${active === 3 ? "is-open" : ""}`}>
        {heading(
          3,
          t("Business preferences", "تفضيلات نشاطك"),
          t(
            "Tell us about your ideal business model, time and budget.",
            "حدد نموذج العمل والوقت والميزانية المناسبين لك.",
          ),
        )}
        <div
          className="profile-section-body profile-preference-columns"
          id={`${formId}-section-3`}
          aria-labelledby={`${formId}-heading-3`}
          hidden={compact && active !== 3}
        >
          <div>
            <h3>{t("How do you want to sell?", "لمن تريد البيع؟")}</h3>
            {choices("selling", [
              { id: "b2b", en: "B2B", ar: "B2B" },
              { id: "b2c", en: "B2C", ar: "B2C" },
              { id: "both", en: "Both", ar: "كلاهما" },
            ])}
          </div>
          <div>
            <h3>{t("Time you can dedicate weekly?", "وقتك المتاح أسبوعيًا؟")}</h3>
            {choices("time", config.timeRanges)}
          </div>
          <div>
            <h3>
              {t("Available starting budget", "ميزانية البداية المتاحة")}
              <select
                aria-label={t("Currency", "العملة")}
                value={profile.currency}
                onChange={(e) => edit({ currency: e.target.value })}
              >
                {["USD", "EGP", "SAR", "AED", "EUR", "QAR", "KWD", "JOD"].map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </h3>
            {choices("budget", config.budgetRanges)}
          </div>
        </div>
      </section>
      */}
      <DiscoveryCountryPicker
        open={countryOpen}
        setOpen={setCountryOpen}
        value={profile.market}
        select={(market) => edit({ market, customMarket: "" })}
        ar={ar}
      />
    </fieldset>
  );
}
