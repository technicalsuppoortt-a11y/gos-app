import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, CreditCard, Filter, Globe2, LayoutGrid, MessageCircle, Send, Users } from 'lucide-react';
import { Card } from './kit';
const tools = [
  { name: 'Funnels', description: 'Create conversion funnels', icon: Filter, color: 'purple', to: '/dashboard/funnels' },
  { name: 'Websites', description: 'Manage your pages', icon: Globe2, color: 'blue', to: '/dashboard/funnels' },
  { name: 'CRM & Leads', description: 'Track your contacts', icon: Users, color: 'green', to: '/dashboard/crm' },
  { name: 'Calendars', description: 'Bookings & availability', icon: CalendarDays, color: 'orange', to: '/dashboard/booking' },
  { name: 'Products', description: 'Sell digital/physical products', icon: CreditCard, color: 'red', to: '/dashboard/products' },
  { name: 'AI Follow-up', description: 'Automated replies', icon: Send, color: 'purple', to: '/dashboard/follow-up' },
  { name: 'Inbox', description: 'Unified conversations', icon: MessageCircle, color: 'blue', to: '/dashboard/inbox' },
  { name: 'Templates', description: 'Saved page templates', icon: LayoutGrid, color: 'neutral', to: '/dashboard/templates' },
];
export function ToolsSettingsPanel() {
  const navigate = useNavigate();
  return <Card><div className="st-tools-grid">{tools.map(t => <button className="st-tool" key={t.name} onClick={() => navigate(t.to)}><span className={`st-service-icon ${t.color}`}><t.icon size={22}/></span><span><b>{t.name}</b><small>{t.description}</small></span><ChevronRight size={16}/></button>)}</div></Card>;
}
