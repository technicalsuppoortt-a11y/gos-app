import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { LiveBrandConfiguration } from "./liveBrand";
import "./gosLive.css";

// gos-app's Demo Account mode starts when the frame's window name is this value
// (gos-app src/demo/mode.ts). It runs the real gos pages on sample data and
// never reads or writes a real gos account.
const GOS_DEMO_WINDOW = "gos-demo-account";
const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 900;

/**
 * A live view of a real gos-app page (served from this same site), with the
 * brand being designed applied on top. Changes to gos pages show up here as
 * soon as gos-app is deployed. Nothing in Launch Brand is copied from gos.
 */
export function GosLiveFrame({
  path,
  title,
  configuration,
  width,
  height,
  fullPage,
  viewport,
  onExitPreview,
  onBackToWorkspace,
}: {
  path: string;
  title: string;
  configuration: LiveBrandConfiguration;
  width?: number | undefined;
  height?: number | undefined;
  fullPage?: boolean | undefined;
  viewport?: { width: number; height: number } | undefined;
  onExitPreview?: (() => void) | undefined;
  onBackToWorkspace?: (() => void) | undefined;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: width ?? 0, height: height ?? 0 });
  const [status, setStatus] = useState<"loading" | "slow" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const message = JSON.stringify(configuration);
  const back = onBackToWorkspace ?? onExitPreview;
  const separator = path.includes("?") ? "&" : "?";
  const source = `${path}${separator}launch-brand-preview=1${back ? "&launch-brand-back=1" : ""}`;
  const sendBrand = useCallback((target: Window | null | undefined) => {
    target?.postMessage({ type: "launch-brand:brand", configuration: JSON.parse(message) }, window.location.origin);
  }, [message]);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      const next = { width: width ?? element.clientWidth, height: height ?? element.clientHeight };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  useLayoutEffect(() => {
    setStatus("loading");
    const timeout = window.setTimeout(() => {
      setStatus(current => current === "loading" ? "slow" : current);
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [source, attempt]);

  useLayoutEffect(() => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    // The app asks for its brand as soon as it starts, before assets finish loading.
    const onMessage = (event: MessageEvent) => {
      if (event.source !== target || event.origin !== window.location.origin) return;
      if (event.data?.type === "launch-brand:ready") { sendBrand(target); setStatus("ready"); }
      if (event.data?.type === "launch-brand:back") back?.();
    };
    window.addEventListener("message", onMessage);
    sendBrand(target);
    return () => window.removeEventListener("message", onMessage);
  }, [back, sendBrand, source, attempt]);

  const scale = viewport && size.width && size.height
    ? Math.min(1, size.width / viewport.width, size.height / viewport.height)
    : fullPage || !size.width ? 1 : Math.min(1, size.width / DESKTOP_WIDTH);
  const frameWidth = viewport?.width ?? (scale === 1 ? "100%" : DESKTOP_WIDTH);
  const frameHeight = viewport?.height ?? (scale === 1 ? "100%" : Math.max(size.height / scale, DESKTOP_HEIGHT * 0.6));
  const isAr = configuration.brand.language === "ar";

  return (
    <div
      ref={box}
      style={{ position: "relative", overflow: "hidden", width: width ?? "100%", height: height ?? "100%" }}
    >
      <iframe
        key={`${source}:${attempt}`}
        ref={frame}
        name={GOS_DEMO_WINDOW}
        title={title}
        src={source}
        onLoad={() => sendBrand(frame.current?.contentWindow)}
        onError={() => setStatus("error")}
        style={{ border: 0, display: "block", width: frameWidth, height: frameHeight, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: isAr ? "top right" : "top left", position: scale === 1 ? undefined : "absolute", top: 0, [isAr ? "right" : "left"]: 0 }}
      />
      {status !== "ready" && <div className={`gos-live-loading${status !== "loading" ? " gos-live-loading--action" : ""}`} role={status === "error" ? "alert" : "status"} aria-live="polite" dir={isAr ? "rtl" : "ltr"}>
        {status === "loading" && <span className="gos-live-spinner" aria-hidden="true" />}
        <span>{status === "loading" ? (isAr ? "جارٍ تجهيز المعاينة…" : "Preparing your preview…")
          : status === "slow" ? (isAr ? "المعاينة تستغرق وقتًا أطول من المتوقع." : "The preview is taking longer than expected.")
          : (isAr ? "تعذر تحميل المعاينة." : "The preview could not be loaded.")}</span>
        {status !== "loading" && <>
          <span className="gos-live-loading-detail">{isAr ? "تعديلاتك ما زالت في المحرر. يمكنك إعادة تحميل المعاينة." : "Your edits are still in the editor. You can reload the preview."}</span>
          <button type="button" className="gos-live-retry" onClick={() => setAttempt(current => current + 1)}>{isAr ? "إعادة تحميل المعاينة" : "Reload preview"}</button>
        </>}
      </div>}
    </div>
  );
}
