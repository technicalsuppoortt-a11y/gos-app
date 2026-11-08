export type SavedChange = { pageId: string; field: string; label: string; labelAr: string; value: string };
const labels: Record<string, [string, string]> = {
 brandName: ["Brand name", "اسم البراند"], tagline: ["Tagline", "شعار البراند النصي"], brandPalette: ["Brand color", "لون البراند"], logo: ["Logo", "اللوجو"], uploadedLogo: ["Logo image", "صورة اللوجو"], selectedBrandIdentity: ["Logo concept", "تصميم اللوجو"], fontPersonality: ["Typography", "الخطوط"], brandVoices: ["Brand voice", "أسلوب البراند"], brandLanguage: ["Brand language", "لغة البراند"], logoStyles: ["Logo style", "ستايل اللوجو"], targetAudience: ["Target audience", "الجمهور المستهدف"], brandKeywords: ["Brand keywords", "كلمات البراند"], business: ["Business type", "نوع المشروع"], selectedTemplate: ["Template", "القالب"], color: ["Color", "اللون"], font: ["Font", "الخط"], layout: ["Layout", "تنسيق الصفحة"], modules: ["Integrations", "التكاملات"], paymentGateway: ["Payment gateway", "بوابة الدفع"], coreMessage: ["Core message", "الرسالة الأساسية"], contentTone: ["Content tone", "أسلوب المحتوى"], contentCta: ["Call to action", "دعوة لاتخاذ إجراء"], posts: ["Content posts", "منشورات المحتوى"], campaign: ["Campaign", "الحملة"], selectedChannel: ["Marketing channel", "قناة التسويق"], apiProvider: ["AI provider", "مزود الذكاء الاصطناعي"], dashboardWidgets: ["Dashboard widgets", "عناصر لوحة التحكم"]
};
export function describeChanges(previous: string, current: string): SavedChange[] {
 const before = JSON.parse(previous) as {pageId: string; parameters: Record<string, unknown>}[];
 const after = JSON.parse(current) as typeof before;
 const changes: SavedChange[] = [];
 function walk(pageId: string, old: Record<string, unknown>, next: Record<string, unknown>, prefix = "") {
  for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) {
   if (/password|secret|token|apiKey|credential|dataUrl|svg|fingerprint|revision|updatedAt/i.test(key)) continue;
   if (JSON.stringify(old[key]) === JSON.stringify(next[key])) continue;
   if (key === "colors" || (key === "logo" && Object.hasOwn(next, "choices"))) continue; // Palette already describes the same choice.
   const value = next[key];
   if (value && typeof value === "object" && !Array.isArray(value) && !/logo/i.test(key)) {
    walk(pageId, (old[key] && typeof old[key] === "object" ? old[key] : {}) as Record<string, unknown>, value as Record<string, unknown>, prefix + key + "."); continue;
   }
   const label = labels[key] ?? [key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_:]/g, " "), "إعداد " + key];
   const summary = /logo|messages|image|builderBlocks/i.test(key) ? "" : typeof value === "string" && !/^(data:|https?:)/i.test(value) ? value.slice(0, 100) : typeof value === "number" ? String(value) : Array.isArray(value) && value.every(v => typeof v === "string" && v.length < 40) ? value.join(", ").slice(0, 100) : "";
   changes.push({pageId, field: prefix + key, label: label[0] ?? key, labelAr: label[1] ?? key, value: summary});
  }
 }
 for (const page of after) if (page.pageId !== "vision_journey") walk(page.pageId, before.find(p => p.pageId === page.pageId)?.parameters ?? {}, page.parameters);
 return changes.slice(0, 100);
}
