import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import { LandingPreviewBridge } from "@/modules/brand-engine/components/brandengine/landing-preview/LandingPreviewBridge";
import styles from "./WebsiteWorkspace.module.css";

const devices = [
  { id: "desktop", width: 1280, height: 850, icon: Monitor, en: "Desktop", ar: "سطح المكتب" },
  { id: "tablet", width: 768, height: 1024, icon: Tablet, en: "Tablet", ar: "تابلت" },
  { id: "mobile", width: 390, height: 844, icon: Smartphone, en: "Mobile", ar: "موبايل" },
] as const;

/** The Builder tab is a read-only first look at the customer's website. */
export function BuilderPage() {
  const { language } = useAppSelector(state => state.brand);
  const ar = language === "ar";
  const [device, setDevice] = useState<(typeof devices)[number]["id"]>("desktop");
  const viewport = devices.find(item => item.id === device) ?? devices[0];
  return (
    <section className={styles["workspace"]} dir={ar ? "rtl" : "ltr"} aria-labelledby="website-preview-title">
      <header className={styles["toolbar"]}>
        <div className={styles["heading"]}>
          <h1 id="website-preview-title">{ar ? "الموقع ومسار التحويل" : "Website & Funnel"}</h1>
          <p>{ar ? "معاينة مسودتك الحالية" : "Preview your current draft"}</p>
        </div>
        <div className={styles["devices"]} role="group" aria-label={ar ? "حجم جهاز المعاينة" : "Preview device"}>
          {devices.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" aria-pressed={device === item.id} onClick={() => setDevice(item.id)}>
              <Icon size={16} aria-hidden="true" />
              <span>{ar ? item.ar : item.en}</span>
            </button>;
          })}
        </div>
        <span className={styles["draft"]}>{ar ? "مسودة · معاينة فقط" : "Draft · Preview only"}</span>
      </header>
      <div className={styles["stage"]}>
        <div className={styles["frame"]} style={{ width: viewport.width }}>
          <LandingPreviewBridge viewport={{ width: viewport.width, height: viewport.height }} title={ar ? `معاينة الموقع — ${viewport.ar}` : `Website preview — ${viewport.en}`} />
        </div>
      </div>
    </section>
  );
}
