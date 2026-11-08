export function saveFailureCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string")
    return error.code.replace(/^firestore\//, "");
  if (error instanceof Error) {
    if (/sign in|signed-in account/i.test(error.message)) return "unauthenticated";
    if (/bookings overlap/i.test(error.message)) return "booking-conflict";
    if (/too large/i.test(error.message)) return "too-large";
  }
  return "unknown";
}

export function saveFailureMessage(code: string | null | undefined, ar: boolean): string {
  switch (code) {
    case "invalid-draft":
      return ar
        ? "بيانات البراند المحفوظة غير مكتملة أو بإصدار غير مدعوم. لم نستبدلها؛ أعد المحاولة أو تواصل مع الدعم."
        : "The saved workspace is incomplete or uses an unsupported version. It has not been replaced. Retry or contact support.";
    case "draft-changed":
      return ar
        ? "بيانات البراند اتغيّرت أثناء الحفظ أو التجهيز. أعد المحاولة لتحميل آخر نسخة."
        : "Your workspace changed during saving or preparation. Retry to use the latest version.";
    case "permission-denied":
      return ar
        ? "لا يملك حسابك صلاحية الوصول. أعد تسجيل الدخول ثم حاول مجددًا."
        : "Your account could not access the saved data. Sign in again, then retry.";
    case "unauthenticated":
      return ar
        ? "انتهت صلاحية الجلسة. أعد تسجيل الدخول للحفظ."
        : "Your session needs to be renewed. Sign in again to save.";
    case "unavailable":
    case "deadline-exceeded":
      return ar
        ? "تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة."
        : "Could not connect. Check your internet connection, then retry.";
    case "booking-conflict":
      return ar
        ? "يوجد حجزان متداخلان. غيّر الوقت أو ألغِ أحدهما قبل الحفظ."
        : "Two bookings overlap. Change the time or cancel one before saving.";
    case "too-large":
      return ar
        ? "المحتوى أكبر من الحد المسموح للحفظ. قلّل حجم الصور أو المحتوى."
        : "This content exceeds the save limit. Reduce the images or content.";
    default:
      return ar
        ? "تعذّرت المزامنة. اختياراتك باقية في هذه الجلسة؛ أعد المحاولة."
        : "Could not sync. Your choices are still in this session; please retry.";
  }
}
