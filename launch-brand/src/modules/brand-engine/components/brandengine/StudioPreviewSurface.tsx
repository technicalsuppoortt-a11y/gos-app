import { useEffect, useId, useRef, useState } from "react";
import { Laptop, Maximize2, Smartphone, Tablet } from 'lucide-react';
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import { LandingPreviewBridge } from "./landing-preview/LandingPreviewBridge";
import { BrandedDashboard } from "./BrandedDashboard";
import "./StudioPreviewSurface.css";

export type StudioPreviewSurface = "landing" | "dashboard";
const layer = { width: "100%", height: "100%" } as const;
export type StudioPreviewDevice = "desktop" | "tablet" | "mobile";
export function StudioPreviewSurface({ surface, device, onSurfaceChange, onDeviceChange,
  expanded = false, onExpand,
}: {
  surface: StudioPreviewSurface; device: StudioPreviewDevice;
  onSurfaceChange: (surface: StudioPreviewSurface) => void;
  onDeviceChange: (device: StudioPreviewDevice) => void;
  expanded?: boolean; onExpand?: () => void;
}) {
  const ar = useAppSelector((s) => s.brand.language === "ar");
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<"fit" | "actual">("fit");
  const width = device === "desktop" ? 1280 : device === "tablet" ? 768 : 390;
  const height = device === "desktop" ? 850 : device === "tablet" ? 1024 : 844;
  const scale = zoom === "actual" || !stageSize.width || !stageSize.height ? 1
    : Math.min(1, stageSize.width / width, stageSize.height / height);
  useEffect(() => {
    const stage = host.current;
    if (!stage) return;
    const measure = () => {
      const next = { width: Math.max(1, stage.clientWidth - 24), height: Math.max(1, stage.clientHeight - 24) };
      setStageSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [expanded]);
  const [mounted, setMounted] = useState<Record<StudioPreviewSurface, boolean>>(() => ({ dashboard: surface === "dashboard", landing: surface === "landing" }));
  useEffect(() => { setMounted(current => current[surface] ? current : { ...current, [surface]: true }); }, [surface]);
  const surfaces = ["dashboard", "landing"] as const;
  return <div className={`studio-live-preview studio-live-preview--compact${expanded ? " is-expanded" : ""}`} dir={ar ? "rtl" : "ltr"}>
    <div className="studio-preview-controls">
      <div className="studio-preview-surfaces" role="tablist" aria-label={t("Preview surface", "نوع المعاينة")}>
        {surfaces.map((value, index) => <button key={value} type="button" role="tab"
          id={`${id}-${value}`} aria-controls={`${id}-panel`} aria-selected={surface === value}
          tabIndex={surface === value ? 0 : -1} onClick={() => onSurfaceChange(value)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + (ar ? -1 : 1) + surfaces.length) % surfaces.length;
            else if (event.key === "ArrowLeft") next = (index + (ar ? 1 : -1) + surfaces.length) % surfaces.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = surfaces.length - 1;
            else return;
            event.preventDefault(); onSurfaceChange(surfaces[next]!);
            document.getElementById(`${id}-${surfaces[next]}`)?.focus();
          }}>
          {value === "landing" ? t("Landing Page", "صفحة الهبوط") : t("Dashboard", "الداشبورد")}
        </button>)}
      </div>
      <div className="studio-preview-devices" role="group" aria-label={t("Preview device", "جهاز المعاينة")}>
        {(["desktop", "tablet", "mobile"] as const).map(value => {
          const label = value === "desktop" ? t("Desktop", "كمبيوتر") : value === "tablet" ? t("Tablet", "تابلت") : t("Mobile", "موبايل");
          return <button key={value} type="button" aria-label={label} title={label}
            aria-pressed={device === value} onClick={() => { setZoom("fit"); onDeviceChange(value); }}>
            {value === "desktop" ? <Laptop size={16} aria-hidden="true"/> : value === "tablet" ? <Tablet size={16} aria-hidden="true"/> : <Smartphone size={16} aria-hidden="true"/>}
            <span className="studio-preview-device-label">{label}</span>
          </button>;
        })}
      </div>
      <div className="studio-preview-view-actions" role="group" aria-label={t("Preview magnification", "حجم عرض المعاينة")}>
        <button type="button" aria-pressed={zoom === "fit"} onClick={() => setZoom("fit")}>{t("Fit", "ملاءمة")}</button>
        <button type="button" aria-pressed={zoom === "actual"} onClick={() => setZoom("actual")}
          aria-label={t("Actual size, scroll to inspect details", "الحجم الفعلي، مرّر لرؤية التفاصيل")}>100%</button>
        {onExpand && <button type="button" aria-label={t("Expand preview", "تكبير المعاينة")}
          title={t("Expand preview", "تكبير المعاينة")} onClick={onExpand}><Maximize2 size={16} aria-hidden="true"/></button>}
      </div>
    </div>
    <div ref={host} className={`studio-preview-stage${zoom === "actual" ? " studio-preview-stage--actual" : ""}`} data-preview-stage
      id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${surface}`} tabIndex={0}>
      <div className="studio-preview-device-frame" style={{width: width * scale, height: height * scale}}>
        {/* Both previews stay loaded once opened, so switching tabs or devices never reloads them. */}
        {mounted.dashboard && <div className="studio-preview-layer" hidden={surface !== "dashboard"} style={layer}>
          <BrandedDashboard readOnly viewport={{ width, height }} />
        </div>}
        {mounted.landing && <div className="studio-preview-layer" hidden={surface !== "landing"} style={layer}>
          <LandingPreviewBridge viewport={{ width, height }} title={t("Live landing page preview", "معاينة صفحة الهبوط الحالية")} />
        </div>}
      </div>
    </div>
    <span className="studio-preview-caption"><span dir="ltr">{width} × {height} · {Math.round(scale * 100)}%</span><span>{t("Current draft · preview only", "المسودة الحالية · للمعاينة فقط")}</span></span>
  </div>;
}
