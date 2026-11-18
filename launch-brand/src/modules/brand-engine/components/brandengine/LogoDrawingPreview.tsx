import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Eye, LoaderCircle, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { isBrandFont } from "@/modules/brand-engine/data/brandFonts";
import { isRasterBrandLogo } from "@/modules/brand-engine/services/brandLogo";
import { BrandLogoImage } from "./BrandLogoImage";
import "./LogoDrawingPreview.css";

export type LogoDrawingPreviewProps = {
  identity: BrandIdentity;
  primary: string;
  palette?: string[] | undefined;
  ar: boolean;
  compact?: boolean | undefined;
};

type VectorShape = {
  d: string;
  fill: boolean;
  strokeWidth: number;
  color: string;
  isCutout?: boolean;
};

type AnchorNode = { x: number; y: number };

function buildPresetVectorShapes(mark: BrandIdentity["mark"], ink: string, secondary: string): VectorShape[] {
  switch (mark) {
    case "flow":
      return [
        {
          d: "M-82 34 C-82 -62 14 -92 54 -34 C92 24 24 92 -24 44 C-62 6 -4 -72 68 -52",
          fill: false,
          strokeWidth: 22,
          color: ink,
        },
        {
          d: "M-95 34 A13 13 0 1 1 -69 34 A13 13 0 1 1 -95 34 Z",
          fill: true,
          strokeWidth: 0,
          color: secondary,
        },
      ];
    case "serif":
      return [
        { d: "M-84 0 A84 84 0 1 1 84 0 A84 84 0 1 1 -84 0 Z", fill: false, strokeWidth: 4, color: ink },
        { d: "M-70 0 A70 70 0 1 1 70 0 A70 70 0 1 1 -70 0 Z", fill: false, strokeWidth: 1.8, color: secondary },
        { d: "M-26 -42 L26 -42 M0 -42 L0 42 M-26 42 L26 42", fill: false, strokeWidth: 9, color: ink },
        { d: "M-22 92 L22 92", fill: false, strokeWidth: 3.5, color: secondary },
      ];
    case "nodes":
      return [
        { d: "M0 -72 L72 0 L0 72 L-72 0 Z", fill: false, strokeWidth: 7, color: ink },
        { d: "M0 -72 L0 72 M-72 0 L72 0", fill: false, strokeWidth: 5, color: secondary },
        { d: "M-24 -24 L24 -24 L24 24 L-24 24 Z", fill: true, strokeWidth: 0, color: ink },
        {
          d: "M-16 -72 A16 16 0 1 1 16 -72 A16 16 0 1 1 -16 -72 Z M56 0 A16 16 0 1 1 88 0 A16 16 0 1 1 56 0 Z M-16 72 A16 16 0 1 1 16 72 A16 16 0 1 1 -16 72 Z M-88 0 A16 16 0 1 1 -56 0 A16 16 0 1 1 -88 0 Z",
          fill: true,
          strokeWidth: 4,
          color: secondary,
        },
      ];
    case "bilingual":
      return [
        {
          d: "M-52 -78 L52 -78 Q88 -78 88 -42 L88 42 Q88 78 52 78 L-52 78 Q-88 78 -88 42 L-88 -42 Q-88 -78 -52 -78 Z",
          fill: false,
          strokeWidth: 6,
          color: ink,
        },
        { d: "M-34 -34 L34 -34 L34 34 L-34 34 Z", fill: false, strokeWidth: 4, color: secondary },
        { d: "M-14 -14 L14 -14 L14 14 L-14 14 Z", fill: true, strokeWidth: 0, color: ink },
      ];
    case "burst":
      return [
        {
          d: "M0 -90 L22 -54 L64 -64 L54 -22 L90 0 L54 22 L64 64 L22 54 L0 90 L-22 54 L-64 64 L-54 22 L-90 0 L-54 -22 L-64 -64 L-22 -54 Z",
          fill: true,
          strokeWidth: 0,
          color: ink,
        },
        {
          d: "M0 -38 L38 0 L0 38 L-38 0 Z",
          fill: true,
          strokeWidth: 0,
          color: "#FFFFFF",
          isCutout: true,
        },
      ];
    case "prism":
    default:
      return [
        { d: "M0 -90 L78 -45 L78 45 L0 90 L-78 45 L-78 -45 Z", fill: true, strokeWidth: 0, color: ink },
        { d: "M0 -58 L50 -29 L50 29 L0 58 L-50 29 L-50 -29 Z", fill: true, strokeWidth: 0, color: "#FFFFFF", isCutout: true },
        { d: "M0 -30 L26 -15 L26 15 L0 30 L-26 15 L-26 -15 Z", fill: true, strokeWidth: 0, color: secondary },
        { d: "M0 -90 L0 -58 M78 45 L50 29 M-78 45 L-50 29", fill: false, strokeWidth: 6, color: "#FFFFFF" },
      ];
  }
}

function extractAnchorNodes(shapes: VectorShape[]): AnchorNode[] {
  const nodes: AnchorNode[] = [];
  const seen = new Set<string>();
  const addNode = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 98 || Math.abs(y) > 98) return;
    const key = `${Math.round(x / 8)}:${Math.round(y / 8)}`;
    if (seen.has(key)) return;
    seen.add(key);
    nodes.push({ x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
  };

  for (const shape of shapes) {
    const tokens = shape.d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) || [];
    let i = 0;
    let cmd = "";
    let cx = 0;
    let cy = 0;
    while (i < tokens.length && nodes.length < 12) {
      const tok = tokens[i]!;
      if (/^[A-Za-z]$/.test(tok)) {
        cmd = tok;
        i++;
        continue;
      }
      const rel = cmd === cmd.toLowerCase();
      const u = cmd.toUpperCase();
      const read = () => Number(tokens[i++]);
      if (u === "M" || u === "L" || u === "T") {
        const x = read();
        const y = read();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        addNode(cx, cy);
      } else if (u === "H") {
        const x = read();
        cx = rel ? cx + x : x;
        addNode(cx, cy);
      } else if (u === "V") {
        const y = read();
        cy = rel ? cy + y : y;
        addNode(cx, cy);
      } else if (u === "C") {
        read();
        read();
        read();
        read();
        const x = read();
        const y = read();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        addNode(cx, cy);
      } else if (u === "S" || u === "Q") {
        read();
        read();
        const x = read();
        const y = read();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        addNode(cx, cy);
      } else if (u === "A") {
        read();
        read();
        read();
        read();
        read();
        const x = read();
        const y = read();
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        addNode(cx, cy);
      } else {
        i++;
      }
    }
  }

  if (nodes.length < 4) {
    return [
      { x: 0, y: -68 },
      { x: 62, y: -32 },
      { x: 62, y: 36 },
      { x: 0, y: 68 },
      { x: -62, y: 36 },
      { x: -62, y: -32 },
    ];
  }
  return nodes.slice(0, 10);
}

/** Presentation of returned artwork; replay never starts another AI request. */
export function LogoDrawingPreview(props: LogoDrawingPreviewProps) {
  const [replay, setReplay] = useState(0);
  const signature = JSON.stringify([
    props.identity.id,
    props.identity.name,
    props.identity.mark,
    props.identity.logo,
    props.primary,
    props.palette,
  ]);
  return (
    <LogoReveal
      key={`${signature}:${replay}`}
      {...props}
      onReplay={() => setReplay((value) => value + 1)}
    />
  );
}

const REVEAL_DURATION_MS = 2750;

function LogoReveal({
  identity,
  primary,
  palette,
  ar,
  compact = false,
  onReplay,
}: LogoDrawingPreviewProps & { onReplay: () => void }) {
  const raster = isRasterBrandLogo(identity);
  const [rasterState, setRasterState] = useState<"loading" | "ready" | "error">(
    raster ? "loading" : "ready",
  );
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  useEffect(() => {
    if (raster && rasterState !== "ready") return;
    setProgress(0);
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / REVEAL_DURATION_MS) * 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [raster, rasterState]);

  const skipToFinal = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setProgress(100);
  }, []);

  const loaded = useCallback(() => setRasterState("ready"), []);
  const failed = useCallback(() => setRasterState("error"), []);

  const ink = useMemo(() => {
    const valid = /^#[0-9a-f]{6}$/i.test(primary) ? primary : "#0891B2";
    return valid.toLowerCase() === "#f7f7f7" || valid.toLowerCase() === "#ffffff" ? "#0891B2" : valid;
  }, [primary]);

  const tones = useMemo(() => {
    const clean = (palette ?? identity.logo?.palette ?? []).filter(
      (c) => /^#[0-9a-f]{6}$/i.test(c) && c.toLowerCase() !== "#ffffff",
    );
    return clean.length ? clean : [ink, "#0D9488"];
  }, [palette, identity.logo?.palette, ink]);

  const textOnly = Boolean(identity.logo && identity.logo.paths.length === 0 && identity.logo.wordmark);

  const vectorShapes = useMemo<VectorShape[]>(() => {
    if (raster || textOnly) return [];
    const customPaths = identity.logo?.paths;
    if (customPaths && customPaths.length >= 1 && customPaths.length <= 8) {
      return customPaths.map((p, idx) => ({
        d: p.d,
        fill: p.fill,
        strokeWidth: p.strokeWidth,
        color: tones[idx % tones.length] || ink,
      }));
    }
    return buildPresetVectorShapes(identity.mark, tones[0] || ink, tones[1] || tones[0] || ink);
  }, [raster, textOnly, identity.logo?.paths, identity.mark, tones, ink]);

  const anchorNodes = useMemo(() => extractAnchorNodes(vectorShapes), [vectorShapes]);

  const displayName = identity.name?.trim() || (ar ? "علامتك التجارية" : "Your Brand");
  const isArabicText = /[\u0600-\u06ff]/.test(displayName);
  const w = identity.logo?.wordmark;
  const wordmarkFont =
    w?.font && isBrandFont(w.font)
      ? w.font
      : identity.typography && isBrandFont(identity.typography)
        ? identity.typography
        : isArabicText
          ? "Cairo"
          : "Manrope";
  const wordmarkWeight = w?.weight && [400, 500, 600, 700, 800].includes(w.weight) ? w.weight : 700;
  const formattedLabel =
    isArabicText || !w || w.casing === "original"
      ? displayName
      : w.casing === "uppercase"
        ? displayName.toUpperCase()
        : displayName.toLowerCase();

  const roundedPct = Math.round(progress);
  const isAnimating = progress < 100 && rasterState !== "error";

  const stageLabel =
    rasterState === "error"
      ? t("Artwork unavailable", "تعذّر تحميل الشعار")
      : roundedPct < 24
        ? t("1/4 · Plotting vector nodes", "١/٤ · تحديد نقاط الفيكتور")
        : roundedPct < 66
          ? t("2/4 · Tracing geometric paths", "٢/٤ · رسم المسارات الهندسية")
          : roundedPct < 88
            ? t("3/4 · Applying brand palette", "٣/٤ · تطبيق ألوان الهوية")
            : roundedPct < 100
              ? t("4/4 · Finalizing brand lockup", "٤/٤ · اعتماد الشعار النهائي")
              : t("Vector mark ready", "الشعار الفيكتور جاهز");

  // Stage envelope calculations (0..1)
  const guideOpacity =
    progress < 16
      ? progress / 16
      : progress < 68
        ? 1
        : progress < 88
          ? 1 - (progress - 68) / 20
          : 0;

  const wordmarkReveal = Math.max(0, Math.min(1, (progress - 76) / 22));
  const charCount = Math.max(1, Array.from(formattedLabel).length);
  const dynamicFontSize = Math.max(30, Math.min(62, Math.round(620 / Math.max(charCount * 0.62, 4))));

  return (
    <figure
      className={`logo-drawing-preview${compact ? " logo-drawing-preview--compact" : ""} is-${rasterState}${isAnimating ? " is-animating" : " is-complete"}`}
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="logo-drawing-preview__heading">
        <div className="logo-drawing-preview__status">
          <span className="logo-drawing-preview__badge" aria-hidden="true">
            {isAnimating ? <Sparkles size={12} /> : <CheckCircle2 size={12} />}
          </span>
          <span className="logo-drawing-preview__stage-text">{stageLabel}</span>
          <span className="logo-drawing-preview__pct" dir="ltr">
            {roundedPct}%
          </span>
        </div>
        <div className="logo-drawing-preview__controls">
          {isAnimating && (
            <button
              type="button"
              className="logo-drawing-preview__btn logo-drawing-preview__btn--ghost"
              onClick={skipToFinal}
            >
              <Eye size={13} aria-hidden="true" />
              {t("Show final", "عرض كامل")}
            </button>
          )}
          <button
            type="button"
            className="logo-drawing-preview__btn"
            disabled={raster && rasterState === "loading"}
            onClick={onReplay}
          >
            <RotateCcw size={13} aria-hidden="true" />
            {rasterState === "error"
              ? t("Reload artwork", "إعادة التحميل")
              : t("Replay reveal", "إعادة الرسم")}
          </button>
        </div>
      </div>

      {/* Live Multi-Stop Gradient Progress Strip */}
      <div
        className="logo-drawing-preview__progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPct}
        aria-label={t("Logo vector construction progress", "تقدم بناء الشعار")}
      >
        <div
          className="logo-drawing-preview__progress-fill"
          style={{ width: `${roundedPct}%` }}
        />
      </div>

      <div className="logo-drawing-preview__stage" aria-busy={raster && rasterState === "loading"}>
        {raster ? (
          <>
            {rasterState === "loading" && (
              <div className="logo-drawing-preview__message" role="status">
                <LoaderCircle size={18} className="logo-drawing-preview__spinner" aria-hidden="true" />
                {t("Loading your generated logo…", "جارٍ تحميل اللوجو المولّد…")}
              </div>
            )}
            {rasterState === "error" && (
              <div className="logo-drawing-preview__message" role="alert">
                <TriangleAlert size={18} aria-hidden="true" />
                {t("The artwork could not be loaded. Reload to try again.", "تعذّر تحميل التصميم. أعد تحميله للمحاولة مرة أخرى.")}
              </div>
            )}
            {rasterState !== "error" && (
              <div
                className="logo-drawing-preview__raster-wrap"
                style={{
                  clipPath: `inset(0 ${Math.max(0, 100 - progress)}% 0 0)`,
                  opacity: Math.max(0.25, progress / 100),
                }}
              >
                <BrandLogoImage
                  identity={identity}
                  primary={primary}
                  palette={palette}
                  layout="horizontal"
                  className="logo-drawing-preview__image"
                  onLoad={loaded}
                  onError={failed}
                />
              </div>
            )}
          </>
        ) : (
          <svg
            className="logo-drawing-preview__vector-svg"
            viewBox="0 0 920 260"
            role="img"
            aria-label={`${displayName} vector logo reveal`}
          >
            <defs>
              <filter id={`lb-node-glow-${identity.id.replace(/[^a-zA-Z0-9_-]/g, "")}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Architectural Vector Mark Construction Stage */}
            {!textOnly && (
              <g transform="translate(175 130)">
                {/* Stage 1: CAD Construction Blueprint Rings & Crosshairs */}
                {guideOpacity > 0.01 && (
                  <g className="logo-drawing-preview__guides" opacity={guideOpacity * 0.72}>
                    <circle
                      cx="0"
                      cy="0"
                      r="92"
                      fill="none"
                      stroke="#0891B2"
                      strokeWidth="1.2"
                      strokeDasharray="5 5"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="56"
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                      opacity="0.7"
                    />
                    <line x1="-108" y1="0" x2="108" y2="0" stroke="#0891B2" strokeWidth="1" strokeDasharray="3 4" opacity="0.55" />
                    <line x1="0" y1="-108" x2="0" y2="108" stroke="#0891B2" strokeWidth="1" strokeDasharray="3 4" opacity="0.55" />
                    <rect x="-86" y="-86" width="172" height="172" rx="16" fill="none" stroke="#0891B2" strokeWidth="0.9" opacity="0.35" />
                  </g>
                )}

                {/* Stage 2 & 3: Progressive Vector Path Tracing + Brand Color Fill */}
                {vectorShapes.map((shape, idx) => {
                  const count = Math.max(1, vectorShapes.length);
                  const traceStart = 18 + (idx / count) * 34;
                  const traceWindow = Math.max(16, 46 / count);
                  const traceRatio = Math.max(0, Math.min(1, (progress - traceStart) / traceWindow));
                  const fillStart = 62 + (idx / count) * 14;
                  const fillRatio = shape.fill
                    ? Math.max(0, Math.min(1, (progress - fillStart) / 18))
                    : 0;
                  const activeTraceStroke =
                    shape.strokeWidth > 0
                      ? shape.strokeWidth
                      : Math.max(0, 3.2 * (1 - fillRatio * 0.95));
                  const strokeCol = shape.isCutout ? ink : shape.color;

                  if (traceRatio <= 0.005) return null;
                  return (
                    <path
                      key={idx}
                      d={shape.d}
                      pathLength={1}
                      fill={shape.fill ? shape.color : "none"}
                      fillRule="evenodd"
                      fillOpacity={fillRatio}
                      stroke={strokeCol}
                      strokeWidth={activeTraceStroke}
                      strokeOpacity={
                        shape.strokeWidth > 0
                          ? 1
                          : Math.max(0, 1 - fillRatio * 0.92)
                      }
                      strokeDasharray="1"
                      strokeDashoffset={1 - traceRatio}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Glowing Geometric Vertex Anchor Nodes */}
                {guideOpacity > 0.01 &&
                  anchorNodes.map((node, idx) => {
                    const appearAt = (idx / Math.max(1, anchorNodes.length)) * 22;
                    const nodeIn = Math.max(0, Math.min(1, (progress - appearAt) / 9));
                    const alpha = nodeIn * guideOpacity;
                    if (alpha <= 0.02) return null;
                    return (
                      <g
                        key={`${node.x}:${node.y}:${idx}`}
                        transform={`translate(${node.x} ${node.y}) scale(${0.6 + 0.4 * nodeIn})`}
                        opacity={alpha}
                      >
                        <circle r="7.5" fill="#06B6D4" fillOpacity="0.24" />
                        <rect
                          x="-3.2"
                          y="-3.2"
                          width="6.4"
                          height="6.4"
                          rx="1.5"
                          fill="#FFFFFF"
                          stroke={ink}
                          strokeWidth="1.8"
                        />
                      </g>
                    );
                  })}
              </g>
            )}

            {/* Wordmark Baseline Guides (when Wordmark-only or during Stage 3-4) */}
            {guideOpacity > 0.01 && (
              <g opacity={guideOpacity * 0.42}>
                <line
                  x1={textOnly ? 140 : 305}
                  y1="102"
                  x2="840"
                  y2="102"
                  stroke="#0891B2"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1={textOnly ? 140 : 305}
                  y1="158"
                  x2="840"
                  y2="158"
                  stroke="#0891B2"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </g>
            )}

            {/* Stage 4: Resolved Brand Wordmark Lockup */}
            {wordmarkReveal > 0.01 && (
              <g
                opacity={wordmarkReveal}
                transform={`translate(${(1 - wordmarkReveal) * (isArabicText ? -18 : 18)} 0)`}
              >
                {!textOnly && (
                  <line
                    x1="292"
                    y1="82"
                    x2="292"
                    y2="178"
                    stroke={ink}
                    strokeWidth="2"
                    strokeOpacity={0.22 * wordmarkReveal}
                  />
                )}
                <text
                  x={textOnly ? 460 : isArabicText ? 830 : 322}
                  y="132"
                  dominantBaseline="central"
                  textAnchor={textOnly ? "middle" : isArabicText ? "end" : "start"}
                  fontFamily={`"${wordmarkFont}", ${isArabicText ? "Cairo, sans-serif" : "Manrope, sans-serif"}`}
                  fontSize={dynamicFontSize}
                  fontWeight={wordmarkWeight}
                  letterSpacing={isArabicText ? 0 : w?.letterSpacing ?? 0.3}
                  fill={ink}
                  direction={isArabicText ? "rtl" : "ltr"}
                >
                  {formattedLabel}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      {!compact && (
        <figcaption className="logo-drawing-preview__caption" aria-live="polite">
          {rasterState === "error"
            ? t("Your previous logo choices stay available.", "اختيارات اللوجو السابقة تفضل متاحة.")
            : isAnimating
              ? t(
                  "Step-by-step vector geometry & brand wordmark construction.",
                  "بناء هندسي متدرج لمسارات الفيكتور واسم البراند.",
                )
              : t(
                  "Custom vector artwork ready. Click Replay reveal anytime without using an attempt.",
                  "تصميم الفيكتور جاهز. اضغط إعادة الرسم في أي وقت بدون استهلاك محاولة.",
                )}
        </figcaption>
      )}
    </figure>
  );
}
