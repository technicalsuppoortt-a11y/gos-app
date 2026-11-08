import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { normalizeLogoMask, logoMaskSimilarity } from "../data/logoSimilarity.js";
import { isBrandFont, brandFontStylesheet } from "../data/brandFonts.ts";

export const logoVersion = 7;
export const logoWidth = 1200,
  logoHeight = 400;
const xml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
    );

const rasterImages = new Map<string, string>();
export const isRasterBrandLogo = (identity: BrandIdentity) => Boolean(identity.logo?.image);
const rasterKey = (identity: BrandIdentity) => `${identity.logo?.image?.ownerUid}:${identity.logo?.image?.assetId}`;
const inlineImage = (value?: string) => value && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : undefined;
export const brandLogoImageUrl = (identity: BrandIdentity) => inlineImage(identity.logo?.image?.dataUrl) || rasterImages.get(rasterKey(identity));

export function createRasterBrandLogoSvg(dataUrl: string | undefined, name: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img"><title>${xml(name)} logo</title>${dataUrl ? `<image href="${xml(dataUrl)}" x="0" y="0" width="1200" height="400" preserveAspectRatio="xMidYMid meet"/>` : ""}</svg>`;
}

export async function resolveBrandLogoImage(identity: BrandIdentity): Promise<string> {
  const image = identity.logo?.image;
  if (!image) throw new Error("This logo has no image.");
  const temporary = inlineImage(image.dataUrl);
  if (temporary) return temporary;
  const { auth, db } = await import('../firebase.ts');
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== image.ownerUid) throw new Error("The saved logo belongs to another account.");
  if (!/^[a-z0-9-]{1,100}$/i.test(image.assetId)) throw new Error("The saved logo reference is invalid.");
  const { cachedBrandAssetUrl, resolveFirestoreBrandImage } = await import('./brandAssets.ts');
  let dataUrl = rasterImages.get(rasterKey(identity)) || cachedBrandAssetUrl(uid, image.assetId);
  if (!dataUrl) {
    const { doc, getDoc } = await import('firebase/firestore');
    const snapshot = await getDoc(doc(db, 'users', uid, 'assets', image.assetId));
    if (!snapshot.exists()) throw new Error("The generated logo image could not be found.");
    dataUrl = await resolveFirestoreBrandImage(uid, image.assetId, snapshot.data());
  }
  if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
  if (!inlineImage(dataUrl)) throw new Error("The saved logo image is invalid.");
  if (!rasterImages.has(rasterKey(identity)) && typeof document !== 'undefined' && typeof Image !== 'undefined') {
    const { transparentLogoPng } = await import('./logoTransparency');
    dataUrl = await transparentLogoPng(dataUrl!);
    if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed.");
  }
  rasterImages.set(rasterKey(identity), dataUrl);
  if (rasterImages.size > 30) rasterImages.delete(rasterImages.keys().next().value!);
  return dataUrl;
}

// SVG wrappers for raster images are internal previews, never vector downloads.
// One standalone vector is used for legacy cards, PNG download and saved image.
export function createBrandLogoSvg(
  identity: BrandIdentity,
  primary: string,
  options: { monochrome?: "light" | "dark" | undefined; embedFonts?: boolean } = {},
) {
  if (isRasterBrandLogo(identity)) return createRasterBrandLogoSvg(brandLogoImageUrl(identity), identity.name);
  const color = /^#[0-9a-f]{6}$/i.test(primary) ? primary : "#071B38";
  const ink =
    options.monochrome === "dark"
      ? "#FFFFFF"
      : options.monochrome === "light"
        ? "#111111"
        : color.toLowerCase() === "#f7f7f7"
          ? "#243449"
          : color;
  const initial = xml(Array.from(identity.name.trim())[0]?.toUpperCase() || "B");
  const marks: Record<BrandIdentity["mark"], string> = {
    prism: `<path d="M0 -96 83 -48 83 48 0 96 -83 48 -83 -48Z" fill="${ink}"/><path d="M0 -65 56 -32 56 32 0 65 -56 32 -56 -32Z" fill="white"/><path d="M0 -34 29 -17 29 17 0 34 -29 17 -29 -17Z" fill="${ink}"/><path d="M0 -96V-65M83 48 56 32M-83 48 -56 32" stroke="white" stroke-width="8"/>`,
    flow: `<path d="M-85 35C-85 -65 15 -95 55 -35C95 25 25 95 -25 45C-65 5 -5 -75 70 -55" fill="none" stroke="${ink}" stroke-width="26" stroke-linecap="round"/><circle cx="-85" cy="35" r="13" fill="${ink}"/>`,
    serif: `<circle r="88" fill="none" stroke="${ink}" stroke-width="3"/><circle r="76" fill="none" stroke="${ink}" stroke-width="1"/><text y="35" text-anchor="middle" font-family="Georgia,serif" font-size="110" fill="${ink}">${initial}</text><path d="M-20 98H20" stroke="${ink}" stroke-width="3"/>`,
    nodes: `<path d="M0 -73 73 0 0 73 -73 0Z M0 -73V73M-73 0H73" stroke="${ink}" stroke-width="8" fill="none"/><rect x="-25" y="-25" width="50" height="50" rx="12" fill="${ink}"/>${[
      [0, -73],
      [73, 0],
      [0, 73],
      [-73, 0],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="18" fill="white" stroke="${ink}" stroke-width="8"/>`,
      )
      .join("")}`,
    bilingual: `<rect x="-90" y="-80" width="180" height="160" rx="38" fill="none" stroke="${ink}" stroke-width="5"/><text y="30" text-anchor="middle" font-family="Georgia,serif" font-size="100" fill="${ink}">${initial}</text>`,
    burst: `<path d="M0 -96 24 -58 68 -68 58 -24 96 0 58 24 68 68 24 58 0 96 -24 58 -68 68 -58 24 -96 0 -58 -24 -68 -68 -24 -58Z" fill="${ink}"/><text y="26" text-anchor="middle" font-family="Arial,sans-serif" font-size="78" font-weight="700" fill="white">${initial}</text>`,
  };
  const geometry = identity.logo?.paths;
  const customMark =
    geometry &&
    geometry.length >= 1 &&
    geometry.length <= 8 &&
    geometry.every(
      (path) =>
        typeof path.d === "string" &&
        path.d.length <= 1800 &&
        /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE,.+\s-]+$/.test(path.d) &&
        typeof path.fill === "boolean" &&
        Number.isFinite(path.strokeWidth) &&
        path.strokeWidth >= 0 &&
        path.strokeWidth <= 12 &&
        (path.fill || path.strokeWidth > 0),
    )
      ? geometry
          .map(
            (path) =>
              `<path d="${xml(path.d)}" fill="${path.fill ? ink : "none"}" fill-rule="evenodd" stroke="${ink}" stroke-width="${path.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
          )
          .join("")
      : null;
  const name = identity.name.trim() || "Your Brand";
  const textOnly = identity.logo?.paths.length === 0 && Boolean(identity.logo.wordmark);
  const markGroup = `<g data-brand-mark="true" transform="translate(170 200)">${textOnly ? "" : customMark || marks[identity.mark] || marks.prism}</g>`;
  const wordmark = identity.logo?.wordmark;
  if (wordmark) {
    const arabic = /[\u0600-\u06ff]/.test(name);
    const family = isBrandFont(wordmark.font) ? wordmark.font : arabic ? "Cairo" : "Manrope";
    const weight = [400, 500, 600, 700, 800].includes(wordmark.weight) ? wordmark.weight : 700;
    const spacing = arabic ? 0 : Math.max(-1, Math.min(4, wordmark.letterSpacing));
    const label =
      arabic || wordmark.casing === "original"
        ? name
        : wordmark.casing === "uppercase"
          ? name.toUpperCase()
          : name.toLowerCase();
    const descriptor = wordmark.descriptor.trim().slice(0, 60);
    const available = textOnly ? 1000 : wordmark.separator ? 715 : 770;
    const size = fitWordmark(label, family, weight, spacing, available);
    const descriptorSize = Math.min(22, fitWordmark(descriptor, family, 400, arabic ? 0 : 3, available));
    const textWidth = measureWordmark(label, family, weight, size, spacing);
    const blockWidth = Math.max(textWidth, descriptor ? measureWordmark(descriptor, family, 400, descriptorSize, arabic ? 0 : 3) : 0);
    const start = textOnly ? 600 - blockWidth / 2 : wordmark.separator ? 385 : 310;
    const x = arabic ? start + blockWidth : start;
    const offset = textOnly ? 0 : 600 - (74 + start + blockWidth) / 2;
    const y = descriptor ? 175 : 200;
    const embedded = options.embedFonts === false ? "" : fontCss.get(`${family}:${weight}`) || "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img"><title>${xml(name)} logo</title>${embedded ? `<defs><style>${embedded}</style></defs>` : ""}<g transform="translate(${offset} 0)">${markGroup}${wordmark.separator ? `<path d="M310 100V300" stroke="${ink}" stroke-width="2" opacity=".5"/>` : ""}<text x="${x}" y="${y}" dominant-baseline="central" text-anchor="start" font-family="${xml(family)},${arabic ? "sans-serif" : /Playfair/.test(family) ? "serif" : "sans-serif"}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${ink}"${arabic ? ' direction="rtl" unicode-bidi="plaintext"' : ""}>${xml(label)}</text>${descriptor ? `<text x="${x}" y="250" text-anchor="start" font-family="${xml(family)},sans-serif" font-size="${descriptorSize}" font-weight="400" letter-spacing="${arabic ? 0 : 3}" fill="${ink}"${arabic ? ' direction="rtl" unicode-bidi="plaintext"' : ""}>${xml(descriptor)}</text>` : ""}</g></svg>`;
  }
  const font =
    identity.mark === "serif" || /playfair|serif|elegant/i.test(identity.typography)
      ? "Georgia,serif"
      : "Arial,sans-serif";
  const size = Math.max(32, Math.min(68, 760 / Math.max(Array.from(name).length * 0.6, 1)));
  const tagline = identity.tagline.trim();
  const words = tagline.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).length > 52 && line) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  const caption = lines
    .slice(0, 2)
    .map(
      (text, i) =>
        `<tspan x="340" dy="${i ? 32 : 0}">${xml(text.slice(0, 100))}${i === 1 && lines.length > 2 ? "…" : ""}</tspan>`,
    )
    .join("");
  const isArabic = /[\u0600-\u06ff]/.test(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img"><title>${xml(name)} logo</title><g transform="translate(${600 - (74 + 310 + measureWordmark(name, font, identity.mark === "flow" ? 500 : 700, size, 0)) / 2} 0)"><g data-brand-mark="true" transform="translate(170 200)">${customMark || marks[identity.mark] || marks.prism}</g><text x="${isArabic ? 310 + measureWordmark(name, font, identity.mark === "flow" ? 500 : 700, size, 0) : 310}" y="200" dominant-baseline="central" text-anchor="start" font-family="${font}" font-size="${size}" font-weight="${identity.mark === "flow" ? 500 : 700}" fill="${ink}"${isArabic ? ' direction="rtl"' : ""}${name.length > 35 ? ' textLength="760" lengthAdjust="spacingAndGlyphs"' : ""}>${xml(name)}</text><!--<text x="340" y="235" text-anchor="start" font-family="Arial,sans-serif" font-size="23" fill="${ink}" opacity=".75">${caption}</text>--></g></svg>`;
}

export const logoDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Compact gallery presentation uses the same artwork as the horizontal export.
export function createBrandLogoCardSvg(identity: BrandIdentity, primary: string) {
  const full = createBrandLogoSvg(identity, primary);
  if (isRasterBrandLogo(identity)) return full;
  if (identity.logo?.paths.length === 0 && identity.logo.wordmark) return full;
  const mark = full.split('<g data-brand-mark="true" transform="translate(170 200)">')[1]!.split("</g>")[0];
  const defs = full.match(/<defs>[\s\S]*?<\/defs>/)?.[0] || "";
  const name = identity.name.trim() || "Your Brand";
  const arabic = /\p{Script=Arabic}/u.test(name);
  const w = identity.logo?.wordmark;
  const font = w?.font && isBrandFont(w.font) ? w.font : arabic ? "Cairo" : "Manrope";
  const label = arabic || !w || w.casing === "original" ? name : w.casing === "uppercase" ? name.toUpperCase() : name.toLowerCase();
  const weight = w?.weight || 700;
  const size = Math.min(32, fitWordmark(label, font, weight, 0, 300));
  const ink = /^#[0-9a-f]{6}$/i.test(primary) ? primary.toLowerCase() === "#f7f7f7" ? "#243449" : primary : "#071B38";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="280" viewBox="0 0 360 280" role="img"><title>${xml(name)} logo</title>${defs}<g transform="translate(180 110) scale(.82)">${mark}</g><text x="180" y="242" text-anchor="middle" font-family="${xml(font)},sans-serif" font-size="${size}" font-weight="${weight}" fill="${ink}"${arabic ? ' direction="rtl" unicode-bidi="plaintext"' : ""}>${xml(label)}</text></svg>`;
}

export function createBrandMarkSvg(identity: BrandIdentity, primary: string) {
  const full = createBrandLogoSvg(identity, primary);
  if (isRasterBrandLogo(identity)) return full;
  if (identity.logo?.paths.length === 0 && identity.logo.wordmark) return full;
  const mark = full
    .split('<g data-brand-mark="true" transform="translate(170 200)">')[1]!
    .split("</g>")[0];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="-120 -120 240 240">${mark}</svg>`;
}

export async function logoPngFile(svg: string, name: string) {
  const image = new Image();
  image.src = logoDataUrl(svg);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = logoWidth;
  canvas.height = logoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Logo image export is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Logo export failed."))),
      "image/png",
    ),
  );
  return new File(
    [blob],
    `${name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60) || "brand"}-logo.png`,
    { type: "image/png" },
  );
}

function measureWordmark(label: string, family: string, weight: number, size: number, spacing: number) {
  const ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  if (ctx) ctx.font = `${weight} ${size}px ${family.includes(",") ? family : `"${family}"`}`;
  return (ctx ? ctx.measureText(label).width : Array.from(label).length * size * .65) + Math.max(0, Array.from(label).length - 1) * spacing;
}

const fontCss = new Map<string, string>();
const fontRequests = new Map<string, Promise<void>>();
function fitWordmark(
  label: string,
  family: string,
  weight: number,
  spacing: number,
  available: number,
) {
  if (typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = `${weight} 88px "${family}"`;
      return Math.min(
        88,
        Math.max(
          1,
          (88 * (available - Math.max(0, Array.from(label).length - 1) * Math.max(0, spacing))) /
            Math.max(ctx.measureText(label).width, 1),
        ),
      );
    }
  }
  return Math.min(
    88,
    Math.max(
      1,
      (available - Math.max(0, Array.from(label).length - 1) * Math.max(0, spacing)) /
        Math.max(Array.from(label).length * 0.65, 1),
    ),
  );
}

// SVG images are isolated documents: embed fonts so cards and downloaded files
// use the same lettering, including Arabic glyphs and shaping.
export async function prepareBrandLogoSvg(
  identity: BrandIdentity,
  primary: string,
  options: { monochrome?: "light" | "dark" | undefined } = {},
) {
  if (isRasterBrandLogo(identity)) return createRasterBrandLogoSvg(await resolveBrandLogoImage(identity), identity.name);
  const w = identity.logo?.wordmark;
  if (w && isBrandFont(w.font) && typeof document !== "undefined") {
    const key = `${w.font}:${w.weight}`;
    if (!fontCss.has(key)) {
      let request = fontRequests.get(key);
      if (!request) {
        request = (async () => {
          const response = await fetch(
            brandFontStylesheet([w.font], [w.weight, 400]),
            { signal: AbortSignal.timeout(15000) },
          );
          if (!response.ok) throw new Error("Logo font could not be loaded. Please retry.");
          let css = await response.text();
          const urls = [
            ...new Set(
              [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]!),
            ),
          ];
          if (!urls.length) throw new Error("Logo font is unavailable. Please retry.");
          const embeddedFonts = await Promise.all(urls.map(async (url) => {
            const font = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!font.ok) throw new Error("Logo font could not be loaded. Please retry.");
            const bytes = new Uint8Array(await font.arrayBuffer());
            let binary = "";
            for (const byte of bytes) binary += String.fromCharCode(byte);
            return [url, `data:font/woff2;base64,${btoa(binary)}`] as const;
          }));
          for (const [url, dataUrl] of embeddedFonts) css = css.replaceAll(url, dataUrl);
          // Load the same font into the host document for accurate text measurement.
          const style = document.createElement("style");
          style.textContent = css;
          document.head.append(style);
          fontCss.set(key, css);
        })().finally(() => fontRequests.delete(key));
        fontRequests.set(key, request);
      }
      await request;
    }
    await Promise.all([
      document.fonts.load(`${w.weight} 88px "${w.font}"`, identity.name),
      ...(w.descriptor ? [document.fonts.load(`400 22px "${w.font}"`, w.descriptor)] : []),
    ]);
  }
  return createBrandLogoSvg(identity, primary, options);
}

export function validateBrandLogoArtwork(identity: BrandIdentity) {
  if (!identity.logo || !identity.logo.paths.length || typeof document === "undefined") return;
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden";
  container.innerHTML = createBrandMarkSvg(identity, "#111111");
  document.body.append(container);
  try {
    const paths = container.querySelectorAll<SVGPathElement>("path");
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const path of paths) {
      const bounds = path.getBBox();
      const stroke = Number(path.getAttribute("stroke-width") || 0) / 2;
      left = Math.min(left, bounds.x - stroke);
      top = Math.min(top, bounds.y - stroke);
      right = Math.max(right, bounds.x + bounds.width + stroke);
      bottom = Math.max(bottom, bounds.y + bounds.height + stroke);
    }
    if (
      ![left, top, right, bottom].every(Number.isFinite) ||
      left < -102 ||
      top < -102 ||
      right > 102 ||
      bottom > 102 ||
      right - left < 20 ||
      bottom - top < 20
    )
      throw Object.assign(
        new Error("The generated logo geometry is incomplete or clipped. Generate again."),
        { diagnostic: "brand-invalid-logo" },
      );
  } finally {
    container.remove();
  }
}

export async function validateBrandLogoDiversity(
  identities: BrandIdentity[],
  previous: BrandIdentity[] = [],
) {
  if (typeof document === "undefined") return;
  const rasterize = async (identity: BrandIdentity) => {
    const image = new Image();
    image.src = logoDataUrl(createBrandMarkSvg(identity, "#000000"));
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Logo artwork review is unavailable.");
    ctx.drawImage(image, 0, 0, 192, 192);
    const pixels = ctx.getImageData(0, 0, 192, 192).data;
    const alpha = new Uint8Array(192 * 192);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3]!;
    return normalizeLogoMask(alpha, 192, 192);
  };
  // Check new/new and new/old; existing duplicates do not invalidate a fresh batch.
  const old = await Promise.all(previous.filter(identity => identity.logo?.paths?.length).slice(-128).map(rasterize));
  const masks = await Promise.all(identities.filter(identity => identity.logo?.paths.length).map(rasterize));
  for (let i = 0; i < masks.length; i++) {
    if ([...old, ...masks.slice(0, i)].some(mask => logoMaskSimilarity(masks[i]!, mask) >= .86))
      throw Object.assign(new Error(`Logo option ${i + 1} is visually too similar to another logo. Redesign its silhouette and concept, not just its coordinates or wording.`), { diagnostic: "brand-similar-logo" });
  }
}
