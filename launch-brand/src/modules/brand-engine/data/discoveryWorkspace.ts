import type { BuilderBlock } from "./types.ts";
import type { DiscoverySelection } from "./discovery.ts";

export type DiscoveryContent = {
  blocks: Array<{ id: string; title: string; body: string; ctaLabel: string }>;
  followUpMessages: string[];
  qualificationQuestions: string[];
  sourceSubNicheId: string;
  catalogVersion: string;
  templateVersion: number;
  inputFingerprint?: string;
  sourceRevision?: string;
  provider?: string;
  model?: string;
};

export function discoveryContext(selection: DiscoverySelection | null, ar = false) {
  if (!selection) return null;
  const p = selection.profileSnapshot;
  return {
    niche: ar ? selection.nicheNameAr : selection.nicheNameEn,
    subNiche: ar ? selection.subNicheNameAr : selection.subNicheNameEn,
    audience: ar ? p.targetAudienceAr : p.targetAudienceEn,
    problems: ar ? p.coreProblemsAr : p.coreProblemsEn,
    outcome: ar ? p.desiredOutcomeAr : p.desiredOutcomeEn,
    goal: p.goal,
  };
}

// Content can replace text only; layout, IDs, links and visibility remain curated.
export function applyDiscoveryCopy(
  blocks: BuilderBlock[],
  content: DiscoveryContent,
): BuilderBlock[] {
  if (!Array.isArray(content.blocks) || content.blocks.length !== blocks.length)
    throw new Error("The generated copy does not match this funnel.");
  const copies = new Map(content.blocks.map((item) => [item.id, item]));
  if (copies.size !== blocks.length || blocks.some((block) => !copies.has(block.id)))
    throw new Error("The generated copy changed the funnel structure.");
  return blocks.map((block) => {
    const copy = copies.get(block.id)!;
    if (
      typeof copy.title !== "string" ||
      typeof copy.body !== "string" ||
      typeof copy.ctaLabel !== "string" ||
      copy.title.length > 500 ||
      copy.body.length > 6000 ||
      copy.ctaLabel.length > 120
    )
      throw new Error("The generated copy contains an invalid field.");
    return {
      ...block,
      title: copy.title,
      body: copy.body,
      ...(block.ctaLabel ? { ctaLabel: copy.ctaLabel } : {}),
    };
  });
}

export function mergeActiveFunnelBlocks(
  cloned: BuilderBlock[],
  activeIds: string[],
  visible: BuilderBlock[],
): BuilderBlock[] {
  const current = new Map(visible.map((block) => [block.id, block]));
  if (
    current.size !== activeIds.length ||
    visible.length !== activeIds.length ||
    activeIds.some((id) => !current.has(id))
  )
    throw new Error(
      "The funnel structure has been customized. Restore its niche template before using AI copy.",
    );
  return cloned.map((block) => ({ ...(current.get(block.id) ?? block) }));
}
