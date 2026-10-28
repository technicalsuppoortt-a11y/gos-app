import { NavLink } from 'react-router-dom';
import { useUILanguage } from '../../i18n/display';

export const dashboardModules = ['funnels-websites', 'crm', 'booking', 'products', 'templates'];
const management = [['funnels', 'Funnels & Websites', 'الأقماع والمواقع'], ['crm', 'CRM & Leads Management', 'إدارة العملاء'], ['booking', 'Booking & Calendar', 'الحجوزات والتقويم'], ['products', 'Products & Payments', 'المنتجات والمدفوعات'], ['templates', 'Templates', 'القوالب']];
const settings = [['settings', 'General', 'عام'], ['integrations', 'Integrations & Webhooks', 'التكاملات وWebhooks'], ['ai-usage', 'AI Models & Usage', 'الذكاء الاصطناعي والاستخدام'], ['transactions', 'Transactions', 'المعاملات']];
export function AdminGroupNav({ group }: { group: 'management' | 'settings' }) {
  const ar = useUILanguage().startsWith('ar');
  return <section className="adm-group"><h2>{group === 'management' ? (ar ? 'إدارة لوحة التحكم' : 'Dashboard Management') : (ar ? 'الإعدادات' : 'Settings')}</h2><nav className="adm-group-nav" aria-label={group === 'management' ? 'Dashboard Management' : 'Settings'}>{(group === 'management' ? management : settings).map(([id, en, arabic]) => <NavLink key={id} to={`/admin/${id}`} className={({ isActive }) => isActive ? 'active' : ''}>{ar ? arabic : en}</NavLink>)}</nav></section>;
}
