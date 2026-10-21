import type { Billing, Product } from './model';
import { defaultExperience } from './model';
export function checkoutTotals(product: Product, billing?: Billing, bump = 0, code = '') {
  const c = product.config!; const e = c.experience ?? defaultExperience();
  const selected = billing || c.billing;
  const price = selected === 'One-time' ? e.oneTimeAmount : selected === 'Payment plan' ? e.installmentAmount : e.recurringAmount;
  const discounts = e.discounts.filter(discount => discount.enabled && (discount.appliesTo === 'All pricing options' || discount.appliesTo === selected));
  if (e.coupon.enabled && code.trim().toLowerCase() === e.coupon.code.trim().toLowerCase()) discounts.push({ ...e.coupon, id: 'coupon', appliesTo: 'All pricing options' });
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
  return { subtotal, tax: round(tax), total, bumpTotal, discount: round(price - discounted), dueToday, included, selected };
}

