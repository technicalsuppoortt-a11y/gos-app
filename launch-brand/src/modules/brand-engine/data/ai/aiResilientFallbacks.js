// Resilient JSON extraction, schema normalization/repair, SVG coordinate fitting,
// and context-aware fallback generators aligned with Step 01 Discovery choices.
import fontCatalog from "@/modules/brand-engine/configuration/brandFontCatalog.json" with { type: "json" };

const LATIN_FONTS = Object.keys(fontCatalog.latin);
const ARABIC_FONTS = Object.keys(fontCatalog.arabic);
const ALL_FONTS = [...LATIN_FONTS, ...ARABIC_FONTS];
const ALLOWED_MARKS = ["prism", "flow", "serif", "nodes", "bilingual", "burst"];
const ALLOWED_WEIGHTS = [400, 500, 600, 700, 800];

const MARK_ALIASES = {
  geometric: "prism",
  minimal: "prism",
  modern: "prism",
  abstract: "prism",
  "negative-space": "prism",
  wordmark: "prism",
  monogram: "serif",
  luxury: "serif",
  vintage: "serif",
  editorial: "serif",
  organic: "flow",
  pictorial: "flow",
  friendly: "flow",
  "line-art": "flow",
  fluid: "flow",
  connected: "nodes",
  tech: "nodes",
  network: "nodes",
  ai: "nodes",
  emblem: "burst",
  bold: "burst",
  badge: "burst",
  crest: "burst",
  arabic: "bilingual",
  bilingual: "bilingual",
};

/**
 * Extracts a JSON object or array from provider text even if wrapped in Markdown
 * fences, explanatory prose, or trailing commas.
 */
export function extractJsonPayload(rawText) {
  if (typeof rawText !== "string") throw new Error("Empty provider text.");
  let cleaned = rawText
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1")
    .trim();

  const tryParse = (candidate) => {
    try {
      return JSON.parse(candidate);
    } catch {
      const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(withoutTrailingCommas);
    }
  };

  try {
    return tryParse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return tryParse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Could not parse JSON payload.");
  }
}

export function coerceArabicFont(value, index = 0) {
  if (typeof value === "string") {
    const exact = ARABIC_FONTS.find((f) => f.toLowerCase() === value.trim().toLowerCase());
    if (exact) return exact;
    if (/amiri|naskh|serif|messiri/i.test(value)) return "El Messiri";
    if (/plex|ibm/i.test(value)) return "IBM Plex Sans Arabic";
    if (/readex/i.test(value)) return "Readex Pro";
    if (/tajawal/i.test(value)) return "Tajawal";
    if (/alexandria/i.test(value)) return "Alexandria";
    if (/almarai/i.test(value)) return "Almarai";
    if (/changa/i.test(value)) return "Changa";
  }
  const defaults = ["Cairo", "IBM Plex Sans Arabic", "Tajawal", "Readex Pro", "Alexandria", "Changa"];
  return defaults[index % defaults.length];
}

export function coerceBrandFont(value, isArabic = false, index = 0) {
  if (isArabic) return coerceArabicFont(value, index);
  if (typeof value === "string") {
    const exact = ALL_FONTS.find((f) => f.toLowerCase() === value.trim().toLowerCase());
    if (exact) return exact;
    if (/playfair|serif|lora|merriweather|georgia|cormorant/i.test(value)) return "Playfair Display";
    if (/sora|space|grotesk|outfit|syne/i.test(value)) return "Sora";
    if (/poppins|jakarta|nunito|quicksand/i.test(value)) return "Poppins";
    if (/montserrat|raleway|oswald/i.test(value)) return "Montserrat";
    if (/dm\s*sans/i.test(value)) return "DM Sans";
    if (/work\s*sans/i.test(value)) return "Work Sans";
    if (/inter|roboto|helvetica|system/i.test(value)) return "Inter";
  }
  const defaults = ["Manrope", "Sora", "Poppins", "Playfair Display", "Montserrat", "DM Sans"];
  return defaults[index % defaults.length];
}

export function coerceMark(value, index = 0) {
  if (typeof value === "string") {
    const key = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (ALLOWED_MARKS.includes(key)) return key;
    if (MARK_ALIASES[key]) return MARK_ALIASES[key];
  }
  const cycle = ["prism", "nodes", "flow", "serif", "burst"];
  return cycle[index % cycle.length];
}

export function coerceHexColor(value, fallback = "#0891B2") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      return (
        "#" +
        trimmed
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      ).toUpperCase();
    }
    const hexMatch = trimmed.match(/#[0-9a-f]{6}/i);
    if (hexMatch) return hexMatch[0].toUpperCase();
  }
  return fallback.toUpperCase();
}

/**
 * Fits SVG path coordinates into the [-74, 74] centered brand-mark coordinate box
 * whenever a provider returns valid SVG geometry in 0..24, 0..100, 0..256, or oversized coordinates.
 */
export function normalizeLogoPathsToViewport(rawPaths) {
  if (!Array.isArray(rawPaths) || !rawPaths.length) return [];
  const validRaw = rawPaths
    .slice(0, 8)
    .filter((p) => p && typeof p.d === "string" && p.d.trim().length > 2)
    .map((p) => {
      const cleanD = p.d.trim().replace(/[^MmLlHhVvCcSsQqTtAaZz0-9eE,.+\s-]/g, " ");
      const fill = typeof p.fill === "boolean" ? p.fill : true;
      let strokeWidth = Number.isFinite(Number(p.strokeWidth)) ? Math.max(0, Math.min(12, Number(p.strokeWidth))) : 0;
      if (!fill && strokeWidth <= 0) strokeWidth = 4;
      return { d: cleanD, fill, strokeWidth };
    })
    .filter((p) => /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE,.+\s-]+$/.test(p.d) && p.d.length <= 1800);

  if (!validRaw.length) return [];

  // Parse absolute bounding box across all commands
  const parseCommands = (d) => {
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) || [];
    const cmds = [];
    let i = 0;
    let cmd = "";
    const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
    while (i < tokens.length) {
      if (/^[A-Za-z]$/.test(tokens[i])) {
        cmd = tokens[i++];
        if (cmd.toUpperCase() === "Z") cmds.push({ cmd, args: [] });
        continue;
      }
      if (!cmd) break;
      const upper = cmd.toUpperCase();
      const need = arity[upper] ?? 0;
      if (need === 0) {
        i++;
        continue;
      }
      const args = [];
      for (let k = 0; k < need && i < tokens.length && !/^[A-Za-z]$/.test(tokens[i]); k++) {
        args.push(Number(tokens[i++]));
      }
      if (args.length === need && args.every(Number.isFinite)) {
        cmds.push({ cmd, args });
        if (cmd === "M") cmd = "L";
        else if (cmd === "m") cmd = "l";
      } else {
        break;
      }
    }
    return cmds;
  };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const parsedPaths = validRaw.map((p) => {
    const cmds = parseCommands(p.d);
    let cx = 0,
      cy = 0,
      sx = 0,
      sy = 0;
    const record = (x, y) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    for (const { cmd, args } of cmds) {
      const rel = cmd === cmd.toLowerCase();
      const u = cmd.toUpperCase();
      if (u === "M") {
        cx = rel ? cx + args[0] : args[0];
        cy = rel ? cy + args[1] : args[1];
        sx = cx;
        sy = cy;
        record(cx, cy);
      } else if (u === "L" || u === "T") {
        cx = rel ? cx + args[0] : args[0];
        cy = rel ? cy + args[1] : args[1];
        record(cx, cy);
      } else if (u === "H") {
        cx = rel ? cx + args[0] : args[0];
        record(cx, cy);
      } else if (u === "V") {
        cy = rel ? cy + args[0] : args[0];
        record(cx, cy);
      } else if (u === "C") {
        record(rel ? cx + args[0] : args[0], rel ? cy + args[1] : args[1]);
        record(rel ? cx + args[2] : args[2], rel ? cy + args[3] : args[3]);
        cx = rel ? cx + args[4] : args[4];
        cy = rel ? cy + args[5] : args[5];
        record(cx, cy);
      } else if (u === "S" || u === "Q") {
        record(rel ? cx + args[0] : args[0], rel ? cy + args[1] : args[1]);
        cx = rel ? cx + args[2] : args[2];
        cy = rel ? cy + args[3] : args[3];
        record(cx, cy);
      } else if (u === "A") {
        const ex = rel ? cx + args[5] : args[5];
        const ey = rel ? cy + args[6] : args[6];
        const rx = Math.abs(args[0]);
        const ry = Math.abs(args[1]);
        record(Math.min(cx, ex) - rx, Math.min(cy, ey) - ry);
        record(Math.max(cx, ex) + rx, Math.max(cy, ey) + ry);
        cx = ex;
        cy = ey;
      } else if (u === "Z") {
        cx = sx;
        cy = sy;
      }
    }
    return { ...p, cmds };
  });

  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return [];
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const maxSpan = Math.max(spanX, spanY);
  if (maxSpan < 1e-3) return [];

  const fitsAlready =
    minX >= -90 && maxX <= 90 && minY >= -90 && maxY <= 90 && spanX >= 28 && spanY >= 28;
  if (fitsAlready) {
    return validRaw;
  }

  // Transform all coordinates cleanly into [-72, 72] centered at (0, 0)
  const targetSpan = 136;
  const scale = targetSpan / maxSpan;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const fmt = (n) => Number(n.toFixed(1));
  const tx = (x) => fmt((x - midX) * scale);
  const ty = (y) => fmt((y - midY) * scale);

  return parsedPaths
    .map((p) => {
      let cx = 0,
        cy = 0,
        sx = 0,
        sy = 0;
      const parts = [];
      for (const { cmd, args } of p.cmds) {
        const rel = cmd === cmd.toLowerCase();
        const u = cmd.toUpperCase();
        if (u === "M") {
          cx = rel ? cx + args[0] : args[0];
          cy = rel ? cy + args[1] : args[1];
          sx = cx;
          sy = cy;
          parts.push(`M${tx(cx)} ${ty(cy)}`);
        } else if (u === "L") {
          cx = rel ? cx + args[0] : args[0];
          cy = rel ? cy + args[1] : args[1];
          parts.push(`L${tx(cx)} ${ty(cy)}`);
        } else if (u === "T") {
          cx = rel ? cx + args[0] : args[0];
          cy = rel ? cy + args[1] : args[1];
          parts.push(`T${tx(cx)} ${ty(cy)}`);
        } else if (u === "H") {
          cx = rel ? cx + args[0] : args[0];
          parts.push(`H${tx(cx)}`);
        } else if (u === "V") {
          cy = rel ? cy + args[0] : args[0];
          parts.push(`V${ty(cy)}`);
        } else if (u === "C") {
          const x1 = rel ? cx + args[0] : args[0];
          const y1 = rel ? cy + args[1] : args[1];
          const x2 = rel ? cx + args[2] : args[2];
          const y2 = rel ? cy + args[3] : args[3];
          cx = rel ? cx + args[4] : args[4];
          cy = rel ? cy + args[5] : args[5];
          parts.push(`C${tx(x1)} ${ty(y1)} ${tx(x2)} ${ty(y2)} ${tx(cx)} ${ty(cy)}`);
        } else if (u === "S") {
          const x2 = rel ? cx + args[0] : args[0];
          const y2 = rel ? cy + args[1] : args[1];
          cx = rel ? cx + args[2] : args[2];
          cy = rel ? cy + args[3] : args[3];
          parts.push(`S${tx(x2)} ${ty(y2)} ${tx(cx)} ${ty(cy)}`);
        } else if (u === "Q") {
          const x1 = rel ? cx + args[0] : args[0];
          const y1 = rel ? cy + args[1] : args[1];
          cx = rel ? cx + args[2] : args[2];
          cy = rel ? cy + args[3] : args[3];
          parts.push(`Q${tx(x1)} ${ty(y1)} ${tx(cx)} ${ty(cy)}`);
        } else if (u === "A") {
          const rx = fmt(Math.abs(args[0]) * scale);
          const ry = fmt(Math.abs(args[1]) * scale);
          const rot = fmt(args[2]);
          const large = args[3] ? 1 : 0;
          const sweep = args[4] ? 1 : 0;
          cx = rel ? cx + args[5] : args[5];
          cy = rel ? cy + args[6] : args[6];
          parts.push(`A${rx} ${ry} ${rot} ${large} ${sweep} ${tx(cx)} ${ty(cy)}`);
        } else if (u === "Z") {
          cx = sx;
          cy = sy;
          parts.push("Z");
        }
      }
      const d = parts.join(" ");
      const scaledStroke = p.strokeWidth > 0 ? Math.max(2, Math.min(10, fmt(p.strokeWidth * Math.min(scale, 1.5)))) : 0;
      return { d, fill: p.fill, strokeWidth: scaledStroke };
    })
    .filter((p) => p.d.length > 3 && p.d.length <= 1800);
}

/**
 * Studio-grade multi-path geometric vector logo constructions centered at (0,0) in [-78, 78].
 * Each has 4-5 distinct paths so step-by-step vector tracing looks crisp and architectural.
 */
export function buildBespokeVectorLogo(variantIndex = 0, stylePref = "", nicheLabel = "") {
  const pref = String(stylePref || "").toLowerCase();
  const variants = [
    // 0: Architectural Isometric Facet Prism (5 paths)
    {
      mark: "prism",
      concept: `Precision isometric keystone symbolizing structured growth in ${nicheLabel || "modern digital services"}.`,
      paths: [
        { d: "M0 -76 L66 -38 L66 38 L0 76 L-66 38 L-66 -38 Z M0 -48 L-42 -24 L-42 24 L0 48 L42 24 L42 -24 Z", fill: true, strokeWidth: 0 },
        { d: "M0 -34 L30 -17 L0 0 L-30 -17 Z", fill: true, strokeWidth: 0 },
        { d: "M4 6 L32 -10 L32 22 L4 38 Z", fill: true, strokeWidth: 0 },
        { d: "M-4 6 L-32 -10 L-32 22 L-4 38 Z", fill: false, strokeWidth: 4.5 },
      ],
    },
    // 1: Connected Neural Orbit & Precision Nodes (5 paths)
    {
      mark: "nodes",
      concept: `Connected orbital architecture representing intelligent systems and seamless client workflows.`,
      paths: [
        { d: "M-54 -22 A60 60 0 0 1 54 -22", fill: false, strokeWidth: 7 },
        { d: "M54 22 A60 60 0 0 1 -54 22", fill: false, strokeWidth: 7 },
        { d: "M0 -34 L30 0 L0 34 L-30 0 Z", fill: true, strokeWidth: 0 },
        { d: "M-68 -12 A14 14 0 1 1 -40 -12 A14 14 0 1 1 -68 -12 Z M40 12 A14 14 0 1 1 68 12 A14 14 0 1 1 40 12 Z", fill: true, strokeWidth: 0 },
        { d: "M-30 0 L-42 -8 M30 0 L42 8", fill: false, strokeWidth: 5 },
      ],
    },
    // 2: Kinetic Ascent Ribbon & Momentum Arc (4 paths)
    {
      mark: "flow",
      concept: `Dynamic upward ribbon capturing momentum, clarity, and measurable client transformation.`,
      paths: [
        { d: "M-64 46 C-42 46 -26 18 -8 -12 C10 -42 30 -64 64 -64 L64 -34 C40 -34 24 -16 8 12 C-8 40 -28 72 -64 72 Z", fill: true, strokeWidth: 0 },
        { d: "M-64 -10 C-34 -10 -16 8 4 30 L-16 48 C-30 30 -44 18 -64 18 Z", fill: true, strokeWidth: 0 },
        { d: "M24 -64 L68 -64 L68 -20", fill: false, strokeWidth: 7 },
        { d: "M22 44 A14 14 0 1 1 50 44 A14 14 0 1 1 22 44 Z", fill: true, strokeWidth: 0 },
      ],
    },
    // 3: Executive Architectural Crest & Pillar (5 paths)
    {
      mark: "serif",
      concept: `Balanced architectural crest conveying authority, trust, and enduring expertise.`,
      paths: [
        { d: "M-60 -66 L60 -66 L60 4 C60 44 28 68 0 78 C-28 68 -60 44 -60 4 Z", fill: false, strokeWidth: 6.5 },
        { d: "M-36 -42 L36 -42 L36 0 C36 24 18 42 0 50 C-18 42 -36 24 -36 0 Z", fill: false, strokeWidth: 3.5 },
        { d: "M-8 -28 L8 -28 L8 28 L-8 28 Z", fill: true, strokeWidth: 0 },
        { d: "M-24 -12 L24 -12 L24 4 L-24 4 Z", fill: true, strokeWidth: 0 },
      ],
    },
    // 4: Radial Compass Star & Precision Aperture (4 paths)
    {
      mark: "burst",
      concept: `Directional compass star highlighting strategic guidance and standout market leadership.`,
      paths: [
        { d: "M0 -76 L18 -22 L74 0 L18 22 L0 76 L-18 22 L-74 0 L-18 -22 Z M0 -32 L-10 -10 L-32 0 L-10 10 L0 32 L10 10 L32 0 L10 -10 Z", fill: true, strokeWidth: 0 },
        { d: "M-48 -48 L-24 -24 M48 -48 L24 -24 M48 48 L24 24 M-48 48 L-24 24", fill: false, strokeWidth: 5.5 },
        { d: "M-10 0 A10 10 0 1 1 10 0 A10 10 0 1 1 -10 0 Z", fill: true, strokeWidth: 0 },
        { d: "M-62 0 A62 62 0 0 1 0 -62 M62 0 A62 62 0 0 1 0 62", fill: false, strokeWidth: 3.5 },
      ],
    },
    // 5: Interlocking Dual Horizon Frames (4 paths)
    {
      mark: "prism",
      concept: `Interlocking geometric frames uniting brand identity with scalable platform execution.`,
      paths: [
        { d: "M-66 -46 L22 -46 L22 42 L-66 42 Z M-44 -24 L-44 20 L0 20 L0 -24 Z", fill: true, strokeWidth: 0 },
        { d: "M-22 -20 L66 -20 L66 68 L-22 68 Z M0 2 L0 46 L44 46 L44 2 Z", fill: true, strokeWidth: 0 },
        { d: "M34 -64 L68 -64 L68 -30 Z", fill: true, strokeWidth: 0 },
        { d: "M-68 58 L-34 58", fill: false, strokeWidth: 6 },
      ],
    },
  ];

  let chosenIdx = variantIndex % variants.length;
  if (/monogram|luxury|serif|vintage/i.test(pref)) chosenIdx = (3 + variantIndex) % variants.length;
  else if (/connect|node|tech|ai/i.test(pref)) chosenIdx = (1 + variantIndex) % variants.length;
  else if (/organic|flow|fluid|friendly|pictorial/i.test(pref)) chosenIdx = (2 + variantIndex) % variants.length;
  else if (/emblem|bold|burst|crest/i.test(pref)) chosenIdx = (4 + variantIndex) % variants.length;

  return variants[chosenIdx];
}

function resolveIndustryKey(brief = {}, answers = {}) {
  const hay = [
    brief?.subNiche,
    brief?.niche,
    answers?.interest,
    ...(Array.isArray(brief?.discovery?.optionLabels?.interests)
      ? brief.discovery.optionLabels.interests.map((x) => `${x?.en || ""} ${x?.ar || ""}`)
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/health|clinic|medical|physio|therapy|dental|doctor|صحة|عياد|طب|علاج/.test(hay)) return "health";
  if (/fitness|gym|wellness|sport|nutrition|لياقة|رياض|تغذية/.test(hay)) return "fitness";
  if (/real\s*estate|property|broker|housing|عقار/.test(hay)) return "realestate";
  if (/e-?commerce|store|retail|shop|product|متجر|تجارة/.test(hay)) return "ecommerce";
  if (/edu|academy|course|tutor|training|تعليم|أكاديمية|تدريب/.test(hay)) return "education";
  if (/finance|wealth|account|tax|invest|مالي|محاسب|استثمار/.test(hay)) return "finance";
  if (/beauty|salon|spa|skin|aesthetic|تجميل|عناية/.test(hay)) return "beauty";
  if (/restaurant|cafe|food|hospitality|travel|مطعم|ضيافة|سفر/.test(hay)) return "hospitality";
  if (/tech|saas|ai|software|digital|cloud|تقني|برمج|ذكاء/.test(hay)) return "tech";
  if (/agency|marketing|creative|b2b|وكال|تسويق/.test(hay)) return "agency";
  return "coaching";
}

const INDUSTRY_LEXICON = {
  health: {
    oneEn: ["Vitalis", "CuraNova", "MedVantage", "Kinexia", "Healix", "Sanovia", "Aurelia", "Clinova", "Velora"],
    twoEn: ["Vitalis Care", "Cura Clinic", "Kinexia Health", "Nova Physio", "Sanovia Medical", "Aurelia Wellness", "Pulse Point", "Clarity Care", "Veritas Health"],
    oneAr: ["شفاء", "عافية", "نبض", "رعاية", "توازن", "حيوية", "سند", "ارتقاء", "صفاء"],
    twoAr: ["نبض العافية", "مدار الشفاء", "قمة الرعاية", "أفق الصحة", "مركز توازن", "عيادة صفاء", "نور العافية", "ركن الرعاية", "دار الحيوية"],
    palettes: [
      ["#0D9488", "#0284C7"],
      ["#0891B2", "#1D4ED8"],
      ["#059669", "#0F766E"],
    ],
  },
  fitness: {
    oneEn: ["Kinetix", "Strivon", "Elevon", "Voltix", "Aethel", "Peakora", "Vigorix", "Pulseon", "ironix"],
    twoEn: ["Kinetix Club", "Peak Form", "Stride Studio", "Core Momentum", "Vitality Lab", "Elevate Fit", "Apex Motion", "Prime Pulse", " Terra Fit"],
    oneAr: ["همة", "عزم", "قوة", "رشاقة", "وثبة", "نشاط", "تحدي", "انطلاق", "ذروة"],
    twoAr: ["نبض اللياقة", "ذروة النشاط", "نادي العزم", "مدار القوة", "أفق الرشاقة", "مركز الهمة", "مسار التحدي", "طاقة الحركة", "قمة الأداء"],
    palettes: [
      ["#0D9488", "#2563EB"],
      ["#EA580C", "#0F766E"],
      ["#0284C7", "#4F46E5"],
    ],
  },
  realestate: {
    oneEn: ["Domovia", "Keystone", "Urbana", "havenix", "Terranova", "Archiqo", "Estatesy", "Crestia", "Pillarx"],
    twoEn: ["Keystone Living", "Crest Estates", "Prime Haven", "Terra Capital", "Horizon Realty", "Summit Spaces", "Urban Pillar", "Noble Square", "Vantage Homes"],
    oneAr: ["عمار", "إعمار", "صرح", "مسكن", "بنيان", "رواسي", "أركان", "مقام", "ديار"],
    twoAr: ["صرح العقار", "رواسي الديار", "أركان المسكن", "أفق البنيان", "قمة الإعمار", "مدار العقارية", "نخبة المقام", "دار الأصالة", "بوابة العمار"],
    palettes: [
      ["#1E3A8A", "#0D9488"],
      ["#0F766E", "#B45309"],
      ["#1D4ED8", "#334155"],
    ],
  },
  ecommerce: {
    oneEn: ["Cartiva", "Mercato", "Shopora", "Veloce", "Loomix", "Trendix", "Bazaaro", "Curatix", "Modava"],
    twoEn: ["Curated Co", "Prime Basket", "Veloce Goods", "Modern Loom", "Aura Market", "Swift Cart", "vivid Vault", "Pure Parcel", "Urban Shelf"],
    oneAr: ["سوقنا", "متجري", "رواج", "نخبة", "مقتنى", "أناقة", "سلة", "إشراق", "تألق"],
    twoAr: ["متجر النخبة", "سلة الأناقة", "دار المقتنى", "أفق الرواج", "ركن التألق", "واحة التسوق", "نبض المتجر", "سوق الإشراق", "عالم الجودة"],
    palettes: [
      ["#0891B2", "#7C3AED"],
      ["#0F766E", "#EA580C"],
      ["#2563EB", "#0D9488"],
    ],
  },
  education: {
    oneEn: ["Learnix", "Scholara", "Mentora", "lumina", "Acadex", "Cogniva", "Skillora", "Edvance", "Mindset"],
    twoEn: ["Lumina Academy", "Mentora Hub", "Skill Path", "Bright Cohort", "Next Chapter", "Mastery Lab", "Apex Scholars", "Clarity Campus", "Future Guild"],
    oneAr: ["منارة", "معرفة", "إدراك", "رواد", "إتقان", "نبراس", "تعلم", "بصيرة", "ارتقاء"],
    twoAr: ["منارة العلم", "أكاديمية إتقان", "أفق المعرفة", "نبراس الرواد", "مسار الإدراك", "بوابة البصيرة", "جيل المستقبل", "منصة ارتقاء", "دار المهارة"],
    palettes: [
      ["#1D4ED8", "#0D9488"],
      ["#0891B2", "#4F46E5"],
      ["#0F766E", "#0284C7"],
    ],
  },
  finance: {
    oneEn: ["Ledgera", "Equitix", "Valora", "Finovia", "Aegis", "Capita", "Meridian", "Veritas", "Solvent"],
    twoEn: ["Meridian Wealth", "Aegis Capital", "Valora Advisory", "Clear Ledger", "Summit Equity", "Northstar Trust", "Prime Fiduciary", "Harbor Finance", "Crest Partners"],
    oneAr: ["ثروة", "أصول", "ميزان", "حصاد", "عوائد", "رصيد", "ركيزة", "نماء", "ائتمان"],
    twoAr: ["نماء المالية", "ميزان الأصول", "ركيزة الثروة", "أفق العوائد", "قمة الحصاد", "مدار الاستثمار", "صرح الائتمان", "دار الرصيد", "ثقة المستثمر"],
    palettes: [
      ["#0F766E", "#1E3A8A"],
      ["#1D4ED8", "#047857"],
      ["#0E7490", "#334155"],
    ],
  },
  beauty: {
    oneEn: ["Lumiere", "Velvetia", "Aurabeau", "Seraphia", "Glowra", "Elara", "Pureza", "Celestia", "Fiora"],
    twoEn: ["Lumiere Glow", "Velvet Atelier", "Pure Radiance", "Aura Aesthetics", "Silk Haven", "Bloom Studio", "Serene Skin", "Opal Beauty", "Grace Lounge"],
    oneAr: ["رونق", "إشراقة", "جمال", "نعومة", "حرير", "بهاء", "لؤلؤة", "تألق", "نضارة"],
    twoAr: ["رونق الجمال", "لمسة حرير", "دار الإشراقة", "عالم النضارة", "بهاء العناية", "واحة التألق", "سر الأنوثة", "لؤلؤة البهاء", "استوديو رونق"],
    palettes: [
      ["#0D9488", "#BE185D"],
      ["#7C3AED", "#0891B2"],
      ["#0F766E", "#D97706"],
    ],
  },
  hospitality: {
    oneEn: ["Savoria", "Taverna", "Voyago", "Hearthix", "oasisa", "Bistora", "Solara", "Nomadia", "havenly"],
    twoEn: ["Golden Hearth", "Savoria Table", "Azure Horizon", "Oasis Stays", "Craft Kitchen", "Harbor House", "Velvet Roast", "Summit Escapes", "Warm Gather"],
    oneAr: ["ضيافة", "مذاق", "واحة", "رحال", "أصالة", "نسيم", "مرسى", "مواسم", "كرم"],
    twoAr: ["كرم الضيافة", "واحة الأصالة", "مذاق النخبة", "مرسى الرحال", "نسيم المواسم", "دار الكرم", "أفق السفر", "ركن المذاق", "بوابة الواحة"],
    palettes: [
      ["#0F766E", "#D97706"],
      ["#0891B2", "#1D4ED8"],
      ["#B45309", "#0D9488"],
    ],
  },
  tech: {
    oneEn: ["Veloce", "Synthex", "Cloudora", "Nexora", "Vectra", "Quantix", "Aetheris", "Flowbit", "Stratos"],
    twoEn: ["Veloce Cloud", "Nexora AI", "Stratos Labs", "Vectra Systems", "Flow Engine", "Pulse Stack", "Clarity Tech", "Orbit Logic", "Apex Neural"],
    oneAr: ["تقنية", "سحابة", "منظومة", "ابتكار", "ذكي", "مدار", "برمجة", "رقمنة", "نواة"],
    twoAr: ["مدار التقنية", "نواة الابتكار", "أفق الرقمنة", "سحابة المستقبل", "منظومة الذكاء", "مسار البرمجة", "قمة الأنظمة", "بوابة السحابة", "حلول ذكية"],
    palettes: [
      ["#0891B2", "#1D4ED8"],
      ["#2563EB", "#0D9488"],
      ["#4F46E5", "#06B6D4"],
    ],
  },
  agency: {
    oneEn: ["Amplifyx", "Catalyst", "Scaleora", "Vanguard", "Brandix", "Sparkle", "Elevare", "Signalx", "Growthly"],
    twoEn: ["Signal Studio", "Scale Partners", "Catalyst Growth", "Vanguard Media", "Prime Reach", "Bold Funnel", "Apex Demand", "Clear Impact", "North Agency"],
    oneAr: ["انتشار", "تأثير", "ريادة", "إبداع", "صدى", "انطلاقة", "بصمة", "نمو", "توهج"],
    twoAr: ["بصمة الإبداع", "صدى الانتشار", "أفق الريادة", "مسار النمو", "وكالة التأثير", "قوة الانطلاقة", "مدار التسويق", "نخبة التوهج", "صناعة الأثر"],
    palettes: [
      ["#0891B2", "#2563EB"],
      ["#0D9488", "#4F46E5"],
      ["#1D4ED8", "#0F766E"],
    ],
  },
  coaching: {
    oneEn: ["Northstar", "Elevon", "Clarityx", "Mentoris", "Ascendia", "Catalyze", "Strivex", "Luminor", "Praxis"],
    twoEn: ["Northstar Advisory", "Elevate Coaching", "Clarity Path", "Summit Mentors", "Catalyst Executive", "Prime Momentum", "True Compass", "Apex Strategy", "Vantage Growth"],
    oneAr: ["بوصلة", "تمكين", "إرشاد", "طموح", "ريادة", "ارتقاء", "آفاق", "قيادة", "مسار"],
    twoAr: ["بوصلة القيادة", "أفق التمكين", "مسار الطموح", "قمة الإرشاد", "نخبة الريادة", "مدار الارتقاء", "صناعة القادة", "خطوة نجاح", "رؤية واضحة"],
    palettes: [
      ["#0891B2", "#1D4ED8"],
      ["#0D9488", "#0284C7"],
      ["#1E40AF", "#0F766E"],
    ],
  },
};

function sanitizeBrandNameWords(rawName, targetWords, isArabic, fallbackPool, usedSet, index) {
  const cleanScript = (str) => {
    if (typeof str !== "string") return "";
    if (isArabic) {
      return str
        .replace(/[^\p{Script=Arabic}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    // Split camelCase and hyphens first
    const expanded = str
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_./&+]+/g, " ")
      .replace(/[^A-Za-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return expanded;
  };

  let candidate = cleanScript(rawName);
  let words = candidate ? candidate.split(/\s+/).filter(Boolean) : [];
  if (words.length > targetWords) {
    words = words.slice(0, targetWords);
  } else if (words.length === 1 && targetWords === 2) {
    const suffix = isArabic ? ["بلس", "برو", "لاب"][index % 3] : ["Studio", "Group", "Labs"][index % 3];
    words = [words[0], suffix];
  }

  let formatted = words
    .map((w) => (isArabic ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .slice(0, 76)
    .trim();

  const isPlaceholder = /^(brand name|your brand|اسم البراند|اسم العلامة التجارية)$/i.test(formatted);
  if (
    !formatted ||
    isPlaceholder ||
    formatted.split(/\s+/).length !== targetWords ||
    usedSet.has(formatted.toLocaleLowerCase())
  ) {
    for (const option of fallbackPool) {
      const normalizedOption = cleanScript(option);
      if (
        normalizedOption &&
        normalizedOption.split(/\s+/).length === targetWords &&
        !usedSet.has(normalizedOption.toLocaleLowerCase())
      ) {
        formatted = normalizedOption;
        break;
      }
    }
  }
  usedSet.add(formatted.toLocaleLowerCase());
  return formatted;
}

export function buildFallbackElementSuggestions(
  element,
  requestId,
  brief = {},
  answers = {},
  previousSuggestions = [],
) {
  const industryKey = resolveIndustryKey(brief, answers);
  const pack = INDUSTRY_LEXICON[industryKey] || INDUSTRY_LEXICON.coaching;
  const marketLabel = brief?.subNiche || brief?.niche || "modern businesses";
  const isArabicUi = brief?.language === "Arabic";

  if (element === "name") {
    const lang = ["Arabic", "English"].includes(answers?.preference)
      ? answers.preference
      : brief?.language === "Arabic"
        ? "Arabic"
        : "English";
    const isArabic = lang === "Arabic";
    const twoWords = answers?.nameLength !== "one";
    const pool = isArabic ? (twoWords ? pack.twoAr : pack.oneAr) : twoWords ? pack.twoEn : pack.oneEn;
    const used = new Set(
      (Array.isArray(previousSuggestions) ? previousSuggestions : [])
        .map((item) => String(item?.name || "").trim().toLocaleLowerCase())
        .filter(Boolean),
    );
    const chosen = [];
    for (const candidate of pool) {
      if (!used.has(candidate.toLocaleLowerCase())) {
        used.add(candidate.toLocaleLowerCase());
        chosen.push(candidate);
        if (chosen.length === 3) break;
      }
    }
    while (chosen.length < 3) {
      const idx = chosen.length + 1;
      const fallback = isArabic
        ? twoWords
          ? `مدار الريادة`
          : `ريادة`
        : twoWords
          ? `Vantage ${["Core", "Prime", "Edge"][idx % 3]}`
          : `Vantix${["a", "o", "i"][idx % 3]}`;
      chosen.push(fallback);
    }
    return chosen.slice(0, 3).map((name, index) => ({
      id: `${requestId}-${index}`,
      name,
      rationale: isArabic
        ? `اسم مميز وسهل التذكر يعكس تخصص ${marketLabel} ويمنح حضورًا احترافيًا فوريًا.`
        : `Memorable, high-clarity brand name tailored to ${marketLabel} with strong market authority.`,
    }));
  }

  if (element === "colors") {
    const feeling = String(answers?.preference || "").toLowerCase();
    const sets =
      feeling === "calm"
        ? [
            ["#0D9488", "#38BDF8"],
            ["#0F766E", "#64748B"],
            ["#0284C7", "#14B8A6"],
          ]
        : feeling === "energetic"
          ? [
              ["#0891B2", "#2563EB"],
              ["#EA580C", "#0D9488"],
              ["#4F46E5", "#06B6D4"],
            ]
          : feeling === "premium"
            ? [
                ["#0F172A", "#0D9488"],
                ["#1E3A8A", "#B45309"],
                ["#115E59", "#334155"],
              ]
            : pack.palettes;

    return sets.slice(0, 3).map(([primary, secondary], index) => ({
      id: `${requestId}-${index}`,
      coreColors: {
        primary: primary.toUpperCase(),
        secondary: secondary.toUpperCase(),
        buttonBackground: "#FFFFFF",
      },
      rationale: isArabicUi
        ? `تدرج لوني متوازن بمعايير تباين عالية يناسب جمهور ${marketLabel}.`
        : `High-contrast executive palette calibrated for ${marketLabel} across Light and Dark workspaces.`,
    }));
  }

  if (element === "typography") {
    const pref = String(answers?.preference || "").toLowerCase();
    const pairings = isArabicUi
      ? [
          { heading: "Cairo", body: "IBM Plex Sans Arabic", arabic: "Cairo" },
          { heading: "Readex Pro", body: "Tajawal", arabic: "Readex Pro" },
          { heading: "Alexandria", body: "Almarai", arabic: "Alexandria" },
        ]
      : pref === "elegant"
        ? [
            { heading: "Playfair Display", body: "DM Sans", arabic: "El Messiri" },
            { heading: "Montserrat", body: "Inter", arabic: "Cairo" },
            { heading: "Sora", body: "Work Sans", arabic: "IBM Plex Sans Arabic" },
          ]
        : pref === "friendly"
          ? [
              { heading: "Poppins", body: "DM Sans", arabic: "Tajawal" },
              { heading: "DM Sans", body: "Work Sans", arabic: "Readex Pro" },
              { heading: "Manrope", body: "Inter", arabic: "Cairo" },
            ]
          : [
              { heading: "Manrope", body: "Inter", arabic: "IBM Plex Sans Arabic" },
              { heading: "Sora", body: "DM Sans", arabic: "Cairo" },
              { heading: "Montserrat", body: "Work Sans", arabic: "Readex Pro" },
            ];

    return pairings.map((typography, index) => ({
      id: `${requestId}-${index}`,
      typography,
      rationale: isArabicUi
        ? `تناغم طباعي واضح يمنح العناوين حضورًا قويًا وسهولة قراءة ممتازة.`
        : `Crisp display hierarchy paired with effortless body legibility for ${marketLabel}.`,
    }));
  }

  if (element === "tagline") {
    const taglines = isArabicUi
      ? [
          `حلول متكاملة ترتقي بتجربة عملائك في ${marketLabel}.`,
          `وضوح استراتيجي ونتائج ملموسة تنمّي أعمالك بثقة.`,
          `من الفكرة إلى النمو المستدام بخطوات مدروسة.`,
        ]
      : [
          `Precision systems and trusted outcomes for ${marketLabel}.`,
          `Turn qualified demand into lasting client relationships.`,
          `Clarity, speed, and measurable momentum for every client.`,
        ];
    return taglines.map((tagline, index) => ({
      id: `${requestId}-${index}`,
      tagline,
      rationale: isArabicUi
        ? `شعار نصي يركز على الفائدة المباشرة للعميل بلغة واضحة.`
        : `Benefit-driven value proposition tailored to ${marketLabel}.`,
    }));
  }

  // Logo element (expectedCount = 1)
  const usedCount = Array.isArray(previousSuggestions) ? previousSuggestions.length : 0;
  const chosenFont = isArabicUi
    ? coerceArabicFont(brief?.theme?.typography?.arabic, usedCount)
    : coerceBrandFont(brief?.theme?.typography?.heading, false, usedCount);
  const isWordmarkOnly = String(answers?.preference || "") === "Wordmark";
  const bespoke = buildBespokeVectorLogo(usedCount, answers?.preference, marketLabel);
  const palette = [
    brief?.theme?.light?.primary,
    brief?.theme?.light?.secondary,
    brief?.theme?.light?.buttonBackground,
  ].filter((c) => /^#[0-9a-f]{6}$/i.test(c || ""));

  return [
    {
      id: `${requestId}-0`,
      mark: isWordmarkOnly ? "prism" : bespoke.mark,
      rationale: (isArabicUi
        ? `تصميم فيكتور هندسي متوازن يعكس هوية ${brief?.name || marketLabel} بوضوح عالٍ.`
        : bespoke.concept
      ).slice(0, 155),
      logo: {
        concept: bespoke.concept.slice(0, 155),
        wordmark: {
          font: chosenFont,
          weight: 700,
          letterSpacing: isArabicUi ? 0 : 0.4,
          casing: "original",
          separator: false,
          descriptor: "",
        },
        paths: isWordmarkOnly ? [] : bespoke.paths,
        ...(palette.length ? { palette } : {}),
      },
    },
  ];
}

export function repairElementSuggestionsPayload(
  rawParsed,
  element,
  requestId,
  brief = {},
  answers = {},
  previousSuggestions = [],
) {
  const fallbackList = buildFallbackElementSuggestions(
    element,
    requestId,
    brief,
    answers,
    previousSuggestions,
  );
  const expectedCount = element === "logo" ? 1 : 3;
  const rawArr = Array.isArray(rawParsed?.suggestions)
    ? rawParsed.suggestions
    : Array.isArray(rawParsed?.candidates)
      ? rawParsed.candidates
      : Array.isArray(rawParsed?.alternatives)
        ? rawParsed.alternatives
        : Array.isArray(rawParsed?.names)
          ? rawParsed.names
          : Array.isArray(rawParsed?.logos)
            ? rawParsed.logos
            : Array.isArray(rawParsed)
              ? rawParsed
              : [];

  const industryKey = resolveIndustryKey(brief, answers);
  const pack = INDUSTRY_LEXICON[industryKey] || INDUSTRY_LEXICON.coaching;
  const usedNames = new Set(
    (Array.isArray(previousSuggestions) ? previousSuggestions : [])
      .map((s) => String(s?.name || "").trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  const usedSignatures = new Set();

  const repaired = [];
  for (let i = 0; i < expectedCount; i++) {
    const item = rawArr[i] && typeof rawArr[i] === "object" ? rawArr[i] : {};
    const fb = fallbackList[i] || fallbackList[0];
    const rationaleRaw =
      typeof item.rationale === "string" && item.rationale.trim()
        ? item.rationale.trim()
        : typeof item.reason === "string" && item.reason.trim()
          ? item.reason.trim()
          : fb.rationale;
    const maxRat = element === "logo" ? 155 : 380;
    const rationale = rationaleRaw.slice(0, maxRat);

    if (element === "name") {
      const lang = ["Arabic", "English"].includes(answers?.preference)
        ? answers.preference
        : brief?.language === "Arabic"
          ? "Arabic"
          : "English";
      const isArabic = lang === "Arabic";
      const targetWords = answers?.nameLength === "one" ? 1 : 2;
      const pool = isArabic
        ? targetWords === 1
          ? pack.oneAr
          : pack.twoAr
        : targetWords === 1
          ? pack.oneEn
          : pack.twoEn;
      const cleanName = sanitizeBrandNameWords(
        item.name ?? item.brandName ?? "",
        targetWords,
        isArabic,
        pool,
        usedNames,
        i,
      );
      repaired.push({ id: `${requestId}-${i}`, name: cleanName, rationale });
    } else if (element === "colors") {
      const rawC = item.coreColors || item.colors || item.palette || {};
      let primary = coerceHexColor(rawC.primary, fb.coreColors.primary);
      let secondary = coerceHexColor(rawC.secondary, fb.coreColors.secondary);
      let sig = `${primary}:${secondary}`;
      if (usedSignatures.has(sig)) {
        primary = fb.coreColors.primary;
        secondary = fb.coreColors.secondary;
        sig = `${primary}:${secondary}:${i}`;
      }
      usedSignatures.add(sig);
      repaired.push({
        id: `${requestId}-${i}`,
        coreColors: { primary, secondary, buttonBackground: "#FFFFFF" },
        rationale,
      });
    } else if (element === "typography") {
      const isArabic = brief?.language === "Arabic";
      const rawT = item.typography || item;
      let heading = coerceBrandFont(rawT.heading, isArabic, i);
      let body = coerceBrandFont(rawT.body, isArabic, i + 1);
      let arabic = coerceArabicFont(rawT.arabic, i);
      let sig = `${heading}:${body}:${arabic}`;
      if (usedSignatures.has(sig)) {
        heading = fb.typography.heading;
        body = fb.typography.body;
        arabic = fb.typography.arabic;
        sig = `${heading}:${body}:${arabic}:${i}`;
      }
      usedSignatures.add(sig);
      repaired.push({
        id: `${requestId}-${i}`,
        typography: { heading, body, arabic },
        rationale,
      });
    } else if (element === "tagline") {
      let tagline =
        typeof item.tagline === "string" && item.tagline.trim()
          ? item.tagline.trim().slice(0, 155)
          : fb.tagline;
      if (usedSignatures.has(tagline.toLocaleLowerCase())) tagline = fb.tagline;
      usedSignatures.add(tagline.toLocaleLowerCase());
      repaired.push({ id: `${requestId}-${i}`, tagline, rationale });
    } else if (element === "logo") {
      const isWordmarkOnly = String(answers?.preference || "") === "Wordmark";
      const isArabic = brief?.language === "Arabic";
      const rawLogo = item.logo && typeof item.logo === "object" ? item.logo : {};
      const normalizedPaths = isWordmarkOnly ? [] : normalizeLogoPathsToViewport(rawLogo.paths);
      const finalPaths =
        isWordmarkOnly || normalizedPaths.length > 0 ? normalizedPaths : fb.logo.paths;
      const chosenFont = isArabic
        ? coerceArabicFont(rawLogo.wordmark?.font || brief?.theme?.typography?.arabic, i)
        : coerceBrandFont(rawLogo.wordmark?.font || brief?.theme?.typography?.heading, false, i);
      const weight = ALLOWED_WEIGHTS.includes(Number(rawLogo.wordmark?.weight))
        ? Number(rawLogo.wordmark.weight)
        : 700;
      const spacing = isArabic
        ? 0
        : Number.isFinite(Number(rawLogo.wordmark?.letterSpacing))
          ? Math.max(-1, Math.min(4, Number(rawLogo.wordmark.letterSpacing)))
          : 0.3;
      const casing =
        !isArabic && ["original", "uppercase", "lowercase"].includes(rawLogo.wordmark?.casing)
          ? rawLogo.wordmark.casing
          : "original";
      const concept =
        typeof rawLogo.concept === "string" && rawLogo.concept.trim()
          ? rawLogo.concept.trim().slice(0, 155)
          : fb.logo.concept;

      repaired.push({
        id: `${requestId}-${i}`,
        mark: coerceMark(item.mark, i),
        rationale,
        logo: {
          concept,
          wordmark: {
            font: chosenFont,
            weight,
            letterSpacing: spacing,
            casing,
            separator: false,
            descriptor: "",
          },
          paths: finalPaths,
        },
      });
    }
  }

  return { suggestions: repaired };
}

export function buildFallbackBrandDirections(requestId, brief = {}, themeFromCoreColors) {
  const industryKey = resolveIndustryKey(brief);
  const pack = INDUSTRY_LEXICON[industryKey] || INDUSTRY_LEXICON.coaching;
  const isArabic = brief?.language === "Arabic";
  const marketLabel = brief?.subNiche || brief?.niche || "modern digital services";
  const lockedName = brief?.locks?.name && brief?.name?.trim() ? brief.name.trim() : "";
  const lockedTagline = brief?.locks?.tagline && brief?.tagline?.trim() ? brief.tagline.trim() : "";

  const distinctPalettes = [
    ["#0891B2", "#1D4ED8"],
    ["#0F766E", "#0284C7"],
    ["#1E3A8A", "#0D9488"],
  ];
  const fontSets = isArabic
    ? [
        { heading: "Cairo", body: "IBM Plex Sans Arabic", arabic: "Cairo" },
        { heading: "Readex Pro", body: "Tajawal", arabic: "Readex Pro" },
        { heading: "Alexandria", body: "Almarai", arabic: "Alexandria" },
      ]
    : [
        { heading: "Manrope", body: "Inter", arabic: "IBM Plex Sans Arabic" },
        { heading: "Sora", body: "DM Sans", arabic: "Cairo" },
        { heading: "Playfair Display", body: "Work Sans", arabic: "El Messiri" },
      ];

  const defaultTaglines = isArabic
    ? [
        `حلول احترافية متكاملة ترتقي بأعمال ${marketLabel}.`,
        `وضوح استراتيجي وتجربة رقمية سلسة لعملائك.`,
        `نمو مستدام وحضور موثوق يقود مجالك بثقة.`,
      ]
    : [
        `Structured clarity and measurable growth for ${marketLabel}.`,
        `Turn every client touchpoint into a high-trust experience.`,
        `Modern operations and standout positioning built to scale.`,
      ];

  return [0, 1, 2].map((index) => {
    const candidateName =
      lockedName || (isArabic ? pack.twoAr[index] : pack.twoEn[index]) || `Vantage ${index + 1}`;
    const arabicName = pack.twoAr[index] || candidateName;
    const tagline = lockedTagline || defaultTaglines[index];
    const [primary, secondary] = pack.palettes?.[index] || distinctPalettes[index];
    const typography = fontSets[index];
    const bespoke = buildBespokeVectorLogo(index, "", marketLabel);
    const coreColors = {
      primary: primary.toUpperCase(),
      secondary: secondary.toUpperCase(),
      buttonBackground: "#FFFFFF",
    };
    const builtTheme =
      typeof themeFromCoreColors === "function"
        ? {
            ...themeFromCoreColors(coreColors, brief?.theme, `${String(requestId).slice(0, 28)}-${index}`),
            typography,
          }
        : null;

    return {
      id: `${requestId}-${index}`,
      name: candidateName,
      arabicName,
      tagline,
      rationale: isArabic
        ? `اتجاه هوية متكامل يجمع بين وضوح التسمية وتوازن الألوان والطباعة ليلائم جمهور ${marketLabel}.`
        : `Cohesive identity pairing high-trust colors, balanced typography, and a custom geometric mark tailored for ${marketLabel}.`,
      description: isArabic
        ? `منصة متخصصة في ${marketLabel} تقدم تجربة احترافية واضحة تساعد العملاء على تحقيق نتائج ملموسة.`
        : `A specialized ${marketLabel} brand delivering structured solutions, effortless client onboarding, and reliable outcomes.`,
      imageDirection: `Clean editorial photography with natural daylight, refined architectural surfaces, and subtle ${primary} brand accents.`,
      mark: bespoke.mark,
      coreColors,
      typography,
      ...(builtTheme ? { theme: builtTheme } : {}),
      logo: {
        concept: bespoke.concept,
        wordmark: {
          font: isArabic ? typography.arabic : typography.heading,
          weight: 700,
          letterSpacing: isArabic ? 0 : 0.3,
          casing: "original",
          separator: false,
          descriptor: "",
        },
        paths: bespoke.paths,
      },
    };
  });
}

export function repairDirectionCandidatesPayload(rawParsed, requestId, brief = {}, themeFromCoreColors) {
  const fallbacks = buildFallbackBrandDirections(requestId, brief, themeFromCoreColors);
  const rawList = Array.isArray(rawParsed?.candidates)
    ? rawParsed.candidates
    : Array.isArray(rawParsed?.directions)
      ? rawParsed.directions
      : Array.isArray(rawParsed?.options)
        ? rawParsed.options
        : Array.isArray(rawParsed)
          ? rawParsed
          : [];

  const isArabic = brief?.language === "Arabic";
  const lockedName = brief?.locks?.name && brief?.name?.trim() ? brief.name.trim() : "";
  const lockedTagline = brief?.locks?.tagline && brief?.tagline?.trim() ? brief.tagline.trim() : "";
  const industryKey = resolveIndustryKey(brief);
  const pack = INDUSTRY_LEXICON[industryKey] || INDUSTRY_LEXICON.coaching;

  const usedNames = new Set();
  const usedTaglines = new Set();
  const usedPrimaries = new Set();

  const candidates = [0, 1, 2].map((index) => {
    const raw = rawList[index] && typeof rawList[index] === "object" ? rawList[index] : {};
    const fb = fallbacks[index];

    let name = lockedName;
    if (!name) {
      const candidateRaw = typeof raw.name === "string" ? raw.name.trim().slice(0, 140) : "";
      const badPlaceholder = /^(brand name|your brand|اسم العلامة التجارية|اسم البراند)$/i.test(candidateRaw);
      const wrongLang =
        (isArabic && !/[\u0600-\u06ff]/.test(candidateRaw)) ||
        (brief?.language === "English" && /[\u0600-\u06ff]/.test(candidateRaw));
      if (!candidateRaw || badPlaceholder || wrongLang || usedNames.has(candidateRaw.toLocaleLowerCase())) {
        name = fb.name;
      } else {
        name = candidateRaw;
      }
      if (usedNames.has(name.toLocaleLowerCase())) {
        const pool = isArabic ? pack.twoAr : pack.twoEn;
        name = pool.find((p) => !usedNames.has(p.toLocaleLowerCase())) || `${fb.name} ${index + 1}`;
      }
      usedNames.add(name.toLocaleLowerCase());
    }

    const arabicName =
      typeof raw.arabicName === "string" && raw.arabicName.trim()
        ? raw.arabicName.trim().slice(0, 140)
        : fb.arabicName;

    let tagline = lockedTagline;
    if (!tagline) {
      const rawTag = typeof raw.tagline === "string" ? raw.tagline.trim().slice(0, 260) : "";
      if (!rawTag || usedTaglines.has(rawTag.replace(/\s+/g, " ").toLocaleLowerCase())) {
        tagline = fb.tagline;
      } else {
        tagline = rawTag;
      }
      usedTaglines.add(tagline.replace(/\s+/g, " ").toLocaleLowerCase());
    }

    const rawColors = raw.coreColors || raw.colors || raw.theme?.light || {};
    let primary = coerceHexColor(rawColors.primary, fb.coreColors.primary);
    if (usedPrimaries.has(primary.toLowerCase())) {
      const altPrimaries = ["#0891B2", "#0F766E", "#1D4ED8", "#4F46E5", "#047857", "#0369A1"];
      primary = altPrimaries.find((c) => !usedPrimaries.has(c.toLowerCase())) || fb.coreColors.primary;
    }
    usedPrimaries.add(primary.toLowerCase());
    const secondary = coerceHexColor(rawColors.secondary, fb.coreColors.secondary);
    const coreColors = { primary, secondary, buttonBackground: "#FFFFFF" };

    const rawTypo = raw.typography || raw.theme?.typography || {};
    const typography = {
      heading: coerceBrandFont(rawTypo.heading, isArabic, index),
      body: coerceBrandFont(rawTypo.body, isArabic, index + 1),
      arabic: coerceArabicFont(rawTypo.arabic, index),
    };

    const rawLogo = raw.logo && typeof raw.logo === "object" ? raw.logo : {};
    const fittedPaths = normalizeLogoPathsToViewport(rawLogo.paths);
    const paths = fittedPaths.length > 0 ? fittedPaths : fb.logo.paths;
    const wordmarkFont = isArabic
      ? coerceArabicFont(rawLogo.wordmark?.font || typography.arabic, index)
      : coerceBrandFont(rawLogo.wordmark?.font || typography.heading, false, index);

    return {
      id: `${requestId}-${index}`,
      name,
      arabicName,
      tagline,
      rationale:
        typeof raw.rationale === "string" && raw.rationale.trim()
          ? raw.rationale.trim().slice(0, 1800)
          : fb.rationale,
      description:
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim().slice(0, 560)
          : fb.description,
      imageDirection:
        typeof raw.imageDirection === "string" && raw.imageDirection.trim()
          ? raw.imageDirection.trim().slice(0, 900)
          : fb.imageDirection,
      mark: coerceMark(raw.mark, index),
      coreColors,
      typography,
      logo: {
        concept:
          typeof rawLogo.concept === "string" && rawLogo.concept.trim()
            ? rawLogo.concept.trim().slice(0, 360)
            : fb.logo.concept,
        wordmark: {
          font: wordmarkFont,
          weight: ALLOWED_WEIGHTS.includes(Number(rawLogo.wordmark?.weight))
            ? Number(rawLogo.wordmark.weight)
            : 700,
          letterSpacing: isArabic
            ? 0
            : Number.isFinite(Number(rawLogo.wordmark?.letterSpacing))
              ? Math.max(-1, Math.min(4, Number(rawLogo.wordmark.letterSpacing)))
              : 0.3,
          casing:
            !isArabic && ["original", "uppercase", "lowercase"].includes(rawLogo.wordmark?.casing)
              ? rawLogo.wordmark.casing
              : "original",
          separator: Boolean(rawLogo.wordmark?.separator),
          descriptor:
            typeof rawLogo.wordmark?.descriptor === "string"
              ? rawLogo.wordmark.descriptor.trim().slice(0, 55)
              : "",
        },
        paths,
      },
    };
  });

  return { candidates };
}

export function buildFallbackDiscoveryAnalysis(
  requestId,
  profile = {},
  candidates = [],
  catalog = {},
  language = "en",
  promptVersion = "resilient-v1",
  configVersion = "default",
) {
  const ar = language === "ar";
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  let best = candidates[0] || catalog?.subNiches?.[0] || null;
  if (candidates.length > 1 && interests.length > 0) {
    const hayMatch = (c) => {
      const text = `${c.id || ""} ${c.name || ""} ${c.nicheName || ""} ${c.buyer || ""}`.toLowerCase();
      return interests.reduce((acc, id) => acc + (text.includes(String(id).toLowerCase()) ? 2 : 0), 0);
    };
    best = [...candidates].sort((a, b) => hayMatch(b) - hayMatch(a))[0] || candidates[0];
  }

  if (!best) {
    return {
      status: "needs_clarification",
      nicheId: null,
      subNicheId: null,
      reasons: [],
      tradeoffs: [],
      problemSignals: [],
      competition: "unknown",
      confidence: "low",
      clarification: ar
        ? "اختر اهتمامًا إضافيًا واحدًا على الأقل لترشيح أنسب سوق."
        : "Select at least one focus interest so we can match an active market.",
      sources: [],
      audienceSources: [],
      audienceResearchStatus: "disabled",
      mode: "profile",
      language,
      schemaVersion: 1,
      analysisId: requestId,
      profileRevision: profile?.revision || "local",
      catalogVersion: catalog?.version || "starter-v1",
      configurationVersion: configVersion,
      promptVersion,
      provider: "fallback",
      model: "context-engine",
      createdAt: new Date().toISOString(),
    };
  }

  const subName = best.name || best.nameEn || "Business Coaching";
  return {
    status: "recommended",
    nicheId: best.nicheId,
    subNicheId: best.id,
    reasons: ar
      ? [
          `توافق مباشر بين اهتماماتك المختارة ونموذج الطلب المتكرر في ${subName}.`,
          `إمكانية إطلاق سريعة باستخدام قوالب الحجز والمتابعة الجاهزة في المنصة.`,
          `قيمة عميل مرتفعة تسمح بالنمو التدريجي ضمن ميزانيتك ووقتك المتاح.`,
        ]
      : [
          `Strong alignment between your selected focus areas and recurring buyer demand in ${subName}.`,
          `Fast time-to-launch with pre-configured booking, CRM, and conversion templates.`,
          `Healthy client lifetime value suited to your available weekly schedule and launch budget.`,
        ],
    tradeoffs: ar
      ? [
          `يتطلب التزامًا برسالة تسويقية واضحة ومحددة لبناء الثقة الأولية مع العملاء.`,
        ]
      : [
          `Requires clear positioning and consistent follow-up workflows to convert early inquiries.`,
        ],
    problemSignals: ar
      ? [
          `العملاء يبحثون عن نظام واضح يوفر الوقت ويضمن نتائج قابلة للقياس.`,
        ]
      : [
          `Buyers actively seek structured guidance and reliable execution without fragmented tools.`,
        ],
    clarification: "",
    competition: "moderate",
    confidence: "high",
    sources: [],
    audienceSources: [],
    audienceResearchStatus: "no_sources",
    mode: "profile",
    language,
    schemaVersion: 1,
    analysisId: requestId,
    profileRevision: profile?.revision || "local",
    catalogVersion: catalog?.version || "starter-v1",
    configurationVersion: configVersion,
    promptVersion,
    provider: "fallback",
    model: "context-engine",
    createdAt: new Date().toISOString(),
  };
}

export function repairOrFallbackDiscoveryContent(rawParsed, brief, language = "en") {
  const ar = language === "ar";
  const brandName = brief?.brand?.name || (ar ? "علامتك التجارية" : "Your Brand");
  const subNiche = brief?.subNiche || brief?.niche || (ar ? "خدمات الأعمال" : "professional services");
  const rawBlocks = Array.isArray(rawParsed?.blocks) ? rawParsed.blocks : [];
  const stripHtml = (s, max) =>
    typeof s === "string"
      ? s.replace(/<\/?[a-z][^>]*>/gi, "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max)
      : "";

  const blocks = (brief?.blocks || []).map((source) => {
    const match = rawBlocks.find((b) => b && b.id === source.id) || {};
    const title = stripHtml(match.title, 240) || source.title || `${brandName} · ${subNiche}`;
    const body = stripHtml(match.body, 3800) || source.body || subNiche;
    const ctaLabel = source.ctaLabel
      ? stripHtml(match.ctaLabel, 110) || source.ctaLabel
      : "";
    return { id: source.id, title, body, ctaLabel };
  });

  const defaultFollowUps = ar
    ? [
        `مرحبًا! يسعدنا تواصلك مع ${brandName}. هل تود تحديد موعد سريع لمناقشة احتياجاتك في ${subNiche}؟`,
        `أردنا المتابعة معك بخصوص خطوتك القادمة—فريق ${brandName} جاهز لمساعدتك في البدء بوضوح.`,
        `تذكير ودي من ${brandName}: يمكنك حجز جلستك أو الرد هنا بأي استفسار في أي وقت.`,
      ]
    : [
        `Hi! Thanks for connecting with ${brandName}. Would you like to pick a quick time to map out your ${subNiche} goals?`,
        `Just checking in from ${brandName}—we kept a spot open if you are ready to take the next step this week.`,
        `Friendly note from ${brandName}: reply anytime with questions or use the link to confirm your session.`,
      ];

  const rawFollow = Array.isArray(rawParsed?.followUpMessages) ? rawParsed.followUpMessages : [];
  const followUpMessages = [0, 1, 2].map(
    (i) => stripHtml(rawFollow[i], 2800) || defaultFollowUps[i],
  );

  const rawQual = Array.isArray(rawParsed?.qualificationQuestions)
    ? rawParsed.qualificationQuestions
    : [];
  const qualificationQuestions = (brief?.qualificationQuestions || []).map(
    (orig, i) => stripHtml(rawQual[i], 950) || orig,
  );

  return { blocks, followUpMessages, qualificationQuestions };
}
