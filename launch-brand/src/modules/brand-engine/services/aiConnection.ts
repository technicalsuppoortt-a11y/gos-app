import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/modules/brand-engine/firebase";
import { invokeAI as invoke } from "@/modules/brand-engine/services/aiBackend";
import type {
  BrandCandidate,
  BrandElement,
  BrandElementAnswers,
  BrandElementCandidate,
} from "@/modules/brand-engine/data/brandTheme";
export type AIConnection = {
  provider: "openai" | "gemini";
  source?: "platform";
  models?: string[];
  aiPaused?: boolean;
  model: string;
  keyLast4: string;
  status: "connected";
  revision: string;
  capabilities: { text: boolean; images: boolean };
  testedAt?: { toMillis?: () => number };
  systemInstructions?: string;
  maxOutputTokens?: number;
  dailyUserLimit?: number;
  dailyGlobalLimit?: number;
};
export type ConnectionInput = {
  provider: string;
  apiKey: string;
  model: string;
  systemInstructions?: string;
  maxOutputTokens?: number;
  dailyUserLimit?: number;
  dailyGlobalLimit?: number;
};
export type ConnectionTest = {
  provider: string;
  model: string;
  models: string[];
  keyLast4: string;
  capabilities: { text: boolean; images: boolean };
};
export function subscribeAIConnection(
  onChange: (value: AIConnection | null) => void,
  onError: () => void,
) {
  return onSnapshot(
    doc(db, "aiConnections", "default"),
    (s) => onChange(s.exists() ? (s.data() as AIConnection) : null),
    onError,
  );
}
export const testAIConnection = (input: ConnectionInput) =>
  invoke<ConnectionTest>("testAIConnection", input);
export const saveAIConnection = (input: ConnectionInput) =>
  invoke<{ model: string; models: string[] }>("saveAIConnection", input);
export const disconnectAIConnection = () => invoke("disconnectAIConnection", {});
export const generateBrandIdentity = (
  requestId: string,
  language: string,
  inputFingerprint: string,
) =>
  invoke<{
    candidates: BrandCandidate[];
    sourceRevision: string;
    provider: string;
    model: string;
    inputFingerprint: string;
    promptVersion: string;
  }>("generateBrandIdentity", { requestId, language, inputFingerprint });
export const sendAICenterMessage = (
  requestId: string,
  message: string,
  language: string,
  history: Array<{ role: string; content: string }>,
) => invoke<{ content: string }>("aiCenterChat", { requestId, message, language, history });
export const generateBrandElement = (
  element: BrandElement,
  answers: BrandElementAnswers,
  requestId: string,
  language: string,
  inputFingerprint: string,
) =>
  invoke<{
    suggestions: BrandElementCandidate[];
    element: BrandElement;
    inputFingerprint: string;
    promptVersion: string;
  }>("generateBrandElement", { element, answers, requestId, language, inputFingerprint });
export function aiError(error: unknown, ar: boolean) {
  const diagnostic =
    (error as { diagnostic?: string; details?: { diagnostic?: string } })?.diagnostic ||
    (error as { details?: { diagnostic?: string } })?.details?.diagnostic ||
    "";
  const providerMessages: Record<string, [string, string]> = {
    "brand-invalid-logo-image": [
      "موديل الصور رجّع ملف لوجو غير صالح. اختياراتك السابقة محفوظة؛ أعد المحاولة لو باقي محاولات.",
      "The image model returned an invalid logo image. Previous designs are preserved; retry if attempts remain.",
    ],
    "brand-logo-image-model": [
      "موديل Gemini Flash Image غير متاح لمفتاح Google الحالي. اطلب من السوبر أدمن مراجعة توفر موديل الصور وصلاحيات مشروع Google.",
      "Gemini Flash Image is unavailable to the saved Google key. Ask Super Admin to check image-model access for the Google project.",
    ],
    "brand-logo-image-save": [
      "اتولد اللوجو واجتاز المراجعة، لكن تعذّر حفظ الصورة بعد إعادة محاولة الحفظ. اختياراتك السابقة محفوظة؛ راجع اتصال الحفظ.",
      "The logo passed review, but its image could not be saved after retrying storage. Your previous designs are preserved; check the storage connection.",
    ],
    "brand-logo-image-count": [
      "موديل الصور رجّع أكثر من صورة بدل لوجو واحد. لم تُحفظ نتيجة غير مطابقة.",
      "The image model returned multiple images instead of one logo. The result was not saved.",
    ],
    "brand-logo-image-reference": [
      "تعذّر تجهيز صورة مراجع اللوجو. اختياراتك محفوظة؛ أعد المحاولة.",
      "The logo reference image could not be prepared. Your previous designs are preserved.",
    ],
    "brand-logo-limit": [
      "استخدمت محاولات توليد اللوجو الثلاثة المتاحة لحسابك. تقدر تختار أو تحمّل تصميم سابق.",
      "Your three logo generation attempts have been used. You can choose or download a previous design.",
    ],
    "brand-weak-logo": [
      "اللوجوهات لم تجتز المراجعة البصرية حتى بعد إعادة التصميم. لم تُحفظ نتائج ضعيفة؛ جرّب توليد بدائل جديدة أو وضّح فكرة البراند أكثر.",
      "The logos did not pass visual review after redesign. The new batch was not saved; generate alternatives or add more brand direction.",
    ],
    "brand-logo-review": [
      "المراجعة البصرية للوجوهات لم تكتمل. اختياراتك السابقة محفوظة؛ أعد المحاولة.",
      "The visual logo review was incomplete. Your previous choices are saved; try again.",
    ],
    "brand-similar-logo": [
      "اللوجوهات المقترحة متشابهة بصريًا حتى بعد إعادة التصميم. لم تُحفظ الدفعة الجديدة؛ جرّب توليد بدائل جديدة.",
      "The proposed logos still look too similar after redesign. The new batch was not saved; generate new alternatives.",
    ],
    "brand-invalid-response": [
      "وصل رد المزوّد، لكن بعض بيانات اتجاهات البراند لم تطابق التنسيق المطلوب. أعد التوليد؛ لن تُحفظ نتيجة غير مكتملة.",
      "The provider responded, but some brand direction data did not match the required format. Generate again; incomplete results are not saved.",
    ],
    "brand-invalid-json": [
      "رد AI لم يكن JSON كاملًا. أعد المحاولة؛ اختياراتك الحالية محفوظة.",
      "AI returned incomplete JSON. Try again; your current choices are saved.",
    ],
    "brand-invalid-count": [
      "عدد اقتراحات AI لم يطابق المطلوب. تقدر تستخدم اقتراحاتك السابقة أو تعيد المحاولة لو متاح.",
      "AI returned the wrong number of suggestions. Use a previous suggestion or retry if attempts remain.",
    ],
    "brand-invalid-language": [
      "لغة الاسم في رد AI لم تطابق اللغة المختارة. راجع لغة البراند وأعد المحاولة.",
      "The generated name does not match your selected brand language. Check the language and try again.",
    ],
    "brand-invalid-word-count": [
      "عدد كلمات الاسم في رد AI لم يطابق اختيارك. أعد المحاولة؛ اختياراتك محفوظة.",
      "The generated name does not match your selected word count. Try again; your choices are saved.",
    ],
    "brand-invalid-logo": [
      "رد AI يحتوي رسم لوجو غير مكتمل أو مسارات غير صالحة. اختياراتك محفوظة؛ جرّب أسلوب لوجو أبسط.",
      "AI returned incomplete or invalid logo artwork. Your choices are saved; try a simpler logo style.",
    ],
    "brand-invalid-colors": [
      "رد AI يحتاج ٣ ألوان أساسية صالحة لكل اقتراح. أعد المحاولة.",
      "AI must provide three valid core colors for each suggestion. Try again.",
    ],
    "brand-invalid-fonts": [
      "الخطوط المقترحة غير مدعومة. أعد المحاولة أو اختر خطًا من القائمة.",
      "The suggested fonts are unsupported. Try again or choose a font from the list.",
    ],
    "provider-use-openai": [
      "صيغة المفتاح تخص OpenAI. اختر OpenAI بدل Google Gemini.",
      "This key has an OpenAI prefix. Select OpenAI instead of Google Gemini.",
    ],
    "provider-use-gemini": [
      "صيغة المفتاح تخص Google. اختر Google Gemini وتأكد أنه مفتاح Gemini API.",
      "This key has a Google prefix. Select Google Gemini and ensure it is a Gemini API key.",
    ],
    "provider-key-copy": [
      "انسخ المفتاح السري كاملًا؛ رقم التتبع أو المفتاح المختصر الظاهر في الجدول لا يعمل.",
      "Paste the full secret key. The Tracking ID or masked key shown in the table cannot authenticate requests.",
    ],
    "provider-key": [
      "مفتاح المزوّد غير صالح أو منتهي. أدخل مفتاحًا جديدًا للمزوّد المختار.",
      "The provider API key is invalid or expired. Enter a new key for the selected provider.",
    ],
    "provider-restriction": [
      "قيود المفتاح أو إعدادات الـ API تمنع الطلب. راجع المواقع المسموحة وتفعيل Gemini API في مشروع المفتاح.",
      "The key's restrictions or API settings block this request. Check allowed websites and Gemini API access in the key's project.",
    ],
    "provider-permission": [
      "المزوّد رفض الوصول (403). راجع صلاحيات المفتاح وتوفر الخدمة لحسابك ومنطقتك.",
      "The provider denied access (403). Check the key permissions and service availability for your account and region.",
    ],
    "provider-quota": [
      "حصة الطلبات لدى المزوّد انتهت (429). راجع حصة الموديل في حساب المزوّد ثم حاول لاحقًا.",
      "The provider quota was reached (429). Check this model's quota in your provider account and retry later.",
    ],
    "provider-model": [
      "الموديل غير متاح (404). امسح خانة الموديل وأعد اختبار الاتصال.",
      "The model is unavailable (404). Clear the Model field and test again.",
    ],
    "provider-request": [
      "المزوّد رفض صيغة الطلب (400). جرّب اختيار موديل آخر من القائمة.",
      "The provider rejected the request format (400). Try another available model.",
    ],
    "provider-timeout": [
      "طلب الذكاء الاصطناعي تجاوز وقت الانتظار قبل اكتمال الرد. بياناتك محفوظة؛ حاول مجددًا.",
      "The AI request timed out before its response completed. Your data was preserved; retry the request.",
    ],
    "provider-network": [
      "المتصفح لم يتمكن من الاتصال بالمزوّد. راجع الإنترنت أو حجب الطلبات بواسطة الشبكة أو إضافات المتصفح.",
      "Could not reach the AI provider. Check your connection and retry.",
    ],
    "provider-output-limit": [
      "الموديل استهلك حد التوكنز قبل إكمال الرد. ارفع حد التوكنز أو جرّب موديل آخر.",
      "The model exhausted the output token limit before completing its reply. Raise the token limit or try another model.",
    ],
    "provider-blocked": [
      "المزوّد حجب الرد وفق سياسات المحتوى. عدّل البرومبت وأعد المحاولة.",
      "The provider blocked the response under its content policy. Revise the prompt and retry.",
    ],
    "provider-empty": [
      "المزوّد رجّع ردًا فارغًا. جرّب موديل آخر وأعد الاختبار.",
      "The provider returned an empty response. Try another model and test again.",
    ],
    "provider-invalid-response": [
      "المزوّد رجّع ردًا ناقصًا أو غير صالح للقراءة. بياناتك محفوظة؛ حاول مجددًا.",
      "The provider returned an incomplete or unreadable response. Your data was preserved; retry the request.",
    ],
    "discovery-invalid-response": [
      "رد الذكاء الاصطناعي لم يطابق بيانات الترشيح المطلوبة أو اقترح سوقًا غير موجود. بياناتك محفوظة؛ أعد التحليل.",
      "The AI response did not match the required recommendation format or selected an unavailable market. Your data was preserved; run the analysis again.",
    ],
    "discovery-missing-source-urls": [
      "Gemini/مزوّد البحث رجّع نصًا أو إشارات استشهاد من غير روابط فعلية، حتى بعد بحث مخصص للخدمة والبلد. لم تُحفظ النتيجة الجديدة. راجع تفعيل Google Search/بحث الويب للموديل في إعدادات المزوّد؛ اختياراتك السابقة محفوظة.",
      "The search provider returned text or citation references without actual URLs, even after a focused service/country search. The new result was not saved. Check the model's web search/Google Search configuration. Your previous choices were preserved.",
    ],
    "discovery-invalid-json": [
      "المزوّد رجّع نصًا بدل صيغة JSON المطلوبة للترشيح، حتى بعد محاولة تصحيح تلقائية. بياناتك محفوظة؛ أعد التحليل.",
      "The provider returned text instead of the required recommendation JSON, even after one automatic correction. Your data was preserved; retry the analysis.",
    ],
    "discovery-invalid-market": [
      "الـAI اختار معرّف نيش أو سب نيش خارج القائمة، حتى بعد محاولة تصحيح تلقائية. لم يُحفظ اختيار غير صالح؛ أعد التحليل.",
      "The AI selected a niche/sub-niche ID outside the approved parent/child list, even after one automatic correction. No invalid choice was saved; retry the analysis.",
    ],
    "discovery-profile": [
      "بيانات Your Profile المحفوظة ناقصة أو غير صالحة. راجع الاهتمامات والمهارات والسوق والوقت والميزانية والعملة، وتأكد أن نفس المجال ليس مختارًا ومستبعدًا معًا.",
      "Your saved profile is incomplete or invalid. Review interests, skills, market, time, budget and currency; do not both select and exclude the same industry.",
    ],
    "discovery-translation": [
      "تعذّرت ترجمة النصوص كاملة. الترشيح الأصلي محفوظ؛ حاول الترجمة مجددًا.",
      "The explanations could not be fully translated. The original recommendation was preserved; retry translation.",
    ],
    "discovery-configuration": [
      "إعدادات استبيان Discovery المنشورة غير صالحة. اطلب من السوبر أدمن مراجعتها وإعادة نشرها.",
      "The published Discovery questionnaire settings are invalid. Ask Super Admin to review and republish them.",
    ],
    "discovery-catalog": [
      "كتالوج النيش والسب نيش المنشور غير صالح للتحليل. اطلب من السوبر أدمن مراجعته وإعادة نشره.",
      "The published niche catalog is invalid for analysis. Ask Super Admin to review and republish it.",
    ],
    "provider-unavailable": [
      "خدمة المزوّد غير متاحة حاليًا. أعد المحاولة لاحقًا.",
      "The AI provider is currently unavailable. Retry later.",
    ],
    "usage-persistence": [
      "تعذّر حفظ سجل استخدام الطلب بعد الاتصال بالمزوّد. راجع اتصال Firebase وصلاحيات الحفظ وسجل الاستخدام قبل إعادة التوليد؛ قد يكون الطلب محسوبًا بالفعل.",
      "Could not save the usage record after contacting the provider. Check Firebase connectivity, write permissions and AI activity before generating again; the provider may already have counted the request.",
    ],
  };
  if (providerMessages[diagnostic]) return providerMessages[diagnostic][ar ? 0 : 1];
  const code = (error as { code?: string })?.code || "";
  if (code.includes("unauthenticated"))
    return ar ? "سجل الدخول مجددًا لاستخدام الذكاء الاصطناعي." : "Sign in again to use AI.";
  if (code.includes("permission-denied"))
    return ar
      ? "تعذّر تنفيذ الطلب بسبب صلاحيات الحساب أو قواعد Firebase. راجع صلاحيات حفظ طلبات الذكاء الاصطناعي؛ استخدام التوليد لا يتطلب حساب سوبر أدمن."
      : "Firebase denied access. Check that the Spark browser-mode Firestore rules are deployed and your account is active. Generating an identity does not require a Super Admin account.";
  if (code.includes("failed-precondition"))
    return ar
      ? "راجع الاتصال المختار والمفتاح والموديل في AI Center. إذا كنت تستخدم اتصال المنصة، اطلب من الإدارة مراجعته."
      : "Check your selected connection, key and model in AI Center. Ask your administrator to review platform connections.";
  if (code.includes("resource-exhausted"))
    return ar
      ? "وصلت للحد المتاح للطلبات أو رصيد المزوّد. راجع AI Center وحاول لاحقًا."
      : "The request limit or provider quota was reached. Check AI Center and retry later.";
  if (code.includes("already-exists"))
    return ar
      ? "طلبك ما زال قيد التنفيذ. انتظر قبل إعادة المحاولة."
      : "Your request is still running. Wait before retrying.";
  return ar
    ? "تعذّر إكمال الطلب. تحقق من الاتصال بمزوّد الذكاء الاصطناعي ثم حاول مجددًا. بياناتك الحالية محفوظة."
    : "The request could not complete. Check the connection to the AI provider and retry. Your existing data was preserved.";
}
