import type {
  DiscoveryDraft,
  DiscoveryConfiguration,
  DiscoveryOption,
} from "@/modules/brand-engine/data/discoveryProfile";
export type DiscoveryReport = Pick<
  DiscoveryDraft,
  "profile" | "analysis" | "selection" | "offer" | "audience" | "qualificationAnswers"
> & {
  status: string;
  nicheName: string;
  subNicheName: string;
  configuration?: DiscoveryConfiguration;
  details?: Array<[string, string]>;
};
export function exportDiscoveryJSON(report: DiscoveryReport) {
  const file = new Blob(
    [
      JSON.stringify(
        { schemaVersion: 1, exportedAt: new Date().toISOString(), ...report },
        null,
        2,
      ),
    ],
    { type: "application/json;charset=utf-8" },
  );
  const url = URL.createObjectURL(file),
    link = document.createElement("a");
  link.href = url;
  link.download = "gos-discovery-report.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function getDiscoveryReportSections(
  report: DiscoveryReport,
  ar: boolean,
): Array<[string, string]> {
  const p = report.profile,
    config = report.configuration;
  const label = (id: string, options?: DiscoveryOption[]) => {
    const option = options?.find((item) => item.id === id);
    return option ? (ar ? option.ar : option.en) : id;
  };
  const list = (ids: string[], options?: DiscoveryOption[]) =>
    ids.map((id) => label(id, options)).join(ar ? "، " : ", ");
  return [
    [ar ? "الاهتمامات" : "Interests", list(p.interests, config?.interests)],
    [ar ? "المجالات المستبعدة" : "Excluded industries", list(p.exclusions, config?.interests)],
    [
      ar ? "الصناعات التي تعرفها" : "Industries you understand",
      list(p.industries, config?.interests),
    ],
    [ar ? "المهارات" : "Skills", list(p.skills, config?.skills)],
    [ar ? "الخبرة" : "Experience", p.experience],
    [ar ? "شبكة العلاقات" : "Network", p.network],
    [
      ar ? "البلد أو المنطقة" : "Target country or region",
      p.market === "custom" ? p.customMarket : label(p.market, config?.markets),
    ],
    [
      ar ? "اللغة المفضلة" : "Preferred language",
      {
        "": "",
        ar: ar ? "العربية" : "Arabic",
        en: ar ? "الإنجليزية" : "English",
        both: ar ? "العربية والإنجليزية" : "Arabic and English",
      }[p.language],
    ],
    ...(p.language === "both" && p.defaultLanguage ? [[
      ar ? "اللغة الافتراضية" : "Default language",
      p.defaultLanguage === "ar" ? (ar ? "العربية" : "Arabic") : (ar ? "الإنجليزية" : "English"),
    ] as [string, string]] : []),
    [
      ar ? "طريقة البيع" : "Selling preference",
      {
        "": "",
        b2b: ar ? "للشركات" : "Business to business",
        b2c: ar ? "للأفراد" : "Business to consumer",
        both: ar ? "للشركات والأفراد" : "Both businesses and consumers",
      }[p.selling],
    ],
    [ar ? "الوقت الأسبوعي المتاح" : "Weekly availability", label(p.time, config?.timeRanges)],
    [
      ar ? "ميزانية البداية" : "Starting budget",
      [label(p.budget, config?.budgetRanges), p.currency].filter(Boolean).join(" "),
    ],
    [ar ? "المجال" : "Niche", report.nicheName],
    [ar ? "التخصص" : "Sub-niche", report.subNicheName],
    [
      ar ? "حالة التقرير" : "Report status",
      report.status === "confirmed" ? (ar ? "محفوظ" : "Confirmed") : ar ? "مسودة" : "Draft",
    ],
    [ar ? "العرض" : "Offer", report.offer || ""],
    [ar ? "الجمهور" : "Audience", report.audience || ""],
    [
      ar ? "إجابات التأهيل" : "Qualification answers",
      report.qualificationAnswers?.answers
        .map(
          (item) =>
            `${ar ? item.questionAr : item.questionEn}\n${item.answer || (ar ? "لم تتم الإجابة بعد" : "Not answered yet")}`,
        )
        .join("\n\n") || "",
    ],
    ...(report.details || []),
    [
      ar ? "أسباب ترشيح AI" : "AI recommendation reasons",
      report.analysis?.reasons.join("\n") || "",
    ],
    [ar ? "حدود البحث" : "Research limitations", report.analysis?.tradeoffs.join("\n") || ""],
    [
      ar ? "شركات وجروبات الجمهور" : "Audience companies and groups",
      report.analysis?.audienceSources?.map(s => `${s.title}\n${s.country || ""}\n${s.reason || ""}\n${s.url}`).join("\n\n") || "",
    ],
    [
      ar ? "المصادر" : "Sources",
      report.analysis?.sources.map((s) => `${s.title}\n${s.url}`).join("\n\n") || "",
    ],
  ].map(
    ([title, body]) =>
      [title, body || (ar ? "لم يتم الاختيار أو الإجابة" : "Not selected or answered")] as [
        string,
        string,
      ],
  );
}

export async function createDiscoveryPDF(report: DiscoveryReport, ar: boolean, font: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", putOnlyUsedFonts: true });
  pdf.addFileToVFS("Amiri-Regular.ttf", font);
  pdf.addFont("Amiri-Regular.ttf", "Discovery", "normal");
  pdf.setFont("Discovery");
  pdf.setLanguage(ar ? "ar" : "en");
  pdf.setProperties({ title: "AI Business Discovery Report" });
  let y = 22;
  const write = (text: string, size: number, color: [number, number, number]) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines: string[] = pdf.splitTextToSize(text, 174);
    const lineHeight = size * 0.5;
    for (const line of lines) {
      if (y + lineHeight > 278) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, ar ? 192 : 18, y, {
        align: ar ? "right" : "left",
      });
      y += lineHeight;
    }
  };
  write(ar ? "تقرير اكتشاف النشاط" : "AI Business Discovery Report", 20, [101, 80, 199]);
  y += 7;
  for (const [title, body] of getDiscoveryReportSections(report, ar)) {
    if (y > 250) {
      pdf.addPage();
      y = 22;
    }
    write(title, 13, [101, 80, 199]);
    y += 2;
    write(body, 11, [24, 33, 62]);
    y += 6;
  }
  return pdf;
}
let pdfFont: Promise<string> | undefined;
export async function exportDiscoveryPDF(report: DiscoveryReport, ar: boolean) {
  pdfFont ||= fetch("/fonts/Amiri-Regular.ttf")
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load the PDF font");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    })
    .catch((error) => {
      pdfFont = undefined;
      throw error;
    });
  const pdf = await createDiscoveryPDF(report, ar, await pdfFont);
  pdf.save("ai-business-discovery.pdf");
}

export function printDiscoveryReport(report: DiscoveryReport, ar: boolean) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
    );
  const sections = getDiscoveryReportSections(report, ar);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
  frame.title = "GOS printable report";
  frame.onload = () => {
    frame.contentWindow?.addEventListener("afterprint", () => frame.remove(), { once: true });
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  frame.srcdoc = `<!doctype html><html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>GOS Discovery Report</title><style>body{font:14px Arial,sans-serif;color:#111a3b;margin:32px}h1{color:#6d3df5}h2{font-size:16px}p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}section{break-inside:avoid;border-bottom:1px solid #e7eaf3;padding:12px 0}@page{margin:16mm}</style></head><body><h1>GOS · ${ar ? "تقرير اكتشاف النشاط" : "Business Discovery Report"}</h1><p>${escape(new Date().toISOString())}</p>${sections.map(([title, body]) => `<section><h2>${escape(title)}</h2><p>${escape(body)}</p></section>`).join("")}</body></html>`;
  document.body.append(frame);
}
