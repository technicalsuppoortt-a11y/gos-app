import type { Billing, Product } from './model';
import { defaultExperience } from './model';
export function checkoutTotals(product: Product, billing?: Billing) {
  const c = product.config!; const e = c.experience ?? defaultExperience();
  const selected = billing || c.billing;
  const subtotal = selected === 'One-time' ? e.oneTimeAmount : selected === 'Payment plan' ? e.installmentAmount : e.recurringAmount;
  const included = e.taxHandling === 'Include tax in price';
  const tax = included ? subtotal - subtotal / (1 + c.taxRate / 100) : subtotal * c.taxRate / 100;
  const total = included ? subtotal : subtotal + tax;
  const dueToday = selected === 'Subscription' && c.trialDays > 0 ? 0 : total;
  return { subtotal, tax, total, dueToday, included, selected };
}

