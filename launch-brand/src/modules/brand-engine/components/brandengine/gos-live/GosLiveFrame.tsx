import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LiveBrandConfiguration } from "./liveBrand";
import {
  previewConfigHash,
  previewSnapshotVersion,
  readPreviewSnapshot,
  savePreviewSnapshot,
  subscribePreviewSnapshots,
} from "./previewSnapshot";
import "./gosLive.css";

// gos-app's Demo Account mode starts when the frame's window name is this value
// (gos-app src/demo/mode.ts). It runs the real gos pages on sample data and
// never reads or writes a real gos account.
const GOS_DEMO_WINDOW = "gos-demo-account";
const DESKTOP_WIDTH = 1440;
const DESKTOP_HEIGHT = 900;

function isPageStyledAndReady(
  target: Window,
  doc: Document,
  path: string,
  expectedMode: "light" | "dark",
): boolean {
  if (doc.documentElement.dataset.theme !== expectedMode) return false;
  if (doc.querySelector(".workspace-loading")) return false;
  const links = doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  for (const link of Array.from(links)) {
    if (link.href && link.href.startsWith(window.location.origin) && !link.sheet) return false;
  }
  if (path === "/") {
    const header = doc.querySelector(".lp-header");
    const hero = doc.querySelector(".lp-hero");
    if (!header || !hero) return false;
    return target.getComputedStyle(header).position === "sticky";
  }
  const shell = doc.querySelector(".layout-dashboard-shell");
  const header = doc.querySelector(".layout-header");
  const home = doc.querySelector(".gos-home-dashboard");
  if (!shell || !header || !home) return false;
  return target.getComputedStyle(shell).display === "flex" && target.getComputedStyle(header).display === "flex";
}

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
  const frame = useRef<HTMLIFrameElement & { __launchBrandConfig?: LiveBrandConfiguration }>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: width ?? 0, height: height ?? 0 });
  const [status, setStatus] = useState<"loading" | "slow" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const message = JSON.stringify(configuration);
  const config = previewConfigHash(message);
  const back = onBackToWorkspace ?? onExitPreview;
  const separator = path.includes("?") ? "&" : "?";
  const source = `${path}${separator}launch-brand-preview=1${back ? "&launch-brand-back=1" : ""}`;

  // Expose configuration synchronously on the frame element so Demo Account's
  // very first render already has the chosen colors, logo, language, and mode.
  if (frame.current) frame.current.__launchBrandConfig = configuration;

  const sendBrand = useCallback((target: Window | null | undefined) => {
    if (frame.current) frame.current.__launchBrandConfig = JSON.parse(message) as LiveBrandConfiguration;
    target?.postMessage({ type: "launch-brand:brand", configuration: JSON.parse(message) }, window.location.origin);
  }, [message]);

  useLayoutEffect(() => {
    if (frame.current) frame.current.__launchBrandConfig = JSON.parse(message) as LiveBrandConfiguration;
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

  const scale = viewport && size.width && size.height
    ? Math.min(1, size.width / viewport.width, size.height / viewport.height)
    : fullPage || !size.width ? 1 : Math.min(1, size.width / DESKTOP_WIDTH);
  const frameWidth = viewport?.width ?? (scale === 1 ? "100%" : DESKTOP_WIDTH);
  const frameHeight = viewport?.height ?? (scale === 1 ? "100%" : Math.max(size.height / scale, DESKTOP_HEIGHT * 0.6));
  const layoutWidth = Math.round(typeof frameWidth === "number" ? frameWidth : size.width);
  const layoutHeight = Math.round(typeof frameHeight === "number" ? frameHeight : size.height);
  const isAr = configuration.brand.language === "ar";

  useSyncExternalStore(subscribePreviewSnapshots, previewSnapshotVersion);
  const snapshot = layoutWidth && layoutHeight ? readPreviewSnapshot(path, layoutWidth, layoutHeight) : null;

  useLayoutEffect(() => {
    setStatus("loading");
    const timeout = window.setTimeout(() => {
      setStatus(current => current === "loading" ? "slow" : current);
    }, 20000);
    return () => window.clearTimeout(timeout);
  }, [source, attempt]);

  const capture = useRef({ path, layoutWidth, layoutHeight, config });
  capture.current = { path, layoutWidth, layoutHeight, config };

  useLayoutEffect(() => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    let timer = 0;
    let saveTimer = 0;
    let disposed = false;
    const painted = (callback: () => void) => {
      let done = false;
      const run = () => { if (!done && !disposed) { done = true; callback(); } };
      try { target.requestAnimationFrame(() => target.requestAnimationFrame(run)); } catch { /* ignored */ }
      window.setTimeout(run, 100);
    };
    const waitForContent = () => {
      window.clearTimeout(timer);
      if (disposed) return;
      let doc: Document;
      try { doc = target.document; } catch { return; }
      if (!isPageStyledAndReady(target, doc, path, configuration.brand.mode)) {
        timer = window.setTimeout(waitForContent, 50);
        return;
      }
      painted(() => {
        setStatus("ready");
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
          if (disposed || !isPageStyledAndReady(target, doc, path, configuration.brand.mode)) return;
          const current = capture.current;
          savePreviewSnapshot(current.path, current.layoutWidth, current.layoutHeight, current.config, doc);
        }, 500);
      });
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== target || event.origin !== window.location.origin) return;
      if (event.data?.type === "launch-brand:ready") { sendBrand(target); waitForContent(); }
      if (event.data?.type === "launch-brand:back") back?.();
    };
    window.addEventListener("message", onMessage);
    sendBrand(target);
    waitForContent();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.clearTimeout(saveTimer);
      window.removeEventListener("message", onMessage);
    };
  }, [back, sendBrand, source, attempt, path, configuration.brand.mode, layoutWidth, layoutHeight]);

  const snapshotScale = snapshot && layoutWidth ? (layoutWidth / snapshot.width) * scale : scale;
  const snapshotHeight = snapshot && layoutWidth ? Math.round(layoutHeight * snapshot.width / layoutWidth) : 0;
  const showSnapshot = Boolean(snapshot) && status !== "ready";

  return (
    <div
      ref={box}
      className="gos-live-frame"
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
        style={{ border: 0, display: "block", width: frameWidth, height: frameHeight, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: isAr ? "top right" : "top left", position: scale === 1 ? undefined : "absolute", top: 0, [isAr ? "right" : "left"]: 0, opacity: status === "ready" ? 1 : 0 }}
      />
      {showSnapshot && snapshot && <iframe title={`${title} snapshot`} srcDoc={snapshot.html}
        sandbox="allow-same-origin" aria-hidden="true" tabIndex={-1}
        style={{ border: 0, display: "block", width: snapshot.width, height: snapshotHeight, transform: `scale(${snapshotScale})`, transformOrigin: isAr ? "top right" : "top left", position: "absolute", top: 0, [isAr ? "right" : "left"]: 0, pointerEvents: "none" }} />}
      {(status === "error" || (status === "slow" && !snapshot)) && <div className="gos-live-loading gos-live-loading--action" role={status === "error" ? "alert" : "status"} aria-live="polite" dir={isAr ? "rtl" : "ltr"}>
        <span>{status === "slow" ? (isAr ? "المعاينة تستغرق وقتًا أطول من المتوقع." : "The preview is taking longer than expected.")
          : (isAr ? "تعذر تحميل المعاينة." : "The preview could not be loaded.")}</span>
        <span className="gos-live-loading-detail">{isAr ? "تعديلاتك ما زالت في المحرر. يمكنك إعادة تحميل المعاينة." : "Your edits are still in the editor. You can reload the preview."}</span>
        <button type="button" className="gos-live-retry" onClick={() => setAttempt(current => current + 1)}>{isAr ? "إعادة تحميل المعاينة" : "Reload preview"}</button>
      </div>}
    </div>
  );
}
