/** Shared by the stylesheet build and captured inline/SVG artwork. */
export function brandVariableRole(property: string): string | undefined {
  if (!property.startsWith("--")) return undefined;
  if (/(?:^|-)header(?:-background)?$/.test(property)) return "header-background";
  if (/(?:^|-)footer(?:-background)?$/.test(property)) return "footer-background";
  if (/(?:^|-)(?:canvas|bg|background)$/.test(property)) return "background";
  if (/(?:^|-)(?:panel|surface)$/.test(property)) return "surface";
  if (/(?:^|-)(?:line|border)$/.test(property)) return "border";
  if (/(?:^|-)(?:muted|muted-text)$/.test(property)) return "muted-text";
  if (/(?:^|-)(?:ink|text)$/.test(property)) return "text";
  if (/(?:^|-)(?:accent|brand|primary|purple|purple-dark|violet|indigo)$/.test(property)) return "primary";
  if (/(?:^|-)green$/.test(property)) return "success";
  if (/(?:^|-)soft$/.test(property)) return "soft";
  return undefined;
}

function themedColor(color: string, property: string): string {
  let digits: string;
  if (color.startsWith("#")) {
    digits = color.slice(1);
    if (digits.length <= 4) digits = [...digits].map((c) => c + c).join("");
  } else if (/^rgba?\(/i.test(color)) {
    const parts = color.match(/[\d.]+%?/g) ?? [];
    if (parts.length < 3) return color;
    digits = parts.slice(0, 3).map((part) => Math.round(Math.min(255,
      parseFloat(part) * (part.endsWith("%") ? 2.55 : 1),
    )).toString(16).padStart(2, "0")).join("");
    if (parts[3]) digits += Math.round(Math.min(1,
      parseFloat(parts[3]) / (parts[3].endsWith("%") ? 100 : 1),
    ) * 255).toString(16).padStart(2, "0");
  } else digits = color.toLowerCase() === "white" ? "ffffff" : "000000";
  const channels = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255);
  const [red, green] = channels as [number, number, number];
  const max = Math.max(...channels), min = Math.min(...channels), delta = max - min;
  const saturation = max ? delta / max : 0;
  const hue = (delta === 0 ? 0 : max === red ? ((green - channels[2]!) / delta + 6) % 6
    : max === green ? (channels[2]! - red) / delta + 2 : (red - green) / delta + 4) * 60;
  let replacement: string | undefined;
  // Violet is the captured dashboard's brand accent, including chart artwork.
  // Channel identities and success/warning/error colors retain their meaning.
  if (hue >= 235 && hue <= 290 && saturation > .2 && max > .2) {
    replacement = saturation < .35
      ? `color-mix(in srgb, var(--gp-primary) ${Math.round(saturation * 100)}%, var(--gp-surface))`
      : `var(--gp-primary, ${color})`;
  } else if (saturation < .35 || max < .3) {
    if (/border|outline/.test(property)) replacement = `var(--gp-border, ${color})`;
    else if (/background|gradient/.test(property)) replacement = max > .98 || max < .3
      ? `var(--gp-surface, ${color})` : `var(--gp-background, ${color})`;
    else if (/^(?:color|fill|stroke|stop-color)$/.test(property) && max < .92) replacement = max < .5
      ? `var(--gp-text, ${color})` : `var(--gp-muted-text, ${color})`;
  }
  if (!replacement) return color;
  const variableAlpha = color.match(/\/\s*(var\(--[\w-]+(?:,\s*[\d.]+)?\))\s*\)$/)?.[1];
  if (variableAlpha) return `color-mix(in srgb, ${replacement} calc(${variableAlpha} * 100%), transparent)`;
  const alpha = digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1;
  return alpha === 1 ? replacement : `color-mix(in srgb, ${replacement} ${Math.round(alpha * 100)}%, transparent)`;
}

export function themeColorValue(value: string, property: string): string {
  if (/url\(/i.test(value) || value.includes('var(--gp-') || property.startsWith("--gp-")) return value;
  const role = brandVariableRole(property);
  if (role) return role === "soft"
    ? "color-mix(in srgb, var(--gp-primary) 8%, var(--gp-surface))"
    : `var(--gp-${role}, ${value})`;
  return value.replace(/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b|rgba?\([\d\s.,%/]+(?:var\(--[\w-]+(?:,\s*[\d.]+)?\)\s*)?\)|(?<![\w-])(?:white|black)\b/gi,
    (color) => themedColor(color, property));
}

/** Call once when a captured page mounts; variables then update it live. */
export function bindCapturedBrandColors(root: Element): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[style], [fill], [stroke], [stop-color]"));
  if (root.matches('[style], [fill], [stroke], [stop-color]')) elements.unshift(root as HTMLElement | SVGElement);
  elements.forEach((element) => {
    // Template artwork is its own design, independent of the dashboard brand.
    if (element.closest(".aw-thumbnail,.aw-live-preview,.pf-page,.pf-renderer,.pf-canvas,.bk-public,.bk-preview-frame,.landing-page,.product-live-preview")) return;
    for (const property of Array.from(element.style)) {
      if (!property.startsWith("--") && !/^(?:color|background(?:-color)?|border(?:-[\w-]+)?|outline(?:-color)?|fill|stroke|stop-color|box-shadow)$/.test(property)) continue;
      const value = element.style.getPropertyValue(property);
      const themed = themeColorValue(value, property);
      if (themed !== value) element.style.setProperty(property, themed, element.style.getPropertyPriority(property));
    }
    for (const property of ["fill", "stroke", "stop-color"]) {
      const value = element.getAttribute(property);
      if (value) {
        const themed = themeColorValue(value, property);
        if (themed !== value) element.setAttribute(property, themed);
      }
    }
  });
}
