import { useLayoutEffect, useRef, useState } from "react";
import type { LiveBrandConfiguration } from "./liveBrand";

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
  const message = JSON.stringify(configuration);
  const sendBrand = (target: Window | null | undefined) => {
    target?.postMessage({ type: "launch-brand:brand", configuration: JSON.parse(message) }, window.location.origin);
  };

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setSize({ width: width ?? element.clientWidth, height: height ?? element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  useLayoutEffect(() => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    // The app asks for its brand as soon as it starts, before assets finish loading.
    const onMessage = (event: MessageEvent) => {
      if (event.source === target && event.origin === window.location.origin && event.data?.type === "launch-brand:ready") sendBrand(target);
    };
    window.addEventListener("message", onMessage);
    sendBrand(target);
    return () => window.removeEventListener("message", onMessage);
  }, [message]);

  const scale = viewport && size.width && size.height
    ? Math.min(1, size.width / viewport.width, size.height / viewport.height)
    : fullPage || !size.width ? 1 : Math.min(1, size.width / DESKTOP_WIDTH);
  const frameWidth = viewport?.width ?? (scale === 1 ? "100%" : DESKTOP_WIDTH);
  const frameHeight = viewport?.height ?? (scale === 1 ? "100%" : Math.max(size.height / scale, DESKTOP_HEIGHT * 0.6));
  const separator = path.includes("?") ? "&" : "?";
  const back = onBackToWorkspace ?? onExitPreview;
  const isAr = configuration.brand.language === "ar";

  return (
    <div
      ref={box}
      style={{ position: "relative", overflow: "hidden", width: width ?? "100%", height: height ?? "100%" }}
    >
      {back && (
        <button
          type="button"
          onClick={back}
          style={{ position: "absolute", zIndex: 2, top: 12, insetInlineStart: 12, borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "rgba(15,23,42,.78)", color: "#fff", border: 0 }}
        >
          {isAr ? "الرجوع للمساحة" : "Back to workspace"}
        </button>
      )}
      <iframe
        ref={frame}
        name={GOS_DEMO_WINDOW}
        title={title}
        src={`${path}${separator}launch-brand-preview=1`}
        onLoad={() => sendBrand(frame.current?.contentWindow)}
        style={{ border: 0, display: "block", width: frameWidth, height: frameHeight, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: isAr ? "top right" : "top left", position: scale === 1 ? undefined : "absolute", top: 0, [isAr ? "right" : "left"]: 0 }}
      />
    </div>
  );
}
