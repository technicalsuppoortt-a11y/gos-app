import { useState, useEffect, useId, type ReactNode } from "react";
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
  Compass,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  X,
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
  other: Compass,
};

const interestHints: Record<string, [string, string]> = {
  health: ["Clinics, telehealth & patient care", "العيادات والرعاية الصحية"],
  fitness: ["Gyms, studios & personal training", "الأندية الرياضية واللياقة"],
  education: ["Courses, cohorts & academies", "الدورات والأكاديميات التعليمية"],
  "real-estate": ["Brokerage, listings & property", "الوساطة والتطوير العقاري"],
  professional: ["Consulting, legal & B2B services", "الاستشارات وخدمات الأعمال"],
  ecommerce: ["Online stores & physical products", "المتاجر الإلكترونية والمنتجات"],
  hospitality: ["Restaurants, cafes & venues", "المطاعم والكافيهات والضيافة"],
  beauty: ["Salons, aesthetics & skincare", "التجميل والعناية والسبا"],
  finance: ["Accounting, advisory & wealth", "المحاسبة والاستشارات المالية"],
  coaching: ["1:1 mentoring & executive programs", "التدريب الشخصي والإرشاد"],
  local: ["Home, maintenance & field services", "الخدمات المحلية والمنزلية"],
  technology: ["SaaS, AI & digital solutions", "البرمجيات والذكاء الاصطناعي"],
  travel: ["Tours, hospitality & experiences", "السياحة والسفر والتجارب"],
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
  const size = compact ? Math.max(1, all.length) : visual ? 16 : 12,
    last = Math.max(0, Math.ceil(all.length / size) - 1),
    current = Math.min(page, last);
  return (
    <div className="profile-option-group">
      <div className={`profile-options ${visual ? "visual" : "plain"}`}>
        {all.slice(current * size, current * size + size).map((option) => {
          const Icon = icons[option.id as keyof typeof icons] || Compass;
          const hint = interestHints[option.id];
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
              <span className="profile-option-copy">
                <span className="profile-option-label">{ar ? option.ar : option.en}</span>
                {visual && hint && (
                  <small className="profile-option-sub">{ar ? hint[1] : hint[0]}</small>
                )}
              </span>
              <span className={`profile-option-indicator ${selected ? "is-checked" : ""}`} aria-hidden="true">
                {selected && <Check className="profile-option-check" />}
              </span>
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
  aside,
}: {
  profile: DiscoveryProfile;
  config: DiscoveryConfiguration;
  edit: (patch: Partial<DiscoveryProfile>) => void;
  ar: boolean;
  busy: boolean;
  /** Shown in the right rail under the language question (live summary and next steps). */
  aside?: ReactNode;
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
  const heading = (i: number, title: string, description: string, badge?: ReactNode) => (
    <div
      className="profile-section-heading"
      id={`${formId}-heading-${i}`}
    >
      <b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b>
      <div className="profile-section-heading-copy">
        <h2>{title}</h2>
        <small>{description}</small>
      </div>
      {badge}
    </div>
  );
  const choices = (
    key: "language" | "defaultLanguage" | "selling" | "time" | "budget",
    options: Array<DiscoveryOption & { code?: string; hintEn?: string; hintAr?: string }>,
  ) => (
    <div className="profile-radio">
      {options.map((o) => {
        const isSelected = profile[key] === o.id;
        return (
          <button
            type="button"
            key={o.id}
            aria-pressed={isSelected}
            className={isSelected ? "selected" : ""}
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
            {o.code && (
              <span className="profile-lang-badge" aria-hidden="true">
                {o.code}
              </span>
            )}
            <span className="profile-radio-copy">
              <strong>{ar ? o.ar : o.en}</strong>
              {(o.hintEn || o.hintAr) && (
                <small>{ar ? o.hintAr : o.hintEn}</small>
              )}
            </span>
            <span className="profile-radio-dot" aria-hidden="true">
              {isSelected && <Check />}
            </span>
          </button>
        );
      })}
    </div>
  );

  const selectedLabels = profile.interests.map((id) => {
    const found = config.interests.find((opt) => opt.id === id);
    return { id, label: found ? (ar ? found.ar : found.en) : id };
  });

  return (
    <fieldset
      disabled={busy}
      className="discover-profile-form"
      aria-label={t("Your business profile", "ملف نشاطك التجاري")}
    >
      <div className="discover-bento-grid">
        <section className="profile-section section-interests is-open">
          {heading(
            0,
            t("What are you interested in?", "ما المجالات التي تهمك؟"),
            t(
              "Select one or more focus areas so we can tailor your workspace modules and brand recommendations.",
              "اختر مجالًا واحدًا أو أكثر لتخصيص أدوات منصتك واقتراحات علامتك التجارية.",
            ),
            <span className="discover-count-pill">
              {profile.interests.length} {t("selected", "محدد")}
            </span>,
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
          <div className="discover-interests-summary-bar">
            <div className="discover-interests-summary-chips">
              <span className="discover-summary-label">
                {t("Active focus:", "التركيز الحالي:")}
              </span>
              {selectedLabels.length === 0 ? (
                <span className="discover-summary-empty">
                  {t("Select industries above to personalize your setup", "اختر المجالات أعلاه لتخصيص إعداداتك")}
                </span>
              ) : (
                selectedLabels.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="discover-selected-interest-tag"
                    onClick={() => edit({ interests: profile.interests.filter((id) => id !== item.id) })}
                  >
                    <span>{item.label}</span>
                    <X size={11} aria-hidden="true" />
                  </button>
                ))
              )}
              {selectedLabels.length > 4 && (
                <span className="discover-summary-more">+{selectedLabels.length - 4}</span>
              )}
            </div>
            {selectedLabels.length > 0 && (
              <button
                type="button"
                className="discover-clear-interests"
                onClick={() => edit({ interests: [] })}
              >
                {t("Clear all", "مسح الكل")}
              </button>
            )}
          </div>
        </section>

        <div className="discover-right-rail">
          <section className="profile-section section-language">
            {heading(
              1,
              t("Preferred language", "اللغة المفضلة"),
              t("Choose the primary language for your brand content and audience.", "اختر اللغة الأساسية لمحتوى علامتك التجارية وجمهورك."),
              <span className="discover-lang-icon" aria-hidden="true"><Languages size={15} /></span>,
            )}
            <div className="profile-section-body">
              <div>
                {choices("language", [
                  { id: "ar", en: "Arabic", ar: "Arabic", code: "AR", hintEn: "Right-to-left interface & copy", hintAr: "واجهة ومحتوى باللغة العربية" },
                  { id: "en", en: "English", ar: "الإنجليزية", code: "EN", hintEn: "Global English interface & copy", hintAr: "واجهة ومحتوى باللغة الإنجليزية" },
                  { id: "both", en: "Arabic + English", ar: "العربية + الإنجليزية", code: "AR·EN", hintEn: "Bilingual multi-market experience", hintAr: "تجربة ثنائية اللغة للأسواق المتعددة" },
                ])}
                {profile.language === "both" && (
                  <div className="profile-default-language">
                    <h3>{t("Default workspace language", "اللغة الافتراضية للمنصة")}</h3>
                    {choices("defaultLanguage", [
                      { id: "ar", en: "Arabic", ar: "Arabic", code: "AR" },
                      { id: "en", en: "English", ar: "الإنجليزية", code: "EN" },
                    ])}
                  </div>
                )}
              </div>
            </div>
          </section>
          {aside}
        </div>
      </div>

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
