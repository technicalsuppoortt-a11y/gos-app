import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
/** A real viewport with the same React context, fonts and styles as the product. */
export function IsolatedBrandPreview({
  children,
  width,
  height = 850,
  title,
  fitHeight = false,
  fillViewport = false,
}: {
  children: ReactNode;
  width: number;
  height?: number;
  title: string;
  fitHeight?: boolean;
  fillViewport?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null),
    [scale, setScale] = useState(1);
  const [canvas, setCanvas] = useState({ width, height });
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const measure = () => {
      if (fillViewport && element.clientWidth > 0 && element.clientHeight > 0) {
        const ratio = element.clientWidth / element.clientHeight;
        const next = { width: Math.max(width, height * ratio), height: Math.max(height, width / ratio) };
        setCanvas((previous) =>
          previous.width === next.width && previous.height === next.height ? previous : next,
        );
        setScale(element.clientWidth / next.width);
        return;
      }
      setCanvas((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
      setScale(
        Math.min(
          1,
          Math.max(
            0.05,
            Math.min(element.clientWidth / width, fitHeight ? element.clientHeight / height : 1),
          ),
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height, fitHeight, fillViewport]);
  const copyStyles = () => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    doc.head.querySelectorAll("[data-preview-style]").forEach((node) => node.remove());
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.dataset["previewStyle"] = "true";
      doc.head.appendChild(clone);
    });
    doc.documentElement.className = document.documentElement.className;
    doc.body.className = `brand-engine-module ${document.querySelector('.brand-engine-module')?.classList.contains('dark') ? 'dark' : 'light'}`;
    doc.body.style.cssText = "margin:0;min-width:0;background:transparent;";
    if (fillViewport) {
      const sizing = doc.createElement("style");
      sizing.dataset["previewStyle"] = "true";
      sizing.textContent =
        "html, body, #brand-preview-root { width: 100%; height: 100%; overflow: hidden !important; } #brand-preview-root > :first-child { min-height: 0 !important; height: 100% !important; overflow: hidden !important; border-radius: 0; } #brand-preview-root * { scrollbar-width: none !important; } #brand-preview-root *::-webkit-scrollbar { display: none !important; }";
      doc.head.appendChild(sizing);
    }
  };
  useEffect(() => {
    if (!target) return;
    const observer = new MutationObserver(copyStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [target]);
  return (
    <div
      ref={host}
      className={`brand-preview-viewport${fitHeight ? " brand-preview-fit-height" : ""}`}
    >
      <div
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
          marginInline: "auto",
          position: "relative",
        }}
      >
        <iframe
          ref={frame}
          title={title}
          sandbox="allow-same-origin"
          srcDoc={
            '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="brand-preview-root"></div></body></html>'
          }
          onLoad={() => {
            copyStyles();
            setTarget(frame.current?.contentDocument?.getElementById("brand-preview-root") ?? null);
          }}
          style={{
            display: "block",
            border: 0,
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        />
        {target && createPortal(children, target)}
      </div>
    </div>
  );
}
