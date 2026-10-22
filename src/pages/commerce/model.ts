export const productTypes = ['Service', 'Digital Product', 'Course'] as const;
export type ProductType = typeof productTypes[number] | 'Course / Membership' | 'Subscription' | 'Bundle' | 'Physical Product' | ProductKind;
export type StatKind = 'sales' | 'revenue' | 'bookings' | 'members';
export type Billing = 'One-time' | 'Payment plan' | 'Subscription';
export type ProductKind = 'course' | 'digital' | 'service' | 'subscription' | 'bundle' | 'physical';
export interface Lesson { id: string; title: string; kind: 'Video' | 'PDF' | 'Text'; duration: string; url: string; storageId?: string; fileName?: string }
export interface PricingDiscount { id: string; enabled: boolean; type: 'Percentage' | 'Fixed Amount'; value: number; appliesTo: 'All pricing options' | 'One-time payment' | 'Payment plan' | 'Subscription' }
export const accessRules = ['Immediately after payment', 'After manual approval', 'After specific date', 'Drip content (scheduled release)'] as const;
export interface ProductExperience {
  shortDescription: string; gallery: string[]; tags: string[]; category: string; language: string; visibility: 'Published' | 'Private' | 'Unlisted';
  instructor: { name: string; bio: string; image: string }; studentLimit: number; requireLogin: boolean;
  fileType?: string; downloadLimitEnabled?: boolean;
  directDownload: boolean; watermark: boolean; included: Array<{ id: string; title: string; enabled: boolean }>;
  serviceMode: 'Online' | 'At Location' | 'Both'; provider: string; location: string;
  rating?: number; reviewCount?: number;
  activeStudents?: number; courseLevel?: string; estimatedDuration?: string;
  instructorSocials?: Record<string, string>; directCheckoutUrl?: string;
  oneTimeAmount: number; comparePrice: number; showComparePrice: boolean; planEnabled: boolean; recurringEnabled: boolean;
  recurringAmount: number; installmentAmount: number; paymentInterval: 'Monthly' | 'Quarterly' | 'Yearly';
  checkout: { secure: boolean; collectInfo: boolean; requirePhone: boolean; guest: boolean; testimonials: boolean; requireTerms?: boolean; termsUrl?: string; privacyUrl?: string; bumpEnabled?: boolean; bumpProductId?: string };
  upsellId: string; downsellId: string; offersEnabled: boolean; funnelUrl: string;
  version: number; parentId: string; updatedAt: string;
  taxHandling: 'Include tax in price' | 'Calculate at checkout';
  paymentMethods: Array<'Visa' | 'Mastercard' | 'PayPal' | 'Apple Pay' | 'Google Pay'>;
  coupon: { enabled: boolean; code: string; type: PricingDiscount['type']; value: number; limitUsage: boolean; usageLimit: number; oncePerCustomer: boolean; geofenceOffer: boolean };
  discounts: PricingDiscount[];
  accessRule: typeof accessRules[number]; accessDate: string; dripDays: number;
}
export interface Student { id: string; name: string; email: string; status: 'Active' | 'Pending' | 'Completed' | 'Suspended'; progress: number; enrolledAt: string; avatar?: string; sample?: boolean }
export interface CommerceOrder { id: string; customer: string; email: string; at: string; amount: number; currency: CommerceConfig['currency']; status: 'Paid' | 'Pending' | 'Refunded'; productName?: string; sample?: boolean }
export interface CommerceActivity { id: string; title: string; at: string }
export interface CommerceConfig {
  students?: Student[]; orders?: CommerceOrder[]; activities?: CommerceActivity[];
  funnelId?: string; funnelPageId?: string; customDomain?: string; webhookUrl?: string; webhookEvents?: string[];
  amount: number; currency: string; billing: Billing;
  installments: number; frequency: 'Monthly' | 'Quarterly' | 'Yearly'; trialDays: number;
  cancellation: 'End of billing period' | 'Immediately'; taxRate: number;
  access: 'Lifetime access' | '12 months' | 'While subscribed'; delivery: 'Instant' | 'After approval';
  bookingUrl: string; duration: number; fulfillment: string; bookingSlots?: string[];
  assets: Array<{ name: string; url: string; storageId?: string; size?: number; mime?: string }>; downloadLimit: number;
  modules: Array<{ id?: string; title: string; lessons: Array<string | Lesson> }>; communityUrl: string; enrollment: 'Automatic' | 'After approval';
  certificateEnabled?: boolean; certificateIssuer?: string; downloadExpiryHours?: number;
  calendarId?: string; bufferBefore?: number; bufferAfter?: number; cancellationHours?: number; cancellationPolicy?: string;
  lessonViews?: Record<string, number>;
  components: string[]; sku: string; inventory: number; shippingRequired: boolean;
  automations: { grantAccess: boolean; confirmation: boolean; crmTag: string; followUp: boolean; fileDelivery?: boolean; calendarInvite?: boolean };
  checkoutFields: string; thankYouUrl: string; salesUrl: string;
  experience?: ProductExperience;
}
export interface Product {
  slug?: string;
  id: string; name: string; type: ProductType; price: string; stats: Array<[StatKind, string]>;
  status: 'Active' | 'Draft'; sales: string; revenue: string; art: string; image?: string;
  tag: string; description: string; config?: CommerceConfig; createdAt?: string;
}
export function defaultConfig(type: ProductType, price = ''): CommerceConfig {
  const amount = Number((price.match(/[\d,.]+/)?.[0] ?? '0').replaceAll(',', '')) || 0;
  const recurring = type.toLowerCase() === 'subscription';
  return { amount, currency: 'EUR', billing: recurring ? 'Subscription' : 'One-time',
    installments: 3, frequency: 'Monthly', trialDays: 0, cancellation: 'End of billing period', taxRate: 0,
    access: recurring ? 'While subscribed' : 'Lifetime access', delivery: 'Instant',
    bookingUrl: '', duration: 60, fulfillment: '', assets: [], downloadLimit: 5, modules: [], communityUrl: '', enrollment: 'Automatic',
    components: [], sku: '', inventory: 0, shippingRequired: true,
    automations: { grantAccess: true, confirmation: true, crmTag: '', followUp: false }, checkoutFields: '', thankYouUrl: '', salesUrl: '', experience: { ...defaultExperience(), downloadLimitEnabled: productKind(type) === 'digital' ? false : undefined, oneTimeAmount: amount, recurringAmount: recurring ? amount : 29, recurringEnabled: recurring, installmentAmount: Math.round(amount / 3 * 100) / 100 } };
}
export function defaultExperience(): ProductExperience {
  return { shortDescription: '', gallery: [], tags: [], category: '', language: 'English', visibility: 'Published', instructor: { name: '', bio: '', image: '' },
    studentLimit: 0, requireLogin: true, directDownload: true, watermark: false, included: [], serviceMode: 'Online', provider: '', location: '',
    oneTimeAmount: 0, comparePrice: 0, showComparePrice: false, planEnabled: false, recurringEnabled: false, recurringAmount: 29, installmentAmount: 99, paymentInterval: 'Monthly',
    checkout: { secure: true, collectInfo: true, requirePhone: false, guest: true, testimonials: false }, upsellId: '', downsellId: '', offersEnabled: false, funnelUrl: '',
    version: 1, parentId: '', updatedAt: '', taxHandling: 'Calculate at checkout', paymentMethods: ['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay'],
    coupon: { enabled: false, code: '', type: 'Percentage', value: 20, limitUsage: false, usageLimit: 100, oncePerCustomer: true, geofenceOffer: false },
    discounts: [{ id: 'automatic-default', enabled: false, type: 'Fixed Amount', value: 10, appliesTo: 'All pricing options' }],
    accessRule: 'Immediately after payment', accessDate: '', dripDays: 7 };
}
export function productKind(type: string): ProductKind {
  const value = type.toLowerCase();
  if (['course', 'membership', 'course / membership', 'online course'].includes(value)) return 'course';
  if (['digital', 'digital product'].includes(value)) return 'digital';
  if (value === 'service') return 'service';
  if (value === 'subscription') return 'course';
  return 'digital';
}
export const kindLabels: Record<ProductKind, ProductType> = { course: 'Course', digital: 'Digital Product', service: 'Service', subscription: 'Course', bundle: 'Digital Product', physical: 'Digital Product' };
export function lessonData(lesson: string | Lesson, index = 0): Lesson {
  return typeof lesson === 'string' ? { id: `legacy-${index}`, title: lesson, kind: 'Video', duration: '', url: '' } : lesson;
}
// Keep independent live updates (for example learner progress) when an editor saves other fields.
export function mergeProductChanges(base: any, draft: any, latest: any): any {
  if (JSON.stringify(base) === JSON.stringify(draft)) return latest === undefined ? draft : latest;
  if (Array.isArray(base) && Array.isArray(draft) && Array.isArray(latest) && [...base, ...draft, ...latest].every(row => row && typeof row.id === 'string')) {
    const before = new Map(base.map(row => [row.id, row])), edited = new Map(draft.map(row => [row.id, row])), remote = new Map(latest.map(row => [row.id, row]));
    const result = draft.map(row => mergeProductChanges(before.get(row.id), row, remote.get(row.id)));
    for (const row of latest) if (!before.has(row.id) && !edited.has(row.id)) result.push(row);
    return result;
  }
  if (base && draft && latest && typeof draft === 'object' && !Array.isArray(draft)) {
    const result = { ...latest };
    for (const key of new Set([...Object.keys(base), ...Object.keys(draft)])) result[key] = mergeProductChanges(base[key], draft[key], latest[key]);
    return result;
  }
  return draft;
}
export function hydrateProduct(product: Product): Product {
  const type = kindLabels[productKind(product.type)];
  const defaults = defaultConfig(product.type, product.price);
  const config = { ...defaults, ...product.config, automations: { ...defaults.automations, ...product.config?.automations } };
  config.modules = config.modules.map((module, index) => ({ ...module, id: module.id || `legacy-module-${index}`, lessons: module.lessons.map((lesson, lessonIndex) => lessonData(lesson, index * 1000 + lessonIndex)) }));
  const experience = { ...defaultExperience(), oneTimeAmount: config.billing === 'Payment plan' ? config.amount * config.installments : config.amount, installmentAmount: config.billing === 'Payment plan' ? config.amount : Math.round(config.amount / config.installments * 100) / 100, recurringAmount: config.billing === 'Subscription' ? config.amount : 29, planEnabled: config.billing === 'Payment plan', recurringEnabled: config.billing === 'Subscription', ...product.config?.experience, instructor: { ...defaultExperience().instructor, ...config.experience?.instructor }, checkout: { ...defaultExperience().checkout, ...config.experience?.checkout } };
  experience.coupon = { ...defaultExperience().coupon, ...product.config?.experience?.coupon };
  if (!product.config?.experience?.accessRule) experience.accessRule = config.delivery === 'After approval' ? 'After manual approval' : 'Immediately after payment';
  return { ...product, type, tag: type, config: { ...config, experience } };
}
export function newProduct(): Product {
  return { id: '', name: '', type: 'Digital Product', price: '', stats: [['sales', '0 sales']], status: 'Draft', sales: '0', revenue: '€0', art: 'templates', tag: 'Digital Product', description: '', config: defaultConfig('Digital Product') };
}
export function formatPrice(config: CommerceConfig) {
  const amount = new Intl.NumberFormat('en-IE', { style: 'currency', currency: config.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(config.amount);
  return `${amount}${config.billing === 'Subscription' ? ` / ${config.frequency.toLowerCase().replace('monthly', 'month').replace('quarterly', 'quarter').replace('yearly', 'year')}` : config.billing === 'Payment plan' ? ` × ${config.installments}` : ''}`;
}
export function validateProduct(product: Product, publish = false): string[] {
  const c = product.config ?? defaultConfig(product.type, product.price);
  const errors: string[] = [];
  if (!productTypes.includes(product.type as typeof productTypes[number])) errors.push('Choose Service, Digital Product or Course as the product type.');
  if (!product.name.trim()) errors.push('Enter a product name.');
  if (!Number.isFinite(c.amount) || c.amount < 0) errors.push('Price must be zero or greater.');
  if (c.billing === 'Payment plan' && (!Number.isInteger(c.installments) || c.installments < 2)) errors.push('Payment plans need at least two installments.');
  if (!Number.isInteger(c.trialDays) || c.trialDays < 0) errors.push('Trial days must be a whole number of zero or greater.');
  if (!Number.isFinite(c.taxRate) || c.taxRate < 0 || c.taxRate > 100) errors.push('Tax rate must be between 0 and 100.');
  for (const [label, value] of [['Download expiration', c.downloadExpiryHours], ['Buffer before', c.bufferBefore], ['Buffer after', c.bufferAfter], ['Cancellation notice', c.cancellationHours]] as const) if (value !== undefined && (!Number.isFinite(value) || value < 0)) errors.push(`${label} must be zero or greater.`);
  if (c.downloadExpiryHours !== undefined && (c.downloadExpiryHours < 1 || c.downloadExpiryHours > 720)) errors.push('Download expiration must be between 1 and 720 hours.');
  const kind = productKind(product.type);
  if (kind === 'subscription' && c.billing !== 'Subscription') errors.push('Subscription products require recurring billing.');
  if (kind === 'digital' && (!Number.isInteger(c.downloadLimit) || c.downloadLimit < 1)) errors.push('Download limit must be a positive whole number.');
  const experience = c.experience;
  if (experience) {
    for (const [label, value] of [['Terms URL', experience.checkout.termsUrl], ['Privacy policy URL', experience.checkout.privacyUrl]]) if (value) { try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error(); } catch { errors.push(`${label} must be a valid HTTP or HTTPS URL.`); } }
    if (experience.checkout.bumpEnabled && (!experience.checkout.bumpProductId || experience.checkout.bumpProductId === product.id)) errors.push('Choose another product for the order bump.');
    if (!Number.isFinite(experience.oneTimeAmount) || experience.oneTimeAmount < 0) errors.push('One-time price must be zero or greater.');
    if (!Number.isInteger(experience.studentLimit) || experience.studentLimit < 0) errors.push('Student limit must be a whole number of zero or greater.');
    if (experience.planEnabled && (!Number.isFinite(experience.installmentAmount) || experience.installmentAmount <= 0 || !Number.isInteger(c.installments) || c.installments < 2)) errors.push('Enabled payment plans require a positive amount and at least two installments.');
    if (experience.recurringEnabled && (!Number.isFinite(experience.recurringAmount) || experience.recurringAmount <= 0)) errors.push('Recurring offers require a positive subscription price.');
    if (experience.showComparePrice && (!Number.isFinite(experience.comparePrice) || experience.comparePrice <= (kind === 'subscription' ? experience.recurringAmount : experience.oneTimeAmount))) errors.push('Compare price must be higher than the selling price.');
    const coupon = experience.coupon;
    if (coupon?.enabled && !coupon.code.trim()) errors.push('Enter a discount code.');
    if (coupon?.enabled && coupon.limitUsage && (!Number.isInteger(coupon.usageLimit) || coupon.usageLimit < 1)) errors.push('Coupon usage limit must be a positive whole number.');
    for (const discount of [coupon, ...(experience.discounts ?? [])]) {
      if (discount?.enabled && (!Number.isFinite(discount.value) || discount.value <= 0 || discount.type === 'Percentage' && discount.value > 100)) errors.push('Enabled discounts require a positive value; percentages cannot exceed 100.');
    }
    if (experience.accessRule === 'After specific date' && (!experience.accessDate || !Number.isFinite(Date.parse(experience.accessDate)))) errors.push('Choose a valid product access date.');
    if (experience.accessRule === 'Drip content (scheduled release)' && (!Number.isInteger(experience.dripDays) || experience.dripDays < 1)) errors.push('Drip release interval must be a positive whole number of days.');
  }
  for (const [label, url] of [['Booking link', c.bookingUrl], ['Community URL', c.communityUrl], ['Thank-you URL', c.thankYouUrl], ['Sales page URL', c.salesUrl], ['Webhook URL', c.webhookUrl], ['Custom domain', c.customDomain ? `https://${c.customDomain}` : ''], ['Funnel URL', experience?.funnelUrl], ['Direct checkout URL', experience?.directCheckoutUrl], ...Object.entries(experience?.instructorSocials ?? {}).map(([network, url]) => [`${network} URL`, url]), ...c.assets.map(asset => ['Asset URL', asset.url]), ...c.modules.flatMap(module => module.lessons.map(lesson => ['Lesson resource URL', lessonData(lesson).url]))]) {
    if (url) {
      try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(); }
      catch { errors.push(`${label} must be a valid https:// or http:// URL.`); }
    }
  }
  if (c.customDomain && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(c.customDomain)) errors.push('Enter a domain name without a protocol or path.');
  for (const student of c.students ?? []) { if (!student.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email) || !Number.isFinite(student.progress) || student.progress < 0 || student.progress > 100) errors.push('Students need a name, valid email and progress between 0 and 100.'); }
  if (publish) {
    if (c.assets.some(asset => asset.storageId?.startsWith('local-')) || c.modules.some(module => module.lessons.some(lesson => lessonData(lesson).storageId?.startsWith('local-')))) errors.push('Upload local attachments to cloud storage or replace them with delivery URLs before publishing.');
    if (!product.description.trim()) errors.push('Add a description before publishing.');
    if (kind === 'service' && !c.bookingUrl.trim() && !c.fulfillment.trim()) errors.push('Add a booking link or service fulfillment instructions.');
    if (kind === 'service' && (!Number.isFinite(c.duration) || c.duration <= 0)) errors.push('Service duration must be greater than zero.');
    if (kind === 'digital' && (!c.assets.length || c.assets.some(a => !a.name.trim() || (!a.url.trim() && !a.storageId)))) errors.push('Add at least one named digital asset with a delivery URL or uploaded file.');
    if (kind === 'course' && !c.communityUrl && (!c.modules.length || c.modules.some(m => !m.title.trim() || !m.lessons.length || m.lessons.some(l => !lessonData(l).title.trim())))) errors.push('Add a community URL or modules with named lessons.');
    if (kind === 'bundle' && c.components.length < 2) errors.push('Choose at least two products for your bundle.');
  }
  return errors;
}
