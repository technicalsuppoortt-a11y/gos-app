import defaults from "@/modules/brand-engine/configuration/discoveryQuestionnaire.json";

export type DiscoveryOption = { id: string; en: string; ar: string };
export type DiscoveryConfiguration = typeof defaults & {
  catalogVersion?: string;
  revision?: string;
};
export const defaultDiscoveryConfiguration: DiscoveryConfiguration = defaults;
export type DiscoveryProfile = {
  schemaVersion: 1;
  revision: string;
  questionnaireVersion: string;
  interests: string[];
  exclusions: string[];
  industries: string[];
  skills: string[];
  experience: string;
  network: string;
  market: string;
  customMarket: string;
  language: "ar" | "en" | "both" | "";
  defaultLanguage?: "ar" | "en" | "";
  selling: "b2b" | "b2c" | "both" | "";
  time: string;
  budget: string;
  currency: string;
};
export const emptyDiscoveryProfile = (version = defaults.version): DiscoveryProfile => ({
  schemaVersion: 1,
  revision: "initial",
  questionnaireVersion: version,
  interests: [],
  exclusions: [],
  industries: [],
  skills: [],
  experience: "",
  network: "",
  market: "",
  customMarket: "",
  language: "",
  selling: "",
  time: "",
  budget: "",
  currency: "USD",
});
export function profileIssues(profile: DiscoveryProfile): string[] {
  return [
    !profile.interests.length && "interests",
    !profile.skills.length && "skills",
    (!profile.market || (profile.market === "custom" && !profile.customMarket?.trim())) && "market",
    !profile.language && "language",
    (profile.language === "both" && !["ar", "en"].includes(profile.defaultLanguage || "")) && "defaultLanguage",
    !profile.selling && "selling",
    !profile.time && "time",
    !profile.budget && "budget",
  ].filter(Boolean) as string[];
}
export type DiscoverySource = {
  title: string;
  url: string;
  kind?: "company" | "group";
  country?: string;
  reason?: string;
};
export type DiscoveryAnalysis = {
  language?: "ar" | "en";
  translations?: Partial<
    Record<
      "ar" | "en",
      Pick<DiscoveryAnalysis, "reasons" | "tradeoffs" | "problemSignals" | "clarification">
    >
  >;
  schemaVersion: 1;
  analysisId: string;
  profileRevision: string;
  catalogVersion: string;
  configurationVersion: string;
  promptVersion: string;
  provider: string;
  model: string;
  mode: "research" | "profile";
  createdAt: string;
  status: "recommended" | "needs_clarification";
  nicheId: string | null;
  subNicheId: string | null;
  reasons: string[];
  tradeoffs: string[];
  problemSignals: string[];
  competition: "low" | "medium" | "high" | "unknown";
  confidence: "low" | "medium" | "high";
  clarification: string;
  sources: Array<{ title: string; url: string }>;
  audienceSources?: DiscoverySource[];
  audienceResearchStatus?: "complete" | "failed" | "disabled" | "no_sources" | "no_matches";
};
export type DiscoveryQualificationResponse = {
  questionEn: string;
  questionAr: string;
  answer: string;
};
export type DiscoveryQualificationAnswers = {
  subNicheId: string;
  answers: DiscoveryQualificationResponse[];
};
export type DiscoveryDraft = {
  profile: DiscoveryProfile;
  analysis?: DiscoveryAnalysis | undefined;
  selection?: { nicheId: string; subNicheId: string; source: "ai" | "manual" } | undefined;
  offer?: string | undefined;
  audience?: string | undefined;
  qualificationAnswers?: DiscoveryQualificationAnswers | undefined;
  committedRevision?: string | undefined;
  decisions?: Array<{ kind: string; subNicheId: string | null; reason: string; at: string }>;
};
export function getDiscoveryQualificationAnswers(
  draft: DiscoveryDraft,
  subNicheId: string,
  questionsEn: string[],
  questionsAr: string[],
): DiscoveryQualificationAnswers {
  const saved =
    draft.qualificationAnswers?.subNicheId === subNicheId ? draft.qualificationAnswers.answers : [];
  return {
    subNicheId,
    answers: questionsEn.map((questionEn, index) => {
      const questionAr = questionsAr[index] || questionEn;
      const response = saved.find(
        (item) => item.questionEn === questionEn && item.questionAr === questionAr,
      );
      return { questionEn, questionAr, answer: response?.answer || "" };
    }),
  };
}
export const analysisIsCurrent = (draft: DiscoveryDraft) =>
  Boolean(draft.analysis && draft.analysis.profileRevision === draft.profile.revision);

export function editDiscoveryDraftProfile(
  draft: DiscoveryDraft,
  patch: Partial<DiscoveryProfile>,
  questionnaireVersion: string,
  revision: string,
): DiscoveryDraft {
  // Editing answers preserves the selected direction and its original analysis.
  return {
    ...draft,
    profile: { ...draft.profile, ...patch, revision, questionnaireVersion },
    committedRevision: undefined,
  };
}

export function getDiscoveryDraftSelection(draft: DiscoveryDraft): DiscoveryDraft["selection"] {
  if (draft.selection) return draft.selection;
  const analysis = draft.analysis;
  // Recover recommendations cleared by the old editing behavior; honor rejection.
  if (
    analysis?.status === "recommended" &&
    analysis.nicheId &&
    analysis.subNicheId &&
    draft.decisions?.at(-1)?.kind !== "rejected"
  ) {
    return { nicheId: analysis.nicheId, subNicheId: analysis.subNicheId, source: "ai" };
  }
  return undefined;
}
