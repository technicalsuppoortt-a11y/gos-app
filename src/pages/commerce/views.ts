import { BookOpen, CalendarDays, CreditCard, Download, FileText, Layers3, LockKeyhole, Settings2, ShoppingCart, Sparkles, Users } from 'lucide-react';
import type { ProductKind } from './model';
export type WorkspaceTab = 'information' | 'content' | 'pricing' | 'checkout' | 'access' | 'automation' | 'settings' | 'booking' | 'components';
export const workspaceViews = {
  course: { title: 'Online Course', information: 'Course Information', tabs: [['information', 'Overview', BookOpen], ['content', 'Content', FileText], ['pricing', 'Pricing & Offers', CreditCard], ['checkout', 'Checkout', ShoppingCart], ['access', 'Access & Students', Users], ['automation', 'Automation', Sparkles], ['settings', 'Settings', Settings2]] },
  digital: { title: 'Digital Product', information: 'Product Information', tabs: [['information', 'Product Information', FileText], ['content', 'Files & Download', Download], ['pricing', 'Pricing & Payment', CreditCard], ['checkout', 'Checkout', ShoppingCart], ['access', 'Customer Access', LockKeyhole], ['automation', 'Automation', Sparkles]] },
  service: { title: 'Service', information: 'Basic Information', tabs: [['information', 'Content', FileText], ['booking', 'Booking', CalendarDays], ['pricing', 'Pricing', CreditCard], ['automation', 'Automation', Sparkles]] },
  subscription: { title: 'Subscription', information: 'Subscription Information', tabs: [['information', 'Overview', FileText], ['content', 'Member Benefits', BookOpen], ['pricing', 'Pricing & Offers', CreditCard], ['checkout', 'Checkout', ShoppingCart], ['access', 'Subscriber Access', Users], ['automation', 'Automation', Sparkles], ['settings', 'Settings', Settings2]] },
  bundle: { title: 'Bundle', information: 'Bundle Information', tabs: [['information', 'Overview', Layers3], ['components', 'Component Products', Layers3], ['pricing', 'Pricing & Offers', CreditCard], ['checkout', 'Checkout', ShoppingCart], ['access', 'Customer Access', LockKeyhole], ['automation', 'Automation', Sparkles], ['settings', 'Settings', Settings2]] },
  physical: { title: 'Physical Product', information: 'Product Information', tabs: [['information', 'Product Information', FileText], ['pricing', 'Pricing', CreditCard], ['settings', 'Settings', Settings2]] },
} as const;
export function resolveTab(kind: ProductKind, requested: string | null): WorkspaceTab {
  const value = requested?.toLowerCase();
  const aliases: Record<string, WorkspaceTab> = { general: 'information', overview: 'information', 'product information': 'information', 'course information': 'information', content: kind === 'service' ? 'information' : 'content', 'files & download': 'content', 'pricing & offers': 'pricing', 'pricing & payment': 'pricing', 'delivery & access': kind === 'service' ? 'booking' : 'access', 'access & students': 'access', 'customer access': 'access' };
  const tab = value ? aliases[value] ?? value : 'information';
  return workspaceViews[kind].tabs.some(([id]) => id === tab) ? tab as WorkspaceTab : 'information';
}
