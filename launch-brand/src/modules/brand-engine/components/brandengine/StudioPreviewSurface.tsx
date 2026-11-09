import { useEffect, useId, useRef, useState } from "react";
import { Laptop, Maximize2, Smartphone, Tablet } from 'lucide-react';
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import { LandingPreviewBridge } from "./landing-preview/LandingPreviewBridge";
import { BrandedDashboard } from "./BrandedDashboard";

export type StudioPreviewSurface = "landing" | "dashboard";
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
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const width = device === "desktop" ? 1280 : device === "tablet" ? 768 : 390;
  const baseHeight = device === "desktop" ? 850 : device === "tablet" ? 1024 : 844;
  const height = device === "desktop" && frameSize.width > 0
    ? Math.round(frameSize.height * width / frameSize.width) : baseHeight;
  useEffect(() => {
    const stage = host.current;
    if (!stage) return;
    const measure = () => {
      const availableWidth = Math.max(1, stage.clientWidth);
      const availableHeight = Math.max(1, stage.clientHeight);
      const nextWidth = device === "desktop" ? Math.min(width, availableWidth)
        : Math.max(1, Math.min(width, availableWidth - 12, (availableHeight - 12) * width / baseHeight));
      const nextHeight = device === "desktop" ? availableHeight : nextWidth * baseHeight / width;
      setFrameSize(previous => previous.width === nextWidth && previous.height === nextHeight
        ? previous : { width: nextWidth, height: nextHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [width, baseHeight, device]);
  const surfaces = ["dashboard", "landing"] as const;
  return <div className={`studio-live-preview${expanded ? " is-expanded" : ""}`} dir={ar ? "rtl" : "ltr"}>
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
            aria-pressed={device === value} onClick={() => onDeviceChange(value)}>
            {value === "desktop" ? <Laptop size={15}/> : value === "tablet" ? <Tablet size={15}/> : <Smartphone size={15}/>}
          </button>;
        })}
        {onExpand && <button type="button" aria-label={t("Expand preview", "تكبير المعاينة")}
          title={t("Expand preview", "تكبير المعاينة")} onClick={onExpand}><Maximize2 size={15}/></button>}
      </div>
    </div>
    <div ref={host} className="studio-preview-stage" data-preview-stage
      id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${surface}`} tabIndex={0}>
      <div className="studio-preview-device-frame" style={{width: frameSize.width || "100%", height: frameSize.height || "100%"}}>
        {surface === "dashboard" ? <BrandedDashboard readOnly
          {...(expanded && device === "desktop" ? {} : { width, height })} /> :
          <LandingPreviewBridge viewport={{ width, height }} title={t("Live landing page preview", "معاينة صفحة الهبوط الحالية")} />}
      </div>
    </div>
    <span className="studio-preview-caption">{width} × {height} · {t("Current draft · preview only", "المسودة الحالية · للمعاينة فقط")}</span>
  </div>;
}
