import { useSyncExternalStore } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { saveSetup } from '../pages/onboarding/onboarding-store';

type Colors = Record<string, string>;
export type PhoenixBrand = {
  name: string; tagline?: string; description: string; business: string;
  language: 'ar' | 'en'; mode: 'light' | 'dark'; logoAssetId?: string;
  theme?: { paletteId: string; light: Colors; dark: Colors; typography: { heading: string; body: string; arabic: string }; buttons: { shape: string; variant: string }; appearance: { radius: number; shadow: string; density: string } };
};
export type PhoenixConfiguration = { uid: string; brand: PhoenixBrand; logo: string; logoHasWordmark: boolean; pages: Record<string, { parameters: Record<string, unknown>; revision: string }> };
let configuration: PhoenixConfiguration | null = null;
let configurationRevision = "";
const listeners = new Set<() => void>();
const trimmedRasterCache = new Map<string, { url: string; wordmark: boolean }>();

export function tightenBrandLogoSvg(svg: string): string {
  if (!svg || !svg.includes('viewBox="0 0 1200 400"')) return svg;
  if (/<image\s+href=/.test(svg)) return svg;
  const groupMatch = svg.match(/<g\s+transform="translate\(([-\d.]+)\s+0\)">/);
  if (!groupMatch) return svg;
  const offset = Number(groupMatch[1]);
  if (!Number.isFinite(offset)) return svg;
  const markMatch = svg.match(/<g\s+data-brand-mark="true"\s+transform="translate\(170\s+200\)">([\s\S]*?)<\/g>/);
  const hasMark = Boolean(markMatch && markMatch[1]!.trim().length > 0);
  let left = 0, right = 1200, top = 88, bottom = 312;
  if (hasMark) {
    const start = svg.includes('<path d="M310 100V300"') ? 385 : 310;
    const textEndGroup = 1200 - 74 - 2 * offset;
    const blockWidth = Math.max(0, textEndGroup - start);
    const glyphSafety = Math.min(36, Math.max(10, blockWidth * 0.08));
    left = Math.max(0, Math.floor(68 + offset - 10));
    right = Math.min(1200, Math.ceil(textEndGroup + offset + glyphSafety + 10));
  } else {
    const textTag = svg.match(/<text\s+([^>]+)>/);
    const xAttr = Number(textTag?.[1]?.match(/\bx="([-\d.]+)"/)?.[1]);
    const sizeAttr = Number(textTag?.[1]?.match(/\bfont-size="([\d.]+)"/)?.[1] || 64);
    const isRtlText = Boolean(textTag?.[1]?.includes('direction="rtl"'));
    if (Number.isFinite(xAttr)) {
      const halfWidth = Math.max(24, Math.abs(xAttr - 600));
      const glyphSafety = Math.min(40, Math.max(12, halfWidth * 0.16));
      left = Math.max(0, Math.floor(isRtlText ? 600 - halfWidth - glyphSafety : 600 - halfWidth - 12));
      right = Math.min(1200, Math.ceil(isRtlText ? 600 + halfWidth + 12 : 600 + halfWidth + glyphSafety));
    }
    const textCount = (svg.match(/<text\b/g) || []).length;
    if (textCount > 1) {
      top = 116;
      bottom = 278;
    } else {
      const halfHeight = Math.max(42, Math.ceil(sizeAttr * 0.68));
      top = Math.max(0, 200 - halfHeight);
      bottom = Math.min(400, 200 + halfHeight);
    }
  }
  const width = Math.max(40, right - left);
  const height = Math.max(40, bottom - top);
  return svg
    .replace(/\bwidth="1200"/, `width="${width}"`)
    .replace(/\bheight="400"/, `height="${height}"`)
    .replace('viewBox="0 0 1200 400"', `viewBox="${left} ${top} ${width} ${height}"`);
}

function normalizeLogoDataUrl(logo: string): string {
  if (!logo) return '';
  if (logo.startsWith('data:image/svg+xml;charset=utf-8,')) {
    try {
      const decoded = decodeURIComponent(logo.slice('data:image/svg+xml;charset=utf-8,'.length));
      const tightened = tightenBrandLogoSvg(decoded);
      return tightened === decoded ? logo : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tightened)}`;
    } catch {
      return logo;
    }
  }
  return logo;
}

function scheduleBrowserRasterTrim(uid: string, revision: string, sourceUrl: string) {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return;
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(sourceUrl)) return;
  const cached = trimmedRasterCache.get(sourceUrl);
  if (cached) {
    if (configuration?.uid === uid && configurationRevision === revision && configuration.logo === sourceUrl && cached.url !== sourceUrl) {
      configuration = { ...configuration, logo: cached.url, logoHasWordmark: configuration.logoHasWordmark || cached.wordmark };
      listeners.forEach(fn => fn());
    }
    return;
  }
  void (async () => {
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const width = image.naturalWidth, height = image.naturalHeight;
      if (width < 8 || height < 8 || width * height > 20_000_000) return;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);
      const pixels = imgData.data;

      // Flood-fill exterior near-white matte if the image corners are opaque white.
      const visited = new Uint8Array(width * height);
      const queue = new Uint32Array(width * height);
      let head = 0, tail = 0, matteChanged = false;
      const visit = (index: number) => {
        if (visited[index]) return;
        visited[index] = 1;
        const offset = index * 4;
        const r = pixels[offset]!, g = pixels[offset + 1]!, b = pixels[offset + 2]!, a = pixels[offset + 3]!;
        if (a !== 0 && (Math.min(r, g, b) < 242 || Math.max(r, g, b) - Math.min(r, g, b) > 18)) return;
        if (a !== 0) { pixels[offset + 3] = 0; matteChanged = true; }
        queue[tail++] = index;
      };
      for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
      for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
      while (head < tail) {
        const idx = queue[head++]!;
        if (idx % width) visit(idx - 1);
        if (idx % width !== width - 1) visit(idx + 1);
        if (idx >= width) visit(idx - width);
        if (idx + width < width * height) visit(idx + width);
      }

      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
          if (pixels[(row + x) * 4 + 3]! > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) return;
      const pad = 2;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(width, maxX + pad + 1) - cropX;
      const cropH = Math.min(height, maxY + pad + 1) - cropY;
      const cropped = cropX > 0 || cropY > 0 || cropW < width || cropH < height;
      if (!matteChanged && !cropped) {
        trimmedRasterCache.set(sourceUrl, { url: sourceUrl, wordmark: cropW > cropH * 1.45 });
        return;
      }
      if (matteChanged) ctx.putImageData(imgData, 0, 0);
      const out = document.createElement('canvas');
      out.width = cropW;
      out.height = cropH;
      const outCtx = out.getContext('2d');
      if (!outCtx) return;
      outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const url = out.toDataURL('image/png');
      const wordmark = cropW > cropH * 1.45;
      trimmedRasterCache.set(sourceUrl, { url, wordmark });
      if (trimmedRasterCache.size > 24) trimmedRasterCache.delete(trimmedRasterCache.keys().next().value!);
      if (configuration?.uid === uid && configurationRevision === revision && configuration.logo === sourceUrl) {
        configuration = { ...configuration, logo: url, logoHasWordmark: configuration.logoHasWordmark || wordmark };
        listeners.forEach(fn => fn());
      }
    } catch {
      /* Preserve original raster data URL if canvas decode fails. */
    }
  })();
}

/** Launch Brand live preview (branding/launchBrandPreview.ts): show a brand without saving it. */
export function previewPhoenixBrand(next: PhoenixConfiguration) {
  const normalizedLogo = normalizeLogoDataUrl(next.logo);
  const cached = trimmedRasterCache.get(normalizedLogo);
  configuration = {
    ...next,
    logo: cached ? cached.url : normalizedLogo,
    logoHasWordmark: next.logoHasWordmark || Boolean(cached?.wordmark),
    pages: next.pages ?? {},
  };
  configurationRevision = "launch-brand-preview";
  listeners.forEach(fn => fn());
  if (!cached) scheduleBrowserRasterTrim(next.uid, "launch-brand-preview", normalizedLogo);
}
export function restorePhoenixBrand(next: PhoenixConfiguration) {
  configuration = next;
  configurationRevision = `inherited:${next.uid}`;
  listeners.forEach(fn => fn());
}
export function clearPhoenixBrand() { configuration = null; configurationRevision = ""; listeners.forEach(fn => fn()); }
export function getPhoenixBrand() { return configuration; }
export function usePhoenixBrand() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => configuration);
}
export async function loadPhoenixBrand(uid: string, sourceUid: string, tenantId: string, email: string) {
  const current = (await getDoc(doc(db, 'users', uid, 'brandEngine', 'current'))).data();
  if (current?.status !== 'prepared' || current.sourceUid !== sourceUid || current.tenantId !== tenantId) throw new Error('لم يكتمل تجهيز منصتك. أعد المحاولة من Phoenix.');
  const revision = JSON.stringify([uid, sourceUid, tenantId, current.snapshotId, current.sourceRevision]);
  const root = doc(db, 'users', uid, 'brandEngineSnapshots', current.snapshotId);
  const [pageDocs, assetDocs] = await Promise.all([getDocs(collection(root, 'pages')), getDocs(collection(root, 'assets'))]);
  const pages = Object.fromEntries(pageDocs.docs.map(page => [page.id, page.data()])) as PhoenixConfiguration['pages'];
  if (!Array.isArray(current.pageIds) || current.pageIds.some((id: string) => !pages[id] || pages[id].revision !== current.sourceRevision)) throw new Error('Your saved configuration is incomplete.');
  const assets = Object.fromEntries(assetDocs.docs.map(asset => [asset.id, asset.data()]));
  const brand = { ...current.brand, tagline: pages.branding?.parameters.tagline || current.brand.tagline || '' } as PhoenixBrand;
  const asset = assets[brand.logoAssetId || ''];
  let logo = asset?.encoding === 'chunked-data-url-v1'
    ? Array.from({ length: asset.chunkCount }, (_, index) => assets[`${brand.logoAssetId}-part-${index}`]?.dataUrl || '').join('')
    : asset?.dataUrl || '';
  if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo)) logo = '';
  // Phoenix previews generated logos as vectors. Reuse the persisted vector
  // instead of shrinking a wide PNG into an icon or regenerating the mark.
  if (asset?.origin === 'generated_logo' && typeof asset.svg === 'string' && /^\s*<svg[\s>]/.test(asset.svg)) {
    logo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tightenBrandLogoSvg(asset.svg))}`;
  }
  if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
  const cachedRaster = trimmedRasterCache.get(logo);
  const finalLogo = cachedRaster ? cachedRaster.url : logo;
  configurationRevision = revision;
  configuration = {
    uid,
    brand,
    logo: finalLogo,
    logoHasWordmark: asset?.origin === 'generated_logo' || Number(asset?.width) > Number(asset?.height) * 1.5 || Boolean(cachedRaster?.wordmark),
    pages,
  };
  saveSetup(email, { onboarding_completed: true, step: 5, name: brand.name, description: brand.description, industry: brand.business, logo: finalLogo.length < 200000 ? finalLogo : '', color: brand.theme?.light.primary || '#7546f5', language: brand.language });
  listeners.forEach(fn => fn());
  if (!cachedRaster) scheduleBrowserRasterTrim(uid, revision, logo);
  return configuration;
}
