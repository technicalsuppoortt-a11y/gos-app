export const UPKLICK_CONTACT_INFO = {
  phoneDisplay: '+20 103 897 9275',
  phoneLocal: '01038979275',
  phoneHref: 'tel:+201038979275',
  emailPrimary: 'support@upklick.net',
  addressEn: '14 Makram Ebeid St., Nasr City, Cairo, Egypt',
  addressAr: '14 شارع مكرم عبيد، مدينة نصر، القاهرة، مصر',
} as const;

export const legalCopy = {
  en: { labels: ['Privacy Policy', 'Terms of Service', 'Refund Policy', 'Shipping Policy', 'Contact Us'], nav: 'Legal and contact links', home: 'Home', login: 'Sign in', identity: 'AI Business & Marketing Operating System (Cloud SaaS Platform)', name: 'Full name', email: 'Email address', phone: 'Mobile number (optional)', message: 'Your message', send: 'Open email draft', help: 'This form opens your email app with a draft addressed to our support team. Send the email there to contact us.', price: 'Subscription price: $99' },
  ar: { labels: ['سياسة الخصوصية', 'شروط الخدمة', 'سياسة الاسترداد', 'سياسة الشحن والتسليم', 'تواصل معنا'], nav: 'روابط السياسات والتواصل', home: 'الرئيسية', login: 'تسجيل الدخول', identity: 'نظام تشغيل الأعمال والتسويق بالذكاء الاصطناعي (منصة برمجيات سحابية كخدمة)', name: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف (اختياري)', message: 'رسالتك', send: 'فتح مسودة بريد إلكتروني', help: 'يفتح هذا النموذج تطبيق البريد الإلكتروني مع مسودة موجهة إلى فريق الدعم. أرسل الرسالة من التطبيق للتواصل معنا.', price: 'سعر الاشتراك: 99 دولاراً أمريكياً' },
  nl: { labels: ['Privacybeleid', 'Servicevoorwaarden', 'Restitutiebeleid', 'Verzendbeleid', 'Contact'], nav: 'Juridische en contactlinks', home: 'Home', login: 'Inloggen', identity: 'AI-besturingssysteem voor bedrijven en marketing (cloud-SaaS-platform)', name: 'Volledige naam', email: 'E-mailadres', phone: 'Mobiel nummer (optioneel)', message: 'Je bericht', send: 'E-mailconcept openen', help: 'Dit formulier opent je e-mailapp met een concept voor ons supportteam. Verstuur de e-mail daar om contact op te nemen.', price: 'Abonnementsprijs: $99' },
  de: { labels: ['Datenschutzerklärung', 'Nutzungsbedingungen', 'Rückerstattungsrichtlinie', 'Versandrichtlinie', 'Kontakt'], nav: 'Rechtliche Links und Kontakt', home: 'Startseite', login: 'Anmelden', identity: 'KI-Betriebssystem für Unternehmen und Marketing (Cloud-SaaS-Plattform)', name: 'Vollständiger Name', email: 'E-Mail-Adresse', phone: 'Mobilnummer (optional)', message: 'Deine Nachricht', send: 'E-Mail-Entwurf öffnen', help: 'Dieses Formular öffnet deine E-Mail-App mit einem Entwurf an unser Supportteam. Sende die E-Mail dort, um uns zu kontaktieren.', price: 'Abonnementpreis: $99' },
} as const;

export function getLegalCopy(language: string) {
  return legalCopy[language.split('-')[0] as keyof typeof legalCopy] ?? legalCopy.en;
}

export function legalLinks(language: string) {
  const paths = ['/privacy-policy', '/terms-of-service', '/refund-policy', '/shipping-policy', '/contact-us'];
  return paths.map((to, index) => ({ to, label: getLegalCopy(language).labels[index] }));
}
