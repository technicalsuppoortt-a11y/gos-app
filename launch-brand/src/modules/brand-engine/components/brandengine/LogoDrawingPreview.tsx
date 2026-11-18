import { useCallback, useState } from "react";
import { LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { useReducedMotion } from "framer-motion";
import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { BrandLogoImage } from "./BrandLogoImage";
import "./LogoDrawingPreview.css";

type LogoDrawingPreviewProps = {
  identity: BrandIdentity;
  primary: string;
  palette?: string[];
  ar: boolean;
};

/** Presentation of returned artwork; replay never starts another AI request. */
export function LogoDrawingPreview(props: LogoDrawingPreviewProps) {
  const [replay, setReplay] = useState(0);
  const signature = JSON.stringify([props.identity, props.primary, props.palette]);
  return <LogoReveal key={`${signature}:${replay}`} {...props} onReplay={() => setReplay(value => value + 1)} />;
}

function LogoReveal({ identity, primary, palette, ar, onReplay }: LogoDrawingPreviewProps & { onReplay: () => void }) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showFinal, setShowFinal] = useState(false);
  const loaded = useCallback(() => setState("ready"), []);
  const failed = useCallback(() => setState("error"), []);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const hasVectorMark = Boolean(identity.logo?.paths.length) && !identity.logo?.image;
  const animate = !reducedMotion && !showFinal;
  const reveal = state === "ready" && animate && !hasVectorMark;
  return <figure className={`logo-drawing-preview is-${state}${reveal ? " has-image-reveal" : ""}`} dir={ar ? "rtl" : "ltr"}>
    <div className="logo-drawing-preview__heading">
      <span>{t("Logo reveal", "ظهور اللوجو")}</span>
      {state === "ready" && animate && <button type="button" onClick={() => setShowFinal(true)}>{t("Show final logo", "عرض اللوجو كاملًا")}</button>}
      <button type="button" disabled={state === "loading"} onClick={onReplay}>
        <RotateCcw size={14} aria-hidden="true" />
        {state === "error" ? t("Reload artwork", "تحميل التصميم مجددًا") : t("Replay reveal", "إعادة عرض الرسم")}
      </button>
    </div>
    <div className="logo-drawing-preview__stage" aria-busy={state === "loading"}>
      {state === "loading" && <div className="logo-drawing-preview__message" role="status"><LoaderCircle size={20} className="logo-drawing-preview__spinner" aria-hidden="true" />{t("Loading your generated logo…", "جارٍ تحميل اللوجو المولّد…")}</div>}
      {state === "error" && <div className="logo-drawing-preview__message" role="alert"><TriangleAlert size={20} aria-hidden="true" />{t("The artwork could not be loaded. Reload to try again.", "تعذّر تحميل التصميم. أعد تحميله للمحاولة مرة أخرى.")}</div>}
      {state !== "error" && <BrandLogoImage
        identity={identity}
        primary={primary}
        palette={palette}
        draw={animate}
        layout="horizontal"
        className="logo-drawing-preview__image"
        onLoad={loaded}
        onError={failed}
      />}
    </div>
    <figcaption className="logo-drawing-preview__caption" aria-live="polite">
      {state === "ready" ? !animate ? t("Your generated artwork is ready.", "التصميم المولّد جاهز.") : t("Visual reveal of the generated artwork. Replay uses the same logo.", "عرض تدريجي للتصميم بعد توليده. إعادة العرض تستخدم نفس اللوجو.") : t("Your previous logo choices stay available.", "اختيارات اللوجو السابقة تفضل متاحة.")}
    </figcaption>
  </figure>;
}
