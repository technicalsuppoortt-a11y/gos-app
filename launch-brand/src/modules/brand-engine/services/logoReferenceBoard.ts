import type { BrandIdentity } from "../data/types";
import { createLogoTemplateIdentities } from "../data/logoTemplates.ts";
import { createBrandLogoSvg, prepareBrandLogoSvg, logoDataUrl } from "./brandLogo.ts";

type ReferenceBrief = {
  name: string;
  theme: { light: { primary: string }; typography: { heading: string; arabic: string } };
};

export function logoReferenceIdentities(brief: ReferenceBrief): BrandIdentity[] {
  const arabic = /\p{Script=Arabic}/u.test(brief.name);
  const font = arabic ? brief.theme.typography.arabic : brief.theme.typography.heading;
  return createLogoTemplateIdentities({ id: "reference", name: brief.name, tagline: "", typography: font,
    palette: "reference", mark: "prism", vibe: "REFERENCE" }, false, font);
}

export function createLogoReferenceBoardSvg(brief: ReferenceBrief) {
  const identities = logoReferenceIdentities(brief);
  const cells = identities.map((identity, i) => {
    const x = (i % 2) * 640;
    const y = 52 + Math.floor(i / 2) * 234;
    const logo = createBrandLogoSvg(identity, brief.theme.light.primary)
      .replace('width="1200" height="400"', `x="${x + 24}" y="${y + 16}" width="590" height="197"`);
    return `<rect x="${x + 14}" y="${y}" width="612" height="220" rx="12" fill="white" stroke="#DFE7E7"/>${logo}<text x="${x + 32}" y="${y + 205}" font-family="sans-serif" font-size="16" fill="#667777">${identity.vibe}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1000" viewBox="0 0 1280 1000"><rect width="1280" height="1000" fill="white"/><text x="28" y="34" font-family="sans-serif" font-size="24" font-weight="600" fill="#223333">Original logo construction references - create new designs, do not copy</text>${cells}</svg>`;
}

// A real visual input, generated locally from our own vector library. No remote
// image fetch, external logo-maker account, additional inference or API key.
export async function createLogoReferenceParts(brief: ReferenceBrief) {
  if (typeof document === "undefined") return [];
  // Embed the same selected font used by the result cards and final exports.
  await prepareBrandLogoSvg(logoReferenceIdentities(brief)[0]!, brief.theme.light.primary);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Logo reference board could not be prepared.");
  const image = new Image();
  image.src = logoDataUrl(createLogoReferenceBoardSvg(brief));
  await image.decode();
  ctx.drawImage(image, 0, 0);
  const data = canvas.toDataURL("image/png").split(",")[1]!;
  return [
    { text: "This board shows our own ready-made logos with the current brand name and palette. Match the optical balance and clean vector finish. These are reference examples, not the requested outputs. The user's detailed composition requests and exclusions override every sample: for name-only requests ignore all symbols and vary lettering only. Otherwise invent ONE new resolved silhouette, distinct from these templates and previousSuggestions, with the name beside the symbol. Honor user requirements over any sample." },
    { inlineData: { mimeType: "image/png", data } },
  ];
}
