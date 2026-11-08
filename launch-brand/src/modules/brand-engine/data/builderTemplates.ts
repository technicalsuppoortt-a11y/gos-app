import saasBackground from "@/modules/brand-engine/assets/builder-saas-bg.jpg";
import commerceBackground from "@/modules/brand-engine/assets/builder-commerce-bg.jpg";
import agencyBackground from "@/modules/brand-engine/assets/builder-agency-bg.jpg";
import creatorBackground from "@/modules/brand-engine/assets/builder-creator-bg.jpg";
import type { BuilderBlock, BuilderBlockType, BuilderTemplate } from "./types";

const base = (
  id: string,
  type: BuilderBlockType,
  label: string,
  title: string,
  body: string,
  extra: Partial<BuilderBlock> = {},
): BuilderBlock => ({
  id,
  type,
  label,
  title,
  body,
  visible: true,
  fontFamily: "Manrope",
  fontWeight: 700,
  fontSize: type === "hero" ? 56 : type === "heading" ? 40 : 30,
  lineHeight: 1.1,
  align: "left",
  textTone: "default",
  background: "light",
  padding: type === "hero" ? 80 : 56,
  margin: 0,
  columns: 3,
  contentWidth: 1120,
  radius: 0,
  buttonStyle: "primary",
  variant: "default",
  ...extra,
});

const header = (id: string, name: string, dark = false) =>
  base(`${id}-header`, "header", "Navigation", name, "Product, Solutions, Stories", {
    ctaLabel: "Get started",
    ctaLink: "#start",
    padding: 22,
    background: dark ? "dark" : "light",
  });

const saas: BuilderBlock[] = [
  header("saas", "NOVA/OS", true),
  base(
    "saas-hero",
    "hero",
    "SaaS hero",
    "One operating system for your fastest ideas.",
    "Plan, ship, and understand every release from one intelligent workspace.",
    {
      eyebrow: "THE AI-NATIVE PRODUCT CLOUD",
      ctaLabel: "Start building free",
      background: "dark",
      mediaUrl: saasBackground,
      variant: "saas-dashboard",
      padding: 92,
    },
  ),
  base(
    "saas-features",
    "features",
    "Product grid",
    "Everything your team needs to accelerate.",
    "Realtime insights|See momentum before the standup.\nAI workflows|Automate work without losing control.\nOne source of truth|Connect roadmap, data, and decisions.\nEnterprise ready|Security that scales with you.",
    { variant: "feature-grid", background: "dark", columns: 4 },
  ),
  base(
    "saas-pricing",
    "pricing",
    "Tier comparison",
    "Simple plans. Serious momentum.",
    "Starter|$0|Core workspace · 3 projects\nScale|$49|AI workflows · Unlimited projects\nEnterprise|Custom|SSO · Advanced controls",
    { variant: "pricing-table", background: "gradient", align: "center" },
  ),
  base(
    "saas-cta",
    "cta",
    "Launch CTA",
    "Ready to move at signal speed?",
    "Bring your roadmap and your team. Nova handles the rest.",
    { ctaLabel: "Launch your workspace", background: "accent", align: "center" },
  ),
];

const commerce: BuilderBlock[] = [
  header("commerce", "FORM / ONE"),
  base(
    "commerce-hero",
    "hero",
    "Product campaign",
    "Sound, distilled.",
    "Studio-grade listening engineered for focused work and everything after.",
    {
      eyebrow: "FORM 01 · NEW RELEASE",
      ctaLabel: "Shop the collection",
      mediaUrl: commerceBackground,
      variant: "product-hero",
      padding: 96,
    },
  ),
  base(
    "commerce-grid",
    "grid",
    "Product showcase",
    "Designed around how you live.",
    "FORM 01 Headphones|Immersive spatial sound · $349\nPocket Buds|Small profile, expansive sound · $129\nTransit Case|Protective wool shell · $59\nDesk Dock|Charge beautifully · $89",
    { variant: "product-grid", columns: 4 },
  ),
  base(
    "commerce-offer",
    "cta",
    "Offer banner",
    "A quieter kind of launch offer.",
    "Save 20% when you build your complete listening set this week.",
    { ctaLabel: "Build your set", background: "accent", variant: "offer-banner", align: "center" },
  ),
  base(
    "commerce-reviews",
    "testimonial",
    "Customer reviews",
    "Loved by listeners, not algorithms.",
    "“A rare product that feels considered from packaging to playback.”|Maya R.\n“Comfortable enough for a full creative day.”|Jon Bell\n“The soundstage is genuinely remarkable.”|Ari Chen",
    { variant: "review-grid", columns: 3 },
  ),
  base("commerce-footer", "footer", "Store footer", "FORM / ONE", "Objects for clearer days.", {
    ctaLabel: "Instagram",
    background: "dark",
  }),
];

const agency: BuilderBlock[] = [
  header("agency", "FIELDWORK"),
  base(
    "agency-hero",
    "hero",
    "Editorial hero",
    "We make ambitious brands impossible to ignore.",
    "Strategy, identity, and digital experiences for organizations shaping what comes next.",
    {
      eyebrow: "INDEPENDENT CREATIVE STUDIO · LONDON / CAIRO",
      ctaLabel: "View selected work",
      mediaUrl: agencyBackground,
      variant: "agency-hero",
      padding: 88,
    },
  ),
  base(
    "agency-gallery",
    "grid",
    "Portfolio gallery",
    "Selected transformations.",
    "Morrow Health|Brand system\nCivic Form|Digital flagship\nAster House|Launch campaign\nGood Measure|Editorial platform",
    { variant: "portfolio-gallery", columns: 2 },
  ),
  base(
    "agency-services",
    "features",
    "Service accordion",
    "Built for defining moments.",
    "01 · Brand strategy|Positioning, architecture, and voice.\n02 · Identity systems|Design systems made to scale.\n03 · Digital experiences|Useful, expressive product ecosystems.",
    { variant: "service-accordion", background: "gradient" },
  ),
  base(
    "agency-contact",
    "cta",
    "Contact form",
    "Bring us the complicated brief.",
    "Tell us what is changing, where you are stuck, and what success needs to feel like.",
    { ctaLabel: "Send project brief", variant: "contact-form", background: "dark" },
  ),
];

const creator: BuilderBlock[] = [
  header("creator", "MADE BY MINA", true),
  base(
    "creator-hero",
    "hero",
    "Creator hero",
    "Make work people remember.",
    "Weekly field notes, honest conversations, and practical systems for a more creative life.",
    {
      eyebrow: "CREATOR · HOST · CREATIVE OPERATOR",
      ctaLabel: "Watch the latest",
      mediaUrl: creatorBackground,
      variant: "creator-hero",
      background: "dark",
      padding: 88,
    },
  ),
  base(
    "creator-video",
    "video",
    "Featured video",
    "The courage to publish before you feel ready",
    "Episode 48 · 24 minutes",
    { variant: "video-feature", background: "gradient", mediaUrl: creatorBackground },
  ),
  base(
    "creator-links",
    "cards",
    "Podcast links",
    "Listen wherever you are.",
    "Spotify|New episodes every Tuesday\nApple Podcasts|Join 80k weekly listeners\nYouTube|Watch the full studio cut",
    { variant: "podcast-links", columns: 3 },
  ),
  base(
    "creator-newsletter",
    "cta",
    "Newsletter form",
    "One useful idea every Friday.",
    "No content treadmill. Just thoughtful notes worth saving.",
    {
      ctaLabel: "Join 42,000 readers",
      variant: "newsletter",
      background: "accent",
      align: "center",
    },
  ),
];

export const builderTemplates: BuilderTemplate[] = [
  {
    id: "saas-launch",
    name: "SaaS Launch",
    category: "SaaS",
    description: "Dark product launch with dashboard, feature grid, and pricing tiers.",
    theme: "Dark",
    accent: "Cyan",
    tags: ["SaaS", "Dark", "Dashboard", "Pricing"],
    blocks: saas,
  },
  {
    id: "storefront",
    name: "E-Commerce Storefront",
    category: "E-commerce",
    description: "Editorial product campaign with collection grid, offer, and reviews.",
    theme: "Light",
    accent: "Coral",
    tags: ["E-commerce", "Light", "Products", "Reviews"],
    blocks: commerce,
  },
  {
    id: "agency-studio",
    name: "Modern Agency Studio",
    category: "Agency",
    description: "Editorial portfolio with gallery, services, and direct inquiry form.",
    theme: "Light",
    accent: "Emerald",
    tags: ["Agency", "Portfolio", "Editorial", "Contact"],
    blocks: agency,
  },
  {
    id: "creator-hub",
    name: "Creator Hub",
    category: "Creator",
    description: "Vibrant media home with video, podcast links, and newsletter capture.",
    theme: "Dark",
    accent: "Coral",
    tags: ["Creator", "Video", "Podcast", "Newsletter"],
    blocks: creator,
  },
];

export const templateMedia: Record<string, string> = {
  "saas-launch": saasBackground,
  storefront: commerceBackground,
  "agency-studio": agencyBackground,
  "creator-hub": creatorBackground,
};

export const elementPresets: Array<{ type: BuilderBlockType; label: string; description: string }> =
  [
    { type: "heading", label: "Heading", description: "Large section title" },
    { type: "text", label: "Paragraph", description: "Body copy block" },
    { type: "image", label: "Image", description: "Responsive media frame" },
    { type: "video", label: "Video", description: "Video feature section" },
    { type: "button", label: "Button", description: "Call-to-action control" },
    { type: "badge", label: "Badge", description: "Compact label" },
    { type: "cards", label: "Cards", description: "Feature card group" },
    { type: "grid", label: "Grid", description: "Responsive columns" },
    { type: "html", label: "Custom HTML", description: "Safe code placeholder" },
  ];

export const createElementBlock = (type: BuilderBlockType): BuilderBlock =>
  base(
    `block-${type}-${Date.now()}`,
    type,
    elementPresets.find((item) => item.type === type)?.label ?? "Block",
    type === "button"
      ? "Get started"
      : type === "badge"
        ? "NEW RELEASE"
        : type === "image"
          ? "Editorial image"
          : type === "video"
            ? "Product story"
            : type === "html"
              ? "Custom embed"
              : "Your new section",
    type === "cards"
      ? "Strategy|Focused direction\nDesign|Distinctive systems\nGrowth|Measurable momentum"
      : "Click any text on the canvas to edit it directly.",
    {
      ...(type === "button" ? { ctaLabel: "Get started" } : {}),
      padding: 36,
      fontSize: type === "text" ? 18 : 32,
    },
  );
