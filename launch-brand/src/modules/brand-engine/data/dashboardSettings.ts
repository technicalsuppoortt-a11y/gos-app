import { brandPages, type BrandPageId } from "./brandPages.ts";
import type { BrandState } from "@/modules/brand-engine/store/brandSlice";

export const settingsSections: Record<BrandPageId, { en: string; ar: string; step: number }> = {
  vision_journey: { en: "Workspace preferences", ar: "تفضيلات مساحة العمل", step: 13 },
  business_discovery: { en: "Business discovery", ar: "اكتشاف المشروع", step: 13 },
  branding: { en: "Brand identity", ar: "هوية البراند", step: 14 },
  template_builder: { en: "Website & platform", ar: "الموقع والمنصة", step: 4 },
  dashboard: { en: "Dashboard & voice input", ar: "الداشبورد والإملاء الصوتي", step: 5 },
  integrations: { en: "Tools & integrations", ar: "الأدوات والتكاملات", step: 6 },
  ai_center: { en: "AI preferences & conversations", ar: "إعدادات الذكاء والمحادثات", step: 8 },
  content_planner: { en: "Content plan & drafts", ar: "خطة المحتوى والمسودات", step: 9 },
  marketing: { en: "Marketing & campaigns", ar: "التسويق والحملات", step: 16 },
  deployment: { en: "Launch preferences", ar: "إعدادات الإطلاق", step: 10 },
};
const labels: Record<string, [string, string]> = {
  business: ["Business type", "نوع المشروع"],
  language: ["Interface language", "لغة الواجهة"],
  theme: ["Appearance", "المظهر"],
  brandName: ["Brand name", "اسم البراند"],
  tagline: ["Tagline", "الشعار النصي"],
  brandKeywords: ["Keywords", "الكلمات المفتاحية"],
  targetAudience: ["Target audience", "الجمهور المستهدف"],
  brandPalette: ["Color palette", "لوحة الألوان"],
  logoStyles: ["Logo styles", "أنماط الشعار"],
  fontPersonality: ["Typography", "الخطوط"],
  brandLanguage: ["Content language", "لغة المحتوى"],
  brandVoices: ["Brand voice", "نبرة البراند"],
  selectedBrandIdentity: ["Chosen identity", "الهوية المختارة"],
  favoriteIdentities: ["Favorite identities", "الهويات المفضلة"],
  uploadedLogo: ["Saved logo", "الشعار المحفوظ"],
  name: ["Name", "الاسم"],
  title: ["Title", "العنوان"],
  text: ["Text", "النص"],
  content: ["Content", "المحتوى"],
  description: ["Description", "الوصف"],
  label: ["Label", "التسمية"],
  arabicName: ["Arabic name", "الاسم العربي"],
  mark: ["Brand symbol", "رمز البراند"],
  palette: ["Colors", "الألوان"],
  typography: ["Typography", "الخطوط"],
  vibe: ["Style", "الطابع"],
  kind: ["Type", "النوع"],
  selectedTemplate: ["Selected template", "القالب المختار"],
  readySaasSelection: ["Selected platform", "المنصة المختارة"],
  builderBlocks: ["Page sections", "أقسام الصفحة"],
  hiddenBlocks: ["Hidden sections", "الأقسام المخفية"],
  builderPalette: ["Website colors", "ألوان الموقع"],
  builderHeadingFont: ["Heading font", "خط العناوين"],
  builderBodyFont: ["Body font", "خط النصوص"],
  builderButtonStyle: ["Button style", "شكل الأزرار"],
  builderPublished: ["Builder publication choice", "اختيار اعتماد الصفحة"],
  device: ["Preview device", "جهاز المعاينة"],
  zoom: ["Preview zoom", "تكبير المعاينة"],
  platformBlueprint: ["Platform plan", "خطة المنصة"],
  platformBuilderMessages: ["Platform planning conversations", "محادثات تخطيط المنصة"],
  color: ["Color", "اللون"],
  font: ["Font", "الخط"],
  layout: ["Layout", "توزيع الصفحة"],
  logo: ["Logo", "الشعار"],
  dictationLanguage: ["Voice input language", "لغة الإملاء الصوتي"],
  layoutVersion: ["Dashboard layout", "تصميم الداشبورد"],
  modules: ["Modules", "الأدوات"],
  enabled: ["Enabled", "مفعّل"],
  connected: ["Connected", "متصل"],
  category: ["Category", "الفئة"],
  paymentGateway: ["Payment gateway", "بوابة الدفع"],
  apiProvider: ["Preferred AI provider", "مزود الذكاء المفضل"],
  messages: ["Conversations", "المحادثات"],
  role: ["Speaker", "المتحدث"],
  bundle: ["Credit bundle draft", "مسودة باقة الرصيد"],
  createdBundles: ["Prepared bundles", "الباقات المُعدّة"],
  credits: ["Credits", "الرصيد"],
  price: ["Price", "السعر"],
  posts: ["Planned content", "المحتوى المخطط"],
  coreMessage: ["Core message", "الرسالة الأساسية"],
  contentTone: ["Content tone", "نبرة المحتوى"],
  contentCta: ["Call to action", "الدعوة لاتخاذ إجراء"],
  corePainPoint: ["Customer challenge", "تحدي العميل"],
  planApplied: ["Plan applied", "اعتماد الخطة"],
  draft: ["Draft", "المسودة"],
  generatedCount: ["Prepared content count", "عدد المحتوى المُعدّ"],
  hasGeneratedContent: ["Content prepared", "تجهيز المحتوى"],
  channel: ["Channel", "القناة"],
  caption: ["Caption", "نص المنشور"],
  date: ["Date", "التاريخ"],
  time: ["Time", "الوقت"],
  status: ["Status", "الحالة"],
  type: ["Type", "النوع"],
  cta: ["Call to action", "الدعوة لاتخاذ إجراء"],
  selectedChannel: ["Selected channel", "القناة المختارة"],
  setup: ["Campaign preferences", "إعدادات الحملة"],
  goal: ["Goal", "الهدف"],
  country: ["Country", "الدولة"],
  budget: ["Budget", "الميزانية"],
  currency: ["Currency", "العملة"],
  payments: ["Payments", "الدفع"],
  audience: ["Audience", "الجمهور"],
  stage: ["Business stage", "مرحلة المشروع"],
  assets: ["Available assets", "الأصول المتاحة"],
  offer: ["Offer", "العرض"],
  competitors: ["Competitors", "المنافسون"],
  campaign: ["Current campaign", "الحملة الحالية"],
  savedCampaigns: ["Saved campaigns", "الحملات المحفوظة"],
  objective: ["Objective", "الهدف"],
  duration: ["Duration", "المدة"],
  copy: ["Campaign copy", "نص الحملة"],
  adImage: ["Campaign image", "صورة الحملة"],
  moreCountryCode: ["Country code", "كود الدولة"],
  hasGenerated: ["Strategy prepared", "تجهيز الاستراتيجية"],
  deployed: ["Launch preparation choice", "اختيار تجهيز الإطلاق"],
  url: ["URL", "الرابط"],
  domain: ["Domain", "الدومين"],
  email: ["Email", "البريد الإلكتروني"],
  phone: ["Phone", "الهاتف"],
  services: ["Services", "الخدمات"],
  products: ["Products", "المنتجات"],
  pricing: ["Pricing", "التسعير"],
  features: ["Features", "المميزات"],
  sections: ["Sections", "الأقسام"],
  booking: ["Booking preferences", "إعدادات الحجز"],
  followUp: ["Follow-up preferences", "إعدادات المتابعة"],
  usageRange: ["Usage period", "فترة الاستخدام"],
};
const internal =
  /^(id|assetId|fingerprint|rendererVersion|revision|updatedAt|createdAt|schemaVersion|activeStep|completedSteps|svg|uid|origin)$/i;
const credential =
  /(?:api[_ -]?key|accessToken|refreshToken|password|secret|credentials|authorization|privateKey|clientSecret)$/i;
const retired =
  /^(dashboardSetupMode|dashboardBundle|dashboardWidgets|dashboardModuleOrder|dashboardModuleSections)$/;
export type SettingRow = { id: string; label: string; value: string; image: boolean };
export function settingLabel(key: string, ar: boolean) {
  if (key.startsWith("messages:"))
    return ar ? "محادثة اكتشاف المشروع" : "Business discovery conversation";
  return (
    labels[key]?.[ar ? 1 : 0] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_:-]/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}
export function dashboardSettings(state: BrandState, ar = false) {
  return brandPages.map((spec) => {
    const rows: SettingRow[] = [];
    const visit = (value: unknown, path: string[], depth: number) => {
      const key = path.at(-1) ?? "";
      if (internal.test(key) || credential.test(key) || value == null || depth > 30) return;
      const label = path
        .map((part) =>
          /^#\d+$/.test(part) ? `${ar ? "عنصر" : "Item"} ${part.slice(1)}` : settingLabel(part, ar),
        )
        .join(" › ");
      if (typeof value === "string" && /^data:image\/(?:png|jpeg|webp|svg\+xml)[;,]/i.test(value)) {
        rows.push({ id: path.join("."), label, value, image: true });
        return;
      }
      if (Array.isArray(value)) {
        if (value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
          if (value.length)
            rows.push({
              id: path.join("."),
              label,
              value: value.join(ar ? "، " : ", "),
              image: false,
            });
        } else value.forEach((item, index) => visit(item, [...path, `#${index + 1}`], depth + 1));
        return;
      }
      if (typeof value === "object") {
        Object.entries(value).forEach(([child, item]) => visit(item, [...path, child], depth + 1));
        return;
      }
      let text = String(value);
      if (!text.trim()) return;
      if (typeof value === "boolean") text = value ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No";
      if (text === "ar-EG") text = "العربية";
      if (text === "en-US") text = "English";
      if (text === "copilot-v1") text = ar ? "تصميم موحّد" : "Shared dashboard layout";
      if (key === "theme") text = value === "dark" ? (ar ? "داكن" : "Dark") : ar ? "فاتح" : "Light";
      rows.push({ id: path.join("."), label, value: text, image: false });
    };
    const values = {
      ...Object.fromEntries(
        spec.fields
          .filter((field) => !retired.test(field))
          .map((field) => [field, state[field as keyof BrandState]]),
      ),
      ...state.pageParameters[spec.id],
    };
    if (spec.id === "dashboard") {
      values["layoutVersion"] = "copilot-v1";
      values["dictationLanguage"] ??= "ar-EG";
    }
    Object.entries(values).forEach(([key, value]) => visit(value, [key], 0));
    return { id: spec.id, ...settingsSections[spec.id], rows };
  });
}
