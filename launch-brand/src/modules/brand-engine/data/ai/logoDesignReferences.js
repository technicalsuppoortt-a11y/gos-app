import sources from "@/modules/brand-engine/configuration/prompts/logoDesignSources.json" with { type: "json" };

// Ship reviewed summaries with the request: a URL alone does not let a model
// inspect a case study, and generation must not depend on a remote page loading.
export function logoDesignReferences(preference) {
  const style = Object.hasOwn(sources.styleDirections, preference) ? preference : "Auto";
  const constructionStyles = sources.styles.find(item => item.id === style)?.constructionStyles;
  const studies = sources.constructionStudies.filter(study =>
    style === "Auto" || (constructionStyles || [style]).includes(study.style));
  return {
    version: sources.version,
    usage: sources.usage,
    requestedStyle: style,
    styleDirection: sources.styleDirections[style],
    caseStudies: sources.caseStudies,
    learningResources: sources.learningResources,
    designWorkflow: sources.designWorkflow,
    constructionStudies: studies.slice(0, style === "Organic" ? 2 : 3),
    reviewChecklist: sources.reviewChecklist,
  };
}
