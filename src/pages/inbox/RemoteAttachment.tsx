import { useEffect, useState } from "react";
import { FileText, ImageOff, Loader2 } from "lucide-react";
import { inboxMediaUrl } from "../../backend/gosApi";
import { translateText, useUILanguage } from "../../i18n/display";
import type { Attachment } from "./inboxData";

/** A WhatsApp image, video, voice note or file stored by the API, loaded with the user's token. */
export function RemoteAttachment({ file }: { file: Attachment }) {
  useUILanguage();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!file.remote) return;
    let active = true;
    setFailed(false);
    inboxMediaUrl(file.remote).then(
      (value) => active && setUrl(value),
      () => active && setFailed(true),
    );
    return () => { active = false; };
  }, [file.remote]);

  const mime = file.mime ?? "";
  if (failed) {
    return (
      <span className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-[12px] text-slate-500 dark:border-white/10 dark:bg-white/5">
        <ImageOff size={14} />{translateText("This file could not be loaded")}
      </span>
    );
  }
  if (!url) {
    return (
      <span className={`grid place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5 ${file.isImage || mime.startsWith("video/") ? "h-32 w-44" : "h-11 w-44"}`} aria-label={translateText("Loading file")}>
        <Loader2 size={16} className="animate-spin" />
      </span>
    );
  }
  if (file.isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-black/5">
        <img src={url} alt={file.name} className="h-32 w-44 object-cover" />
      </a>
    );
  }
  if (mime.startsWith("video/")) {
    return <video src={url} controls preload="metadata" className="h-40 w-60 rounded-xl bg-black object-contain" />;
  }
  if (mime.startsWith("audio/")) {
    return <audio src={url} controls preload="metadata" className="h-10 w-60 max-w-full" />;
  }
  return (
    <a href={url} download={file.name} className="flex max-w-[230px] items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white px-3 py-2 transition hover:border-purple-200 dark:border-white/10 dark:bg-white/5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/15">
        <FileText size={15} />
      </span>
      <b className="block truncate text-[12px] font-semibold">{file.name}</b>
    </a>
  );
}
