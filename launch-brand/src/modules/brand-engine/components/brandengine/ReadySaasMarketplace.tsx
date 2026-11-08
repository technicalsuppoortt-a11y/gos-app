import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  Info,
  LayoutDashboard,
  LockKeyhole,
  PanelsTopLeft,
  Rocket,
  Users,
} from 'lucide-react';
import {
  readySaasCatalog,
  readySaasBrand,
  type ReadySaas,
  type ReadySaasBrand,
  type ReadySaasCategory,
} from "@/modules/brand-engine/data/readySaas";
import { useAppDispatch, useAppSelector } from "@/modules/brand-engine/store/hooks";
import { actions } from "@/modules/brand-engine/store/brandSlice";
import { BrandIdentityMark } from "./BrandIdentityMark";
import { DashboardBrandLogo } from "./DashboardBrandLogo";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/modules/brand-engine/components/ui/dialog";
import styles from "./ReadySaasMarketplace.module.css";
import { LandingPreviewBridge } from "./landing-preview/LandingPreviewBridge";
import { LiveWebsiteViewport } from "./LiveWebsiteViewport";

export type ReadySaasPreviewMode = "landing" | "dashboard";

export function ReadySaasPreview({
  item,
  brand,
  mode = "landing",
  ar = false,
  logoUrl,
  generatedLogo = false,
  primary,
}: {
  item: ReadySaas;
  brand: ReadySaasBrand;
  mode?: ReadySaasPreviewMode;
  ar?: boolean;
  logoUrl?: string | undefined;
  generatedLogo?: boolean;
  primary?: string | undefined;
  description?: string;
}) {
  if (mode === "landing") return (
    <div className={styles["sharedLanding"]} aria-label={`${brand.name} — ${ar ? "صفحة الهبوط" : "Landing Page"}`}>
      <LiveWebsiteViewport title={ar ? "معاينة الموقع" : "Website preview"}>
        <LandingPreviewBridge />
      </LiveWebsiteViewport>
    </div>
  );
  return (
    <div
      className={styles["preview"]}
      data-palette={brand.palette}
      data-font={brand.typography}
      dir={ar ? "rtl" : "ltr"}
      aria-label={`${brand.name} — ${ar ? "لوحة التحكم" : "Dashboard"}`}
    >
      <div className={styles["previewHeader"]}>
        <span className={styles["previewBrand"]}>
          <span className={styles["logo"]}>
            {logoUrl || generatedLogo ? (
              <DashboardBrandLogo identity={brand.logo} url={logoUrl} generated={generatedLogo} primary={primary} />
            ) : (
              <BrandIdentityMark identity={brand.logo} />
            )}
          </span>
          <strong>{brand.name}</strong>
        </span>
        <span className={styles["previewLabel"]}>{ar ? "معاينة فقط" : "Read-only preview"}</span>
      </div>
      {(
        <div className={styles["dashboard"]}>
          <div className={styles["dashboardHeading"]}>
            <h4>{ar ? "نظرة عامة على مساحة العمل" : "Workspace overview"}</h4>
            <span>{ar ? "بيانات تجريبية" : "Sample data"}</span>
          </div>
          <div className={styles["metricTiles"]}>
            {item.core.map((id, index) => (
              <div key={id}>
                <small>{toolName(id, ar)}</small>
                <strong>{[128, 42, 96][index]}</strong>
                <span>{ar ? "نظرة عامة" : "Overview"}</span>
              </div>
            ))}
          </div>
          <div className={styles["activity"]}>
            <strong>{ar ? "النشاط الأخير" : "Recent activity"}</strong>
            {item.core.map((id) => (
              <div key={id}>
                <span className={styles["activityDot"]} />
                <span>{toolName(id, ar)}</span>
                <span>{ar ? "جاهز" : "Ready"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const toolNames: Record<string, [string, string]> = {
  crm: ["CRM", "إدارة العملاء"],
  analytics: ["Analytics", "التحليلات"],
  calendar: ["Booking", "الحجوزات"],
  courses: ["Courses", "الدورات"],
  community: ["Community", "المجتمع"],
  landing: ["Landing Pages", "صفحات الهبوط"],
  payments: ["Payments", "الدفع"],
  whatsapp: ["WhatsApp", "واتساب"],
  assistant: ["AI Assistant", "مساعد ذكي"],
  mail: ["Email Marketing", "التسويق بالبريد"],
};
function toolName(id: string, ar: boolean) {
  return toolNames[id]?.[ar ? 1 : 0] ?? id;
}

export function ReadySaasBrandSummary({ brand, ar }: { brand: ReadySaasBrand; ar: boolean }) {
  return (
    <div className={styles["brandContext"]} data-palette={brand.palette}>
      <span className={styles["logo"]}>
        <BrandIdentityMark identity={brand.logo} />
      </span>
      <dl>
        <div>
          <dt>{ar ? "اسم النشاط" : "Business name"}</dt>
          <dd>{brand.name}</dd>
        </div>
        <div>
          <dt>{ar ? "الألوان" : "Palette"}</dt>
          <dd>
            <span className={styles["swatch"]} />
            {brand.palette}
          </dd>
        </div>
        <div>
          <dt>{ar ? "الخط" : "Typography"}</dt>
          <dd>{brand.typography}</dd>
        </div>
        <div>
          <dt>{ar ? "الشعار" : "Logo"}</dt>
          <dd>{brand.logo.id}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ReadySaasPreviewTabs({
  mode,
  onChange,
  ar,
}: {
  mode: ReadySaasPreviewMode;
  onChange: (mode: ReadySaasPreviewMode) => void;
  ar: boolean;
}) {
  return (
    <div
      className={styles["previewTabs"]}
      role="group"
      aria-label={ar ? "نوع المعاينة" : "Preview type"}
    >
      <button type="button" aria-pressed={mode === "landing"} onClick={() => onChange("landing")}>
        <PanelsTopLeft aria-hidden="true" />
        {ar ? "صفحة الهبوط" : "Landing Page"}
      </button>
      <button
        type="button"
        aria-pressed={mode === "dashboard"}
        onClick={() => onChange("dashboard")}
      >
        <LayoutDashboard aria-hidden="true" />
        {ar ? "لوحة التحكم" : "Dashboard"}
      </button>
    </div>
  );
}

function ReadySaasMetrics({ item, ar }: { item: ReadySaas; ar: boolean }) {
  if (item.category !== "proven" || !item.metrics) return null;
  return (
    <div className={styles["compactMetrics"]}>
      <div>
        <BarChart3 aria-hidden="true" />
        <span>
          <strong>
            {new Intl.NumberFormat(ar ? "ar-EG" : "en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(item.metrics.revenue)}
            +
          </strong>
          <small>{ar ? "إجمالي المبيعات" : "Total sales"}</small>
        </span>
      </div>
      <div>
        <Users aria-hidden="true" />
        <span>
          <strong>{item.metrics.owners}+</strong>
          <small>{ar ? "مالك منصة نشط" : "Active owners"}</small>
        </span>
      </div>
      <small className={styles["metricsNote"]}>
        {ar ? "أرقام المبيعات ليست موثّقة" : "Sales figures are not verified"}
      </small>
    </div>
  );
}

function ReadySaasDialog({
  item,
  brand,
  ar,
  kind,
}: {
  item: ReadySaas;
  brand: ReadySaasBrand;
  ar: boolean;
  kind: "preview" | "details";
}) {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<ReadySaasPreviewMode>("landing");
  const preview = kind === "preview";
  const label = preview ? (ar ? "معاينة" : "Preview") : ar ? "التفاصيل" : "Details";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={preview ? styles["previewButton"] : styles["detailsButton"]}
        >
          {preview ? <Eye aria-hidden="true" /> : <Info aria-hidden="true" />}
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className={styles["modal"]} dir={ar ? "rtl" : "ltr"}>
        <header className={styles["modalHeader"]}>
          <span className={styles["eyebrow"]}>READY SAAS · {label}</span>
          <DialogTitle>{ar ? item.nameAr : item.name}</DialogTitle>
          <DialogDescription>{ar ? item.descriptionAr : item.description}</DialogDescription>
        </header>
        <div className={styles["modalBody"]}>
          {preview ? (
            <>
              <ReadySaasPreviewTabs mode={mode} onChange={setMode} ar={ar} />
              <ReadySaasPreview item={item} brand={brand} mode={mode} ar={ar} />
            </>
          ) : (
            <>
              <section className={styles["detailSection"]}>
                <h4>{ar ? "هوية علامتك، مطبّقة بالفعل" : "Your brand, already applied"}</h4>
                <ReadySaasBrandSummary brand={brand} ar={ar} />
              </section>
              <div className={styles["detailColumns"]}>
                <section className={styles["stack"]}>
                  <h4>{ar ? "الأدوات الأساسية" : "Built-in tools"}</h4>
                  <div>
                    {item.core.map((id) => (
                      <span key={id}>
                        <Check aria-hidden="true" />
                        {toolName(id, ar)}
                      </span>
                    ))}
                  </div>
                </section>
                <section className={styles["stack"]}>
                  <h4>{ar ? "موصلات الربط المجهّزة" : "Integration adapters"}</h4>
                  <div>
                    {item.integrations.map((id) => (
                      <span key={id}>
                        <Check aria-hidden="true" />
                        {toolName(id, ar)}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
              <ReadySaasMetrics item={item} ar={ar} />
              <p className={styles["detailNote"]}>
                {ar
                  ? "موصلات الربط مضمنة؛ حسابات المزوّدين غير متصلة في هذا العرض التجريبي."
                  : "Integration adapters are included; provider accounts require separate setup."}
              </p>
            </>
          )}
        </div>
        <footer className={styles["modalFooter"]}>
          <div>
            <span className={styles["locked"]}>
              <LockKeyhole aria-hidden="true" />
              {ar ? "حل جاهز — التخصيص مقفل" : "Turnkey Solution — Customization Locked"}
            </span>
            <small>
              {ar ? "انتقل مباشرةً إلى النشر والإطلاق" : "Continue directly to Deploy & Launch"}
            </small>
          </div>
          <button
            className={styles["useButton"]}
            type="button"
            onClick={() => dispatch(actions.useReadySaas(item.id))}
          >
            {ar ? "استخدم المنصة الجاهزة" : "Use Ready SaaS"}
            <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function ReadySaasCard({
  item,
  brand,
  ar,
}: {
  item: ReadySaas;
  brand: ReadySaasBrand;
  ar: boolean;
}) {
  const dispatch = useAppDispatch();
  return (
    <article className={styles["card"]}>
      <div className={styles["thumbnail"]}>
        <div className={styles["thumbnailImages"]}>
          <img
            className={styles["dashboardImage"]}
            src={`/ready-saas/${item.id}-dashboard.svg`}
            alt={ar ? `لوحة تحكم ${item.name}` : `${item.name} dashboard`}
            loading="lazy"
            width="720"
            height="450"
          />
          <img
            className={styles["landingImage"]}
            src={`/ready-saas/${item.id}-landing.svg`}
            alt={ar ? `صفحة هبوط ${item.name}` : `${item.name} landing page`}
            loading="lazy"
            width="720"
            height="450"
          />
        </div>
        <span className={styles["thumbnailBadge"]}>
          {item.category === "proven"
            ? ar
              ? "مبيعات سابقة"
              : "Proven sales"
            : ar
              ? "قبل الإطلاق"
              : "Pre-launch"}
        </span>
      </div>
      <div className={styles["cardBody"]}>
        <div className={styles["compactHeading"]}>
          <h3>{ar ? item.nameAr : item.name}</h3>
          <span title={ar ? "التخصيص مقفل" : "Customization locked"}>
            <LockKeyhole aria-hidden="true" />
            <span className={styles["lockLabel"]}>{ar ? "مقفل" : "Locked"}</span>
          </span>
        </div>
        <p className={styles["description"]}>{ar ? item.descriptionAr : item.description}</p>
        {item.category === "proven" ? (
          <ReadySaasMetrics item={item} ar={ar} />
        ) : (
          <div className={styles["newStatus"]}>
            <Rocket aria-hidden="true" />
            <span>
              <strong>{ar ? "جاهز لإطلاقك الأول" : "Ready for your first launch"}</strong>
              <small>{ar ? "منصة جديدة، بهوية علامتك" : "A fresh platform, in your brand"}</small>
            </span>
          </div>
        )}
        <div className={styles["cardActions"]}>
          <ReadySaasDialog item={item} brand={brand} ar={ar} kind="preview" />
          <ReadySaasDialog item={item} brand={brand} ar={ar} kind="details" />
          <button
            className={styles["useButton"]}
            type="button"
            onClick={() => dispatch(actions.useReadySaas(item.id))}
          >
            {ar ? "استخدم المنصة الجاهزة" : "Use Ready SaaS"}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ReadySaasMarketplace() {
  const state = useAppSelector((root) => root.brand);
  const ar = state.language === "ar";
  const brand = readySaasBrand(state);
  const [category, setCategory] = useState<ReadySaasCategory>("proven");
  return (
    <section className={styles["marketplace"]} dir={ar ? "rtl" : "ltr"}>
      <header className={styles["intro"]}>
        <h2>{ar ? "منصات جاهزة بهويتك" : "Ready SaaS, already in your brand"}</h2>
        <p>
          {ar
            ? "اختر منصتك، استكشف التفاصيل، وانطلق بهويتك. كل شيء في مكانه لتبدأ أسرع."
            : "Find your platform, explore the details, and launch in your brand. A shorter path from idea to launch."}
        </p>
      </header>
      <div
        className={styles["categoryTabs"]}
        role="group"
        aria-label={ar ? "فئات المنصات الجاهزة" : "Ready SaaS categories"}
      >
        <button
          type="button"
          aria-pressed={category === "proven"}
          onClick={() => setCategory("proven")}
        >
          {ar ? "منصات بمبيعات سابقة" : "SaaS with Proven Sales"}
        </button>
        <button type="button" aria-pressed={category === "new"} onClick={() => setCategory("new")}>
          {ar ? "قبل الإطلاق / منصات جديدة" : "Pre-launch / New SaaS"}
        </button>
      </div>
      <div className={styles["grid"]}>
        {readySaasCatalog
          .filter((item) => item.category === category)
          .map((item) => (
            <ReadySaasCard key={item.id} item={item} brand={brand} ar={ar} />
          ))}
      </div>
    </section>
  );
}

export function ReadySaasDeploymentSummary({
  item,
  brand,
  ar,
}: {
  item: ReadySaas;
  brand: ReadySaasBrand;
  ar: boolean;
}) {
  return (
    <section className={styles["deploymentSummary"]} dir={ar ? "rtl" : "ltr"}>
      <div>
        <span className={styles["eyebrow"]}>
          {ar ? "مسار الإطلاق المباشر" : "READY SAAS · DIRECT LAUNCH"}
        </span>
        <h3>{ar ? item.nameAr : item.name}</h3>
        <p className={styles["locked"]}>
          <LockKeyhole aria-hidden="true" />
          {ar ? "حل جاهز — التخصيص مقفل" : "Turnkey Solution — Customization Locked"}
        </p>
      </div>
      <ReadySaasBrandSummary brand={brand} ar={ar} />
    </section>
  );
}
