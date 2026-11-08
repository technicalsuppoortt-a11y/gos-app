import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { mirrorWebsitePreviewStyles, type WebsitePreviewStyleStatus } from "./websitePreviewStyles";

const frameDocument = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="website-preview-root"></div></body></html>`;

/** A real browser viewport: responsive rules use the selected device's width. */
export function LiveWebsiteViewport({ children, title }: { children: ReactNode; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [styleStatus, setStyleStatus] = useState<WebsitePreviewStyleStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const ar = /[\u0600-\u06ff]/u.test(title);
  useLayoutEffect(() => {
    const doc = mount?.ownerDocument;
    if (!doc) return;
    if (frame.current) frame.current.style.visibility = "hidden";
    const stopMirroring = mirrorWebsitePreviewStyles(document.head, doc.head, (status) => {
      if (frame.current?.contentDocument !== doc) return;
      // Hide the entire iframe immediately when another layout stylesheet is
      // inserted. Nested previews can explicitly set their own visibility.
      frame.current.style.visibility = status === "ready" ? "visible" : "hidden";
      setStyleStatus(status);
    });
    const reset = doc.createElement("style");
    reset.textContent = "html,body{margin:0!important;padding:0!important;min-width:0!important;height:auto!important;overflow-x:hidden;scrollbar-width:none}body{display:block!important}#website-preview-root{width:100%}::-webkit-scrollbar{display:none}";
    doc.head.appendChild(reset);
    return () => {
      stopMirroring();
      reset.remove();
    };
  }, [mount, attempt]);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }} aria-busy={styleStatus === "loading"}>
      <iframe
        ref={frame}
        title={title}
        srcDoc={frameDocument}
        sandbox="allow-same-origin"
        style={{ width: "100%", height: "100%", border: 0, display: "block", visibility: styleStatus === "ready" ? "visible" : "hidden" }}
        onLoad={() => {
          setStyleStatus("loading");
          setMount(frame.current?.contentDocument?.getElementById("website-preview-root") ?? null);
        }}
      />
      {mount && createPortal(children, mount)}
      {styleStatus === "error" && <div role="alert" dir={ar ? "rtl" : "ltr"}
        style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
        <p>{ar ? "تعذر تحميل المعاينة." : "The preview could not load."}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>{ar ? "إعادة المحاولة" : "Try again"}</button>
      </div>}
    </div>
  );
}
