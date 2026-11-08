import type { BrandIdentity, BrandVectorLogo } from "./types";

// Original, bundled vector artwork. These are ready-made templates, not AI results.
// Coordinates share the export renderer's 180-unit mark space.
export const logoTemplates = [
  { id: "geometric", label: "Facet", labelAr: "الأوجه", mark: "prism", concept: "An architectural folded facet with a precise open center.", paths: [
    "M0 -84L74 -42V42L0 84L-74 42V-42ZM0 -53L-47 -26V26L0 53L47 26V-26Z",
    "M-12 -69H12V-23L48 -2L36 19L0 -2L-36 19L-48 -2L-12 -23Z",
  ] },
  { id: "fluid", label: "Ribbon", labelAr: "الشريط", mark: "flow", concept: "Two folded ribbon strokes form a confident forward-moving signature.", paths: [
    "M-78 58L-16 -66H18L-44 58ZM-20 58L42 -66H76L14 58Z",
    "M-44 58L-28 26H30L14 58Z",
  ] },
  { id: "editorial", label: "Arch", labelAr: "القوس", mark: "serif", concept: "A sculpted architectural arch balances heritage with a clean modern cut.", paths: [
    "M-72 72V-10C-72 -96 72 -96 72 -10V72H40V-10C40 -54 -40 -54 -40 -10V72Z",
    "M-20 14H20V72H-20Z",
  ] },
  { id: "ai-first", label: "Weave", labelAr: "الترابط", mark: "nodes", concept: "Interwoven corners suggest coordination through an unmistakable woven silhouette.", paths: [
    "M-74 -74H10V-44H-44V10H-74ZM30 -74H74V10H44V-44H30Z",
    "M74 30V74H-10V44H44V30ZM-30 74H-74V-10H-44V44H-30Z",
    "M-18 -18H18V18H-18Z",
  ] },
  { id: "template-leaf", label: "Botanical", labelAr: "النمو", mark: "flow", concept: "A restrained botanical silhouette with a broad diagonal vein cutout.", paths: [
    "M-70 68C-88 -20 -34 -78 76 -76C78 36 18 86 -70 68ZM-54 54L48 -48L60 -36L-42 66Z",
  ] },
  { id: "template-beacon", label: "Beacon", labelAr: "المنارة", mark: "burst", concept: "Four sculpted rays create a balanced beacon with a distinctive open center.", paths: [
    "M-18 -78H18L10 -24H-10ZM78 -18V18L24 10V-10ZM18 78H-18L-10 24H10ZM-78 18V-18L-24 -10V10Z",
    "M0 -12L12 0L0 12L-12 0Z",
  ] },
  { id: "template-horizon", label: "Horizon", labelAr: "الأفق", mark: "prism", concept: "A rising horizon cut through a solid arch creates a calm, grounded emblem.", paths: [
    "M-80 24C-80 -76 80 -76 80 24H48C48 -32 -48 -32 -48 24Z",
    "M-80 42H80V68H-80Z",
  ] },
  { id: "template-crest", label: "Crest", labelAr: "الدرع", mark: "bilingual", concept: "A tailored shield with a central open chevron for a composed, established identity.", paths: [
    "M-70 -72H70V10C70 42 34 68 0 84C-34 68 -70 42 -70 10ZM-40 -42V8C-40 24 -18 42 0 52C18 42 40 24 40 8V-42Z",
    "M-26 -18L0 8L26 -18V8L0 34L-26 8Z",
  ] },
] as const;

export function createLogoTemplateIdentities(identity: BrandIdentity, arabic = false, font?: string): BrandIdentity[] {
  return logoTemplates.map(template => ({
    ...identity,
    id: template.id,
    mark: template.mark,
    vibe: arabic ? template.labelAr : template.label,
    logo: {
      concept: template.concept,
      paths: template.paths.map(d => ({ d, fill: true, strokeWidth: 0 })),
      wordmark: {
        font: font || (/\p{Script=Arabic}/u.test(identity.name) ? "Cairo" : "Manrope"),
        weight: template.id === "editorial" ? 500 : 700,
        letterSpacing: 0, casing: "original", separator: false, descriptor: "",
      },
    } satisfies BrandVectorLogo,
  }));
}
