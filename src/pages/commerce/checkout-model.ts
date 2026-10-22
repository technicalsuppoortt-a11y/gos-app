import type { Billing, Product } from './model';
import { defaultExperience } from './model';
import type { Discount } from '../discounts-data';

export function resolvePromoDiscount(product: Product, code: string, globals: Discount[] = [], billing?: Billing, now = new Date()) {
  const c = product.config!, e = c.experience ?? defaultExperience(), normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  const coupon = e.coupon;
  if (coupon.enabled && normalized === coupon.code.trim().toLowerCase()) return coupon.value > 0 && (coupon.type !== 'Percentage' || coupon.value <= 100) ? coupon : null;
  const selected = billing ?? c.billing, price = selected === 'One-time' ? e.oneTimeAmount : selected === 'Payment plan' ? e.installmentAmount : e.recurringAmount;
  const discount = globals.find(item => item.code.trim().toLowerCase() === normalized);
  if (!discount || !discount.active || !Number.isFinite(discount.value) || discount.value <= 0 || discount.type === 'Percentage' && discount.value > 100) return null;
  if (discount.expiry && (!Number.isFinite(Date.parse(discount.expiry)) || discount.expiry.slice(0, 10) < now.toISOString().slice(0, 10))) return null;
  if (discount.limit > 0 && discount.uses >= discount.limit || price < (discount.minimum || 0)) return null;
  if (discount.currency && discount.currency !== c.currency) return null;
  if (discount.applies === 'Specific Products' && !discount.productIds?.includes(product.id)) return null;
  if (discount.applies === 'Payment Plans' && selected !== 'Payment plan' || discount.applies === 'Memberships' && selected !== 'Subscription') return null;
  // Customer-specific restrictions need server-verified purchase history at payment time.
  if (discount.customersOnly || discount.once) return null;
  return discount;
}
export function checkoutTotals(product: Product, billing?: Billing, bump = 0, code = '', globals: Discount[] = []) {
  const c = product.config!; const e = c.experience ?? defaultExperience();
  const selected = billing || c.billing;
  const price = selected === 'One-time' ? e.oneTimeAmount : selected === 'Payment plan' ? e.installmentAmount : e.recurringAmount;
  const discounts = e.discounts.filter(discount => discount.enabled && (discount.appliesTo === 'All pricing options' || discount.appliesTo === selected));
  const promo = resolvePromoDiscount(product, code, globals, billing);
  if (promo) discounts.push({ ...promo, enabled: true, id: 'coupon', appliesTo: 'All pricing options' });
  let discounted = price;
  for (const discount of discounts) discounted = Math.max(0, discounted - (discount.type === 'Percentage' ? discounted * Math.min(100, discount.value) / 100 : discount.value));
  const decimals = new Intl.NumberFormat('en', { style: 'currency', currency: c.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const round = (value: number) => Number(value.toFixed(decimals));
  discounted = round(discounted);
  const subtotal = round(discounted + bump);
  const included = e.taxHandling === 'Include tax in price';
  const tax = included ? subtotal - subtotal / (1 + c.taxRate / 100) : subtotal * c.taxRate / 100;
  const total = round(included ? discounted : discounted * (1 + c.taxRate / 100));
  const bumpTotal = round(included ? bump : bump * (1 + c.taxRate / 100));
  const dueToday = round((selected === 'Subscription' && c.trialDays > 0 ? 0 : total) + bumpTotal);
  return { price, subtotal, tax: round(tax), total, bumpTotal, discount: round(price - discounted), dueToday, included, selected };
}

