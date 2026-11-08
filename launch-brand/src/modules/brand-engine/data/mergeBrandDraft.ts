import type { SavedBrandPage } from "./brandPages";

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const fingerprint = (value: unknown) =>
  JSON.stringify(value, (_key, item) =>
    record(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
function merge(base: unknown, local: unknown, remote: unknown, key = ""): unknown {
  if (fingerprint(local) === fingerprint(base)) return remote;
  if (fingerprint(remote) === fingerprint(base) || fingerprint(local) === fingerprint(remote))
    return local;
  // Keep the scope and content of niche-dependent choices from the same session.
  if (/^(nicheSelection|nicheWorkspace|nicheWorkspaceHistory|qualificationAnswers)$/.test(key))
    return local;
  if (
    /^workspace(Leads|Products|Bookings|Services|Sites|Knowledge|Workflows|FollowupTemplates)$/.test(
      key,
    ) &&
    Array.isArray(local) &&
    Array.isArray(remote)
  ) {
    const before = Array.isArray(base) ? base : [];
    const keyed = (items: unknown[]) =>
      Object.fromEntries(
        items
          .filter(record)
          .filter((item) => typeof item["id"] === "string")
          .map((item) => [String(item["id"]), item]),
      );
    const combined = merge(keyed(before), keyed(local), keyed(remote)) as Record<string, unknown>;
    return Object.values(combined);
  }
  if (record(local) && record(remote)) {
    const before = record(base) ? base : {};
    const result: Record<string, unknown> = {};
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(local),
      ...Object.keys(remote),
    ])) {
      const value = merge(before[key], local[key], remote[key], key);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  // Simultaneous edits keep the active user's choice. Lists remain atomic choices.
  return local;
}
export function mergeBrandDraft(
  base: SavedBrandPage[],
  local: SavedBrandPage[],
  remote: SavedBrandPage[],
) {
  const result = local.map((page) => {
    const incoming = remote.find((item) => item.pageId === page.pageId);
    if (!incoming) return page;
    const parameters = {
      ...(merge(
        base.find((item) => item.pageId === page.pageId)?.parameters,
        page.parameters,
        incoming.parameters,
      ) as Record<string, unknown>),
    };
    if (page.pageId === "vision_journey") {
      parameters["activeStep"] = page.parameters["activeStep"];
      parameters["completedSteps"] = page.parameters["completedSteps"];
    }
    if (page.pageId === "business_discovery" && record(parameters["choices"])) {
      const choices = { ...parameters["choices"] };
      parameters["choices"] = choices;
      const selection = choices["nicheSelection"];
      const workspace = choices["nicheWorkspace"];
      if (record(selection)) {
        if (record(selection["profileSnapshot"])) {
          parameters["business"] = selection["profileSnapshot"]["platformPresetId"];
          parameters["subNiche"] = selection["subNicheNameEn"];
        }
        if (
          record(workspace) &&
          (workspace["subNicheId"] !== selection["subNicheId"] ||
            workspace["catalogVersion"] !== selection["catalogVersion"])
        ) {
          const matched = [page, incoming]
            .map((item) => item.parameters["choices"])
            .find(
              (item) =>
                record(item) && fingerprint(item["nicheSelection"]) === fingerprint(selection),
            );
          if (record(matched)) choices["nicheWorkspace"] = matched["nicheWorkspace"];
        }
      }
    }
    return { ...page, parameters };
  });
  const discovery = (pages: SavedBrandPage[]) =>
    pages.find((page) => page.pageId === "business_discovery")?.parameters["choices"];
  const choices = discovery(result);
  const before = discovery(base);
  const selection = record(choices) ? choices["nicheSelection"] : undefined;
  if (
    record(selection) &&
    fingerprint(selection) !== fingerprint(record(before) ? before["nicheSelection"] : undefined)
  ) {
    // Changing niche replaces a coupled workspace. Edits to the previous niche's
    // Builder must not be merged into the new clone from another session.
    const winning = [local, remote].find((pages) => {
      const candidate = discovery(pages);
      return (
        record(candidate) && fingerprint(candidate["nicheSelection"]) === fingerprint(selection)
      );
    });
    if (winning)
      for (const page of result) {
        const source = winning.find((item) => item.pageId === page.pageId);
        if (!source) continue;
        if (page.pageId === "template_builder") page.parameters = source.parameters;
        if (page.pageId === "dashboard") {
          for (const key of [
            "dashboardSetupMode",
            "dashboardBundle",
            "dashboardWidgets",
            "dashboardModuleOrder",
            "dashboardModuleSections",
          ])
            page.parameters[key] = source.parameters[key];
          const sourceChoices = source.parameters["choices"];
          const targetChoices = record(page.parameters["choices"])
            ? { ...page.parameters["choices"] }
            : {};
          page.parameters["choices"] = targetChoices;
          if (record(sourceChoices) && record(targetChoices))
            for (const key of ["nichePipelineStages", "nicheMetrics", "nicheSetupVersion"])
              targetChoices[key] = sourceChoices[key];
        }
        if (page.pageId === "integrations")
          page.parameters["modules"] = source.parameters["modules"];
      }
  }
  return result;
}
