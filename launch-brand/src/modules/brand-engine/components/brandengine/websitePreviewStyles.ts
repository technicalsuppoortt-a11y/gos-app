export type WebsitePreviewStyleStatus = "loading" | "ready" | "error";
type MirroredStyle = {
  copy: Element;
  signature: string;
  status: WebsitePreviewStyleStatus;
  cleanup: () => void;
};

/** Mirror cached stylesheet URLs without exposing a partially styled document. */
export function mirrorWebsitePreviewStyles(
  sourceHead: HTMLHeadElement,
  targetHead: HTMLHeadElement,
  onStatus: (status: WebsitePreviewStyleStatus) => void,
) {
  const copies = new Map<Element, MirroredStyle>();
  let disposed = false;
  let syncing = false;
  let previousStatus: WebsitePreviewStyleStatus | undefined;
  const report = () => {
    if (disposed || syncing) return;
    const entries = [...copies.values()];
    const status = entries.some((entry) => entry.status === "error") ? "error"
      : entries.some((entry) => entry.status === "loading") ? "loading" : "ready";
    if (status !== previousStatus) {
      previousStatus = status;
      onStatus(status);
    }
  };
  const sync = () => {
    if (disposed) return;
    syncing = true;
    const sources = new Set(sourceHead.querySelectorAll('style, link[rel="stylesheet"]'));
    for (const [source, entry] of copies) {
      if (!sources.has(source)) {
        entry.cleanup();
        entry.copy.remove();
        copies.delete(source);
      }
    }
    for (const source of sources) {
      const link = source.tagName === "LINK" ? source as HTMLLinkElement : null;
      const signature = link ? `${link.outerHTML}:${link.href}` : source.getAttribute("media") ?? "";
      let entry = copies.get(source);
      if (entry && entry.signature !== signature) {
        entry.cleanup();
        entry.copy.remove();
        copies.delete(source);
        entry = undefined;
      }
      if (entry) {
        if (!link && entry.copy.textContent !== source.textContent) entry.copy.textContent = source.textContent;
        continue;
      }
      const copy = source.cloneNode(true) as Element;
      if (link) copy.setAttribute("href", link.href);
      // Font CSS can fail or load slowly without preventing the fallback font
      // from displaying the complete layout.
      const optionalFont = /^https?:\/\/fonts\.googleapis\.com(?:[/:?#]|$)/i.test(link?.href ?? "");
      const required = Boolean(link?.href) && !link?.disabled && !optionalFont;
      const next: MirroredStyle = { copy, signature, status: required ? "loading" : "ready", cleanup: () => {} };
      copies.set(source, next);
      if (required) {
        const loaded = () => { next.status = "ready"; report(); };
        const failed = () => { next.status = "error"; report(); };
        copy.addEventListener("load", loaded);
        copy.addEventListener("error", failed);
        next.cleanup = () => {
          copy.removeEventListener("load", loaded);
          copy.removeEventListener("error", failed);
        };
      }
      // Keep cascade order when HMR inserts a style between existing nodes or
      // replaces a link URL in place.
      let following = source.nextElementSibling;
      while (following && !copies.has(following)) following = following.nextElementSibling;
      targetHead.insertBefore(copy, following ? copies.get(following)!.copy : null);
      // A stylesheet may already be available from the browser cache.
      if (required && (copy as HTMLLinkElement).sheet) next.status = "ready";
    }
    syncing = false;
    report();
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(sourceHead, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ["href", "rel", "media", "disabled", "integrity", "crossorigin"],
  });
  return () => {
    disposed = true;
    observer.disconnect();
    copies.forEach((entry) => { entry.cleanup(); entry.copy.remove(); });
    copies.clear();
  };
}
