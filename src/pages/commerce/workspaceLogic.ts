import { hydrateProduct, type CommerceConfig, type CommerceOrder, type Product, type ProductExperience } from './model';

export function configureProduct(product: Product, patch: Partial<CommerceConfig>): Product {
  const config = { ...product.config!, ...patch }, experience = { ...config.experience! };
  if (patch.billing !== undefined && patch.amount === undefined) config.amount = config.billing === 'One-time' ? experience.oneTimeAmount : config.billing === 'Payment plan' ? experience.installmentAmount : experience.recurringAmount;
  if (patch.amount !== undefined) {
    if (config.billing === 'One-time') experience.oneTimeAmount = config.amount;
    else if (config.billing === 'Payment plan') experience.installmentAmount = config.amount;
    else experience.recurringAmount = config.amount;
  }
  config.experience = experience;
  return { ...product, config };
}
export function customizeProduct(product: Product, patch: Partial<ProductExperience>): Product {
  const experience = { ...product.config!.experience!, ...patch }, config = { ...product.config!, experience };
  const field = config.billing === 'One-time' ? 'oneTimeAmount' : config.billing === 'Payment plan' ? 'installmentAmount' : 'recurringAmount';
  if (patch[field] !== undefined) config.amount = experience[field];
  return { ...product, config };
}
const instant = (value: any) => typeof value?.toDate === 'function' ? value.toDate().toISOString() : typeof value === 'string' ? value : '';
const status = (value: string): CommerceOrder['status'] => /refund/i.test(value) ? 'Refunded' : /^(paid|completed|succeeded)$/i.test(value) ? 'Paid' : 'Pending';
export function productOrders(product: Product, orders: Record<string, any>[], transactions: Record<string, any>[]): CommerceOrder[] {
  if (!product.id) return product.config?.orders ?? [];
  const rows = new Map<string, CommerceOrder>((product.config?.orders ?? []).map(row => [row.id, row]));
  const related = new Set<string>();
  for (const row of [...orders, ...transactions]) {
    const linked = row.orderId || row.order_id || row.id;
    const line = row.items?.find((item: any) => (item.productId || item.product_id) === product.id);
    if ((row.productId || row.product_id || row.courseId) !== product.id && !line && !related.has(linked)) continue;
    related.add(linked);
    const previous = rows.get(linked);
    rows.set(linked, { id: linked, customer: row.customerName || row.customer_name || row.customer?.name || (typeof row.customer === 'string' ? row.customer : previous?.customer || ''),
      email: row.customerEmail || row.customer_email || row.customer?.email || row.email || previous?.email || '',
      at: instant(row.createdAt || row.created_at || row.at || row.date) || previous?.at || '',
      amount: Number(line?.total ?? line?.amount ?? (line ? Number(line.price || 0) * Number(line.quantity || 1) : row.total ?? row.amount ?? previous?.amount ?? 0)),
      currency: row.currency || previous?.currency || product.config!.currency, status: status(row.status || previous?.status || ''), productName: line?.name || row.productName || previous?.productName || product.name });
  }
  return [...rows.values()];
}
export function withLiveProductData(product: Product, orders: Record<string, any>[], transactions: Record<string, any>[], events: Record<string, any>[], calendars: Record<string, any>[] = []): CommerceConfig {
  const lessonViews: Record<string, number> = { ...product.config?.lessonViews };
  for (const event of events) if (event.type === 'lesson.viewed' && event.productId === product.id && typeof event.lessonId === 'string') lessonViews[event.lessonId] = (lessonViews[event.lessonId] || 0) + 1;
  const calendar = calendars.find(calendar => calendar.id === product.config?.calendarId);
  return { ...product.config!, orders: productOrders(product, orders, transactions), lessonViews, ...(calendar ? { bookingSlots: (calendar.availability || []).filter((slot: any) => slot.enabled).map((slot: any) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day]} ${slot.start}–${slot.end}`) } : {}) };
}
export function hydrateWorkspaceProduct(product: Product) { return hydrateProduct(product); }
