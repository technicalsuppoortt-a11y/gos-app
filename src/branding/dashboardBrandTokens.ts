export type DashboardBrandMode = 'light' | 'dark';

export interface ResolvedDashboardBrandTokens {
  actionBg: string;
  actionHover: string;
  onAction: string;
  actionGradient: string;
  buttonBackground: string;
  onPrimary: string;
  onBrand: string;
  accentText: string;
  soft: string;
  hover: string;
  headerText: string;
  footerText: string;
}

type Rgb = [number, number, number];

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function parseBrandColorRgb(input: string | undefined | null): Rgb | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'white') return [255, 255, 255];
  if (trimmed.toLowerCase() === 'black') return [0, 0, 0];

  if (trimmed.startsWith('#')) {
    const raw = trimmed.slice(1);
    if (raw.length === 3 || raw.length === 4) {
      return [
        parseInt(raw[0]! + raw[0]!, 16),
        parseInt(raw[1]! + raw[1]!, 16),
        parseInt(raw[2]! + raw[2]!, 16),
      ];
    }
    if (raw.length === 6 || raw.length === 8) {
      return [
        parseInt(raw.slice(0, 2), 16),
        parseInt(raw.slice(2, 4), 16),
        parseInt(raw.slice(4, 6), 16),
      ];
    }
    return null;
  }

  if (/^rgba?\(/i.test(trimmed)) {
    const parts = trimmed.match(/[\d.]+%?/g);
    if (!parts || parts.length < 3) return null;
    return [0, 1, 2].map(index => {
      const token = parts[index]!;
      const numeric = parseFloat(token);
      return clampChannel(token.endsWith('%') ? numeric * 2.55 : numeric);
    }) as Rgb;
  }

  const mixMatch = trimmed.match(/^color-mix\(\s*in\s+srgb\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/i);
  if (mixMatch) {
    const parseStop = (segment: string): { rgb: Rgb; weight?: number } | null => {
      const pctMatch = segment.trim().match(/^(.*?)\s+([\d.]+)%\s*$/);
      const colorPart = pctMatch ? pctMatch[1]!.trim() : segment.trim();
      const rgb = parseBrandColorRgb(colorPart);
      if (!rgb) return null;
      return { rgb, weight: pctMatch ? Math.max(0, Math.min(100, parseFloat(pctMatch[2]!))) / 100 : undefined };
    };
    const left = parseStop(mixMatch[1]!);
    const right = parseStop(mixMatch[2]!);
    if (!left || !right) return null;
    const w1 = left.weight !== undefined ? left.weight : right.weight !== undefined ? 1 - right.weight : 0.5;
    const w2 = right.weight !== undefined ? right.weight : 1 - w1;
    const sum = w1 + w2 || 1;
    return [
      clampChannel((left.rgb[0] * w1 + right.rgb[0] * w2) / sum),
      clampChannel((left.rgb[1] * w1 + right.rgb[1] * w2) / sum),
      clampChannel((left.rgb[2] * w1 + right.rgb[2] * w2) / sum),
    ];
  }

  return null;
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map(channel => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function relativeLuminance([r, g, b]: Rgb): number {
  const linear = [r, g, b].map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

export function brandContrastRatio(a: string, b: string): number {
  const leftRgb = parseBrandColorRgb(a);
  const rightRgb = parseBrandColorRgb(b);
  if (!leftRgb || !rightRgb) return 0;
  const left = relativeLuminance(leftRgb);
  const right = relativeLuminance(rightRgb);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

export function readableSurfaceForeground(color: string): '#11152D' | '#FFFFFF' {
  return brandContrastRatio(color, '#11152D') > brandContrastRatio(color, '#FFFFFF') ? '#11152D' : '#FFFFFF';
}

function mixRgb(a: Rgb, b: Rgb, amountOfA: number): Rgb {
  const t = Math.max(0, Math.min(1, amountOfA));
  return [
    clampChannel(a[0] * t + b[0] * (1 - t)),
    clampChannel(a[1] * t + b[1] * (1 - t)),
    clampChannel(a[2] * t + b[2] * (1 - t)),
  ];
}

function scaleRgb([r, g, b]: Rgb, factor: number): Rgb {
  return [clampChannel(r * factor), clampChannel(g * factor), clampChannel(b * factor)];
}

function hsvStats([r, g, b]: Rgb): { hue: number; saturation: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const saturation = max === 0 ? 0 : delta / max;
  const hue =
    delta === 0
      ? 0
      : ((max === rn ? ((gn - bn) / delta + 6) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4) * 60);
  return { hue, saturation };
}

function darkenPreservingHue(rgb: Rgb, minContrastWithWhite = 4.58): string {
  const currentHex = rgbToHex(rgb);
  if (brandContrastRatio(currentHex, '#FFFFFF') >= minContrastWithWhite) return currentHex;
  let low = 0.05;
  let high = 1;
  let best = scaleRgb(rgb, low);
  for (let step = 0; step < 22; step++) {
    const mid = (low + high) / 2;
    const candidate = scaleRgb(rgb, mid);
    if (brandContrastRatio(rgbToHex(candidate), '#FFFFFF') >= minContrastWithWhite) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }
  return rgbToHex(best);
}

function lightenForDarkSurface(rgb: Rgb, surfaceHex: string): Rgb {
  const { saturation } = hsvStats(rgb);
  if (saturation < 0.14) {
    return [226, 232, 240]; // #E2E8F0 crisp architectural silver on dark surfaces
  }
  const maxChannel = Math.max(rgb[0], rgb[1], rgb[2], 1);
  const maxScale = 245 / maxChannel;
  const vivid = scaleRgb(rgb, maxScale);
  const targetLum = 0.16;

  if (relativeLuminance(vivid) >= targetLum) {
    let low = 1;
    let high = maxScale;
    let best = vivid;
    for (let step = 0; step < 20; step++) {
      const mid = (low + high) / 2;
      const candidate = scaleRgb(rgb, mid);
      if (relativeLuminance(candidate) >= targetLum) {
        best = candidate;
        high = mid;
      } else {
        low = mid;
      }
    }
    if (brandContrastRatio(rgbToHex(best), surfaceHex) >= 2.35) return best;
  }

  const white: Rgb = [255, 255, 255];
  let low = 0;
  let high = 1;
  let best = mixRgb(white, vivid, 0.35);
  for (let step = 0; step < 20; step++) {
    const mid = (low + high) / 2;
    const candidate = mixRgb(white, vivid, mid);
    if (relativeLuminance(candidate) >= targetLum && brandContrastRatio(rgbToHex(candidate), surfaceHex) >= 2.45) {
      best = candidate;
      high = mid;
    } else {
      low = mid;
    }
  }
  return best;
}

function resolveActionPair(
  rawCandidate: string,
  rawSecondary: string | undefined,
  surfaceHex: string,
  mode: DashboardBrandMode,
): { actionBg: string; onAction: '#FFFFFF' | '#11152D' } {
  let rgb = parseBrandColorRgb(rawCandidate) ?? (mode === 'dark' ? ([167, 139, 250] as Rgb) : ([124, 58, 237] as Rgb));
  let hex = rgbToHex(rgb);

  if (mode === 'light' && brandContrastRatio(hex, surfaceHex) < 1.85) {
    const secondaryRgb = parseBrandColorRgb(rawSecondary);
    if (secondaryRgb && brandContrastRatio(rgbToHex(secondaryRgb), surfaceHex) >= 2.5) {
      rgb = secondaryRgb;
    } else {
      rgb = [30, 41, 59]; // #1E293B
    }
    hex = rgbToHex(rgb);
  } else if (mode === 'dark' && brandContrastRatio(hex, surfaceHex) < 2.35) {
    rgb = lightenForDarkSurface(rgb, surfaceHex);
    hex = rgbToHex(rgb);
  }

  const { hue, saturation } = hsvStats(rgb);
  const isVividRed = (hue <= 24 || hue >= 336) && saturation >= 0.42;

  if (mode === 'light' || isVividRed) {
    const safeHex = darkenPreservingHue(rgb, 4.58);
    return { actionBg: safeHex, onAction: '#FFFFFF' };
  }

  if (brandContrastRatio(hex, '#FFFFFF') >= 4.5) {
    return { actionBg: hex, onAction: '#FFFFFF' };
  }
  if (brandContrastRatio(hex, '#11152D') >= 4.5) {
    return { actionBg: hex, onAction: '#11152D' };
  }
  const safeHex = darkenPreservingHue(rgb, 4.58);
  return { actionBg: safeHex, onAction: '#FFFFFF' };
}

function resolveAccentText(
  rawPrimary: string,
  rawSecondary: string | undefined,
  surfaceHex: string,
  backgroundHex: string,
  mode: DashboardBrandMode,
): string {
  let rgb = parseBrandColorRgb(rawPrimary) ?? (mode === 'dark' ? ([196, 181, 253] as Rgb) : ([109, 40, 217] as Rgb));
  let hex = rgbToHex(rgb);

  if (mode === 'light' && brandContrastRatio(hex, surfaceHex) < 1.45) {
    rgb = parseBrandColorRgb(rawSecondary) ?? ([51, 65, 85] as Rgb);
    hex = rgbToHex(rgb);
  }

  const minBgContrast = (candidate: string) =>
    Math.min(brandContrastRatio(candidate, surfaceHex), brandContrastRatio(candidate, backgroundHex));

  if (minBgContrast(hex) >= 4.55) return hex;

  if (mode === 'light') {
    let low = 0.08;
    let high = 1;
    let best = scaleRgb(rgb, low);
    for (let step = 0; step < 22; step++) {
      const mid = (low + high) / 2;
      const candidate = scaleRgb(rgb, mid);
      if (minBgContrast(rgbToHex(candidate)) >= 4.6) {
        best = candidate;
        low = mid;
      } else {
        high = mid;
      }
    }
    const scaledHex = rgbToHex(best);
    if (minBgContrast(scaledHex) >= 4.55) return scaledHex;
    return '#1E293B';
  }

  // Dark mode: lift primary while preserving hue, then blend toward white if needed.
  const maxChannel = Math.max(rgb[0], rgb[1], rgb[2], 1);
  const vivid = scaleRgb(rgb, Math.min(3.5, 248 / maxChannel));
  const vividHex = rgbToHex(vivid);
  if (minBgContrast(vividHex) >= 4.55) return vividHex;

  const white: Rgb = [255, 255, 255];
  let low = 0;
  let high = 1;
  let best = white;
  for (let step = 0; step < 22; step++) {
    const mid = (low + high) / 2;
    const candidate = mixRgb(white, vivid, mid);
    if (minBgContrast(rgbToHex(candidate)) >= 4.6) {
      best = candidate;
      high = mid;
    } else {
      low = mid;
    }
  }
  return rgbToHex(best);
}

/**
 * Normalizes theme mode surfaces so Launch Brand themes (including previously deployed
 * snapshots) maintain crisp dark/light surface hierarchy and readable text/borders.
 */
export function normalizeDashboardModeColors(
  colors: Record<string, string> | undefined,
  mode: DashboardBrandMode,
  lightPrimary?: string,
): Record<string, string> {
  const next: Record<string, string> = { ...(colors ?? {}) };
  if (mode === 'light') {
    if (!parseBrandColorRgb(next.background)) next.background = '#F8FAFC';
    if (!parseBrandColorRgb(next.surface)) next.surface = '#FFFFFF';
    if (!parseBrandColorRgb(next.headerBackground)) next.headerBackground = next.surface;
    if (!parseBrandColorRgb(next.footerBackground)) next.footerBackground = next.background;
    if (!parseBrandColorRgb(next.text) || brandContrastRatio(next.text, next.surface) < 7) next.text = '#0F172A';
    if (!parseBrandColorRgb(next.mutedText) || brandContrastRatio(next.mutedText, next.surface) < 4.5) {
      next.mutedText = '#475569';
    }
    if (!parseBrandColorRgb(next.border)) next.border = '#E2E8F0';
    return next;
  }

  const hueSeed =
    parseBrandColorRgb(lightPrimary) ??
    parseBrandColorRgb(next.primary) ??
    ([99, 91, 255] as Rgb);

  let bgRgb = parseBrandColorRgb(next.background);
  if (!bgRgb || relativeLuminance(bgRgb) > 0.08) {
    bgRgb = mixRgb(hueSeed, [11, 16, 32], 0.12);
    next.background = rgbToHex(bgRgb);
  }
  const bgHex = rgbToHex(bgRgb);

  let surfRgb = parseBrandColorRgb(next.surface);
  if (
    !surfRgb ||
    relativeLuminance(surfRgb) > 0.12 ||
    relativeLuminance(surfRgb) < relativeLuminance(bgRgb) ||
    brandContrastRatio(rgbToHex(surfRgb), bgHex) < 1.04
  ) {
    surfRgb = mixRgb(hueSeed, [21, 28, 47], 0.14);
    next.surface = rgbToHex(surfRgb);
  }
  const surfHex = rgbToHex(surfRgb);

  const headerRgb = parseBrandColorRgb(next.headerBackground);
  if (!headerRgb || relativeLuminance(headerRgb) > 0.12) {
    next.headerBackground = surfHex;
  }

  const footerRgb = parseBrandColorRgb(next.footerBackground);
  if (!footerRgb || relativeLuminance(footerRgb) > 0.10) {
    next.footerBackground = rgbToHex(mixRgb(hueSeed, [8, 12, 24], 0.10));
  }

  const textRgb = parseBrandColorRgb(next.text);
  if (!textRgb || brandContrastRatio(rgbToHex(textRgb), surfHex) < 7) {
    next.text = '#F1F5F9';
  }

  const mutedRgb = parseBrandColorRgb(next.mutedText);
  if (!mutedRgb || brandContrastRatio(rgbToHex(mutedRgb), surfHex) < 4.5) {
    next.mutedText = '#94A3B8';
  }

  const borderRgb = parseBrandColorRgb(next.border);
  if (!borderRgb || brandContrastRatio(rgbToHex(borderRgb), surfHex) < 1.15) {
    next.border = rgbToHex(mixRgb(hueSeed, [45, 54, 76], 0.16));
  }

  return next;
}

export function resolveDashboardBrandTokens(
  colors: Record<string, string>,
  mode: DashboardBrandMode,
  options?: { isWorkspacePalette?: boolean; lightPrimary?: string },
): ResolvedDashboardBrandTokens {
  const surfaceRgb = parseBrandColorRgb(colors.surface) ?? (mode === 'dark' ? ([16, 30, 46] as Rgb) : ([255, 255, 255] as Rgb));
  const backgroundRgb = parseBrandColorRgb(colors.background) ?? (mode === 'dark' ? ([8, 19, 31] as Rgb) : ([248, 250, 252] as Rgb));
  const surfaceHex = rgbToHex(surfaceRgb);
  const backgroundHex = rgbToHex(backgroundRgb);

  const rawPrimary = colors.primary || (mode === 'dark' ? '#A78BFA' : '#7C3AED');
  const rawButtonBg = colors.buttonBackground || '#FFFFFF';
  const hasExplicitButtonBg =
    Boolean(parseBrandColorRgb(rawButtonBg)) && rawButtonBg.trim().toUpperCase() !== '#FFFFFF';

  let actionSeed = hasExplicitButtonBg ? rawButtonBg : rawPrimary;
  if (mode === 'dark' && !hasExplicitButtonBg && options?.lightPrimary) {
    const darkPrimRgb = parseBrandColorRgb(rawPrimary);
    const lightPrimRgb = parseBrandColorRgb(options.lightPrimary);
    if (
      darkPrimRgb &&
      lightPrimRgb &&
      relativeLuminance(darkPrimRgb) > 0.34 &&
      relativeLuminance(lightPrimRgb) >= 0.03 &&
      relativeLuminance(lightPrimRgb) < 0.34 &&
      hsvStats(lightPrimRgb).saturation >= 0.25
    ) {
      actionSeed = rgbToHex(mixRgb(lightPrimRgb, [255, 255, 255], 0.88));
    }
  }

  const { actionBg, onAction } = resolveActionPair(actionSeed, colors.secondary, surfaceHex, mode);

  const actionRgb = parseBrandColorRgb(actionBg) ?? ([124, 58, 237] as Rgb);
  const actionHoverRgb =
    onAction === '#FFFFFF'
      ? mixRgb(actionRgb, [0, 0, 0], 0.86)
      : mixRgb(actionRgb, [17, 21, 45], 0.88);
  const actionHover = rgbToHex(actionHoverRgb);

  const gradientEndRgb =
    onAction === '#FFFFFF'
      ? actionHoverRgb
      : mixRgb(actionRgb, [255, 255, 255], 0.92);
  const actionGradient = `linear-gradient(115deg, ${actionBg} 0%, ${rgbToHex(gradientEndRgb)} 100%)`;

  const preserveRawStudioButton = hasExplicitButtonBg && !options?.isWorkspacePalette;
  const buttonBackground = preserveRawStudioButton ? rawButtonBg : actionBg;
  const onPrimary = preserveRawStudioButton ? readableSurfaceForeground(rawButtonBg) : onAction;

  const accentText = resolveAccentText(rawPrimary, colors.secondary, surfaceHex, backgroundHex, mode);
  const onBrand = readableSurfaceForeground(rawPrimary);
  const headerText = readableSurfaceForeground(colors.headerBackground || backgroundHex);
  const footerText = readableSurfaceForeground(colors.footerBackground || backgroundHex);

  const soft =
    colors.soft ||
    `color-mix(in srgb, ${accentText} ${mode === 'dark' ? '16%' : '10%'}, ${colors.surface || surfaceHex})`;
  const hover = colors.hover || actionHover;

  return {
    actionBg,
    actionHover,
    onAction,
    actionGradient,
    buttonBackground,
    onPrimary,
    onBrand,
    accentText,
    soft,
    hover,
    headerText,
    footerText,
  };
}
