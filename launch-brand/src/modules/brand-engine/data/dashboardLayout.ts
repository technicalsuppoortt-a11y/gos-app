import type { DashboardSection, Module } from "./types";
import { isCoreModule } from "./moduleCategories";
import { z } from "zod";

export const coreLayoutOrder = ["crm", "analytics", "calendar", "courses", "community", "landing"];
export const coreLayoutSections: Record<string, DashboardSection> = {
  crm: "top",
  analytics: "top",
  calendar: "middle",
  courses: "middle",
  community: "bottom",
  landing: "bottom",
};

export function dashboardAIInput(state: {
  business: string;
  language: "en" | "ar";
  platformBlueprint: { summary: string } | null;
  modules: Module[];
  dashboardModuleOrder: string[];
  dashboardModuleSections: Record<string, DashboardSection>;
}) {
  const active = state.modules.filter(isCoreModule).filter((module) => module.active);
  const orderedIds = [
    ...new Set([...state.dashboardModuleOrder, ...active.map((module) => module.id)]),
  ];
  return {
    business: state.business.slice(0, 4000),
    summary: (state.platformBlueprint?.summary ?? "").slice(0, 4000),
    language: state.language,
    modules: orderedIds.flatMap((id) => {
      const module = active.find((item) => item.id === id);
      return module
        ? [
            {
              id,
              name: state.language === "ar" ? module.nameAr : module.name,
              description: module.description,
              section: state.dashboardModuleSections[id] ?? "middle",
            },
          ]
        : [];
    }),
  };
}
export type DashboardAIInput = ReturnType<typeof dashboardAIInput>;

export const dashboardAIResponse = z
  .object({
    summary: z.string().trim().min(1).max(1200),
    layout: z
      .array(
        z
          .object({
            id: z.string(),
            section: z.enum(["top", "middle", "bottom"]),
            reason: z.string().trim().min(1).max(600),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict();
export type DashboardAIResult = z.infer<typeof dashboardAIResponse>;
export type DashboardAIPlan = DashboardAIResult & { sourceKey: string };

// Local interaction preview only: no model, network request or external configuration.
export function createDashboardPreview(input: DashboardAIInput): DashboardAIPlan {
  const context = `${input.business} ${input.summary}`;
  const priority = /course|learn|education|دور[ةات]|تعليم|تدريب/i.test(context)
    ? ["courses", "analytics", "community", "calendar", "crm", "landing"]
    : /book|appointment|coach|clinic|حجز|مواعيد|عياد|استشار/i.test(context)
      ? ["calendar", "crm", "analytics", "courses", "community", "landing"]
      : /community|membership|مجتمع|عضوي/i.test(context)
        ? ["community", "analytics", "courses", "calendar", "crm", "landing"]
        : ["analytics", "crm", "calendar", "courses", "community", "landing"];
  const ar = input.language === "ar";
  const reasons: Record<string, [string, string]> = {
    analytics: [
      "Keep performance insights easy to scan during your daily review.",
      "اجعل مؤشرات الأداء سهلة المتابعة أثناء المراجعة اليومية.",
    ],
    crm: [
      "Keep client records and follow-ups within easy reach.",
      "اجعل بيانات العملاء والمتابعات في متناولك.",
    ],
    calendar: [
      "Keep upcoming bookings and daily appointments easy to access.",
      "اجعل الحجوزات القادمة والمواعيد اليومية سهلة الوصول.",
    ],
    courses: [
      "Group learning content and course management in one clear area.",
      "اجمع المحتوى التعليمي وإدارة الدورات في مساحة واضحة.",
    ],
    community: [
      "Give member conversations and engagement a dedicated area.",
      "خصّص مساحة لمحادثات الأعضاء والتفاعل.",
    ],
    landing: [
      "Keep campaign pages together without crowding everyday operations.",
      "اجمع صفحات الحملات دون ازدحام أدوات العمل اليومي.",
    ],
  };
  const order = [...new Set([...priority, ...input.modules.map((module) => module.id)])].filter(
    (id) => input.modules.some((module) => module.id === id),
  );
  return {
    sourceKey: JSON.stringify(input),
    summary: ar
      ? "تخطيط مقترح محلياً يرتّب الوحدات المفعّلة حسب نشاطك، ويجمع الأدوات المرتبطة في أقسام واضحة. راجع المواضع ثم طبّقها عندما تكون جاهزاً."
      : "This local layout preview prioritizes enabled modules for your business and groups related tools into clear sections. Review the placements, then apply when ready.",
    layout: order.map((id, index) => ({
      id,
      section: index < 2 ? "top" : index < 4 ? "middle" : "bottom",
      reason:
        reasons[id]?.[ar ? 1 : 0] ??
        (ar
          ? "تنظيم هذه الوحدة ضمن أدوات العمل."
          : "Organize this module with your workspace tools."),
    })),
  };
}

export function validateDashboardAIResult(
  value: unknown,
  input: DashboardAIInput,
): DashboardAIResult {
  const result = dashboardAIResponse.parse(value);
  const allowed = new Set(input.modules.map((module) => module.id));
  const returned = new Set(result.layout.map((item) => item.id));
  if (
    result.layout.length !== allowed.size ||
    returned.size !== allowed.size ||
    [...returned].some((id) => !allowed.has(id))
  ) {
    throw new Error("AI_LAYOUT_INVALID");
  }
  // Keep the displayed order consistent with the preview's top/middle/bottom grouping.
  const ranks = { top: 0, middle: 1, bottom: 2 };
  if (
    result.layout.some(
      (item, index) => index > 0 && ranks[item.section] < ranks[result.layout[index - 1]!.section],
    )
  ) {
    throw new Error("AI_LAYOUT_INVALID");
  }
  return result;
}
