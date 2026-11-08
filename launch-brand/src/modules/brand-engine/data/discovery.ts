import type {
  BuilderBlock,
  BuilderBlockType,
  DashboardSection,
  DashboardWidgetId,
  Language,
} from "./types";

/** The editable catalog is loaded from Firestore. Full content is seeded only by the server. */
export type DiscoveryStatus = "active" | "draft" | "archived";
export type DiscoveryGoal = "booking" | "sale" | "enrollment";
export interface DiscoveryNiche {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  status: DiscoveryStatus;
  order: number;
}
export interface DiscoverySubNiche {
  id: string;
  nicheId: string;
  nameEn: string;
  nameAr: string;
  targetAudienceEn: string;
  targetAudienceAr: string;
  buyerProfileEn: string;
  buyerProfileAr: string;
  ageRange?: string;
  coreProblemsEn: string;
  coreProblemsAr: string;
  dayToDayPainEn: string;
  dayToDayPainAr: string;
  desiredOutcomeEn: string;
  desiredOutcomeAr: string;
  gosSolutionEn: string;
  gosSolutionAr: string;
  qualificationQuestionsEn: string[];
  qualificationQuestionsAr: string[];
  moduleIds: string[];
  whyEn: string;
  whyAr: string;
  goal: DiscoveryGoal;
  platformPresetId: "coaching" | "freelancer" | "business" | "creator" | "agency" | "ecommerce";
  funnelTemplateId: string;
  dashboardTemplateId: string;
  templateVersion: number;
  status: DiscoveryStatus;
  order: number;
  source?: { exactFields: string[]; editorialFields: string[] };
}
export interface DiscoveryTemplateBlock {
  id: string;
  type: BuilderBlockType;
  labelEn: string;
  labelAr: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  eyebrowEn?: string;
  eyebrowAr?: string;
  ctaLabelEn?: string;
  ctaLabelAr?: string;
  ctaLink?: string;
  variant?: BuilderBlock["variant"];
  background?: BuilderBlock["background"];
  columns?: number;
}
export interface DiscoveryFunnelTemplate {
  id: string;
  subNicheId: string;
  version: number;
  nameEn: string;
  nameAr: string;
  goal: DiscoveryGoal;
  blocks: DiscoveryTemplateBlock[];
  pages: { id: string; nameEn: string; nameAr: string; blockIds: string[] }[];
  steps: { id: string; nameEn: string; nameAr: string; purposeEn: string; purposeAr: string }[];
}
export interface DiscoveryDashboardTemplate {
  id: string;
  subNicheId: string;
  version: number;
  nameEn: string;
  nameAr: string;
  widgetIds: DashboardWidgetId[];
  moduleIds: string[];
  moduleOrder: string[];
  moduleSections: Record<string, DashboardSection>;
  pipelineStages: { id: string; nameEn: string; nameAr: string }[];
  metrics: { id: string; nameEn: string; nameAr: string }[];
}
export interface DiscoveryCatalog {
  schemaVersion: 1;
  version: string;
  niches: DiscoveryNiche[];
  subNiches: DiscoverySubNiche[];
  templates: { funnels: DiscoveryFunnelTemplate[]; dashboards: DiscoveryDashboardTemplate[] };
  source: {
    document: string;
    documentVersion: string;
    exactFields: string[];
    editorialFields: string[];
    noteEn: string;
    noteAr: string;
  };
}
export interface DiscoverySelection {
  schemaVersion: 1;
  nicheId: string;
  subNicheId: string;
  catalogVersion: string;
  nicheNameEn: string;
  nicheNameAr: string;
  subNicheNameEn: string;
  subNicheNameAr: string;
  profileSnapshot: DiscoverySubNiche;
  confirmedAt: string;
}

export const discoveryModuleIds = [
  "automation",
  "support",
  "crm",
  "mail",
  "calendar",
  "payments",
  "community",
  "assistant",
  "courses",
  "whatsapp",
  "landing",
  "analytics",
] as const;
const statuses = new Set<unknown>(["active", "draft", "archived"]);
const goals = new Set<unknown>(["booking", "sale", "enrollment"]);
const presets = new Set<unknown>([
  "coaching",
  "freelancer",
  "business",
  "creator",
  "agency",
  "ecommerce",
]);
const blockTypes = new Set<unknown>([
  "header",
  "hero",
  "features",
  "testimonial",
  "pricing",
  "cta",
  "footer",
  "heading",
  "text",
  "image",
  "video",
  "button",
  "badge",
  "cards",
  "grid",
]);
const blockVariants = new Set<unknown>([
  "default",
  "saas-dashboard",
  "feature-grid",
  "pricing-table",
  "product-hero",
  "product-grid",
  "offer-banner",
  "review-grid",
  "agency-hero",
  "portfolio-gallery",
  "service-accordion",
  "contact-form",
  "creator-hero",
  "video-feature",
  "podcast-links",
  "newsletter",
]);
const widgetIds = new Set<unknown>([
  "profile",
  "growth",
  "summary",
  "revenue",
  "audience",
  "performance",
  "actions",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const textPresent = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= 4000 &&
  [...value].every((character) => {
    const code = character.charCodeAt(0);
    return code >= 32 || code === 9 || code === 10 || code === 13;
  });
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(textPresent);
const stableId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(value);
const unique = (value: string[]) => new Set(value).size === value.length;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Validate references and required publication content; editorial quality is reviewed by an administrator. */
export function validateDiscoveryCatalog(
  value: unknown,
  { publishing = false }: { publishing?: boolean } = {},
): string[] {
  const errors: string[] = [];
  if (!isRecord(value) || value["schemaVersion"] !== 1 || !stableId(value["version"]))
    return ["Invalid catalog schema or version."];
  if (
    !Array.isArray(value["niches"]) ||
    !Array.isArray(value["subNiches"]) ||
    !isRecord(value["templates"])
  )
    return ["Catalog niches, sub-niches and templates are required."];
  const templates = value["templates"];
  if (!Array.isArray(templates["funnels"]) || !Array.isArray(templates["dashboards"]))
    return ["Funnel and dashboard template arrays are required."];
  if (
    !value["niches"].length ||
    value["niches"].length > 100 ||
    !value["subNiches"].length ||
    value["subNiches"].length > 500 ||
    templates["funnels"].length > 500 ||
    templates["dashboards"].length > 500
  )
    errors.push("Catalog entity counts exceed their allowed range.");
  if (
    !isRecord(value["source"]) ||
    !textPresent(value["source"]["document"]) ||
    !textPresent(value["source"]["documentVersion"]) ||
    !textPresent(value["source"]["noteEn"]) ||
    !textPresent(value["source"]["noteAr"]) ||
    !strings(value["source"]["exactFields"]) ||
    !strings(value["source"]["editorialFields"])
  )
    errors.push("Catalog source document, editorial notes and field provenance are required.");
  const ids = (items: unknown[], label: string) => {
    const result = new Set<string>();
    for (const item of items) {
      if (!isRecord(item) || !stableId(item["id"])) {
        errors.push(`${label}: a stable ID is required.`);
        continue;
      }
      if (result.has(item["id"])) errors.push(`${label}: duplicate ID ${item["id"]}.`);
      result.add(item["id"]);
    }
    return result;
  };
  const nicheIds = ids(value["niches"], "Niche");
  const subIds = ids(value["subNiches"], "Sub-niche");
  const funnelIds = ids(templates["funnels"], "Funnel template");
  const dashboardIds = ids(templates["dashboards"], "Dashboard template");
  const validModules = new Set<string>(discoveryModuleIds);
  for (const niche of value["niches"]) {
    if (!isRecord(niche)) continue;
    for (const key of ["nameEn", "nameAr", "descriptionEn", "descriptionAr", "icon"])
      if (!textPresent(niche[key]))
        errors.push(`Niche ${String(niche["id"])}: ${key} is required.`);
    if (
      !statuses.has(niche["status"]) ||
      !Number.isInteger(niche["order"]) ||
      Number(niche["order"]) < 0
    )
      errors.push(`Niche ${String(niche["id"])}: invalid status or order.`);
    if (
      publishing &&
      niche["status"] === "active" &&
      !value["subNiches"].some(
        (sub) => isRecord(sub) && sub["nicheId"] === niche["id"] && sub["status"] === "active",
      )
    )
      errors.push(`Active niche ${String(niche["id"])} needs an active sub-niche.`);
  }
  for (const sub of value["subNiches"]) {
    if (!isRecord(sub)) continue;
    const label = `Sub-niche ${String(sub["id"])}`;
    if (!nicheIds.has(String(sub["nicheId"])))
      errors.push(`${label}: parent niche does not exist.`);
    if (
      !statuses.has(sub["status"]) ||
      !goals.has(sub["goal"]) ||
      !presets.has(sub["platformPresetId"]) ||
      !Number.isInteger(sub["order"]) ||
      Number(sub["order"]) < 0
    )
      errors.push(`${label}: invalid status, goal, platform preset or order.`);
    for (const key of [
      "nameEn",
      "nameAr",
      "targetAudienceEn",
      "targetAudienceAr",
      "coreProblemsEn",
      "coreProblemsAr",
      "desiredOutcomeEn",
      "desiredOutcomeAr",
    ])
      if (!textPresent(sub[key])) errors.push(`${label}: ${key} is required.`);
    for (const key of [
      "buyerProfileEn",
      "buyerProfileAr",
      "dayToDayPainEn",
      "dayToDayPainAr",
      "gosSolutionEn",
      "gosSolutionAr",
      "whyEn",
      "whyAr",
    ])
      if (
        typeof sub[key] !== "string" ||
        String(sub[key]).length > 4000 ||
        (sub["status"] === "active" && !textPresent(sub[key]))
      )
        errors.push(`${label}: ${key} is required before publishing.`);
    for (const key of ["qualificationQuestionsEn", "qualificationQuestionsAr"])
      if (
        !strings(sub[key]) ||
        sub[key].length > 10 ||
        sub[key].some((question) => question.length > 1000) ||
        (sub["status"] === "active" && sub[key].length === 0)
      )
        errors.push(`${label}: ${key} must contain 1–10 bounded questions for active entries.`);
    if (
      strings(sub["qualificationQuestionsEn"]) &&
      strings(sub["qualificationQuestionsAr"]) &&
      sub["qualificationQuestionsEn"].length !== sub["qualificationQuestionsAr"].length
    )
      errors.push(`${label}: question translations must match.`);
    if (
      !strings(sub["moduleIds"]) ||
      !unique(sub["moduleIds"]) ||
      sub["moduleIds"].some((id) => !validModules.has(id))
    )
      errors.push(`${label}: module references are invalid.`);
    if (
      !Number.isInteger(sub["templateVersion"]) ||
      Number(sub["templateVersion"]) < 1 ||
      typeof sub["funnelTemplateId"] !== "string" ||
      typeof sub["dashboardTemplateId"] !== "string" ||
      (publishing &&
        sub["status"] === "active" &&
        (!funnelIds.has(String(sub["funnelTemplateId"])) ||
          !dashboardIds.has(String(sub["dashboardTemplateId"]))))
    )
      errors.push(`${label}: valid versioned funnel and dashboard references are required.`);
    if (
      sub["ageRange"] !== undefined &&
      (typeof sub["ageRange"] !== "string" || sub["ageRange"].length > 250)
    )
      errors.push(`${label}: age range must be bounded text.`);
    if (
      publishing &&
      sub["status"] === "active" &&
      !value["niches"].some(
        (niche) =>
          isRecord(niche) && niche["id"] === sub["nicheId"] && niche["status"] === "active",
      )
    )
      errors.push(`${label}: active parent niche is required.`);
  }
  for (const funnel of templates["funnels"]) {
    if (!isRecord(funnel)) continue;
    const label = `Funnel ${String(funnel["id"])}`;
    if (
      !subIds.has(String(funnel["subNicheId"])) ||
      !Number.isInteger(funnel["version"]) ||
      Number(funnel["version"]) < 1 ||
      !goals.has(funnel["goal"])
    )
      errors.push(`${label}: invalid sub-niche, version or goal.`);
    if (
      !textPresent(funnel["nameEn"]) ||
      !textPresent(funnel["nameAr"]) ||
      !Array.isArray(funnel["blocks"]) ||
      !funnel["blocks"].length ||
      !Array.isArray(funnel["pages"]) ||
      !funnel["pages"].length ||
      !Array.isArray(funnel["steps"]) ||
      !funnel["steps"].length
    ) {
      errors.push(`${label}: bilingual name, blocks, pages and steps are required.`);
      continue;
    }
    const blockIds = ids(funnel["blocks"], label);
    if (funnel["blocks"].length > 30 || funnel["pages"].length > 15 || funnel["steps"].length > 15)
      errors.push(`${label}: too many blocks, pages or steps.`);
    for (const block of funnel["blocks"]) {
      if (!isRecord(block) || !blockTypes.has(block["type"])) {
        errors.push(`${label}: invalid block type.`);
        continue;
      }
      for (const key of ["labelEn", "labelAr", "titleEn", "titleAr", "bodyEn", "bodyAr"])
        if (!textPresent(block[key]))
          errors.push(`${label}: block ${String(block["id"])} requires ${key}.`);
      if (block["variant"] !== undefined && !blockVariants.has(block["variant"]))
        errors.push(`${label}: unsupported block variant.`);
      if (
        block["background"] !== undefined &&
        !["light", "dark", "accent", "gradient"].includes(String(block["background"]))
      )
        errors.push(`${label}: invalid block background.`);
      if (
        block["columns"] !== undefined &&
        (!Number.isInteger(block["columns"]) ||
          Number(block["columns"]) < 1 ||
          Number(block["columns"]) > 6)
      )
        errors.push(`${label}: columns must be between 1 and 6.`);
      for (const key of ["eyebrowEn", "eyebrowAr", "ctaLabelEn", "ctaLabelAr"])
        if (block[key] !== undefined && (typeof block[key] !== "string" || block[key].length > 500))
          errors.push(`${label}: invalid optional ${key}.`);
      if (
        block["ctaLink"] !== undefined &&
        (typeof block["ctaLink"] !== "string" ||
          block["ctaLink"].length > 2000 ||
          !/^(?:#|\/[^/]|https:\/\/|mailto:|tel:)/.test(block["ctaLink"]))
      )
        errors.push(`${label}: unsafe CTA link.`);
    }
    ids(funnel["pages"], `${label} page`);
    ids(funnel["steps"], `${label} step`);
    for (const page of funnel["pages"])
      if (
        !isRecord(page) ||
        !stableId(page["id"]) ||
        !textPresent(page["nameEn"]) ||
        !textPresent(page["nameAr"]) ||
        !strings(page["blockIds"]) ||
        !page["blockIds"].length ||
        !unique(page["blockIds"]) ||
        page["blockIds"].some((id) => !blockIds.has(id))
      )
        errors.push(`${label}: page references are invalid.`);
    for (const step of funnel["steps"])
      if (
        !isRecord(step) ||
        ["nameEn", "nameAr", "purposeEn", "purposeAr"].some((key) => !textPresent(step[key]))
      )
        errors.push(`${label}: bilingual step name and purpose are required.`);
  }
  for (const dashboard of templates["dashboards"]) {
    if (!isRecord(dashboard)) continue;
    const label = `Dashboard ${String(dashboard["id"])}`;
    if (
      !subIds.has(String(dashboard["subNicheId"])) ||
      !Number.isInteger(dashboard["version"]) ||
      Number(dashboard["version"]) < 1 ||
      !textPresent(dashboard["nameEn"]) ||
      !textPresent(dashboard["nameAr"])
    )
      errors.push(`${label}: invalid sub-niche, version or name.`);
    for (const key of ["moduleIds", "moduleOrder"])
      if (
        !strings(dashboard[key]) ||
        !unique(dashboard[key]) ||
        dashboard[key].some((id) => !validModules.has(id))
      )
        errors.push(`${label}: ${key} references are invalid.`);
    const moduleOrder = dashboard["moduleOrder"];
    if (
      strings(dashboard["moduleIds"]) &&
      strings(moduleOrder) &&
      (dashboard["moduleIds"].length !== moduleOrder.length ||
        dashboard["moduleIds"].some((id) => !moduleOrder.includes(id)))
    )
      errors.push(`${label}: module order must include exactly the selected modules.`);
    if (
      !strings(dashboard["widgetIds"]) ||
      !unique(dashboard["widgetIds"]) ||
      dashboard["widgetIds"].some((id) => !widgetIds.has(id))
    )
      errors.push(`${label}: widget references are invalid.`);
    if (
      !isRecord(dashboard["moduleSections"]) ||
      Object.entries(dashboard["moduleSections"]).some(
        ([id, section]) =>
          !strings(dashboard["moduleOrder"]) ||
          !dashboard["moduleOrder"].includes(id) ||
          !["top", "middle", "bottom"].includes(String(section)),
      )
    )
      errors.push(`${label}: module sections are invalid.`);
    if (
      !Array.isArray(dashboard["pipelineStages"]) ||
      !dashboard["pipelineStages"].length ||
      !Array.isArray(dashboard["metrics"]) ||
      !dashboard["metrics"].length
    )
      errors.push(`${label}: pipeline and metrics are required.`);
    for (const key of ["pipelineStages", "metrics"])
      if (Array.isArray(dashboard[key])) {
        ids(dashboard[key], `${label} ${key}`);
        if (
          dashboard[key].length > 20 ||
          dashboard[key].some(
            (item) =>
              !isRecord(item) || !textPresent(item["nameEn"]) || !textPresent(item["nameAr"]),
          )
        )
          errors.push(`${label}: ${key} require bounded bilingual names.`);
      }
  }
  for (const sub of value["subNiches"]) {
    if (!isRecord(sub)) continue;
    const funnel = templates["funnels"].find(
      (item) => isRecord(item) && item["id"] === sub["funnelTemplateId"],
    );
    const dashboard = templates["dashboards"].find(
      (item) => isRecord(item) && item["id"] === sub["dashboardTemplateId"],
    );
    if (
      publishing &&
      sub["status"] === "active" &&
      isRecord(funnel) &&
      (funnel["subNicheId"] !== sub["id"] ||
        funnel["version"] !== sub["templateVersion"] ||
        funnel["goal"] !== sub["goal"])
    )
      errors.push(`Sub-niche ${String(sub["id"])}: funnel ownership/version/goal mismatch.`);
    if (
      publishing &&
      sub["status"] === "active" &&
      isRecord(dashboard) &&
      (dashboard["subNicheId"] !== sub["id"] || dashboard["version"] !== sub["templateVersion"])
    )
      errors.push(`Sub-niche ${String(sub["id"])}: dashboard ownership/version mismatch.`);
  }
  return errors;
}

export const getActiveNiches = (catalog: DiscoveryCatalog): DiscoveryNiche[] =>
  catalog.niches.filter((niche) => niche.status === "active").sort((a, b) => a.order - b.order);
export const getActiveSubNiches = (
  catalog: DiscoveryCatalog,
  nicheId: string,
): DiscoverySubNiche[] =>
  catalog.niches.some((niche) => niche.id === nicheId && niche.status === "active")
    ? catalog.subNiches
        .filter((sub) => sub.nicheId === nicheId && sub.status === "active")
        .sort((a, b) => a.order - b.order)
    : [];
export const discoveryName = (
  item: { nameEn: string; nameAr: string },
  language: Language,
): string => (language === "ar" ? item.nameAr : item.nameEn);
export function createDiscoverySelection(
  catalog: DiscoveryCatalog,
  sub: DiscoverySubNiche,
  _language: Language = "en",
  confirmedAt = new Date().toISOString(),
): DiscoverySelection {
  const niche = catalog.niches.find((item) => item.id === sub.nicheId && item.status === "active");
  const canonical = catalog.subNiches.find(
    (item) => item.id === sub.id && item.nicheId === niche?.id && item.status === "active",
  );
  if (!niche || sub.status !== "active" || !canonical)
    throw new Error("DISCOVERY_SELECTION_INVALID");
  return {
    schemaVersion: 1,
    nicheId: niche.id,
    subNicheId: canonical.id,
    catalogVersion: catalog.version,
    nicheNameEn: niche.nameEn,
    nicheNameAr: niche.nameAr,
    subNicheNameEn: canonical.nameEn,
    subNicheNameAr: canonical.nameAr,
    profileSnapshot: copy(canonical),
    confirmedAt,
  };
}
export function getDiscoverySelection(value: unknown): DiscoverySelection | null {
  if (!isRecord(value) || value["schemaVersion"] !== 1 || !isRecord(value["profileSnapshot"]))
    return null;
  for (const key of [
    "nicheId",
    "subNicheId",
    "catalogVersion",
    "nicheNameEn",
    "nicheNameAr",
    "subNicheNameEn",
    "subNicheNameAr",
    "confirmedAt",
  ])
    if (!textPresent(value[key])) return null;
  const profile = value["profileSnapshot"];
  if (
    profile["id"] !== value["subNicheId"] ||
    profile["nicheId"] !== value["nicheId"] ||
    !stableId(profile["id"]) ||
    !stableId(profile["nicheId"]) ||
    !statuses.has(profile["status"]) ||
    !goals.has(profile["goal"]) ||
    !presets.has(profile["platformPresetId"]) ||
    !Number.isInteger(profile["templateVersion"]) ||
    Number(profile["templateVersion"]) < 1 ||
    !Number.isInteger(profile["order"])
  )
    return null;
  for (const key of [
    "nameEn",
    "nameAr",
    "targetAudienceEn",
    "targetAudienceAr",
    "buyerProfileEn",
    "buyerProfileAr",
    "coreProblemsEn",
    "coreProblemsAr",
    "dayToDayPainEn",
    "dayToDayPainAr",
    "desiredOutcomeEn",
    "desiredOutcomeAr",
    "gosSolutionEn",
    "gosSolutionAr",
    "whyEn",
    "whyAr",
    "funnelTemplateId",
    "dashboardTemplateId",
  ])
    if (!textPresent(profile[key])) return null;
  for (const key of ["qualificationQuestionsEn", "qualificationQuestionsAr", "moduleIds"])
    if (!strings(profile[key])) return null;
  if (
    !strings(profile["moduleIds"]) ||
    profile["moduleIds"].some((id) => !new Set<string>(discoveryModuleIds).has(id)) ||
    !strings(profile["qualificationQuestionsEn"]) ||
    !strings(profile["qualificationQuestionsAr"]) ||
    profile["qualificationQuestionsEn"].length !== profile["qualificationQuestionsAr"].length ||
    !Number.isFinite(Date.parse(String(value["confirmedAt"])))
  )
    return null;
  return copy(value) as unknown as DiscoverySelection;
}
export function cloneDiscoveryWorkspace(
  catalog: DiscoveryCatalog,
  sub: DiscoverySubNiche,
  brandName: string,
  language: Language,
) {
  const funnel = catalog.templates.funnels.find(
    (item) =>
      item.id === sub.funnelTemplateId &&
      item.subNicheId === sub.id &&
      item.version === sub.templateVersion,
  );
  const dashboard = catalog.templates.dashboards.find(
    (item) =>
      item.id === sub.dashboardTemplateId &&
      item.subNicheId === sub.id &&
      item.version === sub.templateVersion,
  );
  if (!funnel || !dashboard) throw new Error("DISCOVERY_TEMPLATE_MISSING");
  const ar = language === "ar";
  const inject = (text: string) =>
    text
      .replaceAll("{{brandName}}", brandName.trim() || (ar ? "علامتك التجارية" : "Your brand"))
      .replaceAll("{{subNiche}}", discoveryName(sub, language));
  const clonedBlocks: BuilderBlock[] = funnel.blocks.map((block) => ({
    id: block.id,
    type: block.type,
    label: inject(ar ? block.labelAr : block.labelEn),
    title: inject(ar ? block.titleAr : block.titleEn),
    body: inject(ar ? block.bodyAr : block.bodyEn),
    visible: true,
    fontFamily: ar ? "Cairo" : "Manrope",
    fontWeight: 700,
    fontSize: block.type === "hero" ? 56 : block.type === "heading" ? 40 : 30,
    lineHeight: 1.25,
    align: ar ? "right" : "left",
    textTone: "default",
    background: block.background ?? "light",
    padding: block.type === "hero" ? 80 : block.type === "header" ? 22 : 56,
    margin: 0,
    columns: block.columns ?? 3,
    contentWidth: 1120,
    radius: 16,
    buttonStyle: "primary",
    brandStyleLinked: true,
    ...(block.variant ? { variant: block.variant } : {}),
    ...((ar ? block.eyebrowAr : block.eyebrowEn)
      ? { eyebrow: inject((ar ? block.eyebrowAr : block.eyebrowEn)!) }
      : {}),
    ...((ar ? block.ctaLabelAr : block.ctaLabelEn)
      ? { ctaLabel: inject((ar ? block.ctaLabelAr : block.ctaLabelEn)!) }
      : {}),
    ...(block.ctaLink ? { ctaLink: block.ctaLink } : {}),
  }));
  const primaryPage = funnel.pages[0];
  if (!primaryPage) throw new Error("DISCOVERY_TEMPLATE_MISSING");
  const builderBlocks = primaryPage.blockIds
    .map((id) => clonedBlocks.find((block) => block.id === id))
    .filter((block): block is BuilderBlock => Boolean(block))
    .map((block) => ({ ...block }));
  if (builderBlocks.length !== primaryPage.blockIds.length)
    throw new Error("DISCOVERY_TEMPLATE_MISSING");
  return {
    builderBlocks,
    clonedBlocks,
    allBlocks: copy(clonedBlocks),
    activePageId: primaryPage.id,
    builderTemplate: funnel.id,
    selectedTemplate: funnel.id,
    dashboardWidgets: copy(dashboard.widgetIds),
    dashboardModuleOrder: copy(dashboard.moduleOrder),
    dashboardModuleSections: copy(dashboard.moduleSections),
    pipelineStages: copy(dashboard.pipelineStages),
    dashboardMetrics: copy(dashboard.metrics),
    funnelPages: copy(funnel.pages),
    funnelSteps: copy(funnel.steps),
    funnelTemplateId: funnel.id,
    dashboardTemplateId: dashboard.id,
    templateVersion: sub.templateVersion,
    catalogVersion: catalog.version,
  };
}
